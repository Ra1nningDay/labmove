"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import type { Task, TaskStatus, Officer } from "@/lib/types";
import { useTasks } from "@/store/tasks";
import { useOfficers } from "@/store/officers";
import { Filters, type TaskQuery } from "@/components/Filters";
import { TaskList } from "@/components/TaskList";
import { OfficerList } from "@/components/OfficerList";
import { BrandedMapPlaceholder } from "@/components/BrandedMapPlaceholder";
// Defer heavy drawer (lists, sorting, effects) until opened
const AssignmentDrawer = dynamic(
  () => import("@/components/AssignmentDrawer").then((m) => m.AssignmentDrawer),
  { ssr: false }
);
import { TopNav } from "@/components/TopNav";

// Map components are lazy-loaded after idle/interaction via import() in an effect

export default function Page() {
  const { tasks, selectedTaskId, setSelectedTaskId, selectedTask, assignTask } =
    useTasks();
  const { officers } = useOfficers();

  const [query, setQuery] = useState<TaskQuery>({
    text: "",
    date: new Date().toISOString().split("T")[0], // Set to today's date
    status: "",
  });
  const [assignOpen, setAssignOpen] = useState(false);
  const [taskForAssign, setTaskForAssign] = useState<Task | null>(null);
  const [leftTab, setLeftTab] = useState<"tasks" | "officers">("tasks");
  const [routeOfficerId, setRouteOfficerId] = useState<string | null>(null);
  const [routeOpen, setRouteOpen] = useState(false);
  // Delay loading heavy map code until idle/interaction; keep placeholder as LCP
  const [showMap, setShowMap] = useState(false);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  
  // Auto-load map if user previously chose to view it
  React.useEffect(() => {
    const shouldAutoLoadMap = localStorage.getItem('labmove-auto-load-map') === 'true';
    if (shouldAutoLoadMap) {
      // Small delay to avoid blocking initial render
      const timer = setTimeout(() => {
        loadMapNow();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);
  const pendingTimers = React.useRef<number[]>([]);
  type MapProps = {
    tasks: Task[];
    officers: Officer[];
    selectedTaskId?: string | null;
    onSelectTask?: (id: string | null) => void;
    routeOfficerId?: string | null;
    onChangeRouteOfficerId?: (id: string | null) => void;
    routeOpen?: boolean;
    onChangeRouteOpen?: (open: boolean) => void;
  };
  type ProviderProps = { children: React.ReactNode };
  const [MapComponent, setMapComponent] =
    useState<null | React.ComponentType<MapProps>>(null);
  const [ProviderComponent, setProviderComponent] =
    useState<null | React.ComponentType<ProviderProps>>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const loadMapNow = React.useCallback(() => {
    if (isLoadingMap || MapComponent || ProviderComponent) return;
    setIsLoadingMap(true);

    // Preload with higher priority
    Promise.all([
      import("@/components/MapCanvas").then((m) => m.MapCanvas),
      import("@/components/GoogleMapsProvider").then(
        (m) => m.GoogleMapsProvider
      ),
    ])
      .then(([MapC, Provider]) => {
        setMapComponent(() => MapC as unknown as React.ComponentType<MapProps>);
        setProviderComponent(
          () => Provider as unknown as React.ComponentType<ProviderProps>
        );
        setShowMap(true);
        // Start hiding placeholder sooner when components are ready
        setTimeout(() => setIsLoadingMap(false), 100);
      })
      .catch((error) => {
        console.error("Failed to load map components:", error);
        setIsLoadingMap(false);
      });
  }, [isLoadingMap, MapComponent, ProviderComponent]);

  // Button-only interaction: remove global listeners; user must click the CTA
  React.useEffect(() => {
    // Only start hiding placeholder after we decide to load the map
    if (!showMap) return;
    const start = typeof performance !== "undefined" ? performance.now() : 0;
    const minHoldMs = 150; // minimal hold for smooth transition
    const onFirstTiles = () => {
      const elapsed =
        (typeof performance !== "undefined" ? performance.now() : minHoldMs) -
        start;
      const delay = Math.max(0, minHoldMs - elapsed);
      const tid = window.setTimeout(() => setPlaceholderVisible(false), delay);
      pendingTimers.current.push(tid);
    };
    window.addEventListener("map:first-tiles", onFirstTiles);
    // Fallback: hide placeholder after a shorter timeout for better UX
    const failSafe = window.setTimeout(
      () => setPlaceholderVisible(false),
      1500 // much faster fallback
    );
    pendingTimers.current.push(failSafe);
    return () => {
      window.removeEventListener("map:first-tiles", onFirstTiles);
      for (const id of pendingTimers.current) window.clearTimeout(id);
      pendingTimers.current = [];
    };
  }, [showMap]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const textOk =
        !query.text ||
        (t.patientName + " " + t.address)
          .toLowerCase()
          .includes(query.text.toLowerCase());
      const dateOk = !query.date || t.date === query.date;
      const statusOk =
        !query.status || t.status === (query.status as TaskStatus);
      return textOk && dateOk && statusOk;
    });
  }, [tasks, query]);

  return (
    <div className="grid grid-rows-[auto_1fr] min-h-screen">
      <TopNav />

      <div className="p-4 md:p-6 grid gap-4 md:grid-cols-6 grid-cols-2">
        <div className="space-y-3 overflow-auto md:h-[calc(100vh-120px)] col-span-6 md:col-span-2">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur pb-2">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="text-xs text-muted-foreground">
                ทั้งหมด {filtered.length} เคส
              </div>
              <div className="flex items-center gap-1">
                <button
                  className={`px-4 py-2 text-xs rounded-md border ${
                    leftTab === "tasks"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background"
                  }`}
                  onClick={() => setLeftTab("tasks")}
                >
                  งาน
                </button>
                <button
                  className={`px-4 py-2 text-xs rounded-md border ${
                    leftTab === "officers"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background"
                  }`}
                  onClick={() => setLeftTab("officers")}
                >
                  เจ้าหน้าที่
                </button>
              </div>
            </div>
            <Filters query={query} onChange={setQuery} />
          </div>

          {leftTab === "tasks" ? (
            <TaskList
              tasks={filtered}
              officers={officers}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              onAssignClick={(t) => {
                setTaskForAssign(t);
                setAssignOpen(true);
              }}
            />
          ) : (
            <div className="space-y-2 pb-10">
              <OfficerList
                officers={officers}
                selectedTask={selectedTask ?? null}
                onShowRoute={(id) => {
                  setRouteOfficerId(id);
                  setRouteOpen(false);
                }}
              />
            </div>
          )}
        </div>

        <div className="min-h-[320px] md:h-[calc(100vh-120px)] md:col-span-4 col-span-6">
          <div className="relative h-full w-full rounded-md border overflow-hidden bg-gradient-to-br from-blue-50 to-green-50">
            {/* Map layer */}
            {showMap && MapComponent && ProviderComponent && (
              <div
                className={`absolute inset-0 z-0 transition-opacity duration-500 ${
                  !placeholderVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                {React.createElement(
                  ProviderComponent,
                  null,
                  React.createElement(MapComponent, {
                    tasks: filtered,
                    officers: officers,
                    selectedTaskId: selectedTaskId,
                    onSelectTask: setSelectedTaskId,
                    routeOfficerId: routeOfficerId,
                    onChangeRouteOfficerId: setRouteOfficerId,
                    routeOpen: routeOpen,
                    onChangeRouteOpen: setRouteOpen,
                  })
                )}
              </div>
            )}

            {/* Placeholder overlay kept on top until first tiles render */}
            <div
              className={`absolute inset-0 z-10 transition-opacity duration-700 ${
                placeholderVisible || !showMap
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none"
              }`}
              aria-hidden={!placeholderVisible && showMap}
            >
              {/* LQIP - Blurred map background */}
              <Image
                src="/map-lqip.svg"
                alt="แผนที่พื้นที่ให้บริการ"
                fill
                priority
                fetchPriority="high"
                sizes="(min-width: 768px) 66vw, 100vw"
                style={{ objectFit: "cover" }}
                className="blur-sm scale-105"
              />

              {/* Branded Overlay with CTA */}
              <BrandedMapPlaceholder
                onOpenMap={loadMapNow}
                isLoading={isLoadingMap}
              />
            </div>
          </div>
        </div>
      </div>

      {assignOpen && (
        <AssignmentDrawer
          open={assignOpen}
          onOpenChange={setAssignOpen}
          task={taskForAssign}
          officers={officers}
          onAssign={(taskId, officerId) => {
            assignTask(taskId, officerId);
            setSelectedTaskId(taskId);
          }}
        />
      )}
    </div>
  );
}
