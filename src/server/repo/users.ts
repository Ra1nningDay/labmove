// Repository abstraction for saving users
// Default: append to data/users.csv (created if missing)
// If SHEET_ID + service account envs are set, append to Google Sheets instead

import fs from "fs";
import path from "path";
import {
  sheetsConfigured,
  appendRow as sheetsAppendRow,
  USERS_HEADERS,
  USERS_SHEET,
} from "@/server/repo/sheets";

export type UserRow = {
  lineUserId: string;
  name: string;
  phone: string;
  address?: string; // kept for backward compat (booking flow stores address later)
  consent: boolean;
  hn?: string;
  hospital?: string;
  referral?: string;
};

function dataDir() {
  const d = path.join(process.cwd(), "data");
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

const CSV_PATH = () => path.join(dataDir(), "users.csv");

function toCsv(row: UserRow) {
  const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';
  const values = [
    new Date().toISOString(),
    row.lineUserId,
    row.name,
    row.phone,
    row.hn || "",
    row.hospital || "",
    row.referral || "",
    row.consent ? "1" : "0",
    "LINE", // source
  ];
  return values.map((v) => esc(String(v))).join(",");
}

export async function saveUser(row: UserRow) {
  if (sheetsConfigured()) {
    await sheetsAppendRow(USERS_SHEET, USERS_HEADERS, {
      created_at: new Date().toISOString(),
      line_user_id: row.lineUserId,
      name: row.name,
      phone: row.phone,
      hn: row.hn || "",
      hospital: row.hospital || "",
      referral: row.referral || "",
      consent: row.consent ? "1" : "0",
      source: "LINE",
    });
    return;
  }

  const header = '"created_at","line_user_id","name","phone","hn","hospital","referral","consent","source"\n';
  const fp = CSV_PATH();
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, header, "utf8");
  fs.appendFileSync(fp, toCsv(row) + "\n", "utf8");
}
