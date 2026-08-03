import { ClusterResult, MapBounds } from "@/types/cluster";
import { PostType, RECURRING_TYPES } from "@/types/post";

export type ClusterTier = "cluster" | "price-range" | "listing";

// The three zoom bands from the spec: zoomed out shows coarse count
// bubbles, mid zoom shows price-range pills (still grouped, but with
// enough screen space to be worth showing rent info), zoomed in shows
// every listing as its own detailed chip.
export function getClusterTier(zoom: number): ClusterTier {
  if (zoom <= 10) return "cluster";
  if (zoom <= 15) return "price-range";
  return "listing";
}

// Grid cell size in degrees for bucketing *within* a tier — shrinks as you
// zoom in so clusters/price-range groups stay a reasonable on-screen size,
// bottoming out at "listing" (0 = no bucketing, every point is its own
// marker). ~0.01° is roughly 1.1km at this app's latitude (111km/degree
// for lat, ~106km/degree for lng at Hyderabad's ~17.4°N — close enough to
// treat as one number, same approximation the original version used).
//
// One step per zoom level within the "price-range" tier (11-15), not just
// two bands covering the whole range — an earlier version used a single
// ~6.6km cell for 11-13 and a single ~3.9km cell for 14-15, so zooming in
// *within* either range (e.g. 14 -> 15) visibly did nothing: groups that
// looked clustered stayed exactly as clustered, since the cell size
// hadn't changed at all. Every zoom level now gets its own smaller cell.
//
// The cell at zoom 15 (the tier's most-zoomed-in edge, right before
// "listing" takes over and stops bucketing entirely) shrinks all the way
// to ~2km rather than stopping around ~3.5-4km — found by testing against
// this app's actual data, which has a dense pocket of ~13 listings inside
// a ~2-3km radius near central Hyderabad. A ~3.5-4km cell is *bigger*
// than that whole pocket, so no amount of zooming within the price-range
// tier could ever separate them — every zoom level from 11 to 15 kept
// producing the same grouping, which read as "stuck clustering that
// doesn't respond to zoom" even though the cell size genuinely was
// shrinking. A ~2km cell at zoom 15 is finer than that pocket's spread,
// so it now visibly keeps breaking up right up to the individual-listing
// cutover (zoom > 15, viewport ≲ 3-5km).
export function getGridSize(zoom: number): number {
  if (getClusterTier(zoom) === "listing") return 0;
  if (zoom <= 8) return 0.2; // ~22km — cluster tier, city/large-area view
  if (zoom <= 10) return 0.12; // ~13km — cluster tier
  if (zoom <= 11) return 0.08; // ~8.8km — price-range tier, city-wide default view
  if (zoom <= 12) return 0.055; // ~6.1km
  if (zoom <= 13) return 0.038; // ~4.2km
  if (zoom <= 14) return 0.026; // ~2.9km
  return 0.018; // 15, ~2km — price-range tier's most-zoomed-in edge
}

export interface ClusterableItem {
  id: string;
  lat: number;
  lng: number;
  rent: number;
  type: PostType;
}

/**
 * Buckets items into a lat/lng grid and aggregates each bucket into a
 * ClusterPoint or PriceRangePoint (depending on `tier`) — or, for a bucket
 * with exactly one item in the "price-range"/"listing" tiers, a
 * ListingPoint instead: a single isolated point renders as a normal chip
 * rather than a "price-range of 1", which reads better and is what most
 * clustering UIs (Google's own MarkerClusterer included) do at a
 * moderate zoom. The "cluster" tier is the one exception — at city/
 * region scale, a full detailed price/BHK chip next to a field of tiny
 * count bubbles reads as visually inconsistent clutter (confirmed by
 * screenshot), so a lone listing there still renders as a small "1"
 * bubble matching its neighbors' style instead.
 *
 * This is the JS equivalent of the spec's SQL GROUP BY aggregation —
 * Firestore has no GROUP BY, so the same grid-bucket-and-aggregate logic
 * that would run as a SQL query against Postgres runs here instead, over
 * documents already fetched from Firestore (see app/api/clusters).
 */
export function clusterItems(
  items: ClusterableItem[],
  gridSize: number,
  tier: ClusterTier
): ClusterResult[] {
  // gridSize === 0 is the "listing" tier — every item is its own listing,
  // no bucketing at all.
  if (gridSize <= 0) {
    return items.map((item) => ({ type: "listing", lat: item.lat, lng: item.lng, id: item.id }));
  }

  const buckets = new Map<
    string,
    { latSum: number; lngSum: number; minRent: number; maxRent: number; items: ClusterableItem[] }
  >();

  for (const item of items) {
    // FLOOR(lat / gridSize), FLOOR(lng / gridSize) — identical to the
    // spec's SQL bucket keys. The "price-range" tier additionally splits
    // by whether `rent` is a recurring monthly figure (Rent/Sharing/Rent
    // Paid) or a one-time Sale price — grouping those together produced
    // misleading ranges like "₹11,000 – ₹20.0L" (a monthly rent mixed
    // with a lump-sum sale price). The "cluster" tier only ever shows a
    // bare count, never a price, so it's intentionally *not* split this
    // way — doing so would just fragment bubbles at low zoom for no
    // visible benefit, since no price is displayed there at all.
    const latBucket = Math.floor(item.lat / gridSize);
    const lngBucket = Math.floor(item.lng / gridSize);
    const priceCategory = RECURRING_TYPES.includes(item.type) ? "recurring" : "one-time";
    const key =
      tier === "price-range" ? `${latBucket}:${lngBucket}:${priceCategory}` : `${latBucket}:${lngBucket}`;

    const bucket = buckets.get(key) ?? {
      latSum: 0,
      lngSum: 0,
      minRent: Infinity,
      maxRent: -Infinity,
      items: [],
    };
    bucket.latSum += item.lat;
    bucket.lngSum += item.lng;
    bucket.minRent = Math.min(bucket.minRent, item.rent);
    bucket.maxRent = Math.max(bucket.maxRent, item.rent);
    bucket.items.push(item);
    buckets.set(key, bucket);
  }

  const results: ClusterResult[] = [];
  for (const bucket of buckets.values()) {
    if (bucket.items.length === 1) {
      const only = bucket.items[0];
      if (tier === "cluster") {
        results.push({ type: "cluster", lat: only.lat, lng: only.lng, count: 1 });
      } else {
        results.push({ type: "listing", lat: only.lat, lng: only.lng, id: only.id });
      }
      continue;
    }

    const lat = bucket.latSum / bucket.items.length; // AVG(lat) — same as the spec's SQL
    const lng = bucket.lngSum / bucket.items.length; // AVG(lng)
    const count = bucket.items.length;

    results.push(
      tier === "price-range"
        ? { type: "price-range", lat, lng, count, minRent: bucket.minRent, maxRent: bucket.maxRent }
        : { type: "cluster", lat, lng, count }
    );
  }
  return results;
}

export function isWithinBounds(item: ClusterableItem, bounds: MapBounds): boolean {
  return (
    item.lat >= bounds.south &&
    item.lat <= bounds.north &&
    item.lng >= bounds.west &&
    item.lng <= bounds.east
  );
}
