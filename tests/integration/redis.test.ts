import {
  setUserSession,
  getUserSession,
  clearUserSession,
  checkRateLimit,
  closeRedis,
} from "@/lib/redis";

jest.mock("ioredis", () => {
  class MockRedis {
    private store = new Map<string, { value: string; expire?: number }>();
    public status = "ready";
    constructor() {}
    async connect() {
      this.status = "ready";
    }
    on() {
      /* no-op */
    }
    async quit() {
      this.store.clear();
    }
    async setex(key: string, ttl: number, value: string) {
      this.store.set(key, { value, expire: Date.now() + ttl * 1000 });
    }
    async get(key: string) {
      const entry = this.store.get(key);
      if (!entry) return null;
      if (entry.expire && entry.expire <= Date.now()) {
        this.store.delete(key);
        return null;
      }
      return entry.value;
    }
    async del(key: string) {
      this.store.delete(key);
    }
    async incr(key: string) {
      const entry = this.store.get(key);
      const current = entry ? Number(entry.value) : 0;
      const next = current + 1;
      this.store.set(key, {
        value: String(next),
        expire: entry?.expire ?? Date.now() + 60 * 1000,
      });
      return next;
    }
    async expire(key: string, ttl: number) {
      const entry = this.store.get(key);
      if (entry) entry.expire = Date.now() + ttl * 1000;
    }
    async ttl(key: string) {
      const entry = this.store.get(key);
      if (!entry || !entry.expire) return -1;
      const ms = entry.expire - Date.now();
      return ms <= 0 ? 0 : Math.ceil(ms / 1000);
    }
  }
  return MockRedis;
});

describe("Integration: Redis utilities", () => {
  afterEach(async () => {
    await closeRedis();
    jest.clearAllMocks();
  });

  it("stores and retrieves user session data", async () => {
    await setUserSession("user-1", { foo: "bar" }, 60);
    const session = await getUserSession("user-1");
    expect(session).toEqual({ foo: "bar" });

    await clearUserSession("user-1");
    const cleared = await getUserSession("user-1");
    expect(cleared).toBeNull();
  });

  it("enforces simple rate limiting counts", async () => {
    const first = await checkRateLimit("user-rl", 2, 60);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);

    const second = await checkRateLimit("user-rl", 2, 60);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);

    const third = await checkRateLimit("user-rl", 2, 60);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });
});
