/**
 * Jest Global Setup for LabMove Testing
 *
 * Initializes test environment, database connections, and external services
 * before running the test suite.
 */

import dotenv from "dotenv";

export default async function globalSetup() {
  // Load test environment variables
  dotenv.config({ path: ".env.test" });

  console.log("🧪 Setting up global test environment...");

  // Set up test-specific environment variables
  const env = process.env as Record<string, string | undefined>;
  env.NODE_ENV = "test";
  env.REDIS_DB = "15"; // Use separate Redis DB for tests
  env.SENTRY_ENVIRONMENT = "test";

  // Disable external service calls in tests by default
  env.GOOGLE_SHEETS_ENABLED = "false";
  env.LINE_MESSAGING_ENABLED = "false";
  env.SENTRY_ENABLED = "false";

  console.log("✅ Global test environment ready");
}
