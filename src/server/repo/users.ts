// Repository abstraction for saving users
// Default: append to data/users.csv (created if missing)
// Optional: implement Google Sheets by setting SHEET_ID and service account envs later

import fs from "fs";
import path from "path";

export type UserRow = {
  lineUserId: string;
  name: string;
  phone: string;
  address: string;
  consent: boolean;
};

function dataDir() {
  const d = path.join(process.cwd(), "data");
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

const CSV_PATH = () => path.join(dataDir(), "users.csv");

function toCsv(row: UserRow) {
  const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';
  return [new Date().toISOString(), row.lineUserId, row.name, row.phone, row.address, row.consent ? "1" : "0"].map(esc).join(",");
}

export async function saveUser(row: UserRow) {
  // If configured for Sheets in the future, call that adapter here
  const header = '"created_at","line_user_id","name","phone","address","consent"\n';
  const fp = CSV_PATH();
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, header, "utf8");
  fs.appendFileSync(fp, toCsv(row) + "\n", "utf8");
}

