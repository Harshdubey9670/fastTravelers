import { Router } from 'express';
import { authService } from '../services/auth.service.js';
import { requestOtpSchema, verifyOtpSchema, refreshTokenSchema } from '@gaon-auto/validation';
import { authRateLimiter } from '../middlewares/errorHandler.middleware.js';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/request-otp', authRateLimiter, async (req, res, next) => {
  try {
    const validated = requestOtpSchema.parse(req.body);
    const result = await authService.requestOtp(validated.phone, validated.role);
    return res.status(200).json({
      success: true,
      data: result,
      message: 'OTP sent successfully',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-otp', async (req, res, next) => {
  try {
    const validated = verifyOtpSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await authService.verifyOtp(
      validated.phone,
      validated.otp,
      validated.deviceInfo,
      ip,
      userAgent
    );
    return res.status(200).json({
      success: true,
      data: result,
      message: 'Authentication successful',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const validated = refreshTokenSchema.parse(req.body);
    const tokens = await authService.refreshTokens(validated.refreshToken);
    return res.status(200).json({
      success: true,
      data: {
        ...tokens,
        tokens,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await authService.logout(req.user!.id, req.body.refreshToken);
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
