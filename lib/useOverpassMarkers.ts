import { useEffect, useRef, useState } from "react";
import { OverpassPlace } from "@/lib/overpass";

const IDLE_REFETCH_DEBOUNCE_MS = 500;

interface UseOverpassMarkersOptions {
  map: google.maps.Map | null;
  // Only fetches/shows markers while true; clears them the instant this
  // flips to false.
  enabled: boolean;
  fetchPlaces: (bounds: google.maps.LatLngBounds, signal: AbortSignal) => Promise<OverpassPlace[]>;
  // Factory rather than a precomputed google.maps.Icon: it must only be
  // called once `map` exists (i.e. the Maps JS API is actually loaded) —
  // calling it eagerly at render time crashes on the server, where
  // `google` doesn't exist at all. Should be referentially stable (e.g. a
  // module-level function) since it's an effect dep.
  buildIcon: () => google.maps.Icon;
  // Below this zoom the query area is too large for a useful/fast result,
  // so it's skipped (see `needsZoom` below) rather than fetching.
  minZoom?: number;
}

/**
 * Drives one toggleable "nearby POI" marker layer (train stations, bus
 * stops, ...): fetches within the current map bounds while `enabled`,
 * refetches (debounced) as the user pans/zooms, and clears every marker as
 * soon as it's disabled. Shared by both POI controls in MapControls.tsx so
 * that lifecycle logic — fetch/cancel/clear — lives in exactly one place.
 */
export function useOverpassMarkers({
  map,
  enabled,
  fetchPlaces,
  buildIcon,
  minZoom = 13,
}: UseOverpassMarkersOptions) {
  const markersRef = useRef<google.maps.Marker[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  // Tracks an in-flight fetch, plus whether another refetch was requested
  // while it was running — see the coalescing note in `load` below.
  const isFetchingRef = useRef(false);
  const pendingRefetchRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [needsZoom, setNeedsZoom] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const clearMarkers = () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };

    if (!map || !enabled) {
      abortRef.current?.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      pendingRefetchRef.current = false;
      clearMarkers();
      setIsLoading(false);
      setNeedsZoom(false);
      setError(undefined);
      return;
    }

    const load = async () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom() ?? 0;
      if (!bounds || zoom < minZoom) {
        clearMarkers();
        setNeedsZoom(!!bounds);
        return;
      }
      setNeedsZoom(false);

      // Coalesce rather than abort-and-restart: if idle events fire back
      // to back faster than a request round-trips (e.g. someone
      // scroll-wheel zooming quickly), aborting the in-flight fetch every
      // time would mean none ever completes. Instead, just remember to
      // run once more — with whatever the bounds are by then — right
      // after the current one finishes.
      if (isFetchingRef.current) {
        pendingRefetchRef.current = true;
        return;
      }

      isFetchingRef.current = true;
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      try {
        const places = await fetchPlaces(bounds, controller.signal);
        const icon = buildIcon();
        clearMarkers();
        markersRef.current = places.map(
          (place) =>
            new google.maps.Marker({
              position: { lat: place.lat, lng: place.lng },
              map,
              title: place.name,
              icon,
            })
        );
        setError(undefined);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          // Previously this only went to console.error — a failed fetch
          // (rate limit, network blip, ad-blocker on the Overpass domain,
          // ...) looked identical to "no results in this area" from the
          // user's side, with zero visible feedback. Surface it instead.
          console.error("Failed to fetch nearby places:", err);
          setError("Couldn't load nearby stations/stops. Try again.");
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
      clearMarkers();
    };
  }, [map, enabled, fetchPlaces, buildIcon, minZoom]);

  return { isLoading, needsZoom, error };
}
