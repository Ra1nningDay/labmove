"use client";

import React from "react";

export function LegendOverlay() {
  return (
    <div className="absolute left-2 bottom-2 rounded-md border bg-background/95 backdrop-blur px-2 py-1.5 shadow text-[11px]">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full" style={{ background: "#f59e0b" }}></span>
          รอยืนยัน
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full" style={{ background: "#3b82f6" }}></span>
          มอบหมายแล้ว
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full" style={{ background: "#6366f1" }}></span>
          กำลังดำเนินการ
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full" style={{ background: "#10b981" }}></span>
          เสร็จสิ้น
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full" style={{ background: "#ef4444" }}></span>
          ติดปัญหา
        </span>
      </div>
    </div>
  );
}

