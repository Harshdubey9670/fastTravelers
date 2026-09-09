import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import { IdempotencyRecordModel } from '../models/SecurityModels.js';
import { hashPayload } from '@gaon-auto/utils';
import { SYSTEM_CONFIG } from '@gaon-auto/config';

/**
 * Express middleware to guarantee request idempotency using the Idempotency-Key header.
 */
export function idempotencyMiddleware() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const key = req.headers['idempotency-key'] as string;
    if (!key || req.method === 'GET' || req.method === 'HEAD') {
      return next();
    }

    const payloadHash = hashPayload(req.body);
    const endpoint = req.originalUrl;
    const userId = req.user?.id;

    try {
      const existing = await IdempotencyRecordModel.findOne({ key });
      if (existing) {
        // If payload matches, return cached response
        if (existing.payloadHash === payloadHash) {
          res.setHeader('X-Cache', 'HIT-IDEMPOTENT');
          return res.status(existing.responseStatus).json(existing.responseBody);
        } else {
          return res.status(409).json({
            success: false,
            error: {
              code: 'IDEMPOTENCY_KEY_REUSE',
              message: 'Idempotency key was previously used with different request parameters',
            },
          });
        }
      }

      // Intercept res.json to capture response and persist in idempotency cache
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const expiresAt = new Date(Date.now() + SYSTEM_CONFIG.IDEMPOTENCY_TTL_SECONDS * 1000);
          IdempotencyRecordModel.create({
            key,
            endpoint,
            userId: userId as any,
            payloadHash,
            responseStatus: res.statusCode,
            responseBody: body,
            expiresAt,
          }).catch((err) => {
            console.error('[Idempotency] Failed to cache response:', err);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('[Idempotency] Middleware error:', err);
      next();
    }
  };
}
