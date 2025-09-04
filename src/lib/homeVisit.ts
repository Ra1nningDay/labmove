import type { Officer, Task } from "@/lib/types";
// Import JSON mock (Thai fields). It lives at project root.
// Using resolveJsonModule in tsconfig to import JSON at build time.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - typing the JSON ad-hoc
import RAW from "../../home_visit_mock_data.json";

type RawItem = Record<string, unknown>;

function parseCoords(raw: string | undefined): { lat: number; lng: number } | null {
  if (!raw) return null;
  const parts = raw.split(",").map((s) => s.trim());
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function toIsoDate(dateTime: string | undefined): string | null {
  if (!dateTime) return null;
  // Expecting format like "2025-08-29 00:00:00"
  const d = new Date(dateTime.replace(" ", "T"));
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

const LAB_BASE = { lat: 13.7563, lng: 100.5018 }; // Bangkok center as default base

export function buildHomeVisitData() {
  const items: RawItem[] = Array.isArray(RAW) ? (RAW as RawItem[]) : [];

  const officersByName = new Map<string, Officer>();
  const tasks: Task[] = [];

  items.forEach((item, idx) => {
    const name = item["ชื่อผู้รับบริการ"] as string | undefined;
    const address = item["ที่อยู่"] as string | undefined;
    const coordStr = item["ตำแหน่งที่อยู่"] as string | undefined;
    const officerName = item["ชื่อเจ้าหน้าที่"] as string | undefined;
    const dateStr: string | null = toIsoDate(item["วันที่นัดหมาย"] as string | undefined);
    const coords = parseCoords(coordStr);

    if (!name || !address || !coords || !dateStr) {
      return; // skip incomplete rows for the mock
    }

    let officerId: string | undefined;
    if (officerName && officerName.trim()) {
      const key = officerName.trim();
      if (!officersByName.has(key)) {
        officersByName.set(key, {
          id: `hv-officer-${officersByName.size + 1}`,
          name: key,
          phone: "",
          zoneLabel: "",
          base: LAB_BASE,
        });
      }
      officerId = officersByName.get(key)!.id;
    }

    tasks.push({
      id: `hv-${idx + 1}`,
      patientName: name,
      address,
      coords,
      date: dateStr,
      tests: [],
      status: "pending",
      assignedTo: officerId,
    });
  });

  const officers = Array.from(officersByName.values());

  // Randomize officer bases near their assigned tasks (or near center) to avoid overlap
  const allTaskCoords = tasks.map((t) => t.coords);
  const center = allTaskCoords.length
    ? {
        lat:
          allTaskCoords.reduce((s, c) => s + c.lat, 0) / allTaskCoords.length,
        lng:
          allTaskCoords.reduce((s, c) => s + c.lng, 0) / allTaskCoords.length,
      }
    : LAB_BASE;

  function jitter(base: { lat: number; lng: number }, r = 0.02) {
    // ~0.02 deg ~ 2.2km; small random scatter
    const rnd = (amp: number) => (Math.random() * 2 - 1) * amp;
    return { lat: base.lat + rnd(r), lng: base.lng + rnd(r) };
  }

  officers.forEach((o) => {
    const mine = tasks.filter((t) => t.assignedTo === o.id);
    if (mine.length > 0) {
      const avg = {
        lat: mine.reduce((s, t) => s + t.coords.lat, 0) / mine.length,
        lng: mine.reduce((s, t) => s + t.coords.lng, 0) / mine.length,
      };
      o.base = jitter(avg, 0.015);
    } else {
      // no tasks yet: scatter around center
      o.base = jitter(center, 0.03);
    }
  });

  return { officers, tasks };
}

export const HOME_VISIT_AVAILABLE = true;
