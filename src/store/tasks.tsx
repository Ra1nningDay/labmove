"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import type { Task, TaskStatus } from "@/lib/types";
import { INITIAL_TASKS } from "@/lib/mock";
import { buildHomeVisitData } from "@/lib/homeVisit";

type TasksContextValue = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  selectedTaskId: string | null;
  setSelectedTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  assignTask: (taskId: string, officerId: string) => void;
  unassignTask: (taskId: string) => void;
  updateStatus: (taskId: string, status: TaskStatus) => void;
  selectedTask: Task | undefined;
};

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  // Prefer tasks from home visit mock if available; fall back to default mock
  const hv = buildHomeVisitData();
  const [tasks, setTasks] = useState<Task[]>(hv.tasks.length > 0 ? hv.tasks : INITIAL_TASKS);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const assignTask = (taskId: string, officerId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, assignedTo: officerId, status: "assigned" } : t
      )
    );
  };

  const unassignTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assignedTo: undefined, status: "pending" } : t))
    );
  };

  const updateStatus = (taskId: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
  };

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId),
    [tasks, selectedTaskId]
  );

  const value = useMemo<TasksContextValue>(
    () => ({
      tasks,
      setTasks,
      selectedTaskId,
      setSelectedTaskId,
      assignTask,
      unassignTask,
      updateStatus,
      selectedTask,
    }),
    [tasks, selectedTaskId]
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within TasksProvider");
  return ctx;
}
