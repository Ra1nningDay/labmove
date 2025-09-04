"use client";

import React from "react";
import { APIProvider } from "@vis.gl/react-google-maps";

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    // No key: render children without provider so fallbacks can work
    return <>{children}</>;
  }
  return <APIProvider apiKey={apiKey}>{children}</APIProvider>;
}

