/**
 * Redis Client Configuration for LabMove Digital Assistant Platform
 *
 * Provides centralized Redis connection management with health checks,
 * retry logic, and caching utilities for healthcare operations.
 */

import Redis from "ioredis";
import { reportHealthcareError } from "./sentry";

// Redis client instances
let redisClient: Redis | null = null;
let healthCheckInterval: NodeJS.Timeout | null = null;

// Connection configuration
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || "0"),

  // Connection pool settings
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxLoadingTimeout: 5000,

  // Reconnection strategy
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    console.log(`Redis retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },

  // Reconnection settings
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

/**
 * Initialize Redis connection with health monitoring
 */
export async function initRedis(): Promise<Redis> {
  if (redisClient && redisClient.status === "ready") {
    return redisClient;
  }

  try {
    redisClient = new Redis(REDIS_CONFIG);

    // Setup event handlers
    setupRedisEventHandlers(redisClient);

    // Wait for connection
    await redisClient.connect();

    // Start health monitoring
    startHealthMonitoring();

    console.log("Redis connection established successfully");
    return redisClient;
  } catch (error) {
    console.error("Failed to initialize Redis:", error);
    reportHealthcareError(error as Error, {
      operation: "redis_init",
      severity: "critical",
    });
    throw new Error(`Redis initialization failed: ${error}`);
  }
}

/**
 * Get Redis client instance (initializes if not ready)
 */
export async function getRedisClient(): Promise<Redis> {
  if (!redisClient || redisClient.status !== "ready") {
    return await initRedis();
  }
  return redisClient;
}

/**
 * Setup Redis event handlers for monitoring
 */
function setupRedisEventHandlers(client: Redis) {
  client.on("connect", () => {
    console.log("Redis client connected");
  });

  client.on("ready", () => {
    console.log("Redis client ready for commands");
  });

  client.on("error", (error) => {
    console.error("Redis client error:", error);
    reportHealthcareError(error, {
      operation: "redis_connection_error",
      severity: "high",
    });
  });

  client.on("close", () => {
    console.log("Redis connection closed");
  });

  client.on("reconnecting", (ms: number) => {
    console.log(`Redis reconnecting in ${ms}ms`);
  });

  client.on("end", () => {
    console.log("Redis connection ended");
  });
}

/**
 * Start Redis health monitoring
 */
function startHealthMonitoring() {
  // Clear existing interval
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  // Check health every 30 seconds
  healthCheckInterval = setInterval(async () => {
    try {
      if (redisClient) {
        await redisClient.ping();
      }
    } catch (error) {
      console.error("Redis health check failed:", error);
      reportHealthcareError(error as Error, {
        operation: "redis_health_check",
        severity: "medium",
      });
    }
  }, 30000);
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Check Redis connection health
 */
export async function checkRedisHealth(): Promise<{
  status: "healthy" | "unhealthy";
  latency?: number;
  error?: string;
}> {
  try {
    if (!redisClient || redisClient.status !== "ready") {
      return { status: "unhealthy", error: "Redis client not connected" };
    }

    const start = Date.now();
    await redisClient.ping();
    const latency = Date.now() - start;

    return { status: "healthy", latency };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Cache utilities for healthcare operations

/**
 * Cache geocoding results with TTL
 */
export async function cacheGeocode(
  address: string,
  geocodeResult: { lat: number; lng: number; formatted_address: string }
): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = `geocode:${Buffer.from(address).toString("base64")}`;

    await client.setex(
      key,
      7 * 24 * 60 * 60, // 7 days TTL
      JSON.stringify(geocodeResult)
    );
  } catch (error) {
    console.error("Failed to cache geocode result:", error);
    // Don't throw - caching failure shouldn't break the flow
  }
}

/**
 * Get cached geocoding result
 */
export async function getCachedGeocode(
  address: string
): Promise<{ lat: number; lng: number; formatted_address: string } | null> {
  try {
    const client = await getRedisClient();
    const key = `geocode:${Buffer.from(address).toString("base64")}`;

    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error("Failed to get cached geocode result:", error);
    return null;
  }
}

/**
 * Store webhook idempotency key
 */
export async function setWebhookIdempotency(
  webhookId: string,
  ttlSeconds: number = 300
): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const key = `webhook:${webhookId}`;

    const result = await client.set(key, "1", "EX", ttlSeconds, "NX");
    return result === "OK";
  } catch (error) {
    console.error("Failed to set webhook idempotency:", error);
    return false;
  }
}

/**
 * Check if webhook was already processed
 */
export async function checkWebhookIdempotency(
  webhookId: string
): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const key = `webhook:${webhookId}`;

    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    console.error("Failed to check webhook idempotency:", error);
    return false;
  }
}

/**
 * Rate limiting for API endpoints
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  try {
    const client = await getRedisClient();
    const key = `rate_limit:${identifier}`;

    const current = await client.incr(key);

    if (current === 1) {
      await client.expire(key, windowSeconds);
    }

    const ttl = await client.ttl(key);
    const resetTime = Date.now() + ttl * 1000;

    return {
      allowed: current <= maxRequests,
      remaining: Math.max(0, maxRequests - current),
      resetTime,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open - allow request if Redis is down
    return {
      allowed: true,
      remaining: maxRequests,
      resetTime: Date.now() + windowSeconds * 1000,
    };
  }
}

/**
 * Store user session data
 */
export async function setUserSession(
  userId: string,
  sessionData: Record<string, unknown>,
  ttlSeconds: number = 24 * 60 * 60 // 24 hours
): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = `session:${userId}`;

    await client.setex(key, ttlSeconds, JSON.stringify(sessionData));
  } catch (error) {
    console.error("Failed to set user session:", error);
    reportHealthcareError(error as Error, {
      operation: "redis_set_session",
      userId,
      severity: "medium",
    });
  }
}

/**
 * Get user session data
 */
export async function getUserSession(
  userId: string
): Promise<Record<string, unknown> | null> {
  try {
    const client = await getRedisClient();
    const key = `session:${userId}`;

    const session = await client.get(key);
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error("Failed to get user session:", error);
    return null;
  }
}

/**
 * Clear user session data
 */
export async function clearUserSession(userId: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = `session:${userId}`;

    await client.del(key);
  } catch (error) {
    console.error("Failed to clear user session:", error);
  }
}

/**
 * Cache booking confirmation data temporarily
 */
export async function cacheBookingConfirmation(
  confirmationId: string,
  bookingData: Record<string, unknown>,
  ttlSeconds: number = 600 // 10 minutes
): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = `booking_confirmation:${confirmationId}`;

    await client.setex(key, ttlSeconds, JSON.stringify(bookingData));
  } catch (error) {
    console.error("Failed to cache booking confirmation:", error);
  }
}

/**
 * Get cached booking confirmation data
 */
export async function getCachedBookingConfirmation(
  confirmationId: string
): Promise<Record<string, unknown> | null> {
  try {
    const client = await getRedisClient();
    const key = `booking_confirmation:${confirmationId}`;

    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error("Failed to get cached booking confirmation:", error);
    return null;
  }
}

// Handle graceful shutdown
if (typeof process !== "undefined") {
  process.on("SIGTERM", closeRedis);
  process.on("SIGINT", closeRedis);
}
