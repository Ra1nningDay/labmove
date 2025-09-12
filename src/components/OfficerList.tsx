"use client";

import React from "react";
import type { Officer, Task } from "@/lib/types";
import { haversineKm } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  officers: Officer[];
  selectedTask?: Task | null;
  onShowRoute?: (officerId: string) => void;
};

export function OfficerList({ officers, selectedTask, onShowRoute }: Props) {
  const [hoverPreview, setHoverPreview] = React.useState<boolean>(true);
  const [isOpen, setIsOpen] = React.useState<boolean>(true);
  
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("labmove:hoverPreviewOfficers");
      if (raw != null) setHoverPreview(raw === "1");
    } catch {}
  }, []);
  
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("labmove:officerListCollapsed");
      if (raw != null) setIsOpen(raw !== "1");
    } catch {}
  }, []);
  
  React.useEffect(() => {
    try {
      localStorage.setItem(
        "labmove:hoverPreviewOfficers",
        hoverPreview ? "1" : "0"
      );
      if (!hoverPreview) {
        window.dispatchEvent(
          new CustomEvent("assignment:preview-officer", {
            detail: { id: null },
          })
        );
      }
    } catch {}
  }, [hoverPreview]);
  
  React.useEffect(() => {
    try {
      localStorage.setItem(
        "labmove:officerListCollapsed",
        isOpen ? "0" : "1"
      );
    } catch {}
  }, [isOpen]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full text-xs text-muted-foreground p-2 hover:bg-accent/20 rounded transition-colors">
        <span>รายชื่อเจ้าหน้าที่ ({officers.length})</span>
        <div className="flex items-center gap-2">
          <label 
            className="flex items-center gap-1 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-current"
              checked={hoverPreview}
              onChange={(e) => setHoverPreview(e.target.checked)}
            />
            พรีวิวเมื่อชี้
          </label>
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 max-h-80 sm:max-h-none overflow-y-auto mt-2">
        {officers.map((o) => {
          const dist =
            selectedTask && o.base
              ? haversineKm(o.base, selectedTask.coords).toFixed(1)
              : undefined;
          return (
            <div
              key={o.id}
              className="rounded-md border p-3 bg-card/50 cursor-pointer hover:bg-accent/30"
              onMouseEnter={() => {
                try {
                  if (hoverPreview)
                    window.dispatchEvent(
                      new CustomEvent("assignment:preview-officer", {
                        detail: { id: o.id },
                      })
                    );
                } catch {}
              }}
              onMouseLeave={() => {
                try {
                  if (hoverPreview)
                    window.dispatchEvent(
                      new CustomEvent("assignment:preview-officer", {
                        detail: { id: null },
                      })
                    );
                } catch {}
              }}
              onClick={() => {
                try {
                  window.dispatchEvent(
                    new CustomEvent("assignment:select-officer", {
                      detail: { id: o.id },
                    })
                  );
                } catch {}
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-sm">{o.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {o.zoneLabel} • {o.phone}
                  </div>
                  {!o.base && (
                    <div className="text-xs text-amber-600">ไม่มีพิกัดฐาน</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {dist && (
                    <div className="text-xs text-muted-foreground">
                      {dist} กม.
                    </div>
                  )}
                  {onShowRoute && o.base && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowRoute(o.id);
                      }}
                    >
                      เส้นทาง
                    </Button>
                  )}
                </div>
              </div>
          </div>
        );
      })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}