import { NextRequest, NextResponse } from "next/server";
import { fetchActiveListingPointsAdmin } from "@/lib/adminPostsService";
import { clusterItems, getGridSize, isWithinBounds } from "@/lib/clusterGrid";
import { ClusterResult, MapBounds } from "@/types/cluster";

// --- In-memory response cache, keyed by rounded bounds + zoom ---------
//
// This is the "Map" option from the caching requirement (Redis being the
// other). Important caveat, since this runs as a Next.js Route Handler on
// Vercel rather than a long-lived Express process: serverless functions
// aren't guaranteed to keep the same process (and therefore this
// module-level Map) alive between requests. In practice a "warm" instance
// does get reused for bursts of nearby requests, so this still cuts real,
// redundant Firestore reads during active panning/zooming — it just isn't
// a *guaranteed* shared cache across every request the way Redis would
// be. If that guarantee ever matters (e.g. once there's enough traffic
// that cache misses against Firestore get expensive), swap this Map for
// Vercel KV/Redis without changing anything else in this file.
const CACHE_TTL_MS = 45_000; // within the specced 30-60s window
const cache = new Map<string, { data: ClusterResult[]; expiresAt: number }>();

function buildCacheKey(bounds: MapBounds, zoom: number): string {
  // Rounded to ~100m precision — sub-pixel pan differences share a cache
  // entry instead of each missing individually, same idea as map tile
  // caching. This is a cache key only; the actual Firestore/bucketing
  // work below still uses the exact bounds from the request.
  const round = (n: number) => n.toFixed(3);
  return `${round(bounds.north)}:${round(bounds.south)}:${round(bounds.east)}:${round(bounds.west)}:${zoom}`;
}

function getCached(key: string): ClusterResult[] | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setCached(key: string, data: ClusterResult[]): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  // Opportunistic cleanup so this Map can't grow unbounded across a long
  // warm-instance lifetime — cheap since it only runs on a cache miss.
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (v.expiresAt < now) cache.delete(k);
    }
  }
}

function parseFloatParam(searchParams: URLSearchParams, key: string): number | null {
  const raw = searchParams.get(key);
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const north = parseFloatParam(searchParams, "north");
  const south = parseFloatParam(searchParams, "south");
  const east = parseFloatParam(searchParams, "east");
  const west = parseFloatParam(searchParams, "west");
  const zoom = parseFloatParam(searchParams, "zoom");

  if (north === null || south === null || east === null || west === null || zoom === null) {
    return NextResponse.json(
      { error: "north, south, east, west, and zoom are all required numeric query params" },
      { status: 400 }
    );
  }

  const bounds: MapBounds = { north, south, east, west };
  const cacheKey = buildCacheKey(bounds, zoom);

  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  try {
    // Fetches every active listing rather than a Firestore-native
    // bounds-filtered query — Firestore doesn't support independent
    // range filters on two different fields (lat AND lng) in one query
    // without geohashing infrastructure (e.g. geofirestore), which isn't
    // justified at this app's current data volume (the whole `posts`
    // collection is already loaded client-side elsewhere for other
    // features). Bounds filtering + grid aggregation both happen here in
    // plain JS instead — the direct equivalent of the spec's SQL
    // GROUP BY, adapted to a database that doesn't have one. If listing
    // volume ever grows enough that fetching the full collection per
    // cache-miss becomes the bottleneck, that's the point to add
    // geohash-indexed Firestore queries so this can filter server-side
    // before aggregating.
    const allPoints = await fetchActiveListingPointsAdmin();
    const pointsInBounds = allPoints.filter((point) => isWithinBounds(point, bounds));

    const gridSize = getGridSize(zoom);
    const results = clusterItems(pointsInBounds, gridSize);

    setCached(cacheKey, results);
    return NextResponse.json(results, { headers: { "X-Cache": "MISS" } });
  } catch (err) {
    console.error("Failed to compute clusters:", err);
    return NextResponse.json({ error: "Failed to compute clusters" }, { status: 500 });
  }
}
