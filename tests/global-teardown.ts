/**
 * Jest Global Teardown for LabMove Testing
 *
 * Cleans up test environment and closes connections after test suite completion.
 */

export default async function globalTeardown() {
  console.log("🧪 Tearing down global test environment...");

  // Clean up Redis test data
  if (process.env.REDIS_HOST) {
    try {
      const Redis = require("ioredis");
      const redis = new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || "6379"),
        db: parseInt(process.env.REDIS_DB || "15"),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 1,
        retryDelayOnFailover: 100,
        connectTimeout: 2000,
        commandTimeout: 1000,
      });

      await redis.flushdb(); // Clear test database
      await redis.quit();
      console.log("✅ Redis test data cleared");
    } catch (error) {
      console.warn("⚠️ Failed to clean up Redis test data:", error);
    }
  }

  console.log("✅ Global test environment cleaned up");
}
