"use client";

import React from "react";
import type { Task, Officer } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Map,
  AdvancedMarker,
  Pin,
  Marker,
  useMapsLibrary,
  useMap,
} from "@vis.gl/react-google-maps";
import { mapStyles, type MapStyleKey } from "@/lib/mapStyles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/store/tasks";

type Props = {
  tasks: Task[];
  officers: Officer[];
  selectedTaskId?: string | null;
  onSelectTask?: (id: string) => void;
};

type LatLng = google.maps.LatLngLiteral;

export function MapCanvas(props: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return <FallbackCanvas {...props} />;
  }
  return <InnerMapCanvas {...props} />;
}

function InnerMapCanvas({
  tasks,
  officers,
  selectedTaskId,
  onSelectTask,
}: Props) {
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const map = useMap();
  // Load optional libraries; routes + advanced marker
  useMapsLibrary("routes");
  const { assignTask } = useTasks();

  const [showTasks, setShowTasks] = React.useState(true);
  const [showOfficers, setShowOfficers] = React.useState(true);
  const [selectedOfficerId, setSelectedOfficerId] = React.useState<
    string | null
  >(null);

  const selectedTask = React.useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const center = React.useMemo<LatLng>(() => {
    if (selectedTask) return selectedTask.coords;
    const all = tasks.concat([]);
    if (all.length > 0) return all[Math.floor(all.length / 2)].coords;
    return { lat: 13.7563, lng: 100.5018 };
  }, [tasks, selectedTask]);

  React.useEffect(() => {
    if (map) mapRef.current = map;
  }, [map]);

  const [routeInfo, setRouteInfo] = React.useState<{
    distanceText?: string;
    durationText?: string;
    officerId?: string;
  } | null>(null);
  const [etaList, setEtaList] = React.useState<Array<{
    officer: Officer;
    durationText?: string;
    durationValue?: number;
    distanceText?: string;
    distanceValue?: number;
  }> | null>(null);
  const directionsRendererRef =
    React.useRef<google.maps.DirectionsRenderer | null>(null);

  // Safe symbol paths for Marker fallback (when AdvancedMarker unavailable)
  const symbolPaths = React.useMemo(() => {
    const g =
      typeof window !== "undefined"
        ? (window as unknown as { google?: typeof google }).google
        : undefined;
    const circle = g?.maps?.SymbolPath?.CIRCLE as
      | google.maps.SymbolPath
      | undefined;
    const arrow = g?.maps?.SymbolPath?.BACKWARD_CLOSED_ARROW as
      | google.maps.SymbolPath
      | undefined;
    return { circle, arrow };
  }, []);

  const [styleKey, setStyleKey] = React.useState<MapStyleKey>("minimal");
  const defaultMapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;
  const mapIdByStyle: Record<MapStyleKey, string | undefined> = {
    minimal: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID_MINIMAL,
    clean: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID_CLEAN,
    dark: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID_DARK,
  };
  const normalizeMapId = (id?: string) =>
    id && id !== "default" ? id : undefined;
  const selectedMapId = normalizeMapId(mapIdByStyle[styleKey] || defaultMapId);
  const hasVector = Boolean(selectedMapId);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  // Prepare directions renderer when map is ready
  React.useEffect(() => {
    if (!mapRef.current) return;
    if (directionsRendererRef.current) return;
    const dr = new google.maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: true,
      preserveViewport: true,
      polylineOptions: {
        strokeColor: "#2563eb",
        strokeOpacity: 0.95,
        strokeWeight: 5,
      },
    });
    directionsRendererRef.current = dr;
    return () => {
      dr.setMap(null);
      directionsRendererRef.current = null;
    };
  }, [map]);

  // Compute route: prefer manually selected officer; else assigned; else best ETA
  React.useEffect(() => {
    let cancelled = false;
    async function calc() {
      if (!mapRef.current || !selectedTask) {
        directionsRendererRef.current?.setDirections(null);
        setRouteInfo(null);
        setEtaList(null);
        return;
      }

      let origin: LatLng | null = null;
      let chosenOfficerId: string | undefined;

      // If a manual selection exists, use it first
      if (selectedOfficerId) {
        const off = officers.find((o) => o.id === selectedOfficerId);
        origin = off?.base ?? null;
        chosenOfficerId = off?.id;
      } else if (selectedTask.assignedTo) {
        // Otherwise, if already assigned, use that officer
        const off = officers.find((o) => o.id === selectedTask.assignedTo);
        origin = off?.base ?? null;
        chosenOfficerId = off?.id;
      }

      // Also compute ETA list and pick best when not already assigned
      try {
        const svc = new google.maps.DistanceMatrixService();
        const res = await svc.getDistanceMatrix({
          origins: officers.map((o) => o.base),
          destinations: [selectedTask.coords],
          travelMode: google.maps.TravelMode.DRIVING,
          avoidHighways: false,
          avoidTolls: false,
        });
        const rows = res.rows || [];
        const list = rows.map((row, i) => {
          const el = row.elements?.[0];
          return {
            officer: officers[i],
            durationText: el?.duration?.text,
            durationValue: el?.duration?.value,
            distanceText: el?.distance?.text,
            distanceValue: el?.distance?.value,
          };
        });
        list.sort(
          (a, b) => (a.durationValue ?? 1e12) - (b.durationValue ?? 1e12)
        );
        if (!cancelled) setEtaList(list);
        if (!origin && list.length > 0) {
          origin = list[0].officer.base;
          chosenOfficerId = list[0].officer.id;
        }
      } catch {
        if (!origin) {
          // Fallback to straight-line nearest if Distance Matrix fails
          const nearest = [...officers].sort(
            (a, b) =>
              distance(a.base, selectedTask.coords) -
              distance(b.base, selectedTask.coords)
          )[0];
          origin = nearest?.base ?? null;
          chosenOfficerId = nearest?.id;
        }
      }

      if (!origin) {
        setRouteInfo(null);
        setEtaList(null);
        return;
      }

      try {
        const ds = new google.maps.DirectionsService();
        const result = await ds.route({
          origin,
          destination: selectedTask.coords,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false,
          provideRouteAlternatives: false,
        });
        if (cancelled) return;
        directionsRendererRef.current?.setDirections(result);
        const leg = result.routes?.[0]?.legs?.[0];
        setRouteInfo({
          distanceText: leg?.distance?.text,
          durationText: leg?.duration?.text,
          officerId: chosenOfficerId,
        });
      } catch {
        directionsRendererRef.current?.setDirections(null);
        setRouteInfo(null);
      }
    }
    calc();
    return () => {
      cancelled = true;
    };
  }, [selectedTask, officers, selectedOfficerId]);

  // Task marker base color → orange, officer → blue/silver
  const statusColor: Record<string, string> = {
    pending: "#f97316", // orange
    assigned: "#fb923c",
    in_progress: "#f59e0b",
    done: "#10b981",
    issue: "#ef4444",
  };

  const bounds = React.useMemo(() => {
    const lats = tasks
      .map((t) => t.coords.lat)
      .concat(officers.map((o) => o.base.lat));
    const lngs = tasks
      .map((t) => t.coords.lng)
      .concat(officers.map((o) => o.base.lng));
    if (lats.length === 0 || lngs.length === 0) return null;
    const minLat = Math.min(...lats) - 0.01;
    const maxLat = Math.max(...lats) + 0.01;
    const minLng = Math.min(...lngs) - 0.01;
    const maxLng = Math.max(...lngs) + 0.01;
    return { minLat, maxLat, minLng, maxLng };
  }, [tasks, officers]);

  // If all officer bases are identical/nearby, scatter them for display only
  const mapOfficers = React.useMemo(() => {
    if (!officers.length) return officers;
    const unique = new Set(
      officers.map((o) => `${o.base.lat.toFixed(4)},${o.base.lng.toFixed(4)}`)
    );
    if (unique.size > Math.max(2, Math.floor(officers.length / 3)))
      return officers;
    const center = tasks.length
      ? {
          lat: tasks.reduce((s, t) => s + t.coords.lat, 0) / tasks.length,
          lng: tasks.reduce((s, t) => s + t.coords.lng, 0) / tasks.length,
        }
      : { lat: 13.7563, lng: 100.5018 };
    const jitter = (r: number) => (Math.random() * 2 - 1) * r;
    return officers.map((o, i) => ({
      ...o,
      base: {
        lat: center.lat + jitter(0.03) + i * 0.0001,
        lng: center.lng + jitter(0.03) + i * 0.0001,
      },
    }));
  }, [officers, tasks]);

  React.useEffect(() => {
    if (!mapRef.current || !bounds) return;
    const b = new google.maps.LatLngBounds(
      { lat: bounds.minLat, lng: bounds.minLng },
      { lat: bounds.maxLat, lng: bounds.maxLng }
    );
    mapRef.current.fitBounds(b);
  }, [bounds]);

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-md border overflow-hidden">
      <Map
        defaultZoom={11}
        defaultCenter={center}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        mapId={selectedMapId}
        clickableIcons={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
        styles={hasVector ? undefined : mapStyles[styleKey]}
        className="w-full h-full"
      >
        {/* Officers */}
        {showOfficers &&
          (hasVector
            ? mapOfficers.map((o) => {
                const isChosen =
                  routeInfo?.officerId === o.id || selectedOfficerId === o.id;
                return (
                  <AdvancedMarker
                    key={o.id}
                    position={o.base}
                    title={`${o.name} ${o.zoneLabel ?? ""}`}
                    zIndex={isChosen ? 2000 : 1200}
                    onClick={() => setSelectedOfficerId(o.id)}
                  >
                    <div className="flex items-center -translate-y-1">
                      <Pin
                        background={isChosen ? "#2563eb" : "#3b82f6"}
                        borderColor="#ffffff"
                        glyphColor="#ffffff"
                        scale={isChosen ? 1.2 : 1}
                      />
                      <span className="ml-1 px-1.5 py-0.5 text-[11px] rounded bg-white/95 border shadow max-w-[160px] truncate">
                        {o.name}
                        {selectedOfficerId === o.id ? " • กำลังเลือก" : ""}
                      </span>
                    </div>
                  </AdvancedMarker>
                );
              })
            : mapOfficers.map((o) => {
                const isChosen =
                  routeInfo?.officerId === o.id || selectedOfficerId === o.id;
                return (
                  <Marker
                    key={o.id}
                    position={o.base}
                    title={`${o.name} ${o.zoneLabel ?? ""}`}
                    zIndex={isChosen ? 1000 : 600}
                    icon={
                      symbolPaths.arrow
                        ? {
                            path: symbolPaths.arrow,
                            fillColor: isChosen ? "#2563eb" : "#3b82f6",
                            fillOpacity: 1,
                            strokeColor: "#ffffff",
                            strokeWeight: 1,
                            scale: isChosen ? 7 : 5,
                          }
                        : undefined
                    }
                    onClick={() => setSelectedOfficerId(o.id)}
                  />
                );
              }))}

        {/* Tasks */}
        {showTasks &&
          (hasVector
            ? tasks.map((t) => {
                const active = t.id === selectedTaskId;
                return (
                  <AdvancedMarker
                    key={t.id}
                    position={t.coords}
                    title={`${t.patientName} • ${t.address}`}
                    onClick={() => onSelectTask?.(t.id)}
                    zIndex={active ? 1800 : 1000}
                  >
                    <div className="flex items-center -translate-y-1">
                      <Pin
                        background={active ? "#ef4444" : statusColor[t.status]}
                        borderColor={active ? "#111827" : "#ffffff"}
                        glyphColor="#ffffff"
                        scale={active ? 1.3 : 1}
                      />
                      <span className="ml-1 px-1.5 py-0.5 text-[11px] rounded bg-white/95 border shadow max-w-[200px] truncate">
                        {t.patientName}
                        {active ? " • กำลังเลือก" : ""}
                      </span>
                    </div>
                  </AdvancedMarker>
                );
              })
            : tasks.map((t) => {
                const active = t.id === selectedTaskId;
                return (
                  <Marker
                    key={t.id}
                    position={t.coords}
                    title={`${t.patientName} • ${t.address}`}
                    onClick={() => onSelectTask?.(t.id)}
                    zIndex={active ? 999 : 600}
                    icon={
                      symbolPaths.circle
                        ? {
                            path: symbolPaths.circle,
                            fillColor: active
                              ? "#ef4444"
                              : statusColor[t.status],
                            fillOpacity: 1,
                            strokeColor: active ? "#111827" : "#ffffff",
                            strokeWeight: active ? 3 : 2,
                            scale: active ? 9 : 6,
                          }
                        : undefined
                    }
                  />
                );
              }))}

        {/* Route is rendered via DirectionsRenderer imperatively */}
      </Map>

      {/* Overlay: selected task info */}
      {selectedTask && (
        <div className="absolute left-2 top-2 rounded-md border bg-background/95 backdrop-blur px-3 py-2 shadow max-w-[360px]">
          <div className="text-sm font-medium">{selectedTask.patientName}</div>
          <div
            className="text-xs text-muted-foreground max-w-[320px] truncate"
            title={selectedTask.address}
          >
            {selectedTask.address}
          </div>
          {routeInfo && (
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              <div>
                เส้นทางโดยรถยนต์ • {routeInfo.distanceText} •{" "}
                {routeInfo.durationText}
              </div>
              {routeInfo.officerId &&
                (!selectedTask.assignedTo ||
                  selectedTask.assignedTo !== routeInfo.officerId) && (
                  <div className="flex items-center gap-2">
                    <span>แนะนำ:</span>
                    <span className="font-medium">
                      {officers.find((o) => o.id === routeInfo.officerId)?.name}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        assignTask(selectedTask.id, routeInfo.officerId!)
                      }
                    >
                      มอบหมายให้คนนนี้
                    </Button>
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* Overlay: legend */}
      <div className="absolute left-2 bottom-2 rounded-md border bg-background/95 backdrop-blur px-2 py-1.5 shadow text-[11px]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: "#f59e0b" }}
            ></span>
            รอยืนยัน
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: "#3b82f6" }}
            ></span>
            มอบหมายแล้ว
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: "#6366f1" }}
            ></span>
            กำลังดำเนินการ
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: "#10b981" }}
            ></span>
            เสร็จสิ้น
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: "#ef4444" }}
            ></span>
            ติดปัญหา
          </span>
        </div>
      </div>

      {/* Overlay: controls and ETA list */}
      <div className="absolute right-2 top-2 space-y-2">
        <div className="flex items-center gap-2 bg-background/95 backdrop-blur border rounded-md p-1 shadow">
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              bounds &&
              mapRef.current?.fitBounds(
                new google.maps.LatLngBounds(
                  { lat: bounds.minLat, lng: bounds.minLng },
                  { lat: bounds.maxLat, lng: bounds.maxLng }
                )
              )
            }
          >
            พอดีหน้าจอ
          </Button>
          <Button
            size="sm"
            variant={showTasks ? "default" : "outline"}
            onClick={() => setShowTasks((v) => !v)}
          >
            งาน
          </Button>
          <Button
            size="sm"
            variant={showOfficers ? "default" : "outline"}
            onClick={() => setShowOfficers((v) => !v)}
          >
            เจ้าหน้าที่
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSettingsOpen(true)}
            title="ตั้งค่าแผนที่"
          >
            <Settings className="size-4" />
          </Button>
        </div>

        {selectedTask && etaList && (
          <div className="bg-background/95 backdrop-blur border rounded-md p-2 shadow min-w-[220px]">
            <div className="text-xs font-medium mb-1">
              เวลาเดินทาง (แนะนำลำดับแรก)
            </div>
            <div className="space-y-1 max-h-[220px] overflow-auto pr-1">
              {etaList.slice(0, 5).map((it, idx) => (
                <div
                  key={it.officer.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <div className="truncate">
                    <span className={idx === 0 ? "font-semibold" : ""}>
                      {it.officer.name}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      • {it.durationText ?? "-"} • {it.distanceText ?? "-"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={selectedOfficerId === it.officer.id ? "secondary" : "outline"}
                    onClick={() => setSelectedOfficerId(it.officer.id)}
                  >
                    เลือก
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ตั้งค่าแผนที่</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Advanced Marker:{" "}
              {hasVector ? (
                <span className="text-emerald-600">เปิดใช้งาน (Map ID)</span>
              ) : (
                <span className="text-amber-600">ปิด (ยังไม่มี Map ID)</span>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">สไตล์แผนที่</div>
              <div className="grid grid-cols-3 gap-2">
                {(["minimal"] as MapStyleKey[]).map((k) => (
                  <Button
                    key={k}
                    variant={styleKey === k ? "secondary" : "outline"}
                    onClick={() => setStyleKey(k)}
                  >
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </Button>
                ))}
              </div>
              {!hasVector && (
                <div className="text-[11px] text-muted-foreground mt-1">
                  ไม่มี Map ID: ใช้สไตล์ภายใน (JSON) เพื่อซ่อน POIs/ไอคอนรบกวน
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function distance(a: LatLng, b: LatLng) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 =
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}

function FallbackCanvas({
  tasks,
  officers,
  selectedTaskId,
  onSelectTask,
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

  const lats = tasks
    .map((t) => t.coords.lat)
    .concat(officers.map((o) => o.base.lat));
  const lngs = tasks
    .map((t) => t.coords.lng)
    .concat(officers.map((o) => o.base.lng));
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
      {officers.map((o) => {
        const p = project(o.base.lat, o.base.lng);
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
      {tasks.map((t) => {
        const p = project(t.coords.lat, t.coords.lng);
        const active = t.id === selectedTaskId;
        return (
          <button
            key={t.id}
            onClick={() => onSelectTask?.(t.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 outline-none"
            style={{ left: p.x, top: p.y }}
            title={`${t.patientName} • ${t.address}`}
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
