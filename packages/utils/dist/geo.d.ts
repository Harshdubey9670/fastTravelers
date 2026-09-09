/**
 * Geospatial utilities for distance calculations and bounding boxes.
 */
export declare function toRadians(degrees: number): number;
/**
 * Calculates distance between two coordinates using the Haversine formula.
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in meters
 */
export declare function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number;
export declare function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number;
/**
 * Validates latitude and longitude ranges.
 */
export declare function isValidCoordinate(latitude: number, longitude: number): boolean;
/**
 * Approximates travel time in minutes based on rural/semi-urban auto-rickshaw speeds (avg 25 km/h)
 * plus pickup buffer.
 */
export declare function estimateEtaMinutes(distanceMeters: number, bufferMinutes?: number): number;
/**
 * Formats distance nicely (e.g. "450 m" or "3.4 km").
 */
export declare function formatDistance(distanceMeters: number): string;
//# sourceMappingURL=geo.d.ts.map