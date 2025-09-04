"use client";

import React from "react";
import type { Officer, Task } from "@/lib/types";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  officers: Officer[];
  onAssign: (taskId: string, officerId: string) => void;
};

export function AssignmentDrawer({ open, onOpenChange, task, officers, onAssign }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>มอบหมายงาน</DrawerTitle>
          <DrawerDescription>
            {task ? `${task.patientName} • ${task.address}` : "ไม่พบงานที่เลือก"}
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-2">
          {officers.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="text-sm font-medium">{o.name}</div>
                <div className="text-xs text-muted-foreground">{o.zoneLabel} • {o.phone}</div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (task) onAssign(task.id, o.id);
                  onOpenChange(false);
                }}
              >
                เลือก
              </Button>
            </div>
          ))}
          {!officers.length && <div className="text-sm text-muted-foreground">ไม่มีรายชื่อเจ้าหน้าที่</div>}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">ปิด</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

