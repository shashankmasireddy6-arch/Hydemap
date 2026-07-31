"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "@/components/icons";

interface SearchBarProps {
  // null until MapView's map instance exists (see MapView's onMapReady).
  map: google.maps.Map | null;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// Within the requested 14–16 zoom range.
const TARGET_ZOOM = 15;
const ZOOM_STEP_MS = 120;
const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 3;

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

// Location search uses OpenStreetMap's Nominatim API instead of Google
// Places Autocomplete — Places requires billing to be enabled on the
// Google Cloud project, which isn't an option here, while Nominatim is
// free and needs no API key. The map itself still renders via Google Maps
// (MapView), this only swaps out where "type a name, get a lat/lng" comes
// from. Usage policy caps this at ~1 request/second, hence the debounce.
async function searchNominatim(query: string, signal: AbortSignal): Promise<NominatimResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "in");

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) throw new Error(`Nominatim request failed: ${response.status}`);
  return response.json();
}

export default function SearchBar({ map }: SearchBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Debounced fetch, cancelling any request still in flight so a slow
  // earlier response can't overwrite a newer one.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      setResults([]);
      setIsLoading(false);
      setError(undefined);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(undefined);
      try {
        const found = await searchNominatim(trimmed, controller.signal);
        setResults(found);
        setActiveIndex(-1);
        if (found.length === 0) setError("No matching locations found.");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Couldn't reach the location search service. Try again.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close the dropdown on outside click.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    return () => {
      markerRef.current?.setMap(null);
      markerRef.current = null;
    };
  }, []);

  const selectResult = (result: NominatimResult) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);

    if (!map || Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("That location doesn't have valid coordinates.");
      return;
    }

    const location = { lat, lng };
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

    setQuery(result.display_name);
    setResults([]);
    setIsOpen(false);
    setError(undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = results[activeIndex] ?? results[0];
      if (chosen) selectResult(chosen);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setError(undefined);
    markerRef.current?.setMap(null);
    markerRef.current = null;
  };

  return (
    <div ref={containerRef} className="pointer-events-auto relative z-20 w-full max-w-md">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search for an area or location…"
          disabled={!map}
          className="w-full rounded-2xl border border-slate-100 bg-white/95 py-2.5 pl-9 pr-9 text-sm text-slate-800 shadow-panel backdrop-blur-md transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-70"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && (results.length > 0 || isLoading || error) && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] overflow-hidden rounded-2xl border border-slate-100 bg-white/95 shadow-panel backdrop-blur-md">
          {isLoading ? (
            <p className="px-4 py-3 text-sm text-slate-500">Searching…</p>
          ) : error ? (
            <p className="px-4 py-3 text-sm text-slate-500">{error}</p>
          ) : (
            <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
              {results.map((result, index) => (
                <li key={result.place_id}>
                  <button
                    type="button"
                    onClick={() => selectResult(result)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`block w-full truncate px-4 py-2.5 text-left text-sm transition ${
                      index === activeIndex
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {result.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
