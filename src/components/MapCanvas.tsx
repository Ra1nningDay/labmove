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

export function MapCanvas({ tasks, officers, selectedTaskId, onSelectTask }: Props) {
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
  const [routeInfo, setRouteInfo] = React.useState<{ distanceText?: string; durationText?: string } | null>(null);

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
        if (selectedTask.assignedTo) return officers.find((o) => o.id === selectedTask.assignedTo) || officers[0];
        // find nearest by straight-line distance
        const nearest = [...officers].sort((a, b) =>
          distance(a.base, selectedTask.coords) - distance(b.base, selectedTask.coords)
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
      setRouteInfo({ distanceText: leg?.distance?.text, durationText: leg?.duration?.text });
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
    const lats = tasks.map((t) => t.coords.lat).concat(officers.map((o) => o.base.lat));
    const lngs = tasks.map((t) => t.coords.lng).concat(officers.map((o) => o.base.lng));
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
          <Marker key={o.id} position={o.base} title={`${o.name} ${o.zoneLabel ?? ""}`} />
        ))}

        {/* Tasks */}
        {tasks.map((t) => (
          <Marker
            key={t.id}
            position={t.coords}
            title={`${t.patientName} • ${t.address}`}
            onClick={() => onSelectTask?.(t.id)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: statusColor[t.status],
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: t.id === selectedTaskId ? 8 : 6,
            }}
          />
        ))}

        {/* Route for selected task */}
        {routePath && (
          <Polyline
            path={routePath}
            options={{ strokeColor: "#2563eb", strokeOpacity: 0.9, strokeWeight: 5 }}
          />
        )}
      </Map>

      {/* Overlay: selected task info */}
      {selectedTask && (
        <div className="absolute left-2 top-2 rounded-md border bg-background/95 backdrop-blur px-3 py-2 shadow">
          <div className="text-sm font-medium">{selectedTask.patientName}</div>
          <div className="text-xs text-muted-foreground max-w-[320px] truncate" title={selectedTask.address}>
            {selectedTask.address}
          </div>
          {routeInfo && (
            <div className="mt-1 text-xs text-muted-foreground">
              เส้นทางโดยรถยนต์ • {routeInfo.distanceText} • {routeInfo.durationText}
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
  const s2 = Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}
