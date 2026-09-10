import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware.js';
import { routeService } from '../services/route.service.js';
import { isValidCoordinate } from '@gaon-auto/utils';

export const routeRouter = Router();

// In-memory rate limiting: max 30 route requests per minute per user/IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count++;
  return true;
}

/**
 * POST /api/v1/routes/compute
 * Protected route to calculate road routes via Google Routes API.
 * Never exposes the Google API key to clients.
 */
routeRouter.post('/compute', authenticate, async (req: AuthRequest, res: Response) => {
  const clientId = req.user?.id || req.ip || 'anonymous';
  if (!checkRateLimit(clientId)) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many route computation requests. Please try again in a minute.',
      },
    });
  }

  const { origin, destination, intermediateWaypoints } = req.body || {};

  if (!origin || !isValidCoordinate(origin.latitude, origin.longitude)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_COORDINATES',
        message: 'Origin latitude (-90 to 90) and longitude (-180 to 180) are required.',
      },
    });
  }

  if (!destination || !isValidCoordinate(destination.latitude, destination.longitude)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_COORDINATES',
        message: 'Destination latitude (-90 to 90) and longitude (-180 to 180) are required.',
      },
    });
  }

  const result = await routeService.computeRoute({
    origin,
    destination,
    intermediateWaypoints,
  });

  return res.json({
    success: true,
    data: result,
  });
});
