"use client";

import React from "react";
import type { Task, Officer } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  tasks: Task[];
  officers: Officer[];
  selectedTaskId?: string | null;
  onSelectTask?: (id: string) => void;
  routeOfficerId?: string | null;
};

export function FallbackCanvas({
  tasks,
  officers,
  selectedTaskId,
  onSelectTask,
  routeOfficerId,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ w: 800, h: 320 });
  React.useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setSize({ w: Math.max(320, rect.width), h: Math.max(260, rect.height) });
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, []);

  const ftasks = routeOfficerId
    ? tasks.filter((t) => t.assignedTo === routeOfficerId)
    : tasks;
  const fofficers = routeOfficerId
    ? officers.filter((o) => o.id === routeOfficerId && o.base)
    : officers.filter((o) => o.base);

  const lats = ftasks
    .map((t) => t.coords.lat)
    .concat(fofficers.map((o) => o.base!.lat));
  const lngs = ftasks
    .map((t) => t.coords.lng)
    .concat(fofficers.map((o) => o.base!.lng));
  const minLat = Math.min(...lats, 13.6);
  const maxLat = Math.max(...lats, 13.95);
  const minLng = Math.min(...lngs, 100.4);
  const maxLng = Math.max(...lngs, 100.75);
  const pad = 0.01;
  const b = {
    minLat: minLat - pad,
    maxLat: maxLat + pad,
    minLng: minLng - pad,
    maxLng: maxLng + pad,
  };

  function project(lat: number, lng: number) {
    const x = ((lng - b.minLng) / (b.maxLng - b.minLng)) * size.w;
    const y = (1 - (lat - b.minLat) / (b.maxLat - b.minLat)) * size.h;
    return { x, y };
  }
  const statusColor: Record<string, string> = {
    pending: "bg-amber-500",
    assigned: "bg-blue-500",
    in_progress: "bg-indigo-500",
    done: "bg-emerald-500",
    issue: "bg-rose-500",
  };
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[260px] rounded-md border bg-secondary/30 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,.04)_1px,transparent_1px)] bg-[size:20px_20px]" />
      {fofficers.map((o) => {
        const p = project(o.base!.lat, o.base!.lng);
        return (
          <div
            key={o.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: p.x, top: p.y }}
            title={`${o.name} (${o.zoneLabel})`}
          >
            <div className="w-3.5 h-3.5 bg-emerald-600 border-2 border-white rounded-sm shadow" />
          </div>
        );
      })}
      {ftasks.map((t) => {
        const p = project(t.coords.lat, t.coords.lng);
        const active = t.id === selectedTaskId;
        return (
          <button
            key={t.id}
            onClick={() => onSelectTask?.(t.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 outline-none"
            style={{ left: p.x, top: p.y }}
            aria-label={`เลือกงาน: ${t.patientName} • ${t.address}`}
          >
            <span
              className={cn(
                "block w-3.5 h-3.5 rounded-full border-2 border-white shadow",
                statusColor[t.status]
              )}
            />
            {active && (
              <span className="absolute inset-0 -m-1 rounded-full ring-2 ring-primary/60 animate-ping" />
            )}
          </button>
        );
      })}
    </div>
  );
}
