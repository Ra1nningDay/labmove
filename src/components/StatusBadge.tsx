"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock3, BadgeCheck, Route, CheckCircle2, XCircle } from "lucide-react";
import type { TaskStatus } from "@/lib/types";

const map: Record<
  TaskStatus,
  { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: "รอยืนยัน",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: Clock3,
  },
  assigned: {
    label: "มอบหมายแล้ว",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    Icon: BadgeCheck,
  },
  in_progress: {
    label: "กำลังดำเนินการ",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    Icon: Route,
  },
  done: {
    label: "เสร็จสิ้น",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
  issue: {
    label: "ติดปัญหา",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    Icon: XCircle,
  },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, className, Icon } = map[status];
  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1 ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Badge>
  );
}

