"use client";

import React from "react";
import type { Officer, Task } from "@/lib/types";
import { haversineKm } from "@/lib/geo";
import { Button } from "@/components/ui/button";

type Props = {
  officers: Officer[];
  selectedTask?: Task | null;
  onShowRoute?: (officerId: string) => void;
};

export function OfficerList({ officers, selectedTask, onShowRoute }: Props) {
  return (
    <div className="space-y-2">
      {officers.map((o) => {
        const dist = selectedTask
          ? haversineKm(o.base, selectedTask.coords).toFixed(1)
          : undefined;
        return (
          <div key={o.id} className="rounded-md border p-3 bg-card/50">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium text-sm">{o.name}</div>
                <div className="text-xs text-muted-foreground">{o.zoneLabel} • {o.phone}</div>
              </div>
              <div className="flex items-center gap-2">
                {dist && <div className="text-xs text-muted-foreground">{dist} กม.</div>}
                {onShowRoute && (
                  <Button size="sm" variant="outline" onClick={() => onShowRoute(o.id)}>
                    เส้นทาง
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
