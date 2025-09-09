"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Officer } from "@/lib/types";

interface MultiOfficerSelectorProps {
  officers: Officer[];
  selectedOfficerIds: string[];
  onSelectionChange: (ids: string[]) => void;
  multiLimit: number;
  onLimitChange: (limit: number) => void;
  onClearAll: () => void;
  onSwitchToMultiMode?: () => void;
}

export function MultiOfficerSelector({
  officers,
  selectedOfficerIds,
  onSelectionChange,
  multiLimit,
  onLimitChange,
  onClearAll,
  onSwitchToMultiMode,
}: MultiOfficerSelectorProps) {
  const handleOfficerToggle = (officerId: string) => {
    // Switch to multi mode when selecting officers
    if (onSwitchToMultiMode) {
      onSwitchToMultiMode();
    }

    const newSelection = selectedOfficerIds.includes(officerId)
      ? selectedOfficerIds.filter((id) => id !== officerId)
      : [...selectedOfficerIds, officerId];

    onSelectionChange(newSelection);
  };

  return (
    <div className="pt-2 space-y-2">
      <div className="text-sm">หรือเลือกหลายคน (ซ้อนกัน)</div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          className="w-[100px]"
          min={1}
          max={20}
          value={multiLimit}
          onChange={(e) =>
            onLimitChange(
              Math.max(1, Math.min(20, Number(e.target.value) || 1))
            )
          }
        />
        <span className="text-xs text-muted-foreground">
          จำนวนสูงสุดที่แสดง (แนะนำ ≤ 10)
        </span>
        {selectedOfficerIds.length > 0 && (
          <Button variant="outline" onClick={onClearAll}>
            ล้างหลายคน
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-auto pr-1">
        {officers.map((o) => {
          const picked = selectedOfficerIds.includes(o.id);
          const disabled = !picked && selectedOfficerIds.length >= multiLimit;
          return (
            <Button
              key={o.id}
              type="button"
              variant={picked ? "secondary" : "outline"}
              className="justify-start"
              disabled={disabled}
              onClick={() => handleOfficerToggle(o.id)}
            >
              {o.name} • {o.zoneLabel}
            </Button>
          );
        })}
      </div>
      {selectedOfficerIds.length > 0 && (
        <div className="text-xs text-muted-foreground">
          เลือกแล้ว {selectedOfficerIds.length} คน •
          ระบบจะแสดงเส้นทางซ้อนกันตามวันที่ในตัวกรอง
        </div>
      )}
    </div>
  );
}
