import { LatLng } from "@/types/post";

const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance (km) between two lat/lng points. Pure function, no
 * Google Maps dependency, so it's cheap to unit test and reusable anywhere
 * distance matters (nearby-listing filters, "N km away" labels, ...).
 */
export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
