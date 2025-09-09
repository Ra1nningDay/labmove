"use client";

import React from "react";
import type { Officer } from "@/lib/types";
import { Button } from "@/components/ui/button";

export type EtaItem = {
  officer: Officer;
  durationText?: string;
  durationValue?: number;
  distanceText?: string;
  distanceValue?: number;
};

export function EtaPanel({ list, selectedOfficerId, onSelect }: { list: EtaItem[]; selectedOfficerId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="bg-background/95 backdrop-blur border rounded-md p-2 shadow min-w-[220px]">
      <div className="text-xs font-medium mb-1">เวลาเดินทาง (แนะนำลำดับแรก)</div>
      <div className="space-y-1 max-h-[220px] overflow-auto pr-1">
        {list.slice(0, 5).map((it, idx) => (
          <div key={it.officer.id} className="flex items-center justify-between gap-2 text-xs">
            <div className="truncate">
              <span className={idx === 0 ? "font-semibold" : ""}>{it.officer.name}</span>
              <span className="text-muted-foreground"> • {it.durationText ?? "-"} • {it.distanceText ?? "-"}</span>
            </div>
            <Button size="sm" variant={selectedOfficerId === it.officer.id ? "secondary" : "outline"} onClick={() => onSelect(it.officer.id)}>
              เลือก
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

