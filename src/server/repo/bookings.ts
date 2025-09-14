import fs from "fs";
import path from "path";
import {
  sheetsConfigured,
  appendRow as sheetsAppendRow,
  upsertRowByKey,
  getRowByKey,
  getRowsByKey,
  BOOKINGS_SHEET,
  BOOKING_SESSIONS_SHEET,
  BOOKINGS_HEADERS,
  BOOKING_SESSION_HEADERS,
} from "@/server/repo/sheets";

export type BookingRow = {
  userId: string;
  bookingDate?: string; // YYYY-MM-DD
  datePreference: string; // e.g., "เร็วที่สุด" | "วันนี้" | "พรุ่งนี้" | ISO date
  address: string;
  lat?: number;
  lng?: number;
  imagesUrl?: string;
  note?: string;
  status?: string; // pending/confirmed/cancelled
};

export type BookingSessionRow = {
  userId: string;
  step: string;
  address?: string;
  lat?: number;
  lng?: number;
  bookingDate?: string;
  datePreference?: string;
  imagesUrl?: string;
  lastUpdated?: string;
  status?: string; // in_progress | completed
};

function dataDir() {
  const d = path.join(process.cwd(), "data");
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

const BOOKINGS_CSV = () => path.join(dataDir(), "bookings.csv");
const BOOKING_SESSIONS_CSV = () => path.join(dataDir(), "booking_sessions.csv");

export async function appendBooking(row: BookingRow) {
  if (sheetsConfigured()) {
    await sheetsAppendRow(BOOKINGS_SHEET, BOOKINGS_HEADERS, {
      created_at: new Date().toISOString(),
      user_id: row.userId,
      booking_date: row.bookingDate || "",
      date_preference: row.datePreference,
      address: row.address,
      lat: row.lat?.toString() || "",
      lng: row.lng?.toString() || "",
      images_url: row.imagesUrl || "",
      note: row.note || "",
      status: row.status || "pending",
    });
    return;
  }
  const header =
    '"created_at","user_id","booking_date","date_preference","address","lat","lng","images_url","note","status"\n';
  const fp = BOOKINGS_CSV();
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, header, "utf8");
  const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';
  const line = [
    new Date().toISOString(),
    row.userId,
    row.bookingDate || "",
    row.datePreference,
    row.address,
    row.lat?.toString() || "",
    row.lng?.toString() || "",
    row.imagesUrl || "",
    row.note || "",
    row.status || "pending",
  ]
    .map((v) => esc(String(v)))
    .join(",");
  fs.appendFileSync(fp, line + "\n", "utf8");
}

export async function upsertBookingSession(
  userId: string,
  session: BookingSessionRow
) {
  const row = {
    user_id: userId,
    step: session.step,
    address: session.address || "",
    lat: session.lat?.toString() || "",
    lng: session.lng?.toString() || "",
    booking_date: session.bookingDate || "",
    date_preference: session.datePreference || "",
    images_url: session.imagesUrl || "",
    last_updated: session.lastUpdated || new Date().toISOString(),
    status:
      session.status || (session.step === "done" ? "completed" : "in_progress"),
  };

  if (sheetsConfigured()) {
    await upsertRowByKey(
      BOOKING_SESSIONS_SHEET,
      BOOKING_SESSION_HEADERS,
      "user_id",
      userId,
      row
    );
    return;
  }

  const header =
    '"user_id","step","address","lat","lng","booking_date","date_preference","images_url","last_updated","status"\n';
  const fp = BOOKING_SESSIONS_CSV();
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, header, "utf8");
  const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';
  const line = [
    row.user_id,
    row.step,
    row.address,
    row.lat,
    row.lng,
    row.booking_date,
    row.date_preference,
    row.images_url,
    row.last_updated,
    row.status,
  ]
    .map((v) => esc(String(v)))
    .join(",");
  fs.appendFileSync(fp, line + "\n", "utf8");
}

