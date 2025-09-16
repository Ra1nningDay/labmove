import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Don't externalize OpenTelemetry instrumentation packages
    serverComponentsExternalPackages: [
      // Keep other packages external, but not OpenTelemetry
    ],
  },
  // Explicitly include OpenTelemetry dependencies as bundled (not external)
  serverExternalPackages: [
    // Exclude OpenTelemetry packages from being external
    "!@opentelemetry/*",
    "!import-in-the-middle",
    "!require-in-the-middle",
  ],
  async headers() {
    return [
      {
        // Cache rich menu image and other public assets under /richmenu
        source: "/richmenu/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
