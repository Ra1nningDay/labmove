"use client";

import React from "react";
import type { Officer, Task } from "@/lib/types";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { haversineKm } from "@/lib/geo";
import { useTasks } from "@/store/tasks";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  officers: Officer[];
  onAssign: (taskId: string, officerId: string) => void;
};

export function AssignmentDrawer({
  open,
  onOpenChange,
  task,
  officers,
  onAssign,
}: Props) {
  const { tasks } = useTasks();

  const [q, setQ] = React.useState("");
  const [etaList, setEtaList] = React.useState<
    Array<{
      officer: Officer;
      durationText?: string;
      durationValue?: number; // seconds
      distanceText?: string;
      distanceValue?: number; // meters
    }>
  >([]);
  const [loadingEta, setLoadingEta] = React.useState(false);

  const workload = React.useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t) => {
      if (t.assignedTo) map.set(t.assignedTo, (map.get(t.assignedTo) ?? 0) + 1);
    });
    return map;
  }, [tasks]);

  React.useEffect(() => {
    let cancelled = false;
    async function calc() {
      if (!open || !task) {
        setEtaList([]);
        return;
      }
      setLoadingEta(true);
      try {
        const g =
          typeof window !== "undefined"
            ? (window as unknown as { google?: typeof google }).google
            : undefined;
        if (g?.maps?.DistanceMatrixService) {
          const svc = new g.maps.DistanceMatrixService();
          const validOfficers = officers.filter((o) => o.base);
          const res = await svc.getDistanceMatrix({
            origins: validOfficers.map((o) => o.base!),
            destinations: [task.coords],
            travelMode: g.maps.TravelMode.DRIVING,
          });
          if (cancelled) return;
          const rows = res.rows || [];
          const list = rows.map((row, i) => {
            const el = row.elements?.[0];
            return {
              officer: validOfficers[i],
              durationText: el?.duration?.text,
              durationValue: el?.duration?.value,
              distanceText: el?.distance?.text,
              distanceValue: el?.distance?.value,
            };
          });
          list.sort(
            (a, b) => (a.durationValue ?? 1e12) - (b.durationValue ?? 1e12)
          );
          setEtaList(list);
        } else {
          // Fallback: straight line + naive speed
          const validOfficers = officers.filter((o) => o.base);
          const list = validOfficers.map((o) => {
            const km = haversineKm(o.base!, task.coords);
            const speedKmh = 35; // city average
            const hours = km / speedKmh;
            const secs = Math.round(hours * 3600);
            return {
              officer: o,
              distanceText: `${km.toFixed(1)} km`,
              distanceValue: Math.round(km * 1000),
              durationText:
                secs < 60 ? `${secs}s` : `${Math.round(secs / 60)} mins`,
              durationValue: secs,
            };
          });
          list.sort((a, b) => a.durationValue! - b.durationValue!);
          setEtaList(list);
        }
      } finally {
        if (!cancelled) setLoadingEta(false);
      }
    }
    calc();
    return () => {
      cancelled = true;
    };
  }, [open, task, officers]);

  const filtered = React.useMemo(() => {
    const list: Array<{
      officer: Officer;
      durationText?: string;
      durationValue?: number;
      distanceText?: string;
      distanceValue?: number;
    }> = etaList.length ? etaList : officers.map((o) => ({ officer: o }));
    const ql = q.trim().toLowerCase();
    return list.filter(({ officer }) => {
      if (!ql) return true;
      const s = `${officer.name} ${officer.zoneLabel ?? ""} ${
        officer.phone ?? ""
      }`.toLowerCase();
      return s.includes(ql);
    });
  }, [etaList, officers, q]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>มอบหมายงาน</DrawerTitle>
          <DrawerDescription>
            {task
              ? `${task.patientName} • ${task.address}`
              : "ไม่พบงานที่เลือก"}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="ค้นหาเจ้าหน้าที่ (ชื่อ/โซน/เบอร์)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {loadingEta ? (
              <Badge variant="secondary">กำลังคำนวณเวลาเดินทาง…</Badge>
            ) : etaList.length ? (
              <Badge variant="secondary">เรียงตามเวลาเดินทาง</Badge>
            ) : (
              <Badge variant="outline">เรียงตามชื่อ</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            ทั้งหมด {filtered.length} คน • งานในระบบ {tasks.length} งาน
          </div>
        </div>
        <div className="px-4 pb-4 space-y-2 max-h-[60vh] overflow-auto">
          {filtered.map((it, idx) => {
            const o = it.officer;
            const wl = workload.get(o.id) ?? 0;
            return (
              <div
                key={o.id}
                className="flex items-center justify-between rounded border p-3 hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium truncate max-w-[200px]">
                      {o.name}
                    </div>
                    {idx === 0 && etaList.length > 0 && (
                      <Badge className="hidden sm:inline-flex">แนะนำ</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {o.zoneLabel || ""} {o.phone ? `• ${o.phone}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {it.durationText ? (
                      <span>
                        {it.distanceText} • {it.durationText}
                      </span>
                    ) : (
                      <span>-</span>
                    )}
                    <span className="ml-2">• รับงานอยู่ {wl} งาน</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={
                    idx === 0 && etaList.length > 0 ? "secondary" : "outline"
                  }
                  onClick={() => {
                    if (task) onAssign(task.id, o.id);
                    onOpenChange(false);
                  }}
                >
                  เลือก
                </Button>
              </div>
            );
          })}
          {!filtered.length && (
            <div className="text-sm text-muted-foreground">
              ไม่พบเจ้าหน้าที่
            </div>
          )}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">ปิด</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
