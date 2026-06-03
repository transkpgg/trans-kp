/**
 * Geofence utility — Haversine Formula
 * Menghitung jarak antara dua titik koordinat GPS
 */

const EARTH_RADIUS_METERS = 6371000; // Radius bumi dalam meter

/**
 * Konversi derajat ke radian
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Haversine Formula
 * Menghitung jarak antara dua titik koordinat dalam meter
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Check apakah user berada dalam radius geofence
 */
export function isWithinGeofence(
  userLat: number,
  userLng: number,
  branchLat: number,
  branchLng: number,
  radiusMeters: number
): { isWithin: boolean; distanceMeters: number } {
  const distance = calculateDistance(userLat, userLng, branchLat, branchLng);
  return {
    isWithin: distance <= radiusMeters,
    distanceMeters: Math.round(distance),
  };
}

/**
 * Format jarak untuk display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} meter`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
