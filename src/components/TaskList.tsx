"use client";

import React from "react";
import type { Task, Officer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

type Props = {
  tasks: Task[];
  officers?: Officer[];
  selectedTaskId?: string | null;
  onSelectTask?: (id: string) => void;
  onAssignClick?: (task: Task) => void;
};

export function TaskList({ tasks, officers = [], selectedTaskId, onSelectTask, onAssignClick }: Props) {
  const officerById = React.useMemo(() => {
    const m = new Map(officers.map((o) => [o.id, o] as const));
    return m;
  }, [officers]);
  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <div
          key={t.id}
          className={cn(
            "rounded-md border p-3 bg-card/50 transition-colors",
            selectedTaskId === t.id ? "border-primary/50" : "border-border"
          )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <button onClick={() => onSelectTask?.(t.id)} className="text-left">
                  <div className="font-medium text-sm">{t.patientName}</div>
                  <div className="text-xs text-muted-foreground">{t.address}</div>
                  <div className="text-xs text-muted-foreground">{t.date}</div>
                </button>
                <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                  {t.tests.map((x) => (
                    <span key={x} className="rounded bg-secondary px-1.5 py-0.5">
                      {x}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={t.status} />
                <Button size="sm" variant="outline" onClick={() => onAssignClick?.(t)}>
                  มอบหมาย
                </Button>
              </div>
            </div>
          {t.assignedTo && (
            <div className="mt-2 text-xs text-muted-foreground">
              ผู้รับผิดชอบ: {officerById.get(t.assignedTo)?.name ?? t.assignedTo}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
