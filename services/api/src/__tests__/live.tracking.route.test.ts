import { describe, it, expect, beforeEach, vi } from 'vitest';
import { routeService } from '../services/route.service.js';
import { ENV } from '../config/env.js';
import { isValidCoordinate, decodePolyline } from '@gaon-auto/utils';
import { SYSTEM_CONFIG } from '@gaon-auto/config';
import { locationService } from '../services/location.service.js';
import { LocalPlaceModel } from '../models/index.js';

describe('OpenRouteService & MapLibre Architecture Tests (Free / Open-Source Stack)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Route Request Validation & Coordinate Rules (Steps 5, 10)', () => {
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

    it('returns status UNAVAILABLE if destination coordinates are missing (Step 10)', async () => {
      const res = await routeService.computeRoute({
        origin: { latitude: 26.8467, longitude: 80.9462 },
        destination: undefined as any,
      });

      expect(res.status).toBe('UNAVAILABLE');
      expect(res.errorMessage).toContain('Invalid or missing destination');
      expect(res.encodedPolyline).toBeUndefined();
    });

    it('never invents fake distance, fake ETA, or fake straight polyline when API key is unconfigured', async () => {
      const origKey = ENV.OPENROUTESERVICE_API_KEY;
      ENV.OPENROUTESERVICE_API_KEY = '';

      try {
        const res = await routeService.computeRoute({
          origin: { latitude: 26.8467, longitude: 80.9462 },
          destination: { latitude: 26.8500, longitude: 80.9500 },
        });

        expect(res.status).toBe('UNAVAILABLE');
        expect(res.encodedPolyline).toBeUndefined();
        expect(res.distanceMeters).toBeUndefined();
        expect(res.durationSeconds).toBeUndefined();
      } finally {
        ENV.OPENROUTESERVICE_API_KEY = origKey;
      }
    });
  });

  describe('OpenRouteService Response Mapping (Step 5)', () => {
    it('correctly maps distanceMeters, durationSeconds, and encodedPolyline on successful response', async () => {
      const fakeORSResponse = {
        routes: [
          {
            summary: {
              distance: 4250.7,
              duration: 720.2,
            },
            geometry: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
          },
        ],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => fakeORSResponse,
      } as any);

      const origKey = ENV.OPENROUTESERVICE_API_KEY;
      ENV.OPENROUTESERVICE_API_KEY = 'TEST_ORS_KEY';

      try {
        const res = await routeService.computeRoute({
          origin: { latitude: 27.1234, longitude: 81.1234 },
          destination: { latitude: 27.2345, longitude: 81.2345 },
        });

        expect(res.status).toBe('AVAILABLE');
        expect(res.distanceMeters).toBe(4251);
        expect(res.durationSeconds).toBe(720);
        expect(res.encodedPolyline).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
        expect(res.coordinates).toBeDefined();
        expect(res.coordinates!.length).toBeGreaterThan(0);
      } finally {
        ENV.OPENROUTESERVICE_API_KEY = origKey;
      }
    });

    it('handles OpenRouteService API failure gracefully by returning UNAVAILABLE status', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as any);

      const origKey = ENV.OPENROUTESERVICE_API_KEY;
      ENV.OPENROUTESERVICE_API_KEY = 'TEST_ORS_KEY';

      try {
        const res = await routeService.computeRoute({
          origin: { latitude: 26.5000, longitude: 80.5000 },
          destination: { latitude: 26.6000, longitude: 80.6000 },
        });

        expect(res.status).toBe('UNAVAILABLE');
      } finally {
        ENV.OPENROUTESERVICE_API_KEY = origKey;
      }
    });

    it('returns cached response for identical route requests within cache TTL (Step 6)', async () => {
      const fakeORSResponse = {
        routes: [
          {
            summary: { distance: 1500, duration: 300 },
            geometry: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
          },
        ],
      };

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => fakeORSResponse,
      } as any);

      const origKey = ENV.OPENROUTESERVICE_API_KEY;
      ENV.OPENROUTESERVICE_API_KEY = 'TEST_ORS_KEY';

      try {
        const req = {
          origin: { latitude: 26.1111, longitude: 80.2222 },
          destination: { latitude: 26.3333, longitude: 80.4444 },
        };

        const res1 = await routeService.computeRoute(req);
        const res2 = await routeService.computeRoute(req);

        expect(res1.status).toBe('AVAILABLE');
        expect(res2.status).toBe('AVAILABLE');
        // Fetch should only have been called ONCE due to caching
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      } finally {
        ENV.OPENROUTESERVICE_API_KEY = origKey;
      }
    });
  });

  describe('Rural Location Search & Geocoding Fallback (Step 7)', () => {
    it('uses OpenRouteService Pelias fallback only when local database has no matches', async () => {
      // Mock LocalPlaceModel.find to simulate zero local DB matches
      vi.spyOn(LocalPlaceModel, 'find').mockReturnValue({
        limit: () => ({
          lean: async () => [],
        }),
      } as any);

      const fakePeliasResponse = {
        features: [
          {
            properties: {
              id: 'osm:venue:12345',
              name: 'Kanpur Central Railway Station',
              county: 'Kanpur Nagar',
              locality: 'Kanpur',
            },
            geometry: {
              coordinates: [80.3533, 26.4538],
            },
          },
        ],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => fakePeliasResponse,
      } as any);

      const origKey = ENV.OPENROUTESERVICE_API_KEY;
      ENV.OPENROUTESERVICE_API_KEY = 'TEST_ORS_KEY';

      try {
        // Search for a term not in LocalPlace DB
        const results = await locationService.searchPlaces('Unlisted Railway Junction 9999XYZ');
        expect(results.length).toBe(1);
        expect(results[0].source).toBe('OPENROUTESERVICE_FALLBACK');
        expect(results[0].location.coordinates).toEqual([80.3533, 26.4538]);
      } finally {
        ENV.OPENROUTESERVICE_API_KEY = origKey;
      }
    });

    it('returns local database places directly when matches exist without external API call', async () => {
      const mockLocalPlaces = [
        {
          _id: 'lp_123',
          nameEn: 'Shiv Mandir Chaumuhan',
          nameHi: 'शिव मंदिर चौमुहां',
          placeType: 'TEMPLE',
          district: 'Mathura',
          location: { type: 'Point', coordinates: [77.6, 27.6] },
        },
      ];

      vi.spyOn(LocalPlaceModel, 'find').mockReturnValue({
        limit: () => ({
          lean: async () => mockLocalPlaces,
        }),
      } as any);

      const fetchSpy = vi.spyOn(global, 'fetch');

      const results = await locationService.searchPlaces('Shiv Mandir');
      expect(results.length).toBe(1);
      expect(results[0].nameEn).toBe('Shiv Mandir Chaumuhan');
      // Fetch should NEVER be called when local place matches exist
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Polyline Decoding Utility', () => {
    it('decodes encoded polyline string into coordinates array accurately', () => {
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
