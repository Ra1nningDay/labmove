"use client";

import React from "react";
import type { Officer, Task } from "@/lib/types";
import { haversineKm } from "@/lib/geo";

type Props = {
  officers: Officer[];
  selectedTask?: Task | null;
};

export function OfficerList({ officers, selectedTask }: Props) {
  return (
    <div className="space-y-2">
      {officers.map((o) => {
        const dist = selectedTask
          ? haversineKm(o.base, selectedTask.coords).toFixed(1)
          : undefined;
        return (
          <div key={o.id} className="rounded-md border p-3 bg-card/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{o.name}</div>
                <div className="text-xs text-muted-foreground">{o.zoneLabel} • {o.phone}</div>
              </div>
              {dist && <div className="text-xs text-muted-foreground">{dist} กม.</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

