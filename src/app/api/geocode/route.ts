import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Geo = { lat: number; lng: number };
type CacheEntry = {
  ts: number;
  value: {
    coords: Geo;
    formattedAddress?: string;
    placeId?: string;
  };
};

type GoogleGeocodeResponse = {
  status: string;
  results: Array<{
    geometry?: {
      location?: {
        lat: number;
        lng: number;
      };
    };
    formatted_address?: string;
    place_id?: string;
  }>;
  error_message?: string;
};

const MEMORY_TTL_MS = 10 * 60 * 1000; // 10 minutes
const memoryCache = new Map<string, CacheEntry>();

function normalizeKey(address: string, region?: string, language?: string) {
  return [address.trim().toLowerCase(), region || "th", language || "th"].join(
    "|"
  );
}

export async function POST(req: NextRequest) {
  let body: { address?: string; region?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }
  const address = (body.address || "").trim();
  if (!address) return new NextResponse("address required", { status: 400 });
  const region = (body.region || "th").trim();
  const language = (body.language || "th").trim();

  const key = normalizeKey(address, region, language);
  const now = Date.now();
  const cached = memoryCache.get(key);
  if (cached && now - cached.ts < MEMORY_TTL_MS) {
    return NextResponse.json({
      source: "cache",
      ...cached.value,
    });
  }

  const apiKey =
    process.env.GEOCODING_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return new NextResponse("API key missing", { status: 500 });
  }
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("region", region);
  url.searchParams.set("language", language);
  // Bias to Thailand explicitly
  url.searchParams.set("components", "country:TH");

  try {
    const resp = await fetch(url.toString(), {
      method: "GET",
      // Small timeout via AbortController if needed (skipped for brevity)
      headers: { "Content-Type": "application/json" },
      // Next.js fetch caching: bypass
      cache: "no-store",
    });
    if (!resp.ok) {
      return new NextResponse(`geocode upstream ${resp.status}`, {
        status: 502,
      });
    }
    const data: GoogleGeocodeResponse = await resp.json();
    if (data.status !== "OK" || !data.results?.length) {
      return new NextResponse(
        data.error_message || data.status || "ZERO_RESULTS",
        { status: 404 }
      );
    }
    const top = data.results[0];
    const loc = top.geometry?.location;
    if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
      return new NextResponse("no geometry", { status: 500 });
    }
    const value = {
      coords: { lat: loc.lat, lng: loc.lng } as Geo,
      formattedAddress: top.formatted_address as string | undefined,
      placeId: top.place_id as string | undefined,
    };
    memoryCache.set(key, { ts: now, value });
    return NextResponse.json({ source: "live", ...value });
  } catch {
    return new NextResponse("geocode error", { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = (searchParams.get("address") || "").trim();
  const region = (searchParams.get("region") || "th").trim();
  const language = (searchParams.get("language") || "th").trim();
  if (!address) return new NextResponse("address required", { status: 400 });
  // Delegate to POST handler for shared logic
  return POST(
    new NextRequest(req.url, {
      method: "POST",
      body: JSON.stringify({ address, region, language }),
      headers: req.headers,
    })
  );
}
