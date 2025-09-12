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
import { useMediaQuery } from "@/lib/useMediaQuery";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const isMobile = useMediaQuery("(max-width: 767px)");

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
  const [sortKey, setSortKey] = React.useState<
    "eta" | "distance" | "workload" | "name"
  >("eta");

  // Clear preview highlight when panel closes
  React.useEffect(() => {
    if (!open) {
      try {
        window.dispatchEvent(
          new CustomEvent("assignment:preview-officer", {
            detail: { id: null },
          })
        );
      } catch {}
    }
  }, [open]);

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
    const filtered = list.filter(({ officer }) => {
      if (!ql) return true;
      const s = `${officer.name} ${officer.zoneLabel ?? ""} ${
        officer.phone ?? ""
      }`.toLowerCase();
      return s.includes(ql);
    });
    // Sort according to sortKey
    const by = (a: number, b: number) => (a === b ? 0 : a < b ? -1 : 1);
    const nameKey = (s: string) => s?.toLocaleLowerCase?.() ?? "";
    const sorted = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "eta":
          return by(a.durationValue ?? 1e12, b.durationValue ?? 1e12);
        case "distance":
          return by(a.distanceValue ?? 1e12, b.distanceValue ?? 1e12);
        case "workload": {
          const wa = workload.get(a.officer.id) ?? 0;
          const wb = workload.get(b.officer.id) ?? 0;
          return (
            by(wa, wb) ||
            nameKey(a.officer.name).localeCompare(nameKey(b.officer.name))
          );
        }
        case "name":
        default:
          return nameKey(a.officer.name).localeCompare(nameKey(b.officer.name));
      }
    });
    return sorted;
  }, [etaList, officers, q, sortKey, workload]);

  return (
    <>
      {/* Desktop: side panel overlay (no modal overlay) */}
      {!isMobile && open && (
        <div className="hidden md:block fixed left-3 top-[72px] bottom-3 z-40 w-[min(615px,40vw)]">
          <div className="h-full overflow-hidden rounded-md border bg-background/95 backdrop-blur shadow">
            <div className="p-4 border-b">
              <div className="text-base font-semibold">มอบหมายงาน</div>
              <div
                className="text-xs text-muted-foreground truncate"
                title={
                  task
                    ? `${task.patientName} • ${task.address}`
                    : "ไม่พบงานที่เลือก"
                }
              >
                {task ? (
                  <>
                    {task.patientName} • {task.address}
                  </>
                ) : (
                  "ไม่พบงานที่เลือก"
                )}
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="ค้นหาเจ้าหน้าที่ (ชื่อ/โซน/เบอร์)"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Select
                  value={sortKey}
                  onValueChange={(v) => setSortKey(v as any)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="เรียงตาม" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eta">เวลาถึงเร็วสุด</SelectItem>
                    <SelectItem value="distance">ระยะทาง</SelectItem>
                    <SelectItem value="workload">งานน้อยสุด</SelectItem>
                    <SelectItem value="name">ชื่อ (ก-ฮ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground">
                ทั้งหมด {filtered.length} คน • งานในระบบ {tasks.length} งาน
                {loadingEta && (
                  <span className="ml-2">• กำลังคำนวณเวลาเดินทาง…</span>
                )}
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 max-h-[calc(100vh-220px)] overflow-auto pr-1 pb-1">
                {filtered.map((it, idx) => {
                  const o = it.officer;
                  const wl = workload.get(o.id) ?? 0;
                  const recommended =
                    idx === 0 && sortKey === "eta" && etaList.length > 0;
                  return (
                    <div
                      key={o.id}
                      className={`group relative rounded border p-3 hover:bg-accent/40 transition-colors`}
                      onMouseEnter={() => {
                        try {
                          window.dispatchEvent(
                            new CustomEvent("assignment:preview-officer", {
                              detail: { id: o.id },
                            })
                          );
                        } catch {}
                      }}
                      onMouseLeave={() => {
                        try {
                          window.dispatchEvent(
                            new CustomEvent("assignment:preview-officer", {
                              detail: { id: null },
                            })
                          );
                        } catch {}
                      }}
                    >
                      {recommended && (
                        <span className="absolute right-2 top-2 text-[10px] font-medium rounded bg-amber-100 text-amber-900 px-1.5 py-0.5 border border-amber-200">
                          แนะนำ
                        </span>
                      )}
                      <div
                        className="text-sm font-medium truncate"
                        title={o.name}
                      >
                        {o.name}
                      </div>
                      <div
                        className="text-xs text-muted-foreground truncate"
                        title={`${o.zoneLabel || ""} ${
                          o.phone ? "• " + o.phone : ""
                        }`}
                      >
                        {o.zoneLabel || ""} {o.phone ? `• ${o.phone}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {it.durationText ? (
                          <span>
                            {it.distanceText} • {it.durationText}
                          </span>
                        ) : (
                          <span>-</span>
                        )}
                        <span className="block">รับงานอยู่ {wl} งาน</span>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant={recommended ? "default" : "outline"}
                          onClick={() => {
                            if (task) onAssign(task.id, o.id);
                            onOpenChange(false);
                          }}
                          className="cursor-pointer"
                        >
                          มอบหมาย
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {!filtered.length && (
                  <div className="col-span-2 text-sm text-muted-foreground">
                    ไม่พบเจ้าหน้าที่
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => onOpenChange(false)}
                >
                  ปิด
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: existing drawer as bottom sheet (only mount on mobile) */}
      {isMobile && (
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
                  <Badge variant="secondary">เรียงตามเวลาถึง</Badge>
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
                    className="flex items-center justify-between rounded border p-3 hover:bg-accent/40 cursor-pointer"
                    onMouseEnter={() => {
                      try {
                        window.dispatchEvent(
                          new CustomEvent("assignment:preview-officer", {
                            detail: { id: o.id },
                          })
                        );
                      } catch {}
                    }}
                    onMouseLeave={() => {
                      try {
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
                          new CustomEvent("assignment:select-officer", { detail: { id: o.id } })
                        );
                      } catch {}
                    }}
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
                        idx === 0 && etaList.length > 0 ? "default" : "outline"
                      }
                      onClick={() => {
                        if (task) onAssign(task.id, o.id);
                        onOpenChange(false);
                      }}
                    >
                      มอบหมาย
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
      )}
    </>
  );
}
