// Air Quality Index via WAQI (World Air Quality Index — aqicn.org), which
// aggregates real monitoring stations (including CPCB stations across
// Indian cities) rather than a modeled estimate, and returns the standard
// 0-500 AQI scale directly. Needs a free token from
// https://aqicn.org/data-platform/token/ — see .env.local.example.
const WAQI_TOKEN = process.env.NEXT_PUBLIC_WAQI_TOKEN;
const WAQI_ENDPOINT = "https://api.waqi.info/feed";

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

// Standard AQI breakpoints collapsed into the three buckets requested —
// Unhealthy-for-sensitive-groups through Hazardous (101+) all read "Poor"
// here rather than being split further.
function categorize(aqi: number): Pick<AqiResult, "category" | "color"> {
  if (aqi <= 50) return { category: "Good", color: "#22c55e" };
  if (aqi <= 100) return { category: "Moderate", color: "#eab308" };
  return { category: "Poor", color: "#ef4444" };
}

export async function fetchAqi(
  lat: number,
  lng: number,
  signal: AbortSignal
): Promise<AqiResult> {
  if (!WAQI_TOKEN) {
    throw new Error("Missing NEXT_PUBLIC_WAQI_TOKEN — see .env.local.example.");
  }

  const url = `${WAQI_ENDPOINT}/geo:${lat};${lng}/?token=${WAQI_TOKEN}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`WAQI request failed: ${response.status}`);

  const json: WaqiResponse = await response.json();
  if (json.status !== "ok" || typeof json.data !== "object" || json.data === null) {
    const message = typeof json.data === "string" ? json.data : "WAQI returned an error";
    throw new Error(message);
  }

  const aqi = json.data.aqi;
  if (typeof aqi !== "number" || Number.isNaN(aqi)) {
    throw new Error("No AQI reading available for this location");
  }

  return { aqi, ...categorize(aqi) };
}
