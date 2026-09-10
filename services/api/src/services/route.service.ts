import { ENV } from '../config/env.js';
import { RouteComputeRequest, RouteComputeResponse } from '@gaon-auto/types';
import { isValidCoordinate } from '@gaon-auto/utils';
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
   * Computes road route via Google Routes API (ComputeRoutes).
   * Strictly requests only distanceMeters, duration, and polyline.encodedPolyline.
   * If Google Routes API is unconfigured or fails, returns status: UNAVAILABLE.
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

    // Check if Google Routes API key is configured
    const apiKey = ENV.GOOGLE_ROUTES_API_KEY;
    if (!apiKey) {
      const unavailableResponse: RouteComputeResponse = {
        status: 'UNAVAILABLE',
        errorMessage: 'Google Routes API key is not configured on server',
      };
      return unavailableResponse;
    }

    try {
      const payload: any = {
        origin: {
          location: {
            latLng: {
              latitude: origin.latitude,
              longitude: origin.longitude,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.latitude,
              longitude: destination.longitude,
            },
          },
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      };

      if (intermediateWaypoints && intermediateWaypoints.length > 0) {
        payload.intermediates = intermediateWaypoints
          .filter((w) => isValidCoordinate(w.latitude, w.longitude))
          .map((w) => ({
            location: {
              latLng: {
                latitude: w.latitude,
                longitude: w.longitude,
              },
            },
          }));
      }

      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(`[RouteService] Google Routes API returned ${response.status}:`, errorText);
        return {
          status: 'UNAVAILABLE',
          errorMessage: `Routes API returned status ${response.status}`,
        };
      }

      const data = (await response.json()) as any;
      const route = data?.routes?.[0];

      if (!route || !route.polyline?.encodedPolyline) {
        return {
          status: 'UNAVAILABLE',
          errorMessage: 'No road route found between specified points',
        };
      }

      // Parse duration: Google returns string like "540s"
      let durationSeconds: number | undefined;
      if (typeof route.duration === 'string') {
        const parsed = parseInt(route.duration.replace(/s$/i, ''), 10);
        if (!isNaN(parsed)) {
          durationSeconds = parsed;
        }
      }

      const routeResult: RouteComputeResponse = {
        status: 'AVAILABLE',
        distanceMeters: typeof route.distanceMeters === 'number' ? route.distanceMeters : undefined,
        durationSeconds,
        encodedPolyline: route.polyline.encodedPolyline,
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
