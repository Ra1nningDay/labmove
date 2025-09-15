"use client";

import React from "react";
import type { Task, Officer } from "@/lib/types";
import {
  Map as GoogleMap,
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
import { Button } from "@/components/ui/button";
import { useTasks } from "@/store/tasks";
import { ControlsOverlay } from "@/components/map/ControlsOverlay";
import { LegendOverlay } from "@/components/map/LegendOverlay";
import { EtaPanel } from "@/components/map/EtaPanel";
import { SelectedTaskOverlay } from "@/components/map/SelectedTaskOverlay";
import { RouteBanner } from "@/components/map/RouteBanner";
import { FallbackCanvas } from "@/components/map/FallbackCanvas";
import { MultiOfficerSelector } from "@/components/map/MultiOfficerSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  tasks: Task[];
  officers: Officer[];
  selectedTaskId?: string | null;
  onSelectTask?: (id: string | null) => void;
  // Optional external control for admin route mode
  routeOfficerId?: string | null;
  onChangeRouteOfficerId?: (id: string | null) => void;
  routeOpen?: boolean;
  onChangeRouteOpen?: (open: boolean) => void;
};

type LatLng = google.maps.LatLngLiteral;

export function MapCanvas(props: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  // NOTE: Google Maps tiles are rendered by the @vis.gl/react-google-maps library.
  // There is currently no way to set fetchpriority="high" on the underlying <img> tags for map tiles.
  // If this becomes supported upstream, update here to optimize LCP further.
  if (!apiKey) {
    return <FallbackCanvas {...props} />;
  }
  return <InnerMapCanvas {...props} />;
}

