// Minimal in-memory session store with TTL
export type UserProgress = import("@/server/agent/signupFlow").SignupProgress;

type Entry = { value: UserProgress; expiresAt: number };
const TTL_MS = 1000 * 60 * 30; // 30 minutes
const mem = new Map<string, Entry>();

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

