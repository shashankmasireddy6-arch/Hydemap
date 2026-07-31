import { useEffect, useRef, useState } from "react";
import { AqiResult, fetchAqi } from "@/lib/aqi";

const IDLE_REFETCH_DEBOUNCE_MS = 800;

interface UseAqiOptions {
  map: google.maps.Map | null;
  // Only fetches while true; clears the result the instant this flips off.
  enabled: boolean;
}

/**
 * Fetches AQI for the current map center while `enabled`, refetching
 * (debounced) as the user pans. Uses the same coalescing pattern as
 * lib/useOverpassMarkers.ts — finish the in-flight request, then run once
 * more with the latest center, rather than aborting and restarting on
 * every idle event — since that pattern was found (the hard way, on the
 * train/bus stop controls) to be able to prevent any request from ever
 * completing under rapid pan/zoom.
 */
export function useAqi({ map, enabled }: UseAqiOptions) {
  const [result, setResult] = useState<AqiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);
  const pendingRefetchRef = useRef(false);

  useEffect(() => {
    if (!map || !enabled) {
      abortRef.current?.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      pendingRefetchRef.current = false;
      setResult(null);
      setIsLoading(false);
      setError(undefined);
      return;
    }

    const load = async () => {
      const center = map.getCenter();
      if (!center) return;

      if (isFetchingRef.current) {
        pendingRefetchRef.current = true;
        return;
      }

      isFetchingRef.current = true;
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      try {
        const data = await fetchAqi(center.lat(), center.lng(), controller.signal);
        setResult(data);
        setError(undefined);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to fetch AQI:", err);
          setError("Couldn't load AQI for this area.");
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

    load();
    const listener = map.addListener("idle", () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(load, IDLE_REFETCH_DEBOUNCE_MS);
    });

    return () => {
      google.maps.event.removeListener(listener);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      pendingRefetchRef.current = false;
      abortRef.current?.abort();
    };
  }, [map, enabled]);

  return { result, isLoading, error };
}