function InnerMapCanvas(props: Props) {
  const {
    tasks,
    officers,
    selectedTaskId,
    onSelectTask,
    routeOfficerId: routeOfficerIdProp,
    onChangeRouteOfficerId,
    routeOpen: routeOpenProp,
    onChangeRouteOpen,
  } = props;
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
  const [pinnedOfficerId, setPinnedOfficerId] = React.useState<string | null>(
    null
  );
  const [previewOfficerId, setPreviewOfficerId] = React.useState<string | null>(
    null
  );
  const [previewTaskId, setPreviewTaskId] = React.useState<string | null>(null);
  // Admin route mode (can be controlled externally via props)
  const [routeOfficerIdInt, setRouteOfficerIdInt] = React.useState<
    string | null
  >(null);
  // Admin multi-route mode (internal only for now)
  const [routeOfficerIdsInt, setRouteOfficerIdsInt] = React.useState<string[]>(
    []
  );
  const [routeMultiLimit, setRouteMultiLimit] = React.useState<number>(10);
  const [routeOpenInt, setRouteOpenInt] = React.useState(false);
  const routeOfficerId = routeOfficerIdProp ?? routeOfficerIdInt;
  const setRouteOfficerId = React.useCallback(
    (v: string | null) =>
      onChangeRouteOfficerId
        ? onChangeRouteOfficerId(v)
        : setRouteOfficerIdInt(v),
    [onChangeRouteOfficerId, setRouteOfficerIdInt]
  );
  const routeOfficerIds = routeOfficerIdsInt; // currently only internal
  const routeOpen = routeOpenProp ?? routeOpenInt;
  const setRouteOpen = React.useCallback(
    (v: boolean) =>
      onChangeRouteOpen ? onChangeRouteOpen(v) : setRouteOpenInt(v),
    [onChangeRouteOpen, setRouteOpenInt]
  );

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

  // Notify page when the first map tiles have rendered so it can fade out
  // the placeholder image. This helps keep the local placeholder as LCP
  // instead of a late-loading Google Maps tile.
  React.useEffect(() => {
    if (!mapRef.current) return;
    let fired = false;
    try {
      const once = google.maps.event.addListenerOnce(
        mapRef.current,
        "tilesloaded",
        () => {
          if (fired) return;
          fired = true;
          try {
            window.dispatchEvent(new Event("map:first-tiles"));
          } catch {}
        }
      );
      return () => {
        try {
          google.maps.event.removeListener(once);
        } catch {}
      };
    } catch {
      // Silently ignore if event system not ready (e.g. in fallback/no-key)
    }
  }, [map]);

  // When a task is selected from the left list, pan/zoom to it (non-intrusive)
  React.useEffect(() => {
    if (!mapRef.current) return;
    if (!selectedTask) return;
    // Skip when admin route mode is active; that flow has its own camera mgmt
    if (routeOfficerId || routeOfficerIds.length > 0) return;
    // Skip if a pinned officer is active; separate effect fits both points
    if (pinnedOfficerId) return;
    try {
      mapRef.current.panTo(selectedTask.coords);
      const z = mapRef.current.getZoom?.();
      if (typeof z === "number" && z < 13) mapRef.current.setZoom?.(13);
    } catch {}
  }, [selectedTask, routeOfficerId, routeOfficerIds, pinnedOfficerId]);

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
  // For multi-officer overlays, keep a renderer per officer
  const multiDirectionsRef = React.useRef<
    Map<string, google.maps.DirectionsRenderer>
  >(new Map());

  // Clear directions without passing null into setDirections (avoids InvalidValueError)
  const clearDirections = React.useCallback(() => {
    const dr = directionsRendererRef.current;
    if (!dr) return;
    try {
      // Use empty result object to clear safely
      dr.setDirections({
        routes: [],
      } as unknown as google.maps.DirectionsResult);
    } catch {
      try {
        dr.setMap(null);
      } catch {}
    }
  }, []);

  // Listen for hover-preview events from Assignment panel to highlight route
  React.useEffect(() => {
    function onPreview(e: Event) {
      const any = e as unknown as { detail?: { id?: string | null } };
      const id = any?.detail?.id ?? null;
      // Ignore when route mode is active
      if (routeOfficerId || routeOfficerIds.length > 0) return;
      if (pinnedOfficerId) return; // don't override pinned selection
      setPreviewOfficerId(id);
    }
    window.addEventListener("assignment:preview-officer", onPreview);
    return () =>
      window.removeEventListener("assignment:preview-officer", onPreview);
  }, [routeOfficerId, routeOfficerIds, pinnedOfficerId]);

  // Debounce preview -> apply to selectedOfficerId (no camera move)
  React.useEffect(() => {
    if (pinnedOfficerId) return; // pinned overrides
    const tid = setTimeout(() => {
      setSelectedOfficerId(previewOfficerId);
    }, 250);
    return () => clearTimeout(tid);
  }, [previewOfficerId, pinnedOfficerId]);

  // Listen for task list hover preview
  React.useEffect(() => {
    function onTaskPreview(e: Event) {
      const any = e as unknown as { detail?: { id?: string | null } };
      setPreviewTaskId(any?.detail?.id ?? null);
    }
    window.addEventListener("tasklist:preview-task", onTaskPreview);
    return () =>
      window.removeEventListener("tasklist:preview-task", onTaskPreview);
  }, []);

  // Listen for click-select events to pin selection
  React.useEffect(() => {
    function onSelect(e: Event) {
      const any = e as unknown as { detail?: { id?: string | null } };
      const id = any?.detail?.id ?? null;
      if (routeOfficerId || routeOfficerIds.length > 0) return;
      setPinnedOfficerId(id);
      setSelectedOfficerId(id);
    }
    window.addEventListener("assignment:select-officer", onSelect);
    return () =>
      window.removeEventListener("assignment:select-officer", onSelect);
  }, [routeOfficerId, routeOfficerIds]);

  // When a card is clicked (pinned), fit map to show officer base and task
  React.useEffect(() => {
    if (!mapRef.current) return;
    if (!selectedTask) return;
    if (!pinnedOfficerId) return;
    if (routeOfficerId || routeOfficerIds.length > 0) return;
    const off = officers.find((o) => o.id === pinnedOfficerId);
    const origin = off?.base ?? null;
    const dest = selectedTask.coords;
    try {
      const b = new google.maps.LatLngBounds();
      if (origin) b.extend(origin);
      b.extend(dest);
      // Provide some padding so both are clearly visible
      const padding: number | google.maps.Padding = 80 as number;
      (mapRef.current as google.maps.Map).fitBounds(b, padding);
    } catch {
      try {
        const b = new google.maps.LatLngBounds();
        if (origin) b.extend(origin);
        b.extend(dest);
        (mapRef.current as google.maps.Map).fitBounds(b);
      } catch {}
    }
  }, [
    pinnedOfficerId,
    selectedTask,
    routeOfficerId,
    routeOfficerIds,
    officers,
  ]);

  const clearAllMultiDirections = React.useCallback(() => {
    const map = multiDirectionsRef.current;
    for (const [key, renderer] of map) {
      try {
        renderer.setMap(null);
      } catch {}
      map.delete(key);
    }
  }, []);

  // ESC key cancels route mode for quick exit (single or multi)
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (routeOfficerId) setRouteOfficerId(null);
      if (routeOfficerIds.length > 0) {
        setRouteOfficerIdsInt([]);
        clearAllMultiDirections();
      }
      if (!routeOfficerId && routeOfficerIds.length === 0) {
        setPinnedOfficerId(null);
        setSelectedOfficerId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    routeOfficerId,
    routeOfficerIds,
    setRouteOfficerId,
    setRouteOfficerIdsInt,
    clearAllMultiDirections,
  ]);

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
  const handleOfficerClick = React.useCallback(
    (id: string) => {
      // Allow selecting officer only when a task is selected or admin route mode is active
      if (selectedTask || routeOfficerId) {
        // Toggle selection: if already selected, deselect it
        setSelectedOfficerId((prev) => (prev === id ? null : id));
      }
    },
    [selectedTask, routeOfficerId]
  );

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
      // Skip task routing when admin route mode is active (single or multi)
      if (routeOfficerId || routeOfficerIds.length > 0) {
        clearDirections();
        clearAllMultiDirections();
        setRouteInfo(null);
        setEtaList(null);
        return;
      }

      if (!mapRef.current || !selectedTask) {
        clearDirections();
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

      // Also compute ETA list and pick best when not already assigned or previewing
      if (!selectedOfficerId) {
        try {
          const svc = new google.maps.DistanceMatrixService();
          const validOfficers = officers.filter((o) => o.base);
          const res = await svc.getDistanceMatrix({
            origins: validOfficers.map((o) => o.base!),
            destinations: [selectedTask.coords],
            travelMode: google.maps.TravelMode.DRIVING,
            avoidHighways: false,
            avoidTolls: false,
          });
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
          if (!cancelled) setEtaList(list);
          if (!origin && list.length > 0) {
            origin = list[0].officer.base!;
            chosenOfficerId = list[0].officer.id;
          }
        } catch {
          if (!origin) {
            // Fallback to straight-line nearest if Distance Matrix fails
            const validOfficers = officers.filter((o) => o.base);
            const nearest = [...validOfficers].sort(
              (a, b) =>
                distance(a.base!, selectedTask.coords) -
                distance(b.base!, selectedTask.coords)
            )[0];
            origin = nearest?.base ?? null;
            chosenOfficerId = nearest?.id;
          }
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
          origin: origin!,
          destination: selectedTask.coords,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false,
          provideRouteAlternatives: false,
        });
        if (cancelled) return;
        if (result && typeof result === "object") {
          // Update polyline style depending on preview vs pinned
          const isPinned =
            Boolean(pinnedOfficerId) && chosenOfficerId === pinnedOfficerId;
          const isPreview = !isPinned && Boolean(selectedOfficerId);
          directionsRendererRef.current?.setOptions({
            polylineOptions: {
              strokeColor: "#2563eb",
              strokeOpacity: isPreview ? 0.6 : 0.95,
              strokeWeight: isPreview ? 4 : 5,
              // dashed look using icons for preview
              icons: isPreview
                ? [
                    {
                      icon: {
                        path: "M 0,-1 0,1",
                        strokeOpacity: 1,
                        scale: 3,
                      } as google.maps.Symbol,
                      offset: "0",
                      repeat: "12px",
                    },
                  ]
                : undefined,
            },
          });
          directionsRendererRef.current?.setDirections(result);
        } else {
          clearDirections();
        }
        const leg = result.routes?.[0]?.legs?.[0];
        setRouteInfo({
          distanceText: leg?.distance?.text,
          durationText: leg?.duration?.text,
          officerId: chosenOfficerId,
        });
      } catch {
        clearDirections();
        setRouteInfo(null);
      }
    }
    calc();
    return () => {
      cancelled = true;
    };
  }, [
    selectedTask,
    officers,
    selectedOfficerId,
    pinnedOfficerId,
    routeOfficerId,
    routeOfficerIds,
    clearDirections,
    clearAllMultiDirections,
  ]);

  // Admin route view: route through tasks assigned to chosen officer(s)
  React.useEffect(() => {
    let cancelled = false;
    async function calcAdmin() {
      if (!mapRef.current) return;
      const multi = routeOfficerIds?.length ? routeOfficerIds : [];

      // If multi selection present: render multiple colored routes
      if (multi.length > 0) {
        // Clear single renderer
        clearDirections();

        // Palette for up to 10 officers
        const palette = [
          "#ef4444",
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#8b5cf6",
          "#06b6d4",
          "#f43f5e",
          "#22c55e",
          "#eab308",
          "#6366f1",
        ];

        const ds = new google.maps.DirectionsService();
        const used = new Set<string>();
        // Cleanup any stale renderers
        for (const [k, r] of multiDirectionsRef.current) {
          if (!multi.includes(k)) {
            try {
              r.setMap(null);
            } catch {}
            multiDirectionsRef.current.delete(k);
          }
        }

        for (
          let idx = 0;
          idx < Math.min(multi.length, routeMultiLimit);
          idx++
        ) {
          if (cancelled) break;
          const id = multi[idx];
          const off = officers.find((o) => o.id === id);
          const dayTasks = tasks.filter((t) => t.assignedTo === id);
          if (!off || !off.base || dayTasks.length === 0) continue;
          used.add(id);
          const origin = off.base;
          const points = dayTasks.map((t) => ({ location: t.coords }));
          const destination = points[points.length - 1]
            .location as google.maps.LatLngLiteral;
          const waypoints = points
            .slice(0, -1)
            .map((p) => ({ location: p.location, stopover: true as const }));

          try {
            const result = await ds.route({
              origin,
              destination,
              waypoints,
              optimizeWaypoints: true,
              travelMode: google.maps.TravelMode.DRIVING,
            });
            if (cancelled) break;
            // Get or create renderer for this officer
            let r = multiDirectionsRef.current.get(id);
            if (!r) {
              r = new google.maps.DirectionsRenderer({
                map: mapRef.current!,
                suppressMarkers: true,
                preserveViewport: true,
                polylineOptions: {
                  strokeColor: palette[idx % palette.length],
                  strokeOpacity: 0.95,
                  strokeWeight: 4,
                },
              });
              multiDirectionsRef.current.set(id, r);
            } else {
              // Update color if needed
              r.setOptions({
                polylineOptions: {
                  strokeColor: palette[idx % palette.length],
                  strokeOpacity: 0.95,
                  strokeWeight: 4,
                },
              });
              r.setMap(mapRef.current!);
            }
            r.setDirections(result);
          } catch {
            const r = multiDirectionsRef.current.get(id);
            if (r) {
              try {
                r.setMap(null);
              } catch {}
              multiDirectionsRef.current.delete(id);
            }
          }
        }

        // No single route info for multi-selection; clear summary
        setRouteInfo(null);
        return;
      }

      // Single selection mode
      if (!routeOfficerId) return;

      const off = officers.find((o) => o.id === routeOfficerId);
      const dayTasks = tasks.filter((t) => t.assignedTo === routeOfficerId);
      if (!off || !off.base || dayTasks.length === 0) {
        clearDirections();
        setRouteInfo(null);
        return;
      }

      const origin = off.base;
      const points = dayTasks.map((t) => ({ location: t.coords }));
      const destination = points[points.length - 1]
        .location as google.maps.LatLngLiteral;
      const waypoints = points
        .slice(0, -1)
        .map((p) => ({ location: p.location, stopover: true as const }));

      try {
        const ds = new google.maps.DirectionsService();
        const result = await ds.route({
          origin,
          destination,
          waypoints,
          optimizeWaypoints: true,
          travelMode: google.maps.TravelMode.DRIVING,
        });
        if (cancelled) return;
        // Clear multi renderers if any were left
        clearAllMultiDirections();
        if (result && typeof result === "object") {
          directionsRendererRef.current?.setDirections(result);
        } else {
          clearDirections();
        }
        const legs = result.routes?.[0]?.legs ?? [];
        const dist = legs.reduce((s, l) => s + (l.distance?.value ?? 0), 0);
        const dur = legs.reduce((s, l) => s + (l.duration?.value ?? 0), 0);
        setRouteInfo({
          distanceText: dist ? `${(dist / 1000).toFixed(1)} กม.` : undefined,
          durationText: dur ? `${Math.round(dur / 60)} นาที` : undefined,
          officerId: off.id,
        });
      } catch {
        clearDirections();
        setRouteInfo(null);
      }
    }
    calcAdmin();
    return () => {
      cancelled = true;
    };
  }, [
    routeOfficerId,
    routeOfficerIds,
    officers,
    tasks,
    clearDirections,
    clearAllMultiDirections,
    routeMultiLimit,
  ]);

  // Task marker base color → orange, officer → blue/silver
  const statusColor: Record<string, string> = {
    pending: "#f97316", // orange
    assigned: "#fb923c",
    in_progress: "#f59e0b",
    done: "#10b981",
    issue: "#ef4444",
  };

  // When route mode is active, show only that officer and their tasks
  const displayTasks = React.useMemo(() => {
    if (routeOfficerId)
      return tasks.filter((t) => t.assignedTo === routeOfficerId);
    if (routeOfficerIds.length > 0)
      return tasks.filter(
        (t) => t.assignedTo && routeOfficerIds.includes(t.assignedTo)
      );
    return tasks;
  }, [tasks, routeOfficerId, routeOfficerIds]);
  const displayOfficersRaw = React.useMemo(() => {
    if (routeOfficerId) return officers.filter((o) => o.id === routeOfficerId);
    if (routeOfficerIds.length > 0)
      return officers.filter((o) => routeOfficerIds.includes(o.id));
    return officers;
  }, [officers, routeOfficerId, routeOfficerIds]);

  const bounds = React.useMemo(() => {
    const officersWithBase = displayOfficersRaw.filter((o) => o.base);
    const lats = displayTasks
      .map((t) => t.coords.lat)
      .concat(officersWithBase.map((o) => o.base!.lat));
    const lngs = displayTasks
      .map((t) => t.coords.lng)
      .concat(officersWithBase.map((o) => o.base!.lng));
    if (lats.length === 0 || lngs.length === 0) return null;
    const minLat = Math.min(...lats) - 0.01;
    const maxLat = Math.max(...lats) + 0.01;
    const minLng = Math.min(...lngs) - 0.01;
    const maxLng = Math.max(...lngs) + 0.01;
    return { minLat, maxLat, minLng, maxLng };
  }, [displayTasks, displayOfficersRaw]);

  // If all officer bases are identical/nearby, scatter them for display only
  const mapOfficers = React.useMemo(() => {
    // If route mode, just return the selected officer(s) without jitter
    if (routeOfficerId || routeOfficerIds.length > 0) return displayOfficersRaw;
    if (!officers.length) return officers;
    const officersWithBase = officers.filter((o) => o.base);
    const unique = new Set(
      officersWithBase.map(
        (o) => `${o.base!.lat.toFixed(4)},${o.base!.lng.toFixed(4)}`
      )
    );
    if (unique.size > Math.max(2, Math.floor(officersWithBase.length / 3)))
      return officers;
    const tasksWithCoords = displayTasks.filter((t) => t.coords);
    const center = tasksWithCoords.length
      ? {
          lat:
            tasksWithCoords.reduce((s, t) => s + t.coords!.lat, 0) /
            tasksWithCoords.length,
          lng:
            tasksWithCoords.reduce((s, t) => s + t.coords!.lng, 0) /
            tasksWithCoords.length,
        }
      : { lat: 13.7563, lng: 100.5018 };
    const jitter = (r: number) => (Math.random() * 2 - 1) * r;
    return officers.map((o, i) => ({
      ...o,
      base: o.base
        ? {
            lat: center.lat + jitter(0.03) + i * 0.0001,
            lng: center.lng + jitter(0.03) + i * 0.0001,
          }
        : undefined,
    }));
  }, [
    officers,
    displayTasks,
    routeOfficerId,
    routeOfficerIds,
    displayOfficersRaw,
  ]);

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
      <GoogleMap
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
            ? mapOfficers
                .filter((o) => o.base)
                .map((o) => {
                  const isChosen =
                    routeInfo?.officerId === o.id || selectedOfficerId === o.id;
                  return (
                    <AdvancedMarker
                      key={o.id}
                      position={o.base!}
                      title={`${o.name} ${o.zoneLabel ?? ""}`}
                      zIndex={isChosen ? 2000 : 1200}
                      onClick={() => handleOfficerClick(o.id)}
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
            : mapOfficers
                .filter((o) => o.base)
                .map((o) => {
                  const isChosen =
                    routeInfo?.officerId === o.id || selectedOfficerId === o.id;
                  return (
                    <Marker
                      key={o.id}
                      position={o.base!}
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
                      onClick={() => handleOfficerClick(o.id)}
                    />
                  );
                }))}

        {/* Tasks */}
        {showTasks &&
          (hasVector
            ? displayTasks.map((t) => {
                const active = t.id === selectedTaskId;
                const hoverActive = !active && previewTaskId === t.id;
                return (
                  <AdvancedMarker
                    key={t.id}
                    position={t.coords}
                    title={`${t.patientName} • ${t.address}`}
                    onClick={() =>
                      onSelectTask?.(t.id === selectedTaskId ? null : t.id)
                    }
                    zIndex={active ? 1800 : hoverActive ? 1500 : 1000}
                  >
                    <div className="flex items-center -translate-y-1">
                      <Pin
                        background={active ? "#ef4444" : statusColor[t.status]}
                        borderColor={
                          active
                            ? "#111827"
                            : hoverActive
                            ? "#1f2937"
                            : "#ffffff"
                        }
                        glyphColor="#ffffff"
                        scale={active ? 1.3 : hoverActive ? 1.15 : 1}
                      />
                      <span className="ml-1 px-1.5 py-0.5 text-[11px] rounded bg-white/95 border shadow max-w-[200px] truncate">
                        {t.patientName}
                        {active
                          ? " • กำลังเลือก"
                          : hoverActive
                          ? " • ดูตัวอย่าง"
                          : ""}
                      </span>
                    </div>
                  </AdvancedMarker>
                );
              })
            : displayTasks.map((t) => {
                const active = t.id === selectedTaskId;
                const hoverActive = !active && previewTaskId === t.id;
                return (
                  <Marker
                    key={t.id}
                    position={t.coords}
                    title={`${t.patientName} • ${t.address}`}
                    onClick={() =>
                      onSelectTask?.(t.id === selectedTaskId ? null : t.id)
                    }
                    zIndex={active ? 999 : hoverActive ? 800 : 600}
                    icon={
                      symbolPaths.circle
                        ? {
                            path: symbolPaths.circle,
                            fillColor: active
                              ? "#ef4444"
                              : statusColor[t.status],
                            fillOpacity: 1,
                            strokeColor: active
                              ? "#111827"
                              : hoverActive
                              ? "#1f2937"
                              : "#ffffff",
                            strokeWeight: active ? 3 : hoverActive ? 3 : 2,
                            scale: active ? 9 : hoverActive ? 8 : 6,
                          }
                        : undefined
                    }
                  />
                );
              }))}

        {/* Route is rendered via DirectionsRenderer imperatively */}
      </GoogleMap>

      {/* Bottom-center banner for Route Mode */}
      {routeOfficerId && (
        <RouteBanner
          officerName={officers.find((o) => o.id === routeOfficerId)?.name}
          onCancel={() => setRouteOfficerId(null)}
        />
      )}
      {routeOfficerIds.length > 0 && (
        <RouteBanner
          officerName={`หลายคน • ${routeOfficerIds.length} คน`}
          onCancel={() => {
            setRouteOfficerIdsInt([]);
            clearAllMultiDirections();
          }}
        />
      )}

      {/* Overlay: selected task info */}
      {selectedTask && (
        <SelectedTaskOverlay
          task={selectedTask}
          routeInfo={routeInfo}
          officers={officers}
          onAssign={(taskId, officerId) => assignTask(taskId, officerId)}
        />
      )}

      {/* Overlay: legend */}
      <LegendOverlay />

      {/* Overlay: controls and ETA list */}
      <ControlsOverlay
        onFit={() =>
          bounds &&
          mapRef.current?.fitBounds(
            new google.maps.LatLngBounds(
              { lat: bounds.minLat, lng: bounds.minLng },
              { lat: bounds.maxLat, lng: bounds.maxLng }
            )
          )
        }
        showTasks={showTasks}
        setShowTasks={(v) => setShowTasks(v)}
        showOfficers={showOfficers}
        setShowOfficers={(v) => setShowOfficers(v)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenRoute={() => setRouteOpen(true)}
        routeActive={!!routeOfficerId || routeOfficerIds.length > 0}
      />

      {selectedTask && !routeOfficerId && etaList && (
        <div className="absolute right-2 top-[56px]">
          <EtaPanel
            list={etaList}
            selectedOfficerId={selectedOfficerId}
            onSelect={(id) => setSelectedOfficerId(id)}
          />
        </div>
      )}

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

      {/* Admin Route Modal */}
      <Dialog open={routeOpen} onOpenChange={setRouteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เส้นทางเจ้าหน้าที่ (ตามวันในตัวกรอง)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">เลือกเจ้าหน้าที่</div>
            <div className="flex items-center gap-2">
              <Select
                value={routeOfficerId ?? ""}
                onValueChange={(v) => {
                  setRouteOfficerId(v || null);
                  // If choosing single, clear multi selection for clarity
                  if (v) setRouteOfficerIdsInt([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกเจ้าหน้าที่ (โหมดเดี่ยว)" />
                </SelectTrigger>
                <SelectContent>
                  {officers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name} • {o.zoneLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {routeOfficerId && (
                <Button
                  variant="outline"
                  onClick={() => setRouteOfficerId(null)}
                >
                  ล้าง
                </Button>
              )}
            </div>

            <MultiOfficerSelector
              officers={officers}
              selectedOfficerIds={routeOfficerIds}
              onSelectionChange={setRouteOfficerIdsInt}
              multiLimit={routeMultiLimit}
              onLimitChange={setRouteMultiLimit}
              onClearAll={() => {
                setRouteOfficerIdsInt([]);
                clearAllMultiDirections();
              }}
              onSwitchToMultiMode={() => setRouteOfficerId(null)}
            />
            <div className="text-xs text-muted-foreground">
              ระบบจะวางเส้นทางจากฐานไปยังงานทั้งหมดของเจ้าหน้าที่ในวันที่ที่เลือกไว้
              (ตามตัวกรอง)
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

// Fallback Canvas moved to components/map/FallbackCanvas.tsx
