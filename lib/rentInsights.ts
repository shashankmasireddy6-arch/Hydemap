import { Property } from "@/types/post";

export interface PriceRange {
  min: number;
  max: number;
}

/**
 * Average price across visible "Rent" posts. Kept as a pure function, out
 * of the UI, so it's cheap to memoize and easy to reuse or test.
 */
export function calculateAverageRent(properties: Property[]): number | null {
  const rentPosts = properties.filter((p) => p.type === "Rent");
  if (rentPosts.length === 0) return null;

  const total = rentPosts.reduce((sum, p) => sum + p.price, 0);
  return Math.round(total / rentPosts.length);
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
