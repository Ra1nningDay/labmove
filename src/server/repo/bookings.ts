import fs from "fs";
import path from "path";
import {
  sheetsConfigured,
  appendRow as sheetsAppendRow,
  upsertRowByKey,
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
