"use client";

import React from "react";
import { APIProvider } from "@vis.gl/react-google-maps";

// Suppress Google Maps Vector fallback warnings in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args) => {
    const message = args[0]?.toString?.() || "";
    if (
      message.includes("Vector Map") &&
      (message.includes("Falling back to Raster") || message.includes("failed"))
    ) {
      // This is a harmless fallback - suppress the warning
      return;
    }
    originalError.apply(console, args);
  };
}

export function GoogleMapsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    // No key: render children without provider so fallbacks can work
    return <>{children}</>;
  }
  return (
    <APIProvider apiKey={apiKey} libraries={["places", "geometry"]}>
      {children}
    </APIProvider>
  );
}
