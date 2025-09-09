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
import { geocodeAddress } from "@/lib/geocode";
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
  const [baseAddress, setBaseAddress] = React.useState("");
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
    name.trim() &&
    ((mode === "address" && baseAddress.trim()) || mode === "coords");

  const onSave = async () => {
    setGeoError(null);
    setSaving(true);
    let base: { lat: number; lng: number } | undefined;

    if (mode === "coords") {
      base = parseCoords(coordStr) || undefined;
    } else {
      // Address mode - try geocoding if address is provided
      if (baseAddress.trim()) {
        try {
          const res = await geocodeAddress(baseAddress);
          base = res.coords;
        } catch (e) {
          // Geocoding failed, but we can still save without coords
          base = undefined;
        }
      }
    }

    const newOfficer: Officer = {
      id: `o-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      zoneLabel: zoneLabel.trim(),
      base,
      address: mode === "address" ? baseAddress.trim() : undefined,
    };
    setOfficers((prev) => [newOfficer, ...prev]);
    setSaving(false);
    onOpenChange(false);
    setName("");
    setPhone("");
    setZoneLabel("");
    setBaseAddress("");
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
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น นาย กอไก่"
            />
          </div>
          <div className="space-y-1">
            <Label>โทรศัพท์</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="เช่น 081-234-5678"
            />
          </div>
          <div className="space-y-1">
            <Label>โซน/เขต</Label>
            <Input
              value={zoneLabel}
              onChange={(e) => setZoneLabel(e.target.value)}
              placeholder="เช่น เขต A"
            />
          </div>

          {/* Mode Selection */}
          <div className="space-y-2">
            <Label>วิธีการกำหนดตำแหน่งฐาน</Label>
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
              <Label>ที่อยู่ฐาน</Label>
              <Input
                value={baseAddress}
                onChange={(e) => setBaseAddress(e.target.value)}
                placeholder="เลขที่ ถนน แขวง เขต จังหวัด"
              />
              <p className="text-xs text-muted-foreground">
                ระบบจะพยายามแปลงที่อยู่นี้เป็นพิกัดโดยอัตโนมัติ
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>พิกัดฐาน (lat, lng)</Label>
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
                เว้นว่างเพื่อบันทึกโดยไม่มีพิกัด
              </p>
            </div>
          )}

          {geoError && <p className="text-sm text-amber-600">{geoError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button onClick={onSave} disabled={!canSave || saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
