import { useEffect, useState } from "react";
import { LatLng } from "@/types/post";

const DEBOUNCE_MS = 500;

/**
 * Tracks the map's center, debounced on pan/zoom ("idle"), so the "nearby"
 * average-rent calculation can recompute as the user moves the map without
 * re-running on every intermediate frame of a drag. No network fetch here
 * (unlike lib/useAqi.ts / lib/useOverpassMarkers.ts) — just a plain
 * synchronous read of map.getCenter(), so there's no coalescing/abort
 * complexity needed, only the debounce.
 */
export function useMapCenter(map: google.maps.Map | null): LatLng | null {
  const [center, setCenter] = useState<LatLng | null>(null);

  useEffect(() => {
    if (!map) return;

    const readCenter = () => {
      const current = map.getCenter();
      if (current) setCenter({ lat: current.lat(), lng: current.lng() });
    };

    readCenter(); // pick up the initial center right away, not just after the first pan

    let debounceTimer: number | null = null;
    const listener = map.addListener("idle", () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(readCenter, DEBOUNCE_MS);
    });

    return () => {
      google.maps.event.removeListener(listener);
      if (debounceTimer) window.clearTimeout(debounceTimer);
    };
  }, [map]);

  return center;
}
