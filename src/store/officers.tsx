"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import type { Officer } from "@/lib/types";
import { OFFICERS } from "@/lib/mock";

type OfficersContextValue = {
  officers: Officer[];
  setOfficers: React.Dispatch<React.SetStateAction<Officer[]>>;
};

const OfficersContext = createContext<OfficersContextValue | undefined>(undefined);

export function OfficersProvider({ children }: { children: React.ReactNode }) {
  const [officers, setOfficers] = useState<Officer[]>(OFFICERS);

  const value = useMemo<OfficersContextValue>(() => ({ officers, setOfficers }), [officers]);

  return <OfficersContext.Provider value={value}>{children}</OfficersContext.Provider>;
}

export function useOfficers() {
  const ctx = useContext(OfficersContext);
  if (!ctx) throw new Error("useOfficers must be used within OfficersProvider");
  return ctx;
}

