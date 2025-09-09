"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Route as RouteIcon } from "lucide-react";

export function RouteBanner({ officerName, onCancel }: { officerName?: string; onCancel: () => void }) {
  if (!officerName) return null;
  return (
    <div className="absolute inset-x-0 bottom-16 sm:bottom-12 md:bottom-10 lg:bottom-8 flex justify-center z-30 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-background/95 backdrop-blur border shadow px-3 py-1.5 ring-1 ring-amber-500/30">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/90 text-amber-900 text-[12px] font-medium dark:bg-amber-400/25 dark:text-amber-50">
          <RouteIcon className="size-4" /> โหมดเส้นทาง
        </span>
        <div className="text-sm font-medium truncate max-w-[200px]">{officerName}</div>
        <div className="hidden sm:block text-[11px] text-muted-foreground">กด Esc เพื่อยกเลิก</div>
        <Button size="sm" variant="secondary" onClick={onCancel}>
          ยกเลิกเส้นทาง
        </Button>
      </div>
    </div>
  );
}

