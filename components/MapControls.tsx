"use client";

import { useEffect, useRef, useState } from "react";
import { fetchBusStops, fetchTrainStations } from "@/lib/overpass";
import { useOverpassMarkers } from "@/lib/useOverpassMarkers";
import { BusIcon, POI_ICON_MARKUP, SatelliteIcon, TrainIcon, TransitIcon } from "@/components/icons";

interface MapControlsProps {
  // null until MapView's map instance exists (see MapView's onMapReady).
  map: google.maps.Map | null;
}

function buildPoiIcon(color: string, glyph: string): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="11" fill="${color}" stroke="white" stroke-width="2" />
      <g transform="translate(6.5,6.5) scale(0.54)" fill="none" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
        ${glyph}
      </g>
    </svg>
  `.trim();
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(26, 26),
    anchor: new google.maps.Point(13, 13),
  };
}

// Module-level (not per-render) factories, passed to useOverpassMarkers —
// referentially stable, and only ever invoked inside that hook's effect,
// never at render time (see buildIcon's docs there for why that matters).
const buildTrainIcon = () => buildPoiIcon("#0ea5e9", POI_ICON_MARKUP.train);
const buildBusIcon = () => buildPoiIcon("#f97316", POI_ICON_MARKUP.bus);

const toggleBase =
  "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
const toggleOn = "bg-indigo-600 text-white hover:bg-indigo-500";
const toggleOff = "bg-white text-slate-600 hover:bg-slate-50";

export default function MapControls({ map }: MapControlsProps) {
  const [showMetro, setShowMetro] = useState(false);
  const [showTrainStations, setShowTrainStations] = useState(false);
  const [showBusStops, setShowBusStops] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);

  const transitLayerRef = useRef<google.maps.TransitLayer | null>(null);

  // Metro / transit lines — Google's built-in transit overlay. Toggling
  // just attaches/detaches it from the map; the layer instance itself is
  // created once and reused.
  useEffect(() => {
    if (!map) return;
    if (!transitLayerRef.current) transitLayerRef.current = new google.maps.TransitLayer();
    transitLayerRef.current.setMap(showMetro ? map : null);
  }, [map, showMetro]);

  useEffect(() => {
    return () => {
      transitLayerRef.current?.setMap(null);
    };
  }, []);

  // Satellite / roadmap toggle.
  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(
      isSatellite ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP
    );
  }, [map, isSatellite]);

  const { isLoading: isLoadingTrain, needsZoom: trainNeedsZoom } = useOverpassMarkers({
    map,
    enabled: showTrainStations,
    fetchPlaces: fetchTrainStations,
    buildIcon: buildTrainIcon,
  });
  const { isLoading: isLoadingBus, needsZoom: busNeedsZoom } = useOverpassMarkers({
    map,
    enabled: showBusStops,
    fetchPlaces: fetchBusStops,
    buildIcon: buildBusIcon,
  });

  const hint =
    (showTrainStations && trainNeedsZoom) || (showBusStops && busNeedsZoom)
      ? "Zoom in to see stations/stops"
      : undefined;

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1.5">
      <div className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-panel backdrop-blur-md">
        <button
          type="button"
          onClick={() => setShowMetro((v) => !v)}
          disabled={!map}
          aria-pressed={showMetro}
          className={`${toggleBase} ${showMetro ? toggleOn : toggleOff}`}
        >
          <TransitIcon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Metro lines</span>
        </button>

        <button
          type="button"
          onClick={() => setShowTrainStations((v) => !v)}
          disabled={!map}
          aria-pressed={showTrainStations}
          className={`${toggleBase} ${showTrainStations ? toggleOn : toggleOff}`}
        >
          <TrainIcon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">
            Train stations{isLoadingTrain ? "…" : ""}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowBusStops((v) => !v)}
          disabled={!map}
          aria-pressed={showBusStops}
          className={`${toggleBase} ${showBusStops ? toggleOn : toggleOff}`}
        >
          <BusIcon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Bus stops{isLoadingBus ? "…" : ""}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSatellite((v) => !v)}
          disabled={!map}
          aria-pressed={isSatellite}
          className={`${toggleBase} ${isSatellite ? toggleOn : toggleOff}`}
        >
          <SatelliteIcon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Satellite</span>
        </button>
      </div>

      {hint && (
        <span className="rounded-full border border-slate-100 bg-white/95 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-panel backdrop-blur-md">
          {hint}
        </span>
      )}
    </div>
  );
}
