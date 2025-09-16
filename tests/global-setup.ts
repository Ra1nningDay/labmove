/**
 * Jest Global Setup for LabMove Testing
 *
 * Initializes test environment, database connections, and external services
 * before running the test suite.
 */

export default async function globalSetup() {
  // Load test environment variables
  const dotenv = require("dotenv");
  dotenv.config({ path: ".env.test" });

  console.log("🧪 Setting up global test environment...");

  // Set up test-specific environment variables
  (process.env as any).NODE_ENV = "test";
  (process.env as any).REDIS_DB = "15"; // Use separate Redis DB for tests
  (process.env as any).SENTRY_ENVIRONMENT = "test";

  // Disable external service calls in tests by default
  (process.env as any).GOOGLE_SHEETS_ENABLED = "false";
  (process.env as any).LINE_MESSAGING_ENABLED = "false";
  (process.env as any).SENTRY_ENABLED = "false";

  console.log("✅ Global test environment ready");
}
