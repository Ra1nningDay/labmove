type Geo = { lat: number; lng: number };

export function parseLatLngFromText(input: string): Geo | null {
  const t = input.trim();
  // Pattern 1: plain "lat,lng"
  let m = t.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  // Pattern 2: Google Maps URL with @lat,lng,
  m = t.match(/@(-?\d+\.\d+),(-?\d+\.\d+),/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  // Pattern 3: q=lat,lng
  m = t.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  return null;
}

export async function geocodeTextServer(address: string): Promise<{ coords: Geo; formattedAddress?: string } | null> {
  const apiKey = process.env.GEOCODING_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("region", "th");
  url.searchParams.set("language", "th");
  url.searchParams.set("components", "country:TH");
  const resp = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (data.status !== "OK" || !data.results?.length) return null;
  const top = data.results[0];
  const loc = top.geometry?.location;
  if (!loc) return null;
  return { coords: { lat: loc.lat, lng: loc.lng }, formattedAddress: top.formatted_address };
}

