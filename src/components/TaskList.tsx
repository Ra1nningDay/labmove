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
    <div className="rounded-md border bg-card">
      <div className="p-2 text-xs text-muted-foreground">งานทั้งหมด ({tasks.length})</div>
      <div className="divide-y">
      {tasks.map((t) => (
        <div key={t.id} className={cn("relative p-3 hover:bg-accent/30", selectedTaskId === t.id && "ring-1 ring-primary/50 bg-accent/40")}>
          <div className={cn("absolute left-0 top-0 h-full w-1 rounded-r-sm", {
            "bg-amber-500": t.status === "pending",
            "bg-blue-500": t.status === "assigned",
            "bg-indigo-500": t.status === "in_progress",
            "bg-emerald-500": t.status === "done",
            "bg-rose-500": t.status === "issue",
          })} />
          <div className="flex items-start justify-between gap-3">
            <button onClick={() => onSelectTask?.(t.id)} className="text-left flex-1">
              <div className="text-[15px] font-semibold leading-tight">{t.patientName}</div>
              <div className="text-[12px] text-[#6b7280]">{t.address}</div>
              <div className="text-[12px] text-[#6b7280]">{t.date}</div>
              {t.tests.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                  {t.tests.map((x) => (
                    <span key={x} className="rounded bg-secondary px-1.5 py-0.5">
                      {x}
                    </span>
                  ))}
                </div>
              )}
            </button>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={t.status} />
              <Button size="sm" onClick={() => onAssignClick?.(t)}>
                มอบหมาย
              </Button>
            </div>
          </div>
          {t.assignedTo && (
            <div className="mt-1 text-[12px] text-muted-foreground">
              ผู้รับผิดชอบ: {officerById.get(t.assignedTo)?.name ?? t.assignedTo}
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}
