import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@gaon-auto/types';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: UserRole;
        driverId?: string;
    };
}
/**
 * Validates JWT Access Token on incoming requests.
 */
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Role-based authorization middleware.
 */
export declare function requireRole(...allowedRoles: UserRole[]): (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Ride participant ownership middleware to prevent IDOR attacks.
 */
export declare function requireRideParticipant(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=auth.middleware.d.ts.map