"use client";

import { useEffect, useRef, useState } from "react";
import { useAqi } from "@/lib/useAqi";
import { AqiIcon, SatelliteIcon, TransitIcon } from "@/components/icons";
import { METRO_LINES, METRO_STATIONS } from "@/data/metroLines";

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

  const metroPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const metroStationMarkersRef = useRef<google.maps.Marker[]>([]);
  // One shared InfoWindow reused across every station marker, rather than
  // 56 individual ones — a station's popup is just its name, so there's
  // no per-marker state worth keeping around between opens.
  const stationInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const { result: aqiResult, isLoading: isLoadingAqi, error: aqiError } = useAqi({
    map,
    enabled: showAqi,
  });

  // Metro lines — drawn from data/metroLines.ts's hardcoded real route
  // geometry, not Google's built-in TransitLayer: Google's own transit
  // data for Hyderabad only covers one of the three real lines (Red/Blue/
  // Green), which is what prompted this in the first place. Polylines are
  // created once and just attached/detached on toggle, same pattern the
  // old TransitLayer used.
  useEffect(() => {
    if (!map) return;
    if (metroPolylinesRef.current.length === 0) {
      metroPolylinesRef.current = METRO_LINES.map(
        (line) =>
          new google.maps.Polyline({
            path: line.path,
            strokeColor: line.color,
            strokeWeight: 3,
            strokeOpacity: 0.9,
            zIndex: 10,
          })
      );
    }
    metroPolylinesRef.current.forEach((polyline) => polyline.setMap(showMetro ? map : null));
  }, [map, showMetro]);

  // Station markers — small white dots (a classic Marker is fine here;
  // unlike property/cluster markers, a station doesn't need rich HTML,
  // just a name). zIndex above the polylines so dots aren't hidden under
  // a line drawn over them. The native `title` attribute gives a hover
  // tooltip on desktop, but that's a no-op on touch devices — the click
  // listener below (which opens the shared InfoWindow) is what makes a
  // station's name actually visible on tap, mobile or desktop alike.
  useEffect(() => {
    if (!map) return;
    if (!stationInfoWindowRef.current) {
      stationInfoWindowRef.current = new google.maps.InfoWindow();
    }
    if (metroStationMarkersRef.current.length === 0) {
      metroStationMarkersRef.current = METRO_STATIONS.map((station) => {
        const marker = new google.maps.Marker({
          position: { lat: station.lat, lng: station.lng },
          title: station.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4,
            fillColor: "#ffffff",
            fillOpacity: 1,
            strokeColor: "#334155",
            strokeWeight: 1.5,
          },
          zIndex: 20,
        });
        marker.addListener("click", () => {
          const infoWindow = stationInfoWindowRef.current;
          if (!infoWindow) return;
          // Icon badge + uppercase micro-label + name, the same visual
          // pattern the property popup's type badge uses (buildPopupHtml
          // in MapView.tsx) — a plain bold name on its own read as bare
          // and oversized-for-its-content. The wrapping div's own padding
          // is required, not cosmetic: see globals.css's
          // `.gm-style-iw-d { padding: 0 !important; }`, tuned for the
          // property popup's padded wrapper, which zeroes out Google's
          // default InfoWindow padding globally.
          //
          // pr-[52px] (not px-3's usual pr-3) is also load-bearing, not
          // decorative: the close button sits at a *fixed* horizontal
          // offset from the popup's right edge (globals.css's
          // `.gm-ui-hover-effect`), and this content auto-sizes its width
          // to fit whichever line (label or name) is longer. Without a
          // reserved right-side gutter at least as wide as the button's
          // icon-to-edge distance (measured ~40px: 48px button, 24px
          // icon centered inside it, 4px right offset), a station whose
          // name runs close to that edge — e.g. "Road No 5 Jubilee
          // Hills" — puts real text directly under the button; no
          // vertical offset on the button fixes that on its own, since
          // the collision is horizontal, not vertical.
          infoWindow.setContent(`
            <div class="flex items-center gap-2 py-2.5 pl-3 pr-[52px] font-sans">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="4" y1="8" x2="20" y2="8" />
                  <line x1="4" y1="16" x2="20" y2="16" />
                  <line x1="7" y1="5" x2="7" y2="19" />
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="17" y1="5" x2="17" y2="19" />
                </svg>
              </span>
              <div class="flex flex-col">
                <span class="whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-slate-400">Metro Station</span>
                <span class="whitespace-nowrap text-sm font-bold text-slate-900">${station.name}</span>
              </div>
            </div>
          `);
          infoWindow.open({ map, anchor: marker });
        });
        return marker;
      });
    }
    metroStationMarkersRef.current.forEach((marker) => marker.setMap(showMetro ? map : null));
    if (!showMetro) stationInfoWindowRef.current?.close();
  }, [map, showMetro]);

  useEffect(() => {
    return () => {
      metroPolylinesRef.current.forEach((polyline) => polyline.setMap(null));
      metroStationMarkersRef.current.forEach((marker) => marker.setMap(null));
      stationInfoWindowRef.current?.close();
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
