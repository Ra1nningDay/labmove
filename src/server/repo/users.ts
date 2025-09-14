// Repository abstraction for saving users
// Default: append to data/users.csv (created if missing)
// If SHEET_ID + service account envs are set, append to Google Sheets instead

import fs from "fs";
import path from "path";
import {
  sheetsConfigured,
  appendRow as sheetsAppendRow,
  getRowByKey,
  getRowsByKey,
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

export async function findUserByLineId(lineUserId: string): Promise<UserRow | null> {
  if (sheetsConfigured()) {
    const rec = await getRowByKey(USERS_SHEET, USERS_HEADERS, "line_user_id", lineUserId);
    if (!rec) return null;
    return {
      lineUserId: rec["line_user_id"],
      name: rec["name"] || "",
      phone: rec["phone"] || "",
      hn: rec["hn"] || "",
      hospital: rec["hospital"] || "",
      referral: rec["referral"] || "",
      consent: rec["consent"] === "1" || rec["consent"] === "true",
    };
  }

  // CSV fallback lookup
  const fp = CSV_PATH();
  if (!fs.existsSync(fp)) return null;
  const content = fs.readFileSync(fp, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return null; // only header

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
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else {
        if (ch === ',') {
          out.push(cur);
          cur = "";
        } else if (ch === '"') {
          inQuotes = true;
        } else {
          cur += ch;
        }
      }
    }
    out.push(cur);
    return out;
  }

  const header = parseCsvLine(lines[0]);
  const idx = {
    created_at: header.indexOf("created_at"),
    line_user_id: header.indexOf("line_user_id"),
    name: header.indexOf("name"),
    phone: header.indexOf("phone"),
    hn: header.indexOf("hn"),
    hospital: header.indexOf("hospital"),
    referral: header.indexOf("referral"),
    consent: header.indexOf("consent"),
  };

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols[idx.line_user_id] === lineUserId) {
      return {
        lineUserId,
        name: cols[idx.name] || "",
        phone: cols[idx.phone] || "",
        hn: cols[idx.hn] || "",
        hospital: cols[idx.hospital] || "",
        referral: cols[idx.referral] || "",
        consent: (cols[idx.consent] || "") === "1" || (cols[idx.consent] || "").toLowerCase() === "true",
      };
    }
  }

  return null;
}

export async function findUsersByLineId(
  lineUserId: string
): Promise<UserRow[]> {
  if (sheetsConfigured()) {
    const list = await getRowsByKey(
      USERS_SHEET,
      USERS_HEADERS,
      "line_user_id",
      lineUserId
    );
    return list.map((rec) => ({
      lineUserId: rec["line_user_id"],
      name: rec["name"] || "",
      phone: rec["phone"] || "",
      hn: rec["hn"] || "",
      hospital: rec["hospital"] || "",
      referral: rec["referral"] || "",
      consent: rec["consent"] === "1" || rec["consent"] === "true",
    }));
  }

  const fp = CSV_PATH();
  if (!fs.existsSync(fp)) return [];
  const content = fs.readFileSync(fp, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];

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
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else {
        if (ch === ',') {
          out.push(cur);
          cur = "";
        } else if (ch === '"') {
          inQuotes = true;
        } else {
          cur += ch;
        }
      }
    }
    out.push(cur);
    return out;
  }

  const header = parseCsvLine(lines[0]);
  const idx = {
    line_user_id: header.indexOf("line_user_id"),
    name: header.indexOf("name"),
    phone: header.indexOf("phone"),
    hn: header.indexOf("hn"),
    hospital: header.indexOf("hospital"),
    referral: header.indexOf("referral"),
    consent: header.indexOf("consent"),
  } as const;

  const result: UserRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols[idx.line_user_id] === lineUserId) {
      result.push({
        lineUserId,
        name: cols[idx.name] || "",
        phone: cols[idx.phone] || "",
        hn: cols[idx.hn] || "",
        hospital: cols[idx.hospital] || "",
        referral: cols[idx.referral] || "",
        consent:
          (cols[idx.consent] || "") === "1" ||
          (cols[idx.consent] || "").toLowerCase() === "true",
      });
    }
  }
  return result;
}
