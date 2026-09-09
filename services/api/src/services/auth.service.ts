import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { SYSTEM_CONFIG } from '@gaon-auto/config';
import {
  normalizeIndianPhoneNumber,
  generateNumericOtp,
  hashSha256,
  generateRandomToken,
} from '@gaon-auto/utils';
import {
  UserModel,
  DriverProfileModel,
  OTPModel,
  RefreshSessionModel,
  DeviceTokenModel,
  VehicleModel,
} from '../models/index.js';
import { smsService } from './sms.service.js';
import { AuthResponse, UserRole } from '@gaon-auto/types';

export class AuthService {
  /**
   * Requests a login or registration OTP for an Indian mobile number.
   */
  async requestOtp(rawPhone: string, role: UserRole = 'PASSENGER'): Promise<{ cooldownSeconds: number; devOtp?: string }> {
    const norm = normalizeIndianPhoneNumber(rawPhone);
    if (!norm.isValid) {
      throw new Error(norm.error || 'Invalid Indian phone number');
    }
    const phone = norm.canonical;

    const now = new Date();

    // Check existing OTP for cooldown
    const existingOtp = await OTPModel.findOne({ phone }).sort({ createdAt: -1 });
    if (existingOtp && existingOtp.resendCooldownUntil > now) {
      const waitSeconds = Math.ceil((existingOtp.resendCooldownUntil.getTime() - now.getTime()) / 1000);
      throw new Error(`Please wait ${waitSeconds} seconds before requesting a new OTP.`);
    }

    // Generate secure 6-digit OTP
    const otp = generateNumericOtp(SYSTEM_CONFIG.OTP_LENGTH);
    const codeHash = hashSha256(otp, phone);

    const expiresAt = new Date(now.getTime() + SYSTEM_CONFIG.OTP_EXPIRY_SECONDS * 1000);
    const resendCooldownUntil = new Date(now.getTime() + SYSTEM_CONFIG.OTP_RESEND_COOLDOWN_SECONDS * 1000);

    // Save OTP to database
    await OTPModel.create({
      phone,
      codeHash,
      purpose: 'LOGIN',
      attempts: 0,
      maxAttempts: SYSTEM_CONFIG.OTP_MAX_VERIFY_ATTEMPTS,
      expiresAt,
      resendCooldownUntil,
    });

    // Send SMS via provider
    await smsService.sendOtp(phone, otp);

    // In non-production, return devOtp so tests and local UI can verify immediately
    const result: { cooldownSeconds: number; devOtp?: string } = {
      cooldownSeconds: SYSTEM_CONFIG.OTP_RESEND_COOLDOWN_SECONDS,
    };

    if (ENV.NODE_ENV !== 'production') {
      result.devOtp = otp;
    }

    return result;
  }

