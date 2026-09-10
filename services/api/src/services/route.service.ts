import { ENV } from '../config/env.js';
import { RouteComputeRequest, RouteComputeResponse } from '@gaon-auto/types';
import { isValidCoordinate, decodePolyline } from '@gaon-auto/utils';
import { SYSTEM_CONFIG } from '@gaon-auto/config';

interface CacheEntry {
  response: RouteComputeResponse;
  expiresAt: number;
}

export class RouteService {
  private cache = new Map<string, CacheEntry>();

  private getCacheKey(req: RouteComputeRequest): string {
    const o = `${req.origin.latitude.toFixed(4)},${req.origin.longitude.toFixed(4)}`;
    const d = `${req.destination.latitude.toFixed(4)},${req.destination.longitude.toFixed(4)}`;
    return `${o}->${d}`;
  }

  /**
   * Computes road route via OpenRouteService Directions API (v2/directions/driving-car).
   * Architecture: Mobile -> Fast Arrival Backend -> OpenRouteService -> Backend -> Mobile
   * If OpenRouteService is unconfigured or fails, returns status: UNAVAILABLE.
   * NEVER generates fake coordinates, fake straight lines, or fake ETA.
   */
  async computeRoute(request: RouteComputeRequest): Promise<RouteComputeResponse> {
    const { origin, destination, intermediateWaypoints } = request;

    // Validate coordinates
    if (!origin || !isValidCoordinate(origin.latitude, origin.longitude)) {
      return {
        status: 'UNAVAILABLE',
        errorMessage: 'Invalid or missing origin coordinates',
      };
    }

    if (!destination || !isValidCoordinate(destination.latitude, destination.longitude)) {
      return {
        status: 'UNAVAILABLE',
        errorMessage: 'Invalid or missing destination coordinates',
      };
    }

    // Check cache
    const cacheKey = this.getCacheKey(request);
    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.response;
    }

    // Check if OpenRouteService API key is configured (Step 5)
    const apiKey = ENV.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      const unavailableResponse: RouteComputeResponse = {
        status: 'UNAVAILABLE',
        errorMessage: 'OpenRouteService API key is not configured on server',
      };
      return unavailableResponse;
    }

    try {
      // OpenRouteService expects coordinates as [longitude, latitude]
      const coordinates: number[][] = [
        [origin.longitude, origin.latitude],
      ];

      if (intermediateWaypoints && intermediateWaypoints.length > 0) {
        for (const wp of intermediateWaypoints) {
          if (isValidCoordinate(wp.latitude, wp.longitude)) {
            coordinates.push([wp.longitude, wp.latitude]);
          }
        }
      }

      coordinates.push([destination.longitude, destination.latitude]);

      const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey,
        },
        body: JSON.stringify({
          coordinates,
          instructions: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(`[RouteService] OpenRouteService API returned ${response.status}:`, errorText);
        return {
          status: 'UNAVAILABLE',
          errorMessage: `OpenRouteService returned status ${response.status}`,
        };
      }

      const data = (await response.json()) as any;
      const route = data?.routes?.[0];

      if (!route || !route.summary) {
        return {
          status: 'UNAVAILABLE',
          errorMessage: 'No road route found between specified points',
        };
      }

      const distanceMeters =
        typeof route.summary.distance === 'number'
          ? Math.round(route.summary.distance)
          : undefined;

      const durationSeconds =
        typeof route.summary.duration === 'number'
          ? Math.round(route.summary.duration)
          : undefined;

      const encodedPolyline =
        typeof route.geometry === 'string' ? route.geometry : undefined;

      const coords = encodedPolyline ? decodePolyline(encodedPolyline) : undefined;

      const routeResult: RouteComputeResponse = {
        status: 'AVAILABLE',
        distanceMeters,
        durationSeconds,
        encodedPolyline,
        coordinates: coords,
      };

      // Store in short-lived memory cache
      this.cache.set(cacheKey, {
        response: routeResult,
        expiresAt: now + (SYSTEM_CONFIG.ROUTE_CACHE_TTL_MS || 60000),
      });

      // Cleanup cache if size exceeds 500
      if (this.cache.size > 500) {
        for (const [k, v] of this.cache.entries()) {
          if (v.expiresAt <= now) {
            this.cache.delete(k);
          }
        }
      }

      return routeResult;
    } catch (err: any) {
      console.warn('[RouteService] Failed to compute route:', err.message);
      return {
        status: 'UNAVAILABLE',
        errorMessage: err.message || 'Route service error',
      };
    }
  }
}

export const routeService = new RouteService();
