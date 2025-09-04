"use client";

import React from "react";
import { OfficersProvider } from "@/store/officers";
import { TasksProvider } from "@/store/tasks";

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <OfficersProvider>
      <TasksProvider>{children}</TasksProvider>
    </OfficersProvider>
  );
}

