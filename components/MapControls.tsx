"use client";

import { useEffect, useRef, useState } from "react";
import { useAqi } from "@/lib/useAqi";
import { AqiIcon, SatelliteIcon, TransitIcon } from "@/components/icons";

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
  const [showAqi, setShowAqi] = useState(false);

  const transitLayerRef = useRef<google.maps.TransitLayer | null>(null);
  const { result: aqiResult, isLoading: isLoadingAqi, error: aqiError } = useAqi({
    map,
    enabled: showAqi,
  });

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
          onClick={() => setIsSatellite((v) => !v)}
          disabled={!map}
          aria-pressed={isSatellite}
          className={`${toggleBase} ${isSatellite ? toggleOn : toggleOff}`}
        >
          <SatelliteIcon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Satellite</span>
        </button>

        <button
          type="button"
          onClick={() => setShowAqi((v) => !v)}
          disabled={!map}
          aria-pressed={showAqi}
          className={`${toggleBase} ${showAqi ? toggleOn : toggleOff}`}
        >
          <AqiIcon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">AQI{isLoadingAqi && !aqiResult ? "…" : ""}</span>
        </button>
      </div>

      {showAqi && (aqiResult || aqiError) && (
        <span
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold shadow-panel backdrop-blur-md ${
            aqiResult ? "" : "border-red-200 bg-red-50 text-red-700"
          }`}
          style={
            aqiResult
              ? {
                  borderColor: `${aqiResult.color}40`,
                  backgroundColor: `${aqiResult.color}14`,
                  color: aqiResult.color,
                }
              : undefined
          }
        >
          {aqiResult ? (
            <>
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: aqiResult.color }}
              />
              AQI {aqiResult.aqi} · {aqiResult.category}
            </>
          ) : (
            aqiError
          )}
        </span>
      )}
    </div>
  );
}
