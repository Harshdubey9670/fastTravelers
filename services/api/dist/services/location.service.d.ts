export interface NearbyDriverMatch {
    driverId: string;
    userId: string;
    latitude: number;
    longitude: number;
    distanceMeters: number;
    ratingAverage: number;
    totalTrips: number;
}
export declare class LocationService {
    /**
     * Searches for local places and landmarks (villages, markets, temples, bus stands)
     * supporting both Hindi and English aliases.
     */
    searchPlaces(query: string, userLat?: number, userLng?: number, limit?: number): Promise<(import("mongoose").FlattenMaps<import("../models/LocalPlace.js").LocalPlaceDoc> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    /**
     * Retrieves popular places in a district (or globally popular).
     */
    getPopularPlaces(district?: string, limit?: number): Promise<(import("mongoose").FlattenMaps<import("../models/LocalPlace.js").LocalPlaceDoc> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    /**
     * Performs expanding radius geospatial search for online, approved, and available drivers.
     */
    findNearbyEligibleDrivers(pickupLat: number, pickupLng: number, initialRadiusKm?: number, maxRadiusKm?: number, expansionStepKm?: number, maxDrivers?: number): Promise<{
        drivers: NearbyDriverMatch[];
        radiusUsedKm: number;
    }>;
}
export declare const locationService: LocationService;
//# sourceMappingURL=location.service.d.ts.map