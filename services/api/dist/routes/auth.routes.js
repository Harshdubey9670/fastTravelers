"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_service_js_1 = require("../services/auth.service.js");
const validation_1 = require("@gaon-auto/validation");
const errorHandler_middleware_js_1 = require("../middlewares/errorHandler.middleware.js");
const auth_middleware_js_1 = require("../middlewares/auth.middleware.js");
const router = (0, express_1.Router)();
router.post('/request-otp', errorHandler_middleware_js_1.authRateLimiter, async (req, res, next) => {
    try {
        const validated = validation_1.requestOtpSchema.parse(req.body);
        const result = await auth_service_js_1.authService.requestOtp(validated.phone, validated.role);
        return res.status(200).json({
            success: true,
            data: result,
            message: 'OTP sent successfully',
        });
    }
    catch (err) {
        next(err);
    }
});
router.post('/verify-otp', async (req, res, next) => {
    try {
        const validated = validation_1.verifyOtpSchema.parse(req.body);
        const ip = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const result = await auth_service_js_1.authService.verifyOtp(validated.phone, validated.otp, validated.deviceInfo, ip, userAgent);
        return res.status(200).json({
            success: true,
            data: result,
            message: 'Authentication successful',
        });
    }
    catch (err) {
        next(err);
    }
});
router.post('/refresh', async (req, res, next) => {
    try {
        const validated = validation_1.refreshTokenSchema.parse(req.body);
        const tokens = await auth_service_js_1.authService.refreshTokens(validated.refreshToken);
        return res.status(200).json({
            success: true,
            data: tokens,
        });
    }
    catch (err) {
        next(err);
    }
});
router.post('/logout', auth_middleware_js_1.authenticate, async (req, res, next) => {
    try {
        await auth_service_js_1.authService.logout(req.user.id, req.body.refreshToken);
        return res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map