import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import rateLimit from 'express-rate-limit';

export class AppError extends Error {
  constructor(
    public override message: string,
    public status = 400,
    public code = 'BAD_REQUEST'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Standard error handling middleware.
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
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
const realAuthRateLimiter = rateLimit({
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

export const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'test') return next();
  return realAuthRateLimiter(req, res, next);
};

const realApiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'test') return next();
  return realApiRateLimiter(req, res, next);
};
