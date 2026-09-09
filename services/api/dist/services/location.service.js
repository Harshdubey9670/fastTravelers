"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationService = exports.LocationService = void 0;
const env_js_1 = require("../config/env.js");
const index_js_1 = require("../models/index.js");
const utils_1 = require("@gaon-auto/utils");
class LocationService {
    /**
     * Searches for local places and landmarks (villages, markets, temples, bus stands)
     * supporting both Hindi and English aliases.
     */
    async searchPlaces(query, userLat, userLng, limit = 15) {
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
        const places = await index_js_1.LocalPlaceModel.find(filter).limit(limit).lean();
        // If user coordinates are provided, compute distance and sort
        if (userLat !== undefined && userLng !== undefined) {
            return places
                .map((p) => {
                const [lng, lat] = p.location.coordinates;
                const dist = (0, utils_1.calculateDistanceMeters)(userLat, userLng, lat, lng);
                return { ...p, distanceMeters: dist };
            })
                .sort((a, b) => a.distanceMeters - b.distanceMeters);
        }
        return places;
    }
    /**
     * Retrieves popular places in a district (or globally popular).
     */
    async getPopularPlaces(district, limit = 10) {
        const filter = {};
        if (district) {
            filter.district = new RegExp(district, 'i');
        }
        return index_js_1.LocalPlaceModel.find(filter).sort({ popularRank: -1 }).limit(limit).lean();
    }
    /**
     * Performs expanding radius geospatial search for online, approved, and available drivers.
     */
    async findNearbyEligibleDrivers(pickupLat, pickupLng, initialRadiusKm = env_js_1.ENV.INITIAL_SEARCH_RADIUS_KM, maxRadiusKm = env_js_1.ENV.MAX_SEARCH_RADIUS_KM, expansionStepKm = env_js_1.ENV.RADIUS_EXPANSION_STEP_KM, maxDrivers = env_js_1.ENV.MAX_DRIVERS_CONTACTED_PER_RIDE) {
        let currentRadiusKm = initialRadiusKm;
        const staleThreshold = new Date(Date.now() - 120000); // 2 minutes staleness
        while (currentRadiusKm <= maxRadiusKm) {
            const radiusInRadians = currentRadiusKm / 6371; // Earth radius in km
            // Geospatial query using MongoDB $centerSphere on 2dsphere index
            const candidateLocations = await index_js_1.DriverLocationModel.find({
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
                const approvedDrivers = await index_js_1.DriverProfileModel.find({
                    _id: { $in: driverIds },
                    verificationStatus: 'APPROVED',
                    isOnline: true,
                    availabilityStatus: 'AVAILABLE',
                }).lean();
                const approvedDriverMap = new Map(approvedDrivers.map((d) => [d._id.toString(), d]));
                const matched = [];
                for (const loc of candidateLocations) {
                    const profile = approvedDriverMap.get(loc.driverId.toString());
                    if (profile) {
                        const [lng, lat] = loc.location.coordinates;
                        const dist = (0, utils_1.calculateDistanceMeters)(pickupLat, pickupLng, lat, lng);
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
exports.LocationService = LocationService;
exports.locationService = new LocationService();
//# sourceMappingURL=location.service.js.map