"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_js_1 = require("../config/env.js");
const config_1 = require("@gaon-auto/config");
const utils_1 = require("@gaon-auto/utils");
const index_js_1 = require("../models/index.js");
const sms_service_js_1 = require("./sms.service.js");
class AuthService {
    /**
     * Requests a login or registration OTP for an Indian mobile number.
     */
    async requestOtp(rawPhone, role = 'PASSENGER') {
        const norm = (0, utils_1.normalizeIndianPhoneNumber)(rawPhone);
        if (!norm.isValid) {
            throw new Error(norm.error || 'Invalid Indian phone number');
        }
        const phone = norm.canonical;
        const now = new Date();
        // Check existing OTP for cooldown
        const existingOtp = await index_js_1.OTPModel.findOne({ phone }).sort({ createdAt: -1 });
        if (existingOtp && existingOtp.resendCooldownUntil > now) {
            const waitSeconds = Math.ceil((existingOtp.resendCooldownUntil.getTime() - now.getTime()) / 1000);
            throw new Error(`Please wait ${waitSeconds} seconds before requesting a new OTP.`);
        }
        // Generate secure 6-digit OTP
        const otp = (0, utils_1.generateNumericOtp)(config_1.SYSTEM_CONFIG.OTP_LENGTH);
        const codeHash = (0, utils_1.hashSha256)(otp, phone);
        const expiresAt = new Date(now.getTime() + config_1.SYSTEM_CONFIG.OTP_EXPIRY_SECONDS * 1000);
        const resendCooldownUntil = new Date(now.getTime() + config_1.SYSTEM_CONFIG.OTP_RESEND_COOLDOWN_SECONDS * 1000);
        // Save OTP to database
        await index_js_1.OTPModel.create({
            phone,
            codeHash,
            purpose: 'LOGIN',
            attempts: 0,
            maxAttempts: config_1.SYSTEM_CONFIG.OTP_MAX_VERIFY_ATTEMPTS,
            expiresAt,
            resendCooldownUntil,
        });
        // Send SMS via provider
        await sms_service_js_1.smsService.sendOtp(phone, otp);
        // In non-production, return devOtp so tests and local UI can verify immediately
        const result = {
            cooldownSeconds: config_1.SYSTEM_CONFIG.OTP_RESEND_COOLDOWN_SECONDS,
        };
        if (env_js_1.ENV.NODE_ENV !== 'production') {
            result.devOtp = otp;
        }
        return result;
    }
    /**
     * Verifies an OTP and issues access/refresh tokens.
     */
    async verifyOtp(rawPhone, inputOtp, deviceInfo, ipAddress, userAgent) {
        const norm = (0, utils_1.normalizeIndianPhoneNumber)(rawPhone);
        if (!norm.isValid) {
            throw new Error(norm.error || 'Invalid Indian phone number');
        }
        const phone = norm.canonical;
        const now = new Date();
        // Find the latest unverified OTP record
        const otpRecord = await index_js_1.OTPModel.findOne({
            phone,
            verifiedAt: { $exists: false },
            expiresAt: { $gt: now },
        }).sort({ createdAt: -1 });
        if (!otpRecord) {
            throw new Error('OTP has expired or does not exist. Please request a new OTP.');
        }
        if (otpRecord.attempts >= otpRecord.maxAttempts) {
            await index_js_1.OTPModel.deleteOne({ _id: otpRecord._id });
            throw new Error('Maximum verification attempts exceeded. Please request a new OTP.');
        }
        const expectedHash = (0, utils_1.hashSha256)(inputOtp, phone);
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
        let user = await index_js_1.UserModel.findOne({ phone });
        let isNewUser = false;
        if (!user) {
            isNewUser = true;
            user = await index_js_1.UserModel.create({
                phone,
                role: 'PASSENGER', // Defaults to passenger; driver onboarding switches or creates driver profile
                preferredLanguage: 'hi',
                status: 'ACTIVE',
                lastActiveAt: now,
            });
        }
        else {
            if (user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
                throw new Error(`Your account has been ${user.status.toLowerCase()}. Please contact support.`);
            }
            user.lastActiveAt = now;
            await user.save();
        }
        // Load DriverProfile if user is a driver
        let driverProfile = null;
        const dp = await index_js_1.DriverProfileModel.findOne({ userId: user._id });
        if (dp) {
            const vehicle = await index_js_1.VehicleModel.findOne({ driverId: dp._id });
            driverProfile = {
                ...dp.toJSON(),
                vehicle: vehicle ? vehicle.toJSON() : undefined,
            };
        }
        // Generate JWT Tokens
        const { accessToken, refreshToken } = this.generateTokens(user._id.toString(), user.role);
        // Save refresh session in database
        const tokenHash = (0, utils_1.hashSha256)(refreshToken);
        const sessionExpiry = new Date(now.getTime() + config_1.SYSTEM_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 86400 * 1000);
        await index_js_1.RefreshSessionModel.create({
            userId: user._id,
            tokenHash,
            deviceInfo,
            ipAddress,
            userAgent,
            expiresAt: sessionExpiry,
        });
        return {
            user: user.toJSON(),
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: config_1.SYSTEM_CONFIG.ACCESS_TOKEN_EXPIRY_SECONDS,
            },
            driverProfile: driverProfile,
        };
    }
    /**
     * Refreshes access and refresh tokens using a valid refresh token.
     */
    async refreshTokens(refreshToken) {
        try {
            const decoded = jsonwebtoken_1.default.verify(refreshToken, env_js_1.ENV.JWT_REFRESH_SECRET);
            const tokenHash = (0, utils_1.hashSha256)(refreshToken);
            const session = await index_js_1.RefreshSessionModel.findOne({
                tokenHash,
                userId: decoded.sub,
                isRevoked: false,
                expiresAt: { $gt: new Date() },
            });
            if (!session) {
                throw new Error('Invalid or revoked session');
            }
            // Check user status
            const user = await index_js_1.UserModel.findById(decoded.sub);
            if (!user || user.status !== 'ACTIVE') {
                throw new Error('User account is not active');
            }
            // Revoke current refresh token (Rotation)
            session.isRevoked = true;
            await session.save();
            // Issue new token pair
            const newTokens = this.generateTokens(user._id.toString(), user.role);
            const newTokenHash = (0, utils_1.hashSha256)(newTokens.refreshToken);
            await index_js_1.RefreshSessionModel.create({
                userId: user._id,
                tokenHash: newTokenHash,
                deviceInfo: session.deviceInfo,
                expiresAt: new Date(Date.now() + config_1.SYSTEM_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 86400 * 1000),
            });
            return newTokens;
        }
        catch {
            throw new Error('Invalid or expired refresh token. Please log in again.');
        }
    }
    /**
     * Logs out user by revoking refresh session.
     */
    async logout(userId, refreshToken, removePushToken = true) {
        if (refreshToken) {
            const tokenHash = (0, utils_1.hashSha256)(refreshToken);
            await index_js_1.RefreshSessionModel.updateOne({ tokenHash, userId }, { isRevoked: true });
        }
        else {
            // Logout from all devices
            await index_js_1.RefreshSessionModel.updateMany({ userId }, { isRevoked: true });
        }
        if (removePushToken) {
            await index_js_1.DeviceTokenModel.deleteMany({ userId });
        }
    }
    /**
     * Registers a device push notification token.
     */
    async registerDeviceToken(userId, token, platform, deviceId) {
        await index_js_1.DeviceTokenModel.findOneAndUpdate({ token }, {
            userId,
            token,
            platform,
            deviceId,
            lastUsedAt: new Date(),
        }, { upsert: true, new: true });
    }
    generateTokens(userId, role) {
        const accessToken = jsonwebtoken_1.default.sign({ sub: userId, role }, env_js_1.ENV.JWT_ACCESS_SECRET, { expiresIn: `${config_1.SYSTEM_CONFIG.ACCESS_TOKEN_EXPIRY_SECONDS}s` });
        const refreshToken = jsonwebtoken_1.default.sign({ sub: userId, role, jti: (0, utils_1.generateRandomToken)(16) }, env_js_1.ENV.JWT_REFRESH_SECRET, { expiresIn: `${config_1.SYSTEM_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS}d` });
        return { accessToken, refreshToken };
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map