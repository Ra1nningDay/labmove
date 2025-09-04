"use client";

import React from "react";
import type { Task, Officer } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Map,
  Marker,
  useMapsLibrary,
  useMap,
  Polyline,
} from "@vis.gl/react-google-maps";

type Props = {
  tasks: Task[];
  officers: Officer[];
  selectedTaskId?: string | null;
  onSelectTask?: (id: string) => void;
};

type LatLng = google.maps.LatLngLiteral;

export function MapCanvas({
  tasks,
  officers,
  selectedTaskId,
  onSelectTask,
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return (
      <FallbackCanvas
        tasks={tasks}
        officers={officers}
        selectedTaskId={selectedTaskId}
        onSelectTask={onSelectTask}
      />
    );
  }
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const map = useMap();
  const routesLib = useMapsLibrary("routes");

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

  const [routePath, setRoutePath] = React.useState<LatLng[] | null>(null);
  const [routeInfo, setRouteInfo] = React.useState<{
    distanceText?: string;
    durationText?: string;
  } | null>(null);

  // Compute route when a task is selected
  React.useEffect(() => {
    let cancelled = false;
    async function calc() {
      if (!routesLib || !selectedTask) {
        setRoutePath(null);
        setRouteInfo(null);
        return;
      }
      // Find origin: assigned officer base or nearest officer
      const originOfficer = (() => {
        if (selectedTask.assignedTo)
          return (
            officers.find((o) => o.id === selectedTask.assignedTo) ||
            officers[0]
          );
        // find nearest by straight-line distance
        const nearest = [...officers].sort(
          (a, b) =>
            distance(a.base, selectedTask.coords) -
            distance(b.base, selectedTask.coords)
        )[0];
        return nearest;
      })();

      const svc = new routesLib.DirectionsService();
      const result = await svc.route({
        origin: originOfficer?.base || { lat: 13.7563, lng: 100.5018 },
        destination: selectedTask.coords,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
        provideRouteAlternatives: false,
      });
      if (cancelled) return;
      const leg = result.routes?.[0]?.legs?.[0];
      const path = result.routes?.[0]?.overview_path || [];
      setRoutePath(path.map((p) => ({ lat: p.lat(), lng: p.lng() })));
      setRouteInfo({
        distanceText: leg?.distance?.text,
        durationText: leg?.duration?.text,
      });
    }
    calc().catch(() => {
      setRoutePath(null);
      setRouteInfo(null);
    });
    return () => {
      cancelled = true;
    };
  }, [routesLib, selectedTask, officers]);

  const statusColor: Record<string, string> = {
    pending: "#f59e0b",
    assigned: "#3b82f6",
    in_progress: "#6366f1",
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

  React.useEffect(() => {
    if (!mapRef.current || !bounds) return;
    const b = new google.maps.LatLngBounds(
      { lat: bounds.minLat, lng: bounds.minLng },
      { lat: bounds.maxLat, lng: bounds.maxLng }
    );
    mapRef.current.fitBounds(b);
  }, [bounds]);

  const symbolPath =
    (typeof window !== "undefined" &&
      (window as any).google?.maps?.SymbolPath?.CIRCLE) ||
    undefined;

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-md border overflow-hidden">
      <Map
        defaultZoom={11}
        defaultCenter={center}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID}
        className="w-full h-full"
      >
        {/* Officers */}
        {officers.map((o) => (
          <Marker
            key={o.id}
            position={o.base}
            title={`${o.name} ${o.zoneLabel ?? ""}`}
          />
        ))}

        {/* Tasks */}
        {tasks.map((t) => (
          <Marker
            key={t.id}
            position={t.coords}
            title={`${t.patientName} • ${t.address}`}
            onClick={() => onSelectTask?.(t.id)}
            icon={
              symbolPath
                ? {
                    path: symbolPath,
                    fillColor: statusColor[t.status],
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2,
                    scale: t.id === selectedTaskId ? 8 : 6,
                  }
                : undefined
            }
          />
        ))}

        {/* Route for selected task */}
        {routePath && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: "#2563eb",
              strokeOpacity: 0.9,
              strokeWeight: 5,
            }}
          />
        )}
      </Map>

      {/* Overlay: selected task info */}
      {selectedTask && (
        <div className="absolute left-2 top-2 rounded-md border bg-background/95 backdrop-blur px-3 py-2 shadow">
          <div className="text-sm font-medium">{selectedTask.patientName}</div>
          <div
            className="text-xs text-muted-foreground max-w-[320px] truncate"
            title={selectedTask.address}
          >
            {selectedTask.address}
          </div>
          {routeInfo && (
            <div className="mt-1 text-xs text-muted-foreground">
              เส้นทางโดยรถยนต์ • {routeInfo.distanceText} •{" "}
              {routeInfo.durationText}
            </div>
          )}
        </div>
      )}
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

  const lats = tasks.map((t) => t.coords.lat).concat(officers.map((o) => o.base.lat));
  const lngs = tasks.map((t) => t.coords.lng).concat(officers.map((o) => o.base.lng));
  const minLat = Math.min(...lats, 13.6);
  const maxLat = Math.max(...lats, 13.95);
  const minLng = Math.min(...lngs, 100.4);
  const maxLng = Math.max(...lngs, 100.75);
  const pad = 0.01;
  const b = { minLat: minLat - pad, maxLat: maxLat + pad, minLng: minLng - pad, maxLng: maxLng + pad };

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
    <div ref={containerRef} className="relative w-full h-full min-h-[260px] rounded-md border bg-secondary/30 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,.04)_1px,transparent_1px)] bg-[size:20px_20px]" />
      {officers.map((o) => {
        const p = project(o.base.lat, o.base.lng);
        return (
          <div key={o.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: p.x, top: p.y }} title={`${o.name} (${o.zoneLabel})`}>
            <div className="w-3.5 h-3.5 bg-emerald-600 border-2 border-white rounded-sm shadow" />
          </div>
        );
      })}
      {tasks.map((t) => {
        const p = project(t.coords.lat, t.coords.lng);
        const active = t.id === selectedTaskId;
        return (
          <button key={t.id} onClick={() => onSelectTask?.(t.id)} className="absolute -translate-x-1/2 -translate-y-1/2 outline-none" style={{ left: p.x, top: p.y }} title={`${t.patientName} • ${t.address}`}>
            <span className={cn("block w-3.5 h-3.5 rounded-full border-2 border-white shadow", statusColor[t.status])} />
            {active && <span className="absolute inset-0 -m-1 rounded-full ring-2 ring-primary/60 animate-ping" />}
          </button>
        );
      })}
    </div>
  );
}
