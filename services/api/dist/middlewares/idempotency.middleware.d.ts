import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
/**
 * Express middleware to guarantee request idempotency using the Idempotency-Key header.
 */
export declare function idempotencyMiddleware(): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=idempotency.middleware.d.ts.map