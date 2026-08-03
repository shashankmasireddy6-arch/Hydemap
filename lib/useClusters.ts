import { useEffect, useRef, useState } from "react";
import { ClusterResult } from "@/types/cluster";

const DEBOUNCE_MS = 300; // as specced

/**
 * Fetches /api/clusters for the map's current bounds + zoom, debounced on
 * bounds_changed/zoom_changed (both, per the spec — zoom changes also
 * fire bounds_changed, so in practice one debounce timer serves both).
 *
 * Uses the same coalesce-rather-than-abort-and-restart pattern as this
 * app's other pan-driven fetch hooks (AQI, the old train/bus-stop
 * controls): if bounds keep changing faster than a request round-trips
 * (e.g. someone drag-panning quickly), aborting and restarting on every
 * change can mean no request ever completes. Instead, a fetch already in
 * flight is left to finish, and one more run — with whatever the bounds
 * are by then — happens right after, rather than needlessly on every
 * intermediate change.
 *
 * `refreshKey` (optional) forces an immediate re-fetch when it changes,
 * bypassing the debounce — for MapView to call after a new post is added.
 * Without this, a freshly created post's marker wouldn't appear until the
 * next pan/zoom, since bounds/zoom haven't changed and this hook has no
 * other way to learn the listing set changed.
 */
export function useClusters(map: google.maps.Map | null, refreshKey?: unknown) {
  const [results, setResults] = useState<ClusterResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef(false);
  const pendingRefetchRef = useRef(false);
  const loadRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!map) return;

    const load = async () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      if (!bounds || zoom === undefined) return;

      if (isFetchingRef.current) {
        pendingRefetchRef.current = true;
        return;
      }

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      isFetchingRef.current = true;
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          north: String(ne.lat()),
          south: String(sw.lat()),
          east: String(ne.lng()),
          west: String(sw.lng()),
          zoom: String(zoom),
        });
        const response = await fetch(`/api/clusters?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Cluster request failed: ${response.status}`);
        const data: ClusterResult[] = await response.json();
        setResults(data);
        setError(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to fetch clusters:", err);
          // Caller (MapView) falls back to rendering every property as its
          // own marker when this is true — clustering is a display nicety
          // layered on top of the map, and a failure here (missing prod
          // env var, cold-start error, network blip) must never make
          // listings themselves disappear.
          setError(true);
        }
      } finally {
        isFetchingRef.current = false;
        setIsLoading(false);
        if (pendingRefetchRef.current) {
          pendingRefetchRef.current = false;
          load();
        }
      }
    };

    const scheduleLoad = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(load, DEBOUNCE_MS);
    };

    loadRef.current = load;
    load(); // initial fetch for the map's starting bounds/zoom
    const boundsListener = map.addListener("bounds_changed", scheduleLoad);
    const zoomListener = map.addListener("zoom_changed", scheduleLoad);

    return () => {
      google.maps.event.removeListener(boundsListener);
      google.maps.event.removeListener(zoomListener);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [map]);

  // Skip the very first run — the effect above already does the initial
  // fetch; this is only for refreshKey changes *after* that.
  const isFirstRefreshRef = useRef(true);
  useEffect(() => {
    if (isFirstRefreshRef.current) {
      isFirstRefreshRef.current = false;
      return;
    }
    loadRef.current();
  }, [refreshKey]);

  return { results, isLoading, error };
}
