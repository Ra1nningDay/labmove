/**
 * Test Helper: Next.js App Router API Testing
 *
 * Provides a standardized way to test Next.js App Router API routes
 * by calling them directly without starting a full server.
 */

import { NextRequest } from "next/server";

// Cache imported handlers to improve performance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlerCache = new Map<string, any>();

/**
 * Creates a test app instance that can handle API route testing
 * using Next.js App Router patterns
 */
export function createTestApp() {
  return {
    async request(
      method: string,
      url: string,
      data?: unknown,
      headers?: Record<string, string>
    ) {
      // Create a NextRequest object for App Router handlers
      const requestHeaders = new Headers({
        "content-type": "application/json",
        ...headers,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestInit: any = {
        method,
        headers: requestHeaders,
      };

      if (
        data &&
        (method === "POST" || method === "PUT" || method === "PATCH")
      ) {
        requestInit.body = JSON.stringify(data);
      }

      const fullUrl = url.startsWith("http")
        ? url
        : `http://localhost:3000${url}`;
      const request = new NextRequest(fullUrl, requestInit);

      // Import and call the appropriate API route handler
      try {
        let response: Response;

        // Route mapping with caching
        const routeMap = [
          {
            pattern: "/api/liff/signup",
            module: "@/app/api/liff/signup/route",
          },
          {
            pattern: "/api/liff/booking",
            module: "@/app/api/liff/booking/route",
          },
          {
            pattern: "/api/line/webhook",
            module: "@/app/api/line/webhook/route",
          },
          { pattern: "/api/geocode", module: "@/app/api/geocode/route" },
        ];

        const matchedRoute = routeMap.find((route) =>
          url.startsWith(route.pattern)
        );

        if (matchedRoute) {
          // Use cache to avoid repeated imports
          let handler = handlerCache.get(matchedRoute.module);
          if (!handler) {
            handler = await import(matchedRoute.module);
            handlerCache.set(matchedRoute.module, handler);
          }

          if (method === "POST" && handler.POST) {
            response = await handler.POST(request);
          } else if (method === "GET" && handler.GET) {
            response = await handler.GET(request);
          } else if (method === "PUT" && handler.PUT) {
            response = await handler.PUT(request);
          } else if (method === "DELETE" && handler.DELETE) {
            response = await handler.DELETE(request);
          } else {
            response = new Response("Method Not Allowed", { status: 405 });
          }
        } else {
          response = new Response("Not Found", { status: 404 });
        }

        // Parse response body
        let body: unknown = null;
        const responseText = await response.text();
        if (responseText) {
          try {
            body = JSON.parse(responseText);
          } catch {
            body = responseText;
          }
        }

        return {
          status: response.status,
          body,
          headers: Object.fromEntries(response.headers.entries()),
        };
      } catch (error) {
        console.error("Test API route error:", error);
        return {
          status: 500,
          body: {
            error: "Internal Server Error",
            details: error instanceof Error ? error.message : String(error),
          },
          headers: {},
        };
      }
    },
  };
}

/**
 * Enhanced supertest-like interface for testing with better error messages
 */
export function request(app: ReturnType<typeof createTestApp>) {
  return {
    post: (url: string) => ({
      send: async (data: unknown) => {
        const response = await app.request("POST", url, data);
        return {
          status: response.status,
          body: response.body,
          headers: response.headers,
          // Improved expect with better error messages
          expect: (expectedStatus: number) => {
            if (response.status !== expectedStatus) {
              const responseBody = response.body as { error?: unknown };
              const errorDetails = responseBody?.error
                ? `\nError: ${JSON.stringify(responseBody.error, null, 2)}`
                : `\nResponse: ${JSON.stringify(responseBody, null, 2)}`;

              throw new Error(
                `Expected status ${expectedStatus}, got ${response.status}${errorDetails}`
              );
            }
            return { body: response.body, headers: response.headers };
          },
          // Chain-able assertions
          expectStatus: (expectedStatus: number) => {
            if (response.status !== expectedStatus) {
              throw new Error(
                `Expected status ${expectedStatus}, got ${response.status}`
              );
            }
            return {
              body: response.body,
              headers: response.headers,
              expectBody: (bodyMatcher: (body: unknown) => boolean | void) => {
                const result = bodyMatcher(response.body);
                if (result === false) {
                  throw new Error(
                    `Body expectation failed: ${JSON.stringify(response.body)}`
                  );
                }
                return { body: response.body, headers: response.headers };
              },
            };
          },
        };
      },
    }),
    get: (url: string) => ({
      query: (params: Record<string, string>) => ({
        expect: async (expectedStatus: number) => {
          const queryString = new URLSearchParams(params).toString();
          const fullUrl = `${url}?${queryString}`;
          const response = await app.request("GET", fullUrl);

          if (response.status !== expectedStatus) {
            throw new Error(
              `Expected status ${expectedStatus}, got ${
                response.status
              }. Response: ${JSON.stringify(response.body)}`
            );
          }
          return { body: response.body, headers: response.headers };
        },
      }),
    }),
  };
}
