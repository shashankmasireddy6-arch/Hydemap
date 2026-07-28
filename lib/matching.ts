import { Property } from "@/types/post";
import { haversineDistanceKm } from "@/lib/geo";

// How far above the requirement's stated budget a Rent post can still
// count as "within budget". A little flexibility reflects how people
// actually search (a listing 10% over budget is still worth seeing)
// rather than a hard cutoff at the exact number.
export const BUDGET_TOLERANCE = 0.15; // +15%

// How close (in km) a Rent post needs to be to the requirement's pinned
// location to count as "nearby".
export const MATCH_RADIUS_KM = 5;

export interface PropertyMatch extends Property {
  distanceKm: number;
}

export interface MatchResult {
  requirement: Property;
  matches: PropertyMatch[];
}

/**
 * Finds "Rent" posts that are within budget and nearby a "Requirement"
 * post's location, nearest first. Pure function so it's easy to reuse
 * (e.g. re-run when new posts come in) or test.
 */
export function findMatchingRentPosts(requirement: Property, posts: Property[]): MatchResult {
  const maxPrice = requirement.price * (1 + BUDGET_TOLERANCE);

  const matches: PropertyMatch[] = posts
    .filter((post) => post.type === "Rent" && post.id !== requirement.id)
    .filter((post) => post.price <= maxPrice)
    .map((post) => ({
      ...post,
      distanceKm: haversineDistanceKm(
        { lat: requirement.latitude, lng: requirement.longitude },
        { lat: post.latitude, lng: post.longitude }
      ),
    }))
    .filter((post) => post.distanceKm <= MATCH_RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return { requirement, matches };
}
