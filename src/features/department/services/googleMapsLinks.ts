/**
 * AWAAZ-E-AWAM — GOOGLE MAPS UNIVERSAL LINK BUILDER & GEOLOCATION UTILITIES
 * 
 * Free Google Maps integration using official universal web and mobile URL schemes.
 * Cost: $0.00. Requires zero Google Maps Platform API keys or billing accounts.
 *
 * URLs:
 * - Search / View: https://www.google.com/maps/search/?api=1&query=LAT,LNG
 * - Directions:    https://www.google.com/maps/dir/?api=1&destination=LAT,LNG
 * 
 * Complies with strict coordinate bounds (-90 to 90 lat, -180 to 180 lng).
 * Explicitly treats 0 as a valid coordinate.
 */

/**
 * Validates latitude and longitude coordinates strictly.
 * - Must be finite numbers
 * - Latitude: -90 <= lat <= 90
 * - Longitude: -180 <= lng <= 180
 * - 0 is a strictly valid coordinate
 */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }
  if (lat < -90 || lat > 90) {
    return false;
  }
  if (lng < -180 || lng > 180) {
    return false;
  }
  return true;
}

/**
 * Builds an official, free Google Maps search URL to view a location pin.
 * Prefers exact validated coordinates. Falls back to text address if coordinates are invalid or missing.
 * Returns null if neither valid coordinates nor an address is available.
 */
export function buildGoogleMapsSearchUrl(
  lat?: number | null,
  lng?: number | null,
  address?: string | null
): string | null {
  if (isValidCoordinate(lat, lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  }
  if (address && typeof address === 'string' && address.trim().length > 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
  }
  return null;
}

/**
 * Builds an official, free Google Maps directions URL.
 * Omitting the origin parameter causes Google Maps to automatically use the officer's current GPS location.
 * Prefers exact validated coordinates. Falls back to text address if coordinates are invalid or missing.
 * Returns null if neither valid coordinates nor an address is available.
 */
export function buildGoogleMapsDirectionsUrl(
  lat?: number | null,
  lng?: number | null,
  address?: string | null
): string | null {
  if (isValidCoordinate(lat, lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
  }
  if (address && typeof address === 'string' && address.trim().length > 0) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address.trim())}`;
  }
  return null;
}

/**
 * Calculates the great-circle distance between two GPS coordinates using the Haversine formula in metres.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}