  /**
   * Verifies an OTP and issues access/refresh tokens.
   */
  async verifyOtp(
    rawPhone: string,
    inputOtp: string,
    deviceInfo?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const norm = normalizeIndianPhoneNumber(rawPhone);
    if (!norm.isValid) {
      throw new Error(norm.error || 'Invalid Indian phone number');
    }
    const phone = norm.canonical;

    const now = new Date();

    // Find the latest unverified OTP record
    const otpRecord = await OTPModel.findOne({
      phone,
      verifiedAt: { $exists: false },
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      throw new Error('OTP has expired or does not exist. Please request a new OTP.');
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await OTPModel.deleteOne({ _id: otpRecord._id });
      throw new Error('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    const expectedHash = hashSha256(inputOtp, phone);
    if (expectedHash !== otpRecord.codeHash) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = otpRecord.maxAttempts - otpRecord.attempts;
      throw new Error(`Invalid OTP. ${remaining} attempt(s) remaining.`);
    }

    // Mark OTP as verified
    otpRecord.verifiedAt = now;
    await otpRecord.save();

    // Find or create User
    let user = await UserModel.findOne({ phone });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await UserModel.create({
        phone,
        role: 'PASSENGER', // Defaults to passenger; driver onboarding switches or creates driver profile
        preferredLanguage: 'hi',
        status: 'ACTIVE',
        lastActiveAt: now,
      });
    } else {
      if (user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
        throw new Error(`Your account has been ${user.status.toLowerCase()}. Please contact support.`);
      }
      user.lastActiveAt = now;
      await user.save();
    }

    // Load DriverProfile if user is a driver
    let driverProfile = null;
    const dp = await DriverProfileModel.findOne({ userId: user._id });
    if (dp) {
      const vehicle = await VehicleModel.findOne({ driverId: dp._id });
      driverProfile = {
        ...dp.toJSON(),
        vehicle: vehicle ? vehicle.toJSON() : undefined,
      };
    }

    // Generate JWT Tokens
    const { accessToken, refreshToken } = this.generateTokens(user._id.toString(), user.role);

    // Save refresh session in database
    const tokenHash = hashSha256(refreshToken);
    const sessionExpiry = new Date(now.getTime() + SYSTEM_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 86400 * 1000);

    await RefreshSessionModel.create({
      userId: user._id,
      tokenHash,
      deviceInfo,
      ipAddress,
      userAgent,
      expiresAt: sessionExpiry,
    });

    return {
      user: user.toJSON() as any,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: SYSTEM_CONFIG.ACCESS_TOKEN_EXPIRY_SECONDS,
      },
      driverProfile: driverProfile as any,
    };
  }

  /**
   * Refreshes access and refresh tokens using a valid refresh token.
   */
  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, ENV.JWT_REFRESH_SECRET) as { sub: string; role: string };
      const tokenHash = hashSha256(refreshToken);

      const session = await RefreshSessionModel.findOne({
        tokenHash,
        userId: decoded.sub,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      });

      if (!session) {
        throw new Error('Invalid or revoked session');
      }

      // Check user status
      const user = await UserModel.findById(decoded.sub);
      if (!user || user.status !== 'ACTIVE') {
        throw new Error('User account is not active');
      }

      // Revoke current refresh token (Rotation)
      session.isRevoked = true;
      await session.save();

      // Issue new token pair
      const newTokens = this.generateTokens(user._id.toString(), user.role);
      const newTokenHash = hashSha256(newTokens.refreshToken);

      await RefreshSessionModel.create({
        userId: user._id,
        tokenHash: newTokenHash,
        deviceInfo: session.deviceInfo,
        expiresAt: new Date(Date.now() + SYSTEM_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 86400 * 1000),
      });

      return newTokens;
    } catch {
      throw new Error('Invalid or expired refresh token. Please log in again.');
    }
  }

  /**
   * Logs out user by revoking refresh session.
   */
  async logout(userId: string, refreshToken?: string, removePushToken = true): Promise<void> {
    if (refreshToken) {
      const tokenHash = hashSha256(refreshToken);
      await RefreshSessionModel.updateOne({ tokenHash, userId }, { isRevoked: true });
    } else {
      // Logout from all devices
      await RefreshSessionModel.updateMany({ userId }, { isRevoked: true });
    }

    if (removePushToken) {
      await DeviceTokenModel.deleteMany({ userId });
    }
  }

  /**
   * Registers a device push notification token.
   */
  async registerDeviceToken(userId: string, token: string, platform: 'android' | 'ios' | 'web', deviceId?: string): Promise<void> {
    await DeviceTokenModel.findOneAndUpdate(
      { token },
      {
        userId,
        token,
        platform,
        deviceId,
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  }

  private generateTokens(userId: string, role: string) {
    const accessToken = jwt.sign(
      { sub: userId, role },
      ENV.JWT_ACCESS_SECRET,
      { expiresIn: `${SYSTEM_CONFIG.ACCESS_TOKEN_EXPIRY_SECONDS}s` }
    );

    const refreshToken = jwt.sign(
      { sub: userId, role, jti: generateRandomToken(16) },
      ENV.JWT_REFRESH_SECRET,
      { expiresIn: `${SYSTEM_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS}d` }
    );

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
