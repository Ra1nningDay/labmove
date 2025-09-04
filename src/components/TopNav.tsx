"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AddTaskDialog } from "@/components/add/AddTaskDialog";

export function TopNav() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="mx-auto max-w-screen-2xl px-4 py-3 flex items-center justify-between">
        <div className="font-semibold">LabMove Dashboard</div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setOpen(true)}>เพิ่มงาน</Button>
        </div>
      </div>
      <AddTaskDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

