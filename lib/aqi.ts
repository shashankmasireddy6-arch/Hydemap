// Air Quality Index via WAQI (World Air Quality Index — aqicn.org), which
// aggregates real monitoring stations (including CPCB stations across
// Indian cities) rather than a modeled estimate, and returns the standard
// 0-500 AQI scale directly. Needs a free token from
// https://aqicn.org/data-platform/token/ — see .env.local.example.
const WAQI_TOKEN = process.env.NEXT_PUBLIC_WAQI_TOKEN;
const WAQI_ENDPOINT = "https://api.waqi.info/feed";
const NOMINATIM_REVERSE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

export type AqiCategory = "Good" | "Moderate" | "Poor";

export interface AqiResult {
  aqi: number;
  category: AqiCategory;
  color: string;
}

interface WaqiOkResponse {
  status: "ok";
  data: { aqi: number; [key: string]: unknown };
}

interface WaqiErrorResponse {
  status: "error" | string;
  data: string;
}

type WaqiResponse = WaqiOkResponse | WaqiErrorResponse;

interface NominatimReverseResponse {
  address?: {
    city?: string;
    town?: string;
    county?: string;
    state_district?: string;
    state?: string;
  };
}

// Standard AQI breakpoints collapsed into the three buckets requested —
// Unhealthy-for-sensitive-groups through Hazardous (101+) all read "Poor"
// here rather than being split further.
function categorize(aqi: number): Pick<AqiResult, "category" | "color"> {
  if (aqi <= 50) return { category: "Good", color: "#22c55e" };
  if (aqi <= 100) return { category: "Moderate", color: "#eab308" };
  return { category: "Poor", color: "#ef4444" };
}

// WAQI's own geo:lat;lng and map/bounds search endpoints turned out to
// return "can not connect" / an empty station list respectively for this
// token even around a location with a known, queryable station — appears
// to be a limitation on WAQI's free-tier search endpoints rather than
// anything location-specific (a direct /feed/hyderabad/ lookup with the
// same token works fine). So instead: reverse-geocode the coordinates to a
// city name via Nominatim (already used elsewhere in this app, for
// SearchBar), then look that up as a WAQI station slug directly.
async function reverseGeocodeCity(
  lat: number,
  lng: number,
  signal: AbortSignal
): Promise<string> {
  const url = `${NOMINATIM_REVERSE_ENDPOINT}?format=jsonv2&lat=${lat}&lon=${lng}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Reverse geocoding failed: ${response.status}`);

  const json: NominatimReverseResponse = await response.json();
  const address = json.address;
  const city =
    address?.city || address?.town || address?.county || address?.state_district || address?.state;
  if (!city) throw new Error("Couldn't determine a city name for this location");
  return city;
}

export async function fetchAqi(
  lat: number,
  lng: number,
  signal: AbortSignal
): Promise<AqiResult> {
  if (!WAQI_TOKEN) {
    throw new Error("Missing NEXT_PUBLIC_WAQI_TOKEN — see .env.local.example.");
  }

  const city = await reverseGeocodeCity(lat, lng, signal);

  const url = `${WAQI_ENDPOINT}/${encodeURIComponent(city)}/?token=${WAQI_TOKEN}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`WAQI request failed: ${response.status}`);

  const json: WaqiResponse = await response.json();
  if (json.status !== "ok" || typeof json.data !== "object" || json.data === null) {
    const message = typeof json.data === "string" ? json.data : "WAQI returned an error";
    throw new Error(`${message} (looked up as "${city}")`);
  }

  const aqi = json.data.aqi;
  if (typeof aqi !== "number" || Number.isNaN(aqi)) {
    throw new Error(`No AQI reading available for "${city}"`);
  }

  return { aqi, ...categorize(aqi) };
}
