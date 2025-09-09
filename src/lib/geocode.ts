type Geo = { lat: number; lng: number };

type GeocodeResult = {
  coords: Geo;
  formattedAddress?: string;
  placeId?: string;
  source?: string;
};

const SESSION_KEY = "geocode-cache-v1";
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

function readCache(): Record<string, { ts: number; value: GeocodeResult }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(obj: Record<string, { ts: number; value: GeocodeResult }>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(obj));
  } catch {}
}

function k(address: string, region = "th", language = "th") {
  return [address.trim().toLowerCase(), region, language].join("|");
}

export async function geocodeAddress(
  address: string,
  opts?: { region?: string; language?: string }
): Promise<GeocodeResult> {
  const region = opts?.region ?? "th";
  const language = opts?.language ?? "th";
  const key = k(address, region, language);

  // sessionStorage cache
  const cache = readCache();
  const now = Date.now();
  const hit = cache[key];
  if (hit && now - hit.ts < SESSION_TTL_MS) return hit.value;

  const resp = await fetch("/api/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, region, language }),
  });
  if (!resp.ok) {
    throw new Error(`geocode ${resp.status}`);
  }
  const data = (await resp.json()) as GeocodeResult;
  // Persist to session cache
  cache[key] = { ts: now, value: data };
  writeCache(cache);
  return data;
}

