"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import type { Officer } from "@/lib/types";
import { OFFICERS } from "@/lib/mock";
import { buildHomeVisitData } from "@/lib/homeVisit";

type OfficersContextValue = {
  officers: Officer[];
  setOfficers: React.Dispatch<React.SetStateAction<Officer[]>>;
};

const OfficersContext = createContext<OfficersContextValue | undefined>(undefined);

export function OfficersProvider({ children }: { children: React.ReactNode }) {
  // Prefer officers from home visit mock if available; fall back to default mock
  const hv = buildHomeVisitData();
  const initial = hv.officers.length > 0 ? hv.officers : OFFICERS;
  const [officers, setOfficers] = useState<Officer[]>(initial);

  const value = useMemo<OfficersContextValue>(() => ({ officers, setOfficers }), [officers]);

  return <OfficersContext.Provider value={value}>{children}</OfficersContext.Provider>;
}

export function useOfficers() {
  const ctx = useContext(OfficersContext);
  if (!ctx) throw new Error("useOfficers must be used within OfficersProvider");
  return ctx;
}
