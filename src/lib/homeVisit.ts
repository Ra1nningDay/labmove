import type { Officer, Task } from "@/lib/types";
// Import JSON mock (Thai fields). It lives at project root.
// Using resolveJsonModule in tsconfig to import JSON at build time.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - typing the JSON ad-hoc
import RAW from "../../home_visit_mock_data.json";

type RawItem = {
  [key: string]: any;
};

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
    const name: string | undefined = item["ชื่อผู้รับบริการ"];
    const address: string | undefined = item["ที่อยู่"];
    const coordStr: string | undefined = item["ตำแหน่งที่อยู่"];
    const officerName: string | undefined = item["ชื่อเจ้าหน้าที่"];
    const dateStr: string | null = toIsoDate(item["วันที่นัดหมาย"]);
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

  return { officers, tasks };
}

export const HOME_VISIT_AVAILABLE = true;

