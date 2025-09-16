/**
 * Jest Setup File for LabMove Testing
 *
 * Configures Jest environment and provides global test utilities.
 */

// Extend Jest matchers
expect.extend({
  toBeISODateString(received: unknown) {
    const pass = typeof received === "string" && !isNaN(Date.parse(received));
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ISO date string`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ISO date string`,
        pass: false,
      };
    }
  },

  toBeLineUserId(received: unknown) {
    const pass =
      typeof received === "string" &&
      received.startsWith("U") &&
      received.length === 33;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid LINE User ID`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be a valid LINE User ID (U + 32 chars)`,
        pass: false,
      };
    }
  },

  toBeThaiPhoneNumber(received: unknown) {
    const pass = typeof received === "string" && /^0[0-9]{8,9}$/.test(received);
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be a valid Thai phone number`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be a valid Thai phone number (0xxxxxxxxx)`,
        pass: false,
      };
    }
  },
});

// Global test utilities
(global as Record<string, unknown>).testUtils = {
  /**
   * Generate a mock LINE User ID
   */
  generateLineUserId(): string {
    return "U" + Math.random().toString(36).substring(2, 34).padEnd(32, "0");
  },

  /**
   * Generate a mock Thai phone number
   */
  generateThaiPhone(): string {
    return "0" + Math.floor(Math.random() * 900000000 + 100000000).toString();
  },

  /**
   * Generate a mock address in Thailand
   */
  generateThaiAddress(): string {
    const addresses = [
      "123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110",
      "456 ถนนเพชรบุรี แขวงราชเทวี เขตราชเทวี กรุงเทพมหานคร 10400",
      "789 ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500",
      "321 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร 10900",
    ];
    return addresses[Math.floor(Math.random() * addresses.length)];
  },

  /**
   * Generate mock coordinates in Bangkok area
   */
  generateBangkokCoordinates(): { lat: number; lng: number } {
    return {
      lat: 13.7563 + (Math.random() - 0.5) * 0.2, // Bangkok center ± ~11km
      lng: 100.5018 + (Math.random() - 0.5) * 0.2,
    };
  },

  /**
   * Sleep for testing async operations
   */
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Generate a future date for appointments
   */
  generateFutureDate(daysFromNow: number = 1): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0); // 9 AM - 5 PM
    return date;
  },
};

// Console setup for tests
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  // Suppress expected error logs in tests
  const message = args[0]?.toString() || "";
  if (
    message.includes("Warning: ReactDOM.render is deprecated") ||
    message.includes("Warning: componentWillReceiveProps") ||
    message.includes("Redis connection") ||
    message.includes("Sentry")
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Type declarations for global utilities
export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeISODateString(): R;
      toBeLineUserId(): R;
      toBeThaiPhoneNumber(): R;
    }
  }

  var testUtils: {
    generateLineUserId(): string;
    generateThaiPhone(): string;
    generateThaiAddress(): string;
    generateBangkokCoordinates(): { lat: number; lng: number };
    sleep(ms: number): Promise<void>;
    generateFutureDate(daysFromNow?: number): Date;
  };
}
