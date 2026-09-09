"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRateLimiter = exports.authRateLimiter = exports.AppError = void 0;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
class AppError extends Error {
    message;
    status;
    code;
    constructor(message, status = 400, code = 'BAD_REQUEST') {
        super(message);
        this.message = message;
        this.status = status;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
/**
 * Standard error handling middleware.
 */
function errorHandler(err, req, res, next) {
    // Handle Zod validation errors
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request payload',
                details: err.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            },
        });
    }
    // Handle explicit AppError or errors with a status property
    if (err instanceof AppError) {
        return res.status(err.status).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
            },
        });
    }
    const status = err.status || 400; // Default operational errors to 400 Bad Request
    const message = err.message || 'An error occurred';
    const code = err.code || 'BAD_REQUEST';
    if (status >= 500) {
        console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
    }
    return res.status(status).json({
        success: false,
        error: {
            code,
            message,
        },
    });
}
/**
 * Rate limiters
 */
const realAuthRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 30, // limit each IP to 30 OTP requests per 10 mins
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many OTP requests from this IP. Please try again in 10 minutes.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});
const authRateLimiter = (req, res, next) => {
    if (process.env.NODE_ENV === 'test')
        return next();
    return realAuthRateLimiter(req, res, next);
};
exports.authRateLimiter = authRateLimiter;
const realApiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
});
const apiRateLimiter = (req, res, next) => {
    if (process.env.NODE_ENV === 'test')
        return next();
    return realApiRateLimiter(req, res, next);
};
exports.apiRateLimiter = apiRateLimiter;
//# sourceMappingURL=errorHandler.middleware.js.map