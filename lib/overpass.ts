// Free (no API key/billing) source for "nearby POI" lookups — train
// stations and bus stops — via OpenStreetMap's Overpass API. Stands in for
// Google Places Nearby Search, which requires billing enabled on the
// Google Cloud project (see components/SearchBar.tsx for the same
// substitution on the geocoding side, with Nominatim).
const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

export interface OverpassPlace {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

interface OverpassElement {
  id: number;
  lat: number;
  lon: number;
  tags?: { name?: string };
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function boundsToBbox(bounds: google.maps.LatLngBounds): string {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  // Overpass wants "south,west,north,east".
  return `${sw.lat()},${sw.lng()},${ne.lat()},${ne.lng()}`;
}

async function queryOverpass(query: string, signal: AbortSignal): Promise<OverpassPlace[]> {
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    signal,
  });
  if (!response.ok) throw new Error(`Overpass request failed: ${response.status}`);

  const data: OverpassResponse = await response.json();
  return data.elements.map((el) => ({
    id: el.id,
    name: el.tags?.name?.trim() || "Unnamed",
    lat: el.lat,
    lng: el.lon,
  }));
}

// OSM tags railway=station for heavy-rail and most metro/subway stops
// alike — used by the "Train stations" map control.
export function fetchTrainStations(
  bounds: google.maps.LatLngBounds,
  signal: AbortSignal
): Promise<OverpassPlace[]> {
  const bbox = boundsToBbox(bounds);
  const query = `[out:json][timeout:25];node["railway"="station"](${bbox});out body;`;
  return queryOverpass(query, signal);
}

// OSM tags bus stops with highway=bus_stop — used by the "Bus stops" map
// control.
export function fetchBusStops(
  bounds: google.maps.LatLngBounds,
  signal: AbortSignal
): Promise<OverpassPlace[]> {
  const bbox = boundsToBbox(bounds);
  const query = `[out:json][timeout:25];node["highway"="bus_stop"](${bbox});out body;`;
  return queryOverpass(query, signal);
}
