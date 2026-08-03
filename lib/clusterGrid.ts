import { ClusterResult, MapBounds } from "@/types/cluster";

// Same thresholds as specced: coarser grid (bigger cells, fewer/bigger
// clusters) at low zoom, finer grid as you zoom in, individual listings
// past zoom 16.
export function getGridSize(zoom: number): number {
  if (zoom <= 10) return 0.05;
  if (zoom <= 13) return 0.02;
  if (zoom <= 16) return 0.01;
  return 0; // signals "no clustering — return every listing individually"
}

export interface ClusterableItem {
  id: string;
  lat: number;
  lng: number;
}

/**
 * Buckets items into a lat/lng grid and aggregates each bucket into a
 * ClusterPoint (count + centroid) or, for a bucket with exactly one item,
 * a ListingPoint instead — a single isolated point renders as a normal
 * pin rather than a "cluster of 1", which reads better and is what most
 * clustering UIs (Google's own MarkerClusterer included) do.
 *
 * This is the JS equivalent of the spec's SQL GROUP BY aggregation —
 * Firestore has no GROUP BY, so the same grid-bucket-and-aggregate logic
 * that would run as a SQL query against Postgres runs here instead,
 * over documents already fetched from Firestore (see app/api/clusters).
 */
export function clusterItems(items: ClusterableItem[], gridSize: number): ClusterResult[] {
  // gridSize === 0 is the "past zoom 16" case — every item is its own
  // listing, no bucketing at all.
  if (gridSize <= 0) {
    return items.map((item) => ({ type: "listing", lat: item.lat, lng: item.lng, id: item.id }));
  }

  const buckets = new Map<string, { latSum: number; lngSum: number; items: ClusterableItem[] }>();

  for (const item of items) {
    // FLOOR(lat / gridSize), FLOOR(lng / gridSize) — identical to the
    // spec's SQL bucket keys.
    const latBucket = Math.floor(item.lat / gridSize);
    const lngBucket = Math.floor(item.lng / gridSize);
    const key = `${latBucket}:${lngBucket}`;

    const bucket = buckets.get(key) ?? { latSum: 0, lngSum: 0, items: [] };
    bucket.latSum += item.lat;
    bucket.lngSum += item.lng;
    bucket.items.push(item);
    buckets.set(key, bucket);
  }

  const results: ClusterResult[] = [];
  for (const bucket of buckets.values()) {
    if (bucket.items.length === 1) {
      const only = bucket.items[0];
      results.push({ type: "listing", lat: only.lat, lng: only.lng, id: only.id });
    } else {
      results.push({
        type: "cluster",
        lat: bucket.latSum / bucket.items.length, // AVG(lat) — same as the spec's SQL
        lng: bucket.lngSum / bucket.items.length, // AVG(lng)
        count: bucket.items.length,
      });
    }
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