export async function getLatestBookingByUserId(
  userId: string
): Promise<BookingRow | null> {
  if (sheetsConfigured()) {
    const rows = await getRowsByKey(
      BOOKINGS_SHEET,
      BOOKINGS_HEADERS,
      "user_id",
      userId
    );
    if (rows.length === 0) return null;
    rows.sort((a, b) =>
      String(a["created_at"]).localeCompare(String(b["created_at"]))
    );
    const r = rows[rows.length - 1];
    return {
      userId: r["user_id"],
      bookingDate: r["booking_date"] || undefined,
      datePreference: r["date_preference"] || "",
      address: r["address"] || "",
      lat: r["lat"] ? Number(r["lat"]) : undefined,
      lng: r["lng"] ? Number(r["lng"]) : undefined,
      imagesUrl: r["images_url"] || undefined,
      note: r["note"] || undefined,
      status: r["status"] || undefined,
    };
  }

  // CSV fallback
  const fp = BOOKINGS_CSV();
  if (!fs.existsSync(fp)) return null;
  const content = fs.readFileSync(fp, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return null;
  const header = lines[0].split(",");
  const idx = {
    created_at: header.indexOf('"created_at"'),
    user_id: header.indexOf('"user_id"'),
    booking_date: header.indexOf('"booking_date"'),
    date_preference: header.indexOf('"date_preference"'),
    address: header.indexOf('"address"'),
    lat: header.indexOf('"lat"'),
    lng: header.indexOf('"lng"'),
    images_url: header.indexOf('"images_url"'),
    note: header.indexOf('"note"'),
    status: header.indexOf('"status"'),
  } as const;

  // naive CSV parsing (quoted fields)
  function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else inQuotes = false;
        } else cur += ch;
      } else {
        if (ch === ',') {
          out.push(cur);
          cur = "";
        } else if (ch === '"') inQuotes = true;
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  let last: string[] | null = null;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols[idx.user_id] === `"${userId}"`) last = cols;
  }
  if (!last) return null;
  const unq = (s: string) => s.replace(/^"|"$/g, '').replace(/""/g, '"');
  return {
    userId,
    bookingDate: unq(last[idx.booking_date] || "") || undefined,
    datePreference: unq(last[idx.date_preference] || ""),
    address: unq(last[idx.address] || ""),
    lat: last[idx.lat] ? Number(unq(last[idx.lat])) : undefined,
    lng: last[idx.lng] ? Number(unq(last[idx.lng])) : undefined,
    imagesUrl: unq(last[idx.images_url] || "") || undefined,
    note: unq(last[idx.note] || "") || undefined,
    status: unq(last[idx.status] || "") || undefined,
  };
}

export async function getBookingSessionByUserId(
  userId: string
): Promise<BookingSessionRow | null> {
  if (sheetsConfigured()) {
    const rec = await getRowByKey(
      BOOKING_SESSIONS_SHEET,
      BOOKING_SESSION_HEADERS,
      "user_id",
      userId
    );
    if (!rec) return null;
    return {
      userId: rec["user_id"],
      step: rec["step"],
      address: rec["address"] || undefined,
      lat: rec["lat"] ? Number(rec["lat"]) : undefined,
      lng: rec["lng"] ? Number(rec["lng"]) : undefined,
      bookingDate: rec["booking_date"] || undefined,
      datePreference: rec["date_preference"] || undefined,
      imagesUrl: rec["images_url"] || undefined,
      lastUpdated: rec["last_updated"] || undefined,
      status: rec["status"] || undefined,
    };
  }

  // CSV fallback
  const fp = BOOKING_SESSIONS_CSV();
  if (!fs.existsSync(fp)) return null;
  const content = fs.readFileSync(fp, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return null;
  const header = lines[0].split(",");
  const idx = {
    user_id: header.indexOf('"user_id"'),
    step: header.indexOf('"step"'),
    address: header.indexOf('"address"'),
    lat: header.indexOf('"lat"'),
    lng: header.indexOf('"lng"'),
    booking_date: header.indexOf('"booking_date"'),
    date_preference: header.indexOf('"date_preference"'),
    images_url: header.indexOf('"images_url"'),
    last_updated: header.indexOf('"last_updated"'),
    status: header.indexOf('"status"'),
  } as const;

  function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else inQuotes = false;
        } else cur += ch;
      } else {
        if (ch === ',') {
          out.push(cur);
          cur = "";
        } else if (ch === '"') inQuotes = true;
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  let last: string[] | null = null;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols[idx.user_id] === `"${userId}"`) last = cols;
  }
  if (!last) return null;
  const unq = (s: string) => s.replace(/^"|"$/g, '').replace(/""/g, '"');
  return {
    userId,
    step: unq(last[idx.step] || ""),
    address: unq(last[idx.address] || "") || undefined,
    lat: last[idx.lat] ? Number(unq(last[idx.lat])) : undefined,
    lng: last[idx.lng] ? Number(unq(last[idx.lng])) : undefined,
    bookingDate: unq(last[idx.booking_date] || "") || undefined,
    datePreference: unq(last[idx.date_preference] || "") || undefined,
    imagesUrl: unq(last[idx.images_url] || "") || undefined,
    lastUpdated: unq(last[idx.last_updated] || "") || undefined,
    status: unq(last[idx.status] || "") || undefined,
  };
}
