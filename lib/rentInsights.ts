import { LatLng, Property } from "@/types/post";
import { haversineDistanceKm } from "@/lib/geo";

export interface PriceRange {
  min: number;
  max: number;
}

// Default search radius for "nearby" average rent — matches the 3km ask.
export const NEARBY_RADIUS_KM = 3;

/**
 * avg_rent = total_rent / number_of_listings, over "Rent" posts within
 * `radiusKm` of `center` (Haversine great-circle distance — see
 * lib/geo.ts). `properties` is expected to already reflect whatever
 * type/budget filters are active; this only adds the distance constraint
 * on top, it doesn't replace those filters. Pure function, out of the UI,
 * so it's cheap to memoize and easy to reuse or test.
 */
export function calculateNearbyAverageRent(
  center: LatLng | null,
  properties: Property[],
  radiusKm: number = NEARBY_RADIUS_KM
): number | null {
  if (!center) return null;

  const nearbyRentPosts = properties.filter(
    (p) =>
      p.type === "Rent" &&
      haversineDistanceKm(center, { lat: p.latitude, lng: p.longitude }) <= radiusKm
  );
  if (nearbyRentPosts.length === 0) return null;

  const totalRent = nearbyRentPosts.reduce((sum, p) => sum + p.price, 0);
  return Math.round(totalRent / nearbyRentPosts.length);
}

/**
 * Min/max price across visible "Rent Paid" posts — kept as a distinct group
 * from "Rent" posts, since a settled rent and an asking rent mean different
 * things.
 */
export function calculateRentPaidRange(properties: Property[]): PriceRange | null {
  const rentPaidPosts = properties.filter((p) => p.type === "Rent Paid");
  if (rentPaidPosts.length === 0) return null;

  const prices = rentPaidPosts.map((p) => p.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
