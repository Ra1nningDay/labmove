"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/store/tasks";
import type { Task } from "@/lib/types";

export function AddTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { setTasks } = useTasks();
  const [patientName, setPatientName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [date, setDate] = React.useState<string>(new Date().toISOString().slice(0, 10));
  const [coordStr, setCoordStr] = React.useState("");

  function parseCoords(raw: string | undefined): { lat: number; lng: number } | null {
    if (!raw) return null;
    const parts = raw.split(",").map((s) => s.trim());
    if (parts.length !== 2) return null;
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  const canSave = patientName.trim() && address.trim() && date && parseCoords(coordStr);

  const onSave = () => {
    const coords = parseCoords(coordStr);
    if (!coords) return;
    const newTask: Task = {
      id: `nv-${Date.now()}`,
      patientName: patientName.trim(),
      address: address.trim(),
      coords,
      date,
      tests: [],
      status: "pending",
    };
    setTasks((prev) => [newTask, ...prev]);
    onOpenChange(false);
    setPatientName("");
    setAddress("");
    setCoordStr("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มงานใหม่</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>ชื่อผู้รับบริการ</Label>
            <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="เช่น นาง เอ บี" />
          </div>
          <div className="space-y-1">
            <Label>ที่อยู่</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ที่อยู่เต็ม" />
          </div>
          <div className="space-y-1">
            <Label>วันที่</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>พิกัด (lat, lng)</Label>
            <Input value={coordStr} onChange={(e) => setCoordStr(e.target.value)} placeholder="13.76, 100.50" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button onClick={onSave} disabled={!canSave}>บันทึก</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

