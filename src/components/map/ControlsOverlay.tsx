"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Settings, Route as RouteIcon } from "lucide-react";

export function ControlsOverlay({
  onFit,
  showTasks,
  setShowTasks,
  showOfficers,
  setShowOfficers,
  onOpenSettings,
  onOpenRoute,
  routeActive,
}: {
  onFit?: () => void;
  showTasks: boolean;
  setShowTasks: (v: boolean) => void;
  showOfficers: boolean;
  setShowOfficers: (v: boolean) => void;
  onOpenSettings: () => void;
  onOpenRoute: () => void;
  routeActive: boolean;
}) {
  return (
    <div className="absolute right-2 top-2 space-y-2">
      <div className="flex items-center gap-2 bg-background/95 backdrop-blur border rounded-md p-1 shadow">
        <Button
          size="sm"
          variant="ghost"
          className="cursor-pointer"
          onClick={onFit}
        >
          พอดีหน้าจอ
        </Button>
        <Button
          size="sm"
          variant={showTasks ? "default" : "outline"}
          onClick={() => setShowTasks(!showTasks)}
          className="cursor-pointer"
        >
          งาน
        </Button>
        <Button
          size="sm"
          variant={showOfficers ? "default" : "outline"}
          onClick={() => setShowOfficers(!showOfficers)}
          className="cursor-pointer"
        >
          เจ้าหน้าที่
        </Button>

        <Button
          size="sm"
          variant={routeActive ? "default" : "outline"}
          onClick={onOpenRoute}
          title="แสดงเส้นทางเจ้าหน้าที่"
          aria-label="แสดงเส้นทางเจ้าหน้าที่"
          className="cursor-pointer"
        >
          <RouteIcon className="size-4 mr-1" /> เส้นทาง
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenSettings}
          aria-label="ตั้งค่าแผนที่"
          className="cursor-pointer"
        >
          <Settings className="size-4" />
        </Button>
      </div>
    </div>
  );
}
