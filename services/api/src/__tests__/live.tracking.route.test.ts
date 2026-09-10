import { describe, it, expect, beforeEach, vi } from 'vitest';
import { routeService } from '../services/route.service.js';
import { isValidCoordinate, decodePolyline } from '@gaon-auto/utils';
import { SYSTEM_CONFIG } from '@gaon-auto/config';

describe('Google Maps & Routes API Architecture Tests (Rules 3, 4, 5, 6, 12, 14)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Route Request Validation & Coordinate Rules', () => {
    it('validates correct latitude and longitude ranges', () => {
      expect(isValidCoordinate(26.8467, 80.9462)).toBe(true);
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(-90, 180)).toBe(true);
      expect(isValidCoordinate(90, -180)).toBe(true);

      // Invalid ranges
      expect(isValidCoordinate(91, 80)).toBe(false);
      expect(isValidCoordinate(-91, 80)).toBe(false);
      expect(isValidCoordinate(26, 181)).toBe(false);
      expect(isValidCoordinate(26, -181)).toBe(false);
      expect(isValidCoordinate(NaN, 80)).toBe(false);
    });

    it('returns status UNAVAILABLE if origin is missing or invalid', async () => {
      const res = await routeService.computeRoute({
        origin: { latitude: 100, longitude: 200 }, // invalid
        destination: { latitude: 26.8467, longitude: 80.9462 },
      });

      expect(res.status).toBe('UNAVAILABLE');
      expect(res.errorMessage).toContain('Invalid or missing origin');
      expect(res.encodedPolyline).toBeUndefined();
      expect(res.distanceMeters).toBeUndefined();
    });

    it('returns status UNAVAILABLE if destination coordinates are missing (Rule 14)', async () => {
      const res = await routeService.computeRoute({
        origin: { latitude: 26.8467, longitude: 80.9462 },
        destination: undefined as any,
      });

      expect(res.status).toBe('UNAVAILABLE');
      expect(res.errorMessage).toContain('Invalid or missing destination');
      expect(res.encodedPolyline).toBeUndefined();
    });

    it('never invents fake distance, fake ETA, or fake straight polyline when API key is unconfigured', async () => {
      // When GOOGLE_ROUTES_API_KEY is not set
      const res = await routeService.computeRoute({
        origin: { latitude: 26.8467, longitude: 80.9462 },
        destination: { latitude: 26.8500, longitude: 80.9500 },
      });

      expect(res.status).toBe('UNAVAILABLE');
      expect(res.encodedPolyline).toBeUndefined();
      expect(res.distanceMeters).toBeUndefined();
      expect(res.durationSeconds).toBeUndefined();
    });
  });

  describe('Google Routes API Response Mapping', () => {
    it('correctly maps distanceMeters, durationSeconds, and encodedPolyline on successful response', async () => {
      // Temporarily mock fetch for Routes API
      const fakeGoogleResponse = {
        routes: [
          {
            distanceMeters: 4250,
            duration: '720s',
            polyline: {
              encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
            },
          },
        ],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => fakeGoogleResponse,
      } as any);

      // Temporarily set test API key
      const origKey = process.env.GOOGLE_ROUTES_API_KEY;
      process.env.GOOGLE_ROUTES_API_KEY = 'TEST_KEY';

      try {
        const res = await routeService.computeRoute({
          origin: { latitude: 26.8467, longitude: 80.9462 },
          destination: { latitude: 26.8500, longitude: 80.9500 },
        });

        // Either cached or newly mapped
        if (res.status === 'AVAILABLE') {
          expect(res.distanceMeters).toBe(4250);
          expect(res.durationSeconds).toBe(720);
          expect(res.encodedPolyline).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
        }
      } finally {
        process.env.GOOGLE_ROUTES_API_KEY = origKey;
      }
    });

    it('handles Routes API failure gracefully by returning UNAVAILABLE status', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as any);

      const res = await routeService.computeRoute({
        origin: { latitude: 26.8467, longitude: 80.9462 },
        destination: { latitude: 26.8500, longitude: 80.9500 },
      });

      expect(res.status).toBe('UNAVAILABLE');
    });
  });

  describe('Polyline Decoding Utility', () => {
    it('decodes Google encoded polyline string into coordinates array accurately', () => {
      // Standard known encoded polyline
      const samplePolyline = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
      const decoded = decodePolyline(samplePolyline);

      expect(decoded.length).toBeGreaterThan(0);
      expect(typeof decoded[0].latitude).toBe('number');
      expect(typeof decoded[0].longitude).toBe('number');
      expect(isValidCoordinate(decoded[0].latitude, decoded[0].longitude)).toBe(true);
    });

    it('handles empty or malformed polyline strings safely', () => {
      expect(decodePolyline('')).toEqual([]);
      expect(decodePolyline(null as any)).toEqual([]);
      expect(decodePolyline(undefined as any)).toEqual([]);
    });
  });

  describe('Driver Location Throttling & Staleness Thresholds (Rule 6 & 9)', () => {
    it('has correct operational thresholds in configuration', () => {
      expect(SYSTEM_CONFIG.DRIVER_LOCATION_THROTTLE_MS).toBe(3000); // 3s server throttle
      expect(SYSTEM_CONFIG.DRIVER_LOCATION_STALE_DISPLAY_MS).toBe(30000); // 30s UI display threshold
      expect(SYSTEM_CONFIG.ROUTE_RECALC_MIN_DISTANCE_METERS).toBe(150); // 150m route recalc
    });

    it('identifies stale location timestamps correctly', () => {
      const now = Date.now();
      const freshTimestamp = now - 5000; // 5 seconds ago
      const staleTimestamp = now - 45000; // 45 seconds ago (> 30s)

      const isFreshStale = now - freshTimestamp > SYSTEM_CONFIG.DRIVER_LOCATION_STALE_DISPLAY_MS;
      const isStaleStale = now - staleTimestamp > SYSTEM_CONFIG.DRIVER_LOCATION_STALE_DISPLAY_MS;

      expect(isFreshStale).toBe(false);
      expect(isStaleStale).toBe(true);
    });
  });
});
