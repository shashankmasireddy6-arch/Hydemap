"use client";

import { useEffect, useRef, useState } from "react";
import { SatelliteIcon, TransitIcon } from "@/components/icons";

interface MapControlsProps {
  // null until MapView's map instance exists (see MapView's onMapReady).
  map: google.maps.Map | null;
}

const toggleBase =
  "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
const toggleOn = "bg-indigo-600 text-white hover:bg-indigo-500";
const toggleOff = "bg-white text-slate-600 hover:bg-slate-50";

export default function MapControls({ map }: MapControlsProps) {
  const [showMetro, setShowMetro] = useState(false);
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

  return (
    <div className="pointer-events-auto flex flex-col gap-1 rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-panel backdrop-blur-md">
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
        onClick={() => setIsSatellite((v) => !v)}
        disabled={!map}
        aria-pressed={isSatellite}
        className={`${toggleBase} ${isSatellite ? toggleOn : toggleOff}`}
      >
        <SatelliteIcon className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Satellite</span>
      </button>
    </div>
  );
}
