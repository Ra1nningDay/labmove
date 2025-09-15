"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskStatus } from "@/lib/types";
import { Search, CalendarDays, Sparkles } from "lucide-react";

export type TaskQuery = {
  text: string;
  date: string; // YYYY-MM-DD
  status: TaskStatus | "";
};

type Props = {
  query: TaskQuery;
  onChange: (q: TaskQuery) => void;
};

export function Filters({ query, onChange }: Props) {
  return (
    <div className="rounded-md border bg-card p-3 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="search" className="flex items-center gap-1 text-muted-foreground">
            <Search className="size-3.5" /> ค้นหา
          </Label>
          <div className="relative">
            <Search className="size-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              placeholder="ชื่อผู้ป่วย/ที่อยู่"
              value={query.text}
              onChange={(e) => onChange({ ...query, text: e.target.value })}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="date" className="flex items-center gap-1 text-muted-foreground">
            <CalendarDays className="size-3.5" /> วันที่
          </Label>
          <div className="relative">
            <CalendarDays className="size-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="date"
              type="date"
              value={query.date}
              onChange={(e) => onChange({ ...query, date: e.target.value })}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label
            id="filter-status-label"
            className="flex items-center gap-1 text-muted-foreground"
          >
            <Sparkles className="size-3.5" /> สถานะ
          </Label>
          <Select
            value={query.status === "" ? "all" : (query.status as TaskStatus)}
            onValueChange={(v) =>
              onChange({ ...query, status: v === "all" ? "" : (v as TaskStatus) })
            }
          >
            <SelectTrigger aria-labelledby="filter-status-label">
              <SelectValue placeholder="ทั้งหมด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="pending">รอยืนยัน</SelectItem>
              <SelectItem value="assigned">มอบหมายแล้ว</SelectItem>
              <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
              <SelectItem value="done">เสร็จสิ้น</SelectItem>
              <SelectItem value="issue">ติดปัญหา</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
