import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { UserModel } from '../models/User.js';
import { DriverProfileModel } from '../models/DriverProfile.js';
import { RideModel } from '../models/Ride.js';
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
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication token required' },
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET) as { sub: string; role: UserRole };
    const user = await UserModel.findById(decoded.sub);

    if (!user || user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Account suspended or inactive' },
      });
    }

    let driverId: string | undefined;
    if (user.role === 'DRIVER') {
      const dp = await DriverProfileModel.findOne({ userId: user._id });
      if (dp) {
        driverId = dp._id.toString();
      }
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      driverId,
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired authentication token' },
    });
  }
}

/**
 * Role-based authorization middleware.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: insufficient permissions' },
      });
    }
    next();
  };
}

/**
 * Ride participant ownership middleware to prevent IDOR attacks.
 */
export async function requireRideParticipant(req: AuthRequest, res: Response, next: NextFunction) {
  const rideId = req.params.id || req.params.rideId;
  if (!rideId) return next();

  const userId = req.user?.id;
  const userRole = req.user?.role;
  const driverId = req.user?.driverId;

  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
    return next();
  }

  const ride = await RideModel.findById(rideId);
  if (!ride) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Ride not found' },
    });
  }

  const isPassenger = ride.passengerId.toString() === userId;
  const isAssignedDriver = driverId && ride.driverId?.toString() === driverId;

  if (!isPassenger && !isAssignedDriver) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied: You are not a participant in this ride' },
    });
  }

  next();
}
