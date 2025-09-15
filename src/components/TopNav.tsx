"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { MapPin, UserPlus, Plus } from "lucide-react";

const AddTaskDialog = dynamic(
  () => import("@/components/add/AddTaskDialog").then((m) => m.AddTaskDialog),
  { ssr: false }
);
const AddOfficerDialog = dynamic(
  () =>
    import("@/components/add/AddOfficerDialog").then((m) => m.AddOfficerDialog),
  { ssr: false }
);

export function TopNav() {
  const [openTask, setOpenTask] = React.useState(false);
  const [openOfficer, setOpenOfficer] = React.useState(false);
  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b border-border/40 shadow-sm">
      <div className="mx-auto max-w-screen-3xl px-4 md:px-6 py-3 flex items-center justify-between">
        {/* Brand Section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900 tracking-tight">
                LabMove
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                Smart Healthcare Logistics
              </p>
            </div>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenOfficer(true)}
            className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 cursor-pointer"
            aria-label="เพิ่มเจ้าหน้าที่ใหม่"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">เพิ่มเจ้าหน้าที่</span>
            <span className="sm:hidden">เจ้าหน้าที่</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setOpenTask(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 hover:shadow-lg transition-all duration-200 shadow-md cursor-pointer"
            aria-label="เพิ่มงานใหม่"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">เพิ่มงาน</span>
            <span className="sm:hidden">งาน</span>
          </Button>
        </div>
      </div>
      <AddOfficerDialog open={openOfficer} onOpenChange={setOpenOfficer} />
      <AddTaskDialog open={openTask} onOpenChange={setOpenTask} />
    </div>
  );
}
