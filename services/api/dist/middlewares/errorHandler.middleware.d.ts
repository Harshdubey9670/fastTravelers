import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    message: string;
    status: number;
    code: string;
    constructor(message: string, status?: number, code?: string);
}
/**
 * Standard error handling middleware.
 */
export declare function errorHandler(err: any, req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
export declare const authRateLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const apiRateLimiter: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.middleware.d.ts.map