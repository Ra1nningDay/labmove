// Google Sheets adapter (service account)
// - Uses googleapis with JWT
// - Reads credentials from one of:
//   1) process.env.GOOGLE_CREDENTIALS_JSON (JSON string or file path)
//   2) GOOGLE_APPLICATION_CREDENTIALS (file path)
//   3) GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY
// Requires: SHEET_ID

import fs from "fs";
import path from "path";

// Type definitions for Google Sheets API
interface GoogleSheetsMetadata {
  sheets?: Array<{
    properties?: {
      title?: string;
      sheetId?: number;
      index?: number;
      sheetType?: string;
      gridProperties?: {
        rowCount?: number;
        columnCount?: number;
      };
    };
  }>;
}

interface GoogleSheetsResponse {
  data: GoogleSheetsMetadata;
}

interface GoogleSheetsValuesResponse {
  data: {
    values?: string[][];
  };
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

interface SheetsClient {
  sheets: any; // Google Sheets API client - using any to avoid complex typing
  spreadsheetId: string;
}

interface RecordData {
  [key: string]: unknown;
}

let _google: typeof import("googleapis").google | null = null;

function loadGoogle(): typeof import("googleapis").google {
  if (_google) return _google;
  // Lazy import to avoid loading when not needed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { google } = require("googleapis");
  _google = google;
  return google;
}

function readServiceAccountFromEnv(): ServiceAccount | null {
  const jsonOrPath = process.env.GOOGLE_CREDENTIALS_JSON;
  if (jsonOrPath) {
    try {
      // If the env is a path to a file
      const maybePath = jsonOrPath.trim();
      if (fs.existsSync(maybePath)) {
        const data = JSON.parse(fs.readFileSync(maybePath, "utf8"));
        return {
          client_email: data.client_email,
          private_key: data.private_key,
        };
      }
      const data = JSON.parse(jsonOrPath);
      return { client_email: data.client_email, private_key: data.private_key };
    } catch {
      // ignore and try other methods
    }
  }

  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (gac && fs.existsSync(gac)) {
    try {
      const data = JSON.parse(fs.readFileSync(gac, "utf8"));
      return { client_email: data.client_email, private_key: data.private_key };
    } catch {
      // ignore
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;
  if (email && key) {
    // Support escaped newlines
    key = key.replace(/\\n/g, "\n");
    return { client_email: email, private_key: key };
  }
  return null;
}

export function sheetsConfigured() {
  return !!process.env.SHEET_ID && !!readServiceAccountFromEnv();
}

async function getSheetsClient(): Promise<SheetsClient> {
  const spreadsheetId = process.env.SHEET_ID;
  const sa = readServiceAccountFromEnv();
  if (!spreadsheetId || !sa)
    throw new Error("Missing SHEET_ID or service account envs");

  const google = loadGoogle();
  const scopes = ["https://www.googleapis.com/auth/spreadsheets"]; // read/write
  const auth = new google.auth.JWT(
    sa.client_email,
    undefined,
    sa.private_key,
    scopes
  );
  const sheets = google.sheets({ version: "v4", auth });
  return { sheets, spreadsheetId };
}

async function ensureSheetExists(title: string): Promise<void> {
  const { sheets, spreadsheetId }: SheetsClient = await getSheetsClient();
  const meta: GoogleSheetsResponse = await sheets.spreadsheets.get({
    spreadsheetId,
  });
  const found = meta.data.sheets?.find(
    (s: { properties?: { title?: string } }) => s.properties?.title === title
  );
  if (found) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });
}

async function ensureHeader(title: string, headers: string[]): Promise<void> {
  const { sheets, spreadsheetId }: SheetsClient = await getSheetsClient();
  await ensureSheetExists(title);
  const range = `${title}!1:1`;
  const res: GoogleSheetsValuesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const row = res.data.values?.[0] || [];
  const needUpdate = headers.some((h: string, i: number) => row[i] !== h);
  if (needUpdate) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  }
}

function toRowValues(headers: string[], record: RecordData): string[] {
  return headers.map((h: string) => {
    const v = record[h];
    if (v === undefined || v === null) return "";
    return String(v);
  });
}

function colToA1(n: number) {
  // 0-based index → A, B, ... AA
  let s = "";
  let x = n + 1;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - m) / 26);
  }
  return s;
}

async function findRowByKey(
  title: string,
  headers: string[],
  keyHeader: string,
  keyValue: string
): Promise<number | null> {
  const { sheets, spreadsheetId }: SheetsClient = await getSheetsClient();
  const keyIndex = headers.indexOf(keyHeader);
  if (keyIndex < 0) throw new Error(`Key header not found: ${keyHeader}`);
  const col = colToA1(keyIndex);
  const range = `${title}!${col}2:${col}`; // from row 2
  const res: GoogleSheetsValuesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const values = res.data.values || [];
  for (let i = 0; i < values.length; i++) {
    if ((values[i][0] || "") === keyValue) return i + 2; // data start at row 2
  }
  return null;
}

export async function appendRow(
  title: string,
  headers: string[],
  record: RecordData
): Promise<void> {
  await ensureHeader(title, headers);
  const { sheets, spreadsheetId }: SheetsClient = await getSheetsClient();
  const values = [toRowValues(headers, record)];
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${title}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

export async function upsertRowByKey(
  title: string,
  headers: string[],
  keyHeader: string,
  keyValue: string,
  record: RecordData
): Promise<void> {
  await ensureHeader(title, headers);
  const rowNumber = await findRowByKey(title, headers, keyHeader, keyValue);
  const { sheets, spreadsheetId }: SheetsClient = await getSheetsClient();
  const values = [toRowValues(headers, record)];
  if (rowNumber) {
    const endCol = colToA1(headers.length - 1);
    const range = `${title}!A${rowNumber}:${endCol}${rowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${title}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });
  }
}

// High-level helpers for this app
export const USERS_SHEET = "Users";
export const SIGNUP_SESSIONS_SHEET = "SignupSessions";
export const BOOKINGS_SHEET = "Bookings";
export const BOOKING_SESSIONS_SHEET = "BookingSessions";

export const USERS_HEADERS = [
  "created_at",
  "line_user_id",
  "name",
  "phone",
  "hn",
  "hospital",
  "referral",
  "consent",
  "source",
];

export const SIGNUP_SESSION_HEADERS = [
  "user_id",
  "step",
  "consent",
  "name",
  "phone",
  "hn",
  "hospital",
  "referral",
  "last_updated",
  "status",
];

export const BOOKINGS_HEADERS = [
  "created_at",
  "user_id",
  "booking_date",
  "visit_time_window",
  "address",
  "tests",
  "images_url",
  "note",
  "status",
];

export const BOOKING_SESSION_HEADERS = [
  "user_id",
  "step",
  "address",
  "booking_date",
  "tests",
  "images_url",
  "last_updated",
  "status",
];
