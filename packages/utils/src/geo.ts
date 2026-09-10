/**
 * Geospatial utilities for distance calculations and bounding boxes.
 */

const EARTH_RADIUS_METERS = 6371000; // Earth radius in meters

export function toRadians(degrees: number): number {
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
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return Number((calculateDistanceMeters(lat1, lon1, lat2, lon2) / 1000).toFixed(2));
}

/**
 * Validates latitude and longitude ranges.
 */
export function isValidCoordinate(latitude: number, longitude: number): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * Approximates travel time in minutes based on rural/semi-urban auto-rickshaw speeds (avg 25 km/h)
 * plus pickup buffer.
 */
export function estimateEtaMinutes(distanceMeters: number, bufferMinutes = 2): number {
  const distanceKm = distanceMeters / 1000;
  const avgSpeedKmh = 25; // 25 km/h typical in village/town roads
  const travelMinutes = Math.ceil((distanceKm / avgSpeedKmh) * 60);
  return Math.max(1, travelMinutes + bufferMinutes);
}

/**
 * Formats distance nicely (e.g. "450 m" or "3.4 km").
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

/**
 * Decodes a Google Encoded Polyline string into an array of latitude/longitude coordinates.
 * Follows Google's Polyline Algorithm Format.
 */
export function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
  if (!encoded || typeof encoded !== 'string') {
    return [];
  }

  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  try {
    while (index < len) {
      let b: number;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < len);

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < len);

      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: Number((lat / 1e5).toFixed(6)),
        longitude: Number((lng / 1e5).toFixed(6)),
      });
    }
  } catch {
    return [];
  }

  return points;
}
