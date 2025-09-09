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
import { useOfficers } from "@/store/officers";
import type { Officer } from "@/lib/types";

export function AddOfficerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { setOfficers } = useOfficers();
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [zoneLabel, setZoneLabel] = React.useState("");
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

  const canSave = name.trim() && parseCoords(coordStr);

  const onSave = () => {
    const base = parseCoords(coordStr);
    if (!base) return;
    const newOfficer: Officer = {
      id: `o-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      zoneLabel: zoneLabel.trim(),
      base,
    };
    setOfficers((prev) => [newOfficer, ...prev]);
    onOpenChange(false);
    setName("");
    setPhone("");
    setZoneLabel("");
    setCoordStr("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มเจ้าหน้าที่</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>ชื่อ</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น นาย กอไก่" />
          </div>
          <div className="space-y-1">
            <Label>โทรศัพท์</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เช่น 081-234-5678" />
          </div>
          <div className="space-y-1">
            <Label>โซน/เขต</Label>
            <Input value={zoneLabel} onChange={(e) => setZoneLabel(e.target.value)} placeholder="เช่น เขต A" />
          </div>
          <div className="space-y-1">
            <Label>พิกัดฐาน (lat, lng)</Label>
            <Input value={coordStr} onChange={(e) => setCoordStr(e.target.value)} placeholder="13.76, 100.50" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button onClick={onSave} disabled={!canSave}>
              บันทึก
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

