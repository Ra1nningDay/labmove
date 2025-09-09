"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/store/tasks";
import { geocodeAddress } from "@/lib/geocode";
import type { Task } from "@/lib/types";

export function AddTaskDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { setTasks } = useTasks();
  const [patientName, setPatientName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [date, setDate] = React.useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [coordStr, setCoordStr] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"address" | "coords">("address");

  function parseCoords(
    raw: string | undefined
  ): { lat: number; lng: number } | null {
    if (!raw) return null;
    const parts = raw.split(",").map((s) => s.trim());
    if (parts.length !== 2) return null;
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  const canSave =
    patientName.trim() &&
    date &&
    ((mode === "address" && address.trim()) || mode === "coords");

  const onSave = async () => {
    setGeoError(null);
    setSaving(true);
    let coords: { lat: number; lng: number } | undefined;

    if (mode === "coords") {
      coords = parseCoords(coordStr) || undefined;
    } else {
      // Address mode - try geocoding if address is provided
      if (address.trim()) {
        try {
          const res = await geocodeAddress(address);
          coords = res.coords;
        } catch (e) {
          setSaving(false);
          setGeoError(
            "ไม่สามารถแปลงที่อยู่เป็นพิกัดได้ กรุณาระบุพิกัดเอง หรือใช้พิกัดตั้งต้น"
          );
          return;
        }
      }
    }

    const newTask: Task = {
      id: `nv-${Date.now()}`,
      patientName: patientName.trim(),
      address: address.trim(),
      coords: coords || { lat: 13.7563, lng: 100.5018 },
      date,
      tests: [],
      status: "pending",
    };
    setTasks((prev) => [newTask, ...prev]);
    setSaving(false);
    onOpenChange(false);
    setPatientName("");
    setAddress("");
    setCoordStr("");
    setMode("address");
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
            <Input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="เช่น นาง เอ บี"
            />
          </div>
          <div className="space-y-1">
            <Label>วันที่</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <Label>วิธีการกำหนดตำแหน่ง</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "address" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setMode("address")}
              >
                ใช้ที่อยู่
              </Button>
              <Button
                type="button"
                variant={mode === "coords" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setMode("coords")}
              >
                ระบุพิกัดเอง
              </Button>
            </div>
          </div>

          {mode === "address" ? (
            <div className="space-y-1">
              <Label>ที่อยู่</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="เลขที่ ถนน แขวง เขต จังหวัด"
              />
              <p className="text-xs text-muted-foreground">
                ระบบจะพยายามแปลงที่อยู่นี้เป็นพิกัดโดยอัตโนมัติ
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>พิกัด (lat, lng)</Label>
              <Input
                value={coordStr}
                onChange={(e) => setCoordStr(e.target.value)}
                placeholder="13.7563, 100.5018"
              />
              {coordStr && !parseCoords(coordStr) && (
                <p className="text-sm text-amber-600">
                  รูปแบบไม่ถูกต้อง กรุณาใช้รูปแบบ lat,lng
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                เว้นว่างเพื่อใช้พิกัดตั้งต้นกรุงเทพฯ
              </p>
            </div>
          )}
          {geoError && <p className="text-sm text-amber-600">{geoError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            {geoError && mode === "address" && (
              <Button
                variant="secondary"
                onClick={() => {
                  // fallback to default Bangkok coords
                  const newTask: Task = {
                    id: `nv-${Date.now()}`,
                    patientName: patientName.trim(),
                    address: address.trim(),
                    coords: { lat: 13.7563, lng: 100.5018 },
                    date,
                    tests: [],
                    status: "pending",
                  };
                  setTasks((prev) => [newTask, ...prev]);
                  onOpenChange(false);
                  setPatientName("");
                  setAddress("");
                  setCoordStr("");
                  setMode("address");
                }}
                disabled={!canSave}
              >
                บันทึก (ใช้พิกัดตั้งต้น)
              </Button>
            )}
            <Button onClick={onSave} disabled={!canSave || saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
