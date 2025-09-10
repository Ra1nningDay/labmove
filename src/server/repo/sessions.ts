import fs from "fs";
import path from "path";
import type { SignupProgress } from "@/server/agent/signupFlow";
import {
  sheetsConfigured,
  upsertRowByKey,
  SIGNUP_SESSIONS_SHEET,
  SIGNUP_SESSION_HEADERS,
} from "@/server/repo/sheets";

type SignupSessionRow = {
  user_id: string;
  step: string;
  consent?: boolean;
  name?: string;
  phone?: string;
  hn?: string;
  hospital?: string;
  referral?: string;
  last_updated: string;
  status?: string; // in_progress | completed
};

function dataDir() {
  const d = path.join(process.cwd(), "data");
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

const CSV_PATH = () => path.join(dataDir(), "signup_sessions.csv");

function csvHeader() {
  return (
    '"user_id","step","consent","name","phone","hn","hospital","referral","last_updated","status"\n'
  );
}

function toCsv(row: SignupSessionRow) {
  const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';
  const vals = [
    row.user_id,
    row.step,
    row.consent ? "1" : "0",
    row.name || "",
    row.phone || "",
    row.hn || "",
    row.hospital || "",
    row.referral || "",
    row.last_updated,
    row.status || "in_progress",
  ];
  return vals.map((v) => esc(String(v))).join(",");
}

export async function upsertSignupSession(userId: string, progress: SignupProgress, status?: string) {
  const row: SignupSessionRow = {
    user_id: userId,
    step: progress.step,
    consent: progress.consent,
    name: progress.name,
    phone: progress.phone,
    hn: progress.hn,
    hospital: progress.hospital,
    referral: progress.referral,
    last_updated: new Date().toISOString(),
    status: status || (progress.step === "done" ? "completed" : "in_progress"),
  };

  if (sheetsConfigured()) {
    await upsertRowByKey(
      SIGNUP_SESSIONS_SHEET,
      SIGNUP_SESSION_HEADERS,
      "user_id",
      userId,
      row as any
    );
    return;
  }

  // CSV fallback: append (no real upsert)
  const fp = CSV_PATH();
  if (!fs.existsSync(fp)) fs.writeFileSync(fp, csvHeader(), "utf8");
  fs.appendFileSync(fp, toCsv(row) + "\n", "utf8");
}

