import fs from "fs";
import path from "path";

export type BookingStoreEntry = {
  id: string;
  userId: string;
  status: string;
  note?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
};

const STORE_FILE = path.join(process.cwd(), "data", "booking-index.json");

export class BookingStatusError extends Error {
  constructor(public readonly currentStatus: string) {
    super(`Cannot confirm booking with status "${currentStatus}"`);
    this.name = "BookingStatusError";
  }
}

function ensureStoreFile() {
  const dir = path.dirname(STORE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, "[]", "utf8");
  }
}

function readStore(): BookingStoreEntry[] {
  ensureStoreFile();
  const raw = fs.readFileSync(STORE_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw) as BookingStoreEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(entries: BookingStoreEntry[]) {
  ensureStoreFile();
  fs.writeFileSync(STORE_FILE, JSON.stringify(entries, null, 2), "utf8");
}

export function recordBooking(entry: {
  id: string;
  userId: string;
  status?: string;
  note?: string;
  createdAt?: string;
}) {
  const now = new Date().toISOString();
  const entries = readStore();
  const existing = entries.find((item) => item.id === entry.id);
  if (existing) {
    existing.userId = entry.userId;
    existing.status = entry.status ?? existing.status;
    existing.note = entry.note ?? existing.note;
    existing.updatedAt = now;
  } else {
    entries.push({
      id: entry.id,
      userId: entry.userId,
      status: entry.status ?? "pending",
      note: entry.note,
      createdAt: entry.createdAt ?? now,
      updatedAt: now,
    });
  }
  writeStore(entries);
}

export function getBookingById(id: string): BookingStoreEntry | null {
  const entries = readStore();
  return entries.find((item) => item.id === id) ?? null;
}

export function confirmBooking(
  id: string,
  adminNote?: string
): BookingStoreEntry | null {
  const entries = readStore();
  const entry = entries.find((item) => item.id === id);
  if (!entry) return null;
  if (entry.status && entry.status !== "pending") {
    throw new BookingStatusError(entry.status);
  }
  const now = new Date().toISOString();
  entry.status = "confirmed";
  entry.adminNote = adminNote || entry.adminNote;
  entry.confirmedAt = now;
  entry.updatedAt = now;
  writeStore(entries);
  return entry;
}

export function clearBookingStore() {
  const dir = path.dirname(STORE_FILE);
  if (fs.existsSync(STORE_FILE)) {
    fs.unlinkSync(STORE_FILE);
  }
  if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
}
