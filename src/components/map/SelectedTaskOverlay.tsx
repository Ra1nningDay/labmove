"use client";

import React from "react";
import type { Officer, Task } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function SelectedTaskOverlay({
  task,
  routeInfo,
  officers,
  onAssign,
}: {
  task: Task;
  routeInfo: { distanceText?: string; durationText?: string; officerId?: string } | null;
  officers: Officer[];
  onAssign: (taskId: string, officerId: string) => void;
}) {
  return (
    <div className="absolute left-2 top-2 rounded-md border bg-background/95 backdrop-blur px-3 py-2 shadow max-w-[360px]">
      <div className="text-sm font-medium">{task.patientName}</div>
      <div className="text-xs text-muted-foreground max-w-[320px] truncate" title={task.address}>
        {task.address}
      </div>
      {routeInfo && (
        <div className="mt-2 text-xs text-muted-foreground space-y-1">
          <div>
            เส้นทางโดยรถยนต์ • {routeInfo.distanceText} • {routeInfo.durationText}
          </div>
          {routeInfo.officerId && (!task.assignedTo || task.assignedTo !== routeInfo.officerId) && (
            <div className="flex items-center gap-2">
              <span>แนะนำ:</span>
              <span className="font-medium">{officers.find((o) => o.id === routeInfo.officerId)?.name}</span>
              <Button size="sm" variant="secondary" onClick={() => onAssign(task.id, routeInfo.officerId!)}>
                มอบหมายให้คนนนี้
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

