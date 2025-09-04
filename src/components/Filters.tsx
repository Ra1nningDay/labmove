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
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1">
        <Label htmlFor="search">ค้นหา</Label>
        <Input
          id="search"
          placeholder="ชื่อผู้ป่วย/ที่อยู่"
          value={query.text}
          onChange={(e) => onChange({ ...query, text: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="date">วันที่</Label>
        <Input
          id="date"
          type="date"
          value={query.date}
          onChange={(e) => onChange({ ...query, date: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>สถานะ</Label>
        <Select
          value={query.status === "" ? "all" : (query.status as TaskStatus)}
          onValueChange={(v) =>
            onChange({ ...query, status: v === "all" ? "" : (v as TaskStatus) })
          }
        >
          <SelectTrigger>
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
  );
}
