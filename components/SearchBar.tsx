"use client";

import { useEffect, useRef } from "react";
import { SearchIcon } from "@/components/icons";

interface SearchBarProps {
  // null until MapView's map instance exists (see MapView's onMapReady).
  map: google.maps.Map | null;
}

// Within the requested 14–16 zoom range.
const TARGET_ZOOM = 15;
const ZOOM_STEP_MS = 120;

// The Maps JS API has no built-in tween for setZoom (it jumps instantly),
// so this steps one level at a time on a short interval — the standard
// workaround for a "smooth" zoom transition.
function smoothZoomTo(map: google.maps.Map, targetZoom: number) {
  const currentZoom = map.getZoom();
  if (currentZoom === undefined || currentZoom === targetZoom) return;

  const nextZoom = currentZoom + (currentZoom < targetZoom ? 1 : -1);
  map.setZoom(nextZoom);
  if (nextZoom !== targetZoom) {
    window.setTimeout(() => smoothZoomTo(map, targetZoom), ZOOM_STEP_MS);
  }
}

export default function SearchBar({ map }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map || !inputRef.current || autocompleteRef.current) return;
    if (!window.google?.maps?.places) return; // "places" library still loading

    // The classic Autocomplete widget renders its own predictions dropdown
    // and manages requests internally (batched + session-tokened as the
    // user types) — that's what actually keeps API calls in check here,
    // rather than a manual debounce timer on the input's keystrokes, which
    // this widget doesn't expose a hook for anyway.
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ["geometry", "name"],
    });
    autocomplete.bindTo("bounds", map);
    autocompleteRef.current = autocomplete;

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const location = place.geometry?.location;
      if (!location) return; // user hit Enter without picking a suggestion

      map.panTo(location);
      smoothZoomTo(map, TARGET_ZOOM);

      if (markerRef.current) {
        markerRef.current.setPosition(location);
      } else {
        markerRef.current = new google.maps.Marker({
          position: location,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#4f46e5",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          zIndex: 999,
        });
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
      markerRef.current?.setMap(null);
      markerRef.current = null;
      autocompleteRef.current = null;
    };
  }, [map]);

  return (
    <div className="pointer-events-auto w-full max-w-md">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search for an area or location…"
          disabled={!map}
          className="w-full rounded-2xl border border-slate-100 bg-white/95 py-2.5 pl-9 pr-3 text-sm text-slate-800 shadow-panel backdrop-blur-md transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-70"
        />
      </div>
    </div>
  );
}
