// Minimal in-memory session store with TTL
export type UserProgress = import("@/server/agent/signupFlow").SignupProgress;
export type BookingProgress = import("@/server/agent/bookingFlow").BookingProgress;

// Registered user cache (24h)
export type RegisteredUser = {
  lineUserId: string;
  name?: string;
  phone?: string;
  hn?: string;
  hospital?: string;
  referral?: string;
  registered: boolean;
};

type Entry = { value: UserProgress; expiresAt: number };
const TTL_MS = 1000 * 60 * 30; // 30 minutes
const mem = new Map<string, Entry>();

type BookingEntry = { value: BookingProgress; expiresAt: number };
const bookingMem = new Map<string, BookingEntry>();

type RegEntry = { value: RegisteredUser; expiresAt: number };
const REG_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const reg = new Map<string, RegEntry>();

// Meta: mode + lastEventId for idempotency/router
export type SessionMode = "idle" | "signup" | "booking" | "llm";
export type UserMeta = { mode?: SessionMode; lastEventId?: string };
type MetaEntry = { value: UserMeta; expiresAt: number };
const meta = new Map<string, MetaEntry>();

export function getUserProgress(userId: string): UserProgress | undefined {
  const e = mem.get(userId);
  if (!e) return undefined;
  if (e.expiresAt < Date.now()) {
    mem.delete(userId);
    return undefined;
  }
  return e.value;
}

export function upsertUserProgress(userId: string, value: UserProgress) {
  mem.set(userId, { value, expiresAt: Date.now() + TTL_MS });
}

export function clearUserProgress(userId: string) {
  mem.delete(userId);
}

export function getBookingProgress(userId: string): BookingProgress | undefined {
  const e = bookingMem.get(userId);
  if (!e) return undefined;
  if (e.expiresAt < Date.now()) {
    bookingMem.delete(userId);
    return undefined;
  }
  return e.value;
}

export function upsertBookingProgress(userId: string, value: BookingProgress) {
  bookingMem.set(userId, { value, expiresAt: Date.now() + TTL_MS });
}

export function clearBookingProgress(userId: string) {
  bookingMem.delete(userId);
}

export function getRegisteredUserCached(userId: string): RegisteredUser | undefined {
  const e = reg.get(userId);
  if (!e) return undefined;
  if (e.expiresAt < Date.now()) {
    reg.delete(userId);
    return undefined;
  }
  return e.value;
}

export function upsertRegisteredUserCached(userId: string, value: RegisteredUser) {
  reg.set(userId, { value, expiresAt: Date.now() + REG_TTL_MS });
}

export function clearRegisteredUserCached(userId: string) {
  reg.delete(userId);
}

export function getUserMeta(userId: string): UserMeta | undefined {
  const e = meta.get(userId);
  if (!e) return undefined;
  if (e.expiresAt < Date.now()) {
    meta.delete(userId);
    return undefined;
  }
  return e.value;
}

export function upsertUserMeta(userId: string, value: UserMeta) {
  meta.set(userId, { value, expiresAt: Date.now() + REG_TTL_MS });
}

export function clearUserMeta(userId: string) {
  meta.delete(userId);
}
