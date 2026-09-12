import { ENV } from '../config/env.js';
import { LocalPlaceModel, DriverLocationModel, DriverProfileModel, OperatingAreaModel } from '../models/index.js';
import { calculateDistanceMeters } from '@gaon-auto/utils';

export interface NearbyDriverMatch {
  driverId: string;
  userId: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  ratingAverage: number;
  totalTrips: number;
}

export class LocationService {
  /**
   * Searches for local places and landmarks (villages, markets, temples, bus stands)
   * supporting both Hindi and English aliases.
   */
  async searchPlaces(query: string, userLat?: number, userLng?: number, limit = 15) {
    const trimmed = query.trim();
    if (!trimmed) {
      return this.getPopularPlaces(undefined, limit);
    }

    const regex = new RegExp(trimmed, 'i');
    const filter = {
      $or: [
        { nameEn: { $regex: regex } },
        { nameHi: { $regex: regex } },
        { aliases: { $regex: regex } },
        { district: { $regex: regex } },
        { tehsil: { $regex: regex } },
      ],
    };

    let places: any[] = await LocalPlaceModel.find(filter).limit(limit).lean();

    // Step 7: Rural Location Search - LocalPlace DB first, external geocoding as fallback ONLY
    if (places.length === 0 && ENV.OPENROUTESERVICE_API_KEY) {
      try {
        const url = `https://api.openrouteservice.org/geocode/search?api_key=${encodeURIComponent(
          ENV.OPENROUTESERVICE_API_KEY
        )}&text=${encodeURIComponent(trimmed)}&boundary.country=IND&size=${limit}`;

        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          if (data && Array.isArray(data.features)) {
            places = data.features.map((f: any, idx: number) => ({
              _id: `ors_${f.properties?.id || idx}`,
              nameEn: f.properties?.name || f.properties?.label || trimmed,
              nameHi: f.properties?.name || f.properties?.label || trimmed,
              placeType: 'OTHER',
              district: f.properties?.county || f.properties?.region || '',
              tehsil: f.properties?.locality || '',
              location: {
                type: 'Point',
                coordinates: [f.geometry.coordinates[0], f.geometry.coordinates[1]],
              },
              isVerified: false,
              source: 'OPENROUTESERVICE_FALLBACK',
            }));
          }
        }
      } catch (err: any) {
        console.warn('[LocationService] OpenRouteService geocoding fallback failed:', err.message);
      }
    }

    // If user coordinates are provided, compute distance and sort
    if (userLat !== undefined && userLng !== undefined) {
      return places
        .map((p) => {
          const [lng, lat] = p.location.coordinates;
          const dist = calculateDistanceMeters(userLat, userLng, lat, lng);
          return { ...p, distanceMeters: dist };
        })
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
    }

    return places;
  }

  /**
   * Retrieves popular places in a district (or globally popular).
   */
  async getPopularPlaces(district?: string, limit = 10) {
    const filter: any = {};
    if (district) {
      filter.district = new RegExp(district, 'i');
    }
    return LocalPlaceModel.find(filter).sort({ popularRank: -1 }).limit(limit).lean();
  }

  /**
   * Performs expanding radius geospatial search for online, approved, and available drivers.
   */
  async findNearbyEligibleDrivers(
    pickupLat: number,
    pickupLng: number,
    initialRadiusKm = ENV.INITIAL_SEARCH_RADIUS_KM,
    maxRadiusKm = ENV.MAX_SEARCH_RADIUS_KM,
    expansionStepKm = ENV.RADIUS_EXPANSION_STEP_KM,
    maxDrivers = ENV.MAX_DRIVERS_CONTACTED_PER_RIDE
  ): Promise<{ drivers: NearbyDriverMatch[]; radiusUsedKm: number }> {
    let currentRadiusKm = initialRadiusKm;
    const staleThreshold = new Date(Date.now() - 600000); // 10 minutes staleness for stationary drivers waiting at stands

    while (currentRadiusKm <= maxRadiusKm) {
      const radiusInRadians = currentRadiusKm / 6371; // Earth radius in km

      // Geospatial query using MongoDB $centerSphere on 2dsphere index
      const candidateLocations = await DriverLocationModel.find({
        isOnline: true,
        availabilityStatus: 'AVAILABLE',
        updatedAt: { $gte: staleThreshold },
        location: {
          $geoWithin: {
            $centerSphere: [[pickupLng, pickupLat], radiusInRadians],
          },
        },
      }).lean();

      if (candidateLocations.length > 0) {
        const driverIds = candidateLocations.map((loc) => loc.driverId);

        // Verify driver profiles are approved
        const approvedDrivers = await DriverProfileModel.find({
          _id: { $in: driverIds },
          verificationStatus: 'APPROVED',
          isOnline: true,
          availabilityStatus: 'AVAILABLE',
        }).lean();

        const approvedDriverMap = new Map(approvedDrivers.map((d) => [d._id.toString(), d]));

        const matched: NearbyDriverMatch[] = [];
        for (const loc of candidateLocations) {
          const profile = approvedDriverMap.get(loc.driverId.toString());
          if (profile) {
            const [lng, lat] = loc.location.coordinates;
            const dist = calculateDistanceMeters(pickupLat, pickupLng, lat, lng);
            matched.push({
              driverId: profile._id.toString(),
              userId: profile.userId.toString(),
              latitude: lat,
              longitude: lng,
              distanceMeters: dist,
              ratingAverage: profile.ratingAverage,
              totalTrips: profile.completedTrips,
            });
          }
        }

        if (matched.length > 0) {
          // Sort by closest distance and limit to maxDrivers
          matched.sort((a, b) => a.distanceMeters - b.distanceMeters);
          return {
            drivers: matched.slice(0, maxDrivers),
            radiusUsedKm: currentRadiusKm,
          };
        }
      }

      currentRadiusKm += expansionStepKm;
    }

    return { drivers: [], radiusUsedKm: initialRadiusKm };
  }
}

export const locationService = new LocationService();
