import { METRO_STATIONS } from "@/data/metroLines";

const EARTH_RADIUS_KM = 6371;

// Great-circle distance between two lat/lng points, in km — same
// haversine formula this app used before (see the since-removed
// lib/geo.ts, deleted along with the rent-insights feature that was its
// only caller at the time; recreated here for the "Near Metro" filter's
// genuinely new need for it).
function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Whether a point is within `radiusKm` of *any* metro station —
 * checked against all 56 stations (data/metroLines.ts) rather than just
 * the nearest one on a specific line, since a flat's proximity to the
 * network as a whole is what matters here, not which line serves it.
 * Linear scan over 56 stations is trivial at this app's scale; not worth
 * a spatial index.
 */
export function isNearAnyMetroStation(point: { lat: number; lng: number }, radiusKm: number): boolean {
  return METRO_STATIONS.some(
    (station) => haversineDistanceKm(point, { lat: station.lat, lng: station.lng }) <= radiusKm
  );
}
