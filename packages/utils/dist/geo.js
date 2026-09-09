"use strict";
/**
 * Geospatial utilities for distance calculations and bounding boxes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRadians = toRadians;
exports.calculateDistanceMeters = calculateDistanceMeters;
exports.calculateDistanceKm = calculateDistanceKm;
exports.isValidCoordinate = isValidCoordinate;
exports.estimateEtaMinutes = estimateEtaMinutes;
exports.formatDistance = formatDistance;
const EARTH_RADIUS_METERS = 6371000; // Earth radius in meters
function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}
/**
 * Calculates distance between two coordinates using the Haversine formula.
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in meters
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(EARTH_RADIUS_METERS * c);
}
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    return Number((calculateDistanceMeters(lat1, lon1, lat2, lon2) / 1000).toFixed(2));
}
/**
 * Validates latitude and longitude ranges.
 */
function isValidCoordinate(latitude, longitude) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number')
        return false;
    if (isNaN(latitude) || isNaN(longitude))
        return false;
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}
/**
 * Approximates travel time in minutes based on rural/semi-urban auto-rickshaw speeds (avg 25 km/h)
 * plus pickup buffer.
 */
function estimateEtaMinutes(distanceMeters, bufferMinutes = 2) {
    const distanceKm = distanceMeters / 1000;
    const avgSpeedKmh = 25; // 25 km/h typical in village/town roads
    const travelMinutes = Math.ceil((distanceKm / avgSpeedKmh) * 60);
    return Math.max(1, travelMinutes + bufferMinutes);
}
/**
 * Formats distance nicely (e.g. "450 m" or "3.4 km").
 */
function formatDistance(distanceMeters) {
    if (distanceMeters < 1000) {
        return `${distanceMeters} m`;
    }
    return `${(distanceMeters / 1000).toFixed(1)} km`;
}
//# sourceMappingURL=geo.js.map