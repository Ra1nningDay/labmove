"use client";

import React, { useMemo, useState } from "react";
import type { Task, TaskStatus } from "@/lib/types";
import { useTasks } from "@/store/tasks";
import { useOfficers } from "@/store/officers";
import { Filters, type TaskQuery } from "@/components/Filters";
import { TaskList } from "@/components/TaskList";
import { MapCanvas } from "@/components/MapCanvas";
import { OfficerList } from "@/components/OfficerList";
import { AssignmentDrawer } from "@/components/AssignmentDrawer";
import { TopNav } from "@/components/TopNav";

export default function Page() {
  const { tasks, selectedTaskId, setSelectedTaskId, selectedTask, assignTask } = useTasks();
  const { officers } = useOfficers();

  const [query, setQuery] = useState<TaskQuery>({ text: "", date: "", status: "" });
  const [assignOpen, setAssignOpen] = useState(false);
  const [taskForAssign, setTaskForAssign] = useState<Task | null>(null);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const textOk =
        !query.text ||
        (t.patientName + " " + t.address).toLowerCase().includes(query.text.toLowerCase());
      const dateOk = !query.date || t.date === query.date;
      const statusOk = !query.status || t.status === (query.status as TaskStatus);
      return textOk && dateOk && statusOk;
    });
  }, [tasks, query]);

  return (
    <div className="grid grid-rows-[auto_1fr] min-h-screen">
      <TopNav />

      <div className="p-4 md:p-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-3 overflow-auto md:h-[calc(100vh-120px)]">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur pb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">ทั้งหมด {filtered.length} เคส</div>
            </div>
            <Filters query={query} onChange={setQuery} />
          </div>

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

          <div className="space-y-2 pb-10">
            <h2 className="text-sm font-medium">เจ้าหน้าที่</h2>
            <OfficerList officers={officers} selectedTask={selectedTask ?? null} />
          </div>
        </div>

        <div className="min-h-[320px] md:h-[calc(100vh-120px)]">
          <MapCanvas
            tasks={filtered}
            officers={officers}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
          />
        </div>
      </div>

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
    </div>
  );
}
