# LABMOVE Frontend Agent Spec (Next.js + Tailwind)

เอกสารนี้สรุป MVP ที่ผู้ใช้จัดทำไว้ และกำหนดสเปค/ขอบเขตสำหรับสร้างหน้าบ้านด้วย Next.js + Tailwind โดยยังคงใช้ mock data และฟังก์ชันพื้นฐาน (เช่น haversine) ตาม MVP เดิม ส่วน dependency อื่นๆ และการเชื่อมต่อ backend จะทำในระยะถัดไป

## เป้าหมาย (MVP)
- แสดงรายการงาน (tasks) และเจ้าหน้าที่ (officers) พร้อมข้อมูลพื้นฐาน
- แสดงจุดบนแผนที่ด้วย Google Maps เมื่อมี API key และ fallback เป็นแผนที่แบบ canvas เมื่อไม่มี
- คำนวณระยะทางระหว่างฐานเจ้าหน้าที่กับจุดตรวจด้วย Haversine (กิโลเมตร) และแนะนำ ETA/ระยะทางด้วย Google Distance Matrix เมื่อใช้ Google Maps
- ใช้ป้ายสถานะ (Status Badge) พร้อมสี/ไอคอนตามสถานะ
- เลือกงานจากแผนที่หรือจากลิสต์ เพื่อดูรายละเอียด/มอบหมายเจ้าหน้าที่
- รองรับการกรอง/ค้นหาเบื้องต้น (เช่น วันที่ สถานะ คำค้นชื่อ/ที่อยู่)
- เพิ่ม/แก้ไขข้อมูลแบบ mock:
  - เพิ่มงานใหม่ (AddTask)
  - เพิ่มเจ้าหน้าที่ใหม่ (AddOfficer) พร้อมพิกัดฐาน
– โหมดผู้ดูแล (Admin Route Mode): เลือกเจ้าหน้าที่เพื่อแสดงเส้นทางรวมของงานในวันนั้น (opt-in)

## ไม่อยู่ในขอบเขต (MVP)
- ไม่มีการเชื่อมต่อ API จริง, Auth, หรือ Database (ข้อมูลเป็น mock/in-memory)
- ไม่มีการบันทึกข้อมูลถาวร (refresh แล้วข้อมูลหาย)
- Routing/ETA เป็นฝั่ง client-only เพื่อประกอบ UI เท่านั้น (ไม่มี backend optimization)

---

## เทคโนโลยีหลัก
- Next.js (TypeScript, App Router ได้/หรือ Pages Router ก็ได้ — เลือกอย่างใดอย่างหนึ่งให้สอดคล้องทั้งโปรเจค)
- Tailwind CSS สำหรับสไตล์และ layout
- React state ฝั่ง client (useState/useMemo) สำหรับ mock flow
- Optional (ตกแต่ง):
  - framer-motion สำหรับ animation
  - lucide-react สำหรับไอคอน

> หมายเหตุ: สามารถถอด framer-motion/lucide-react ออกในอนาคตได้ โดยไม่กระทบสถาปัตยกรรมหลักของ UI

---

## โครงสร้างข้อมูล (ตาม MVP)
```ts
export type TaskStatus = "pending" | "assigned" | "in_progress" | "done" | "issue";

export type Task = {
  id: string;
  patientName: string;
  address: string;
  coords: { lat: number; lng: number };
  date: string;        // YYYY-MM-DD
  tests: string[];
  status: TaskStatus;
  assignedTo?: string; // officer.id
};

export type Officer = {
  id: string;
  name: string;
  phone: string;
  zoneLabel: string;                 // ป้ายเขต/โซน
  base: { lat: number; lng: number } // ตำแหน่งฐาน
};
```

### Mock Data (ตัวอย่าง)
- OFFICERS: 3 คน (พรชัย/กัลยา/วีรพล) มี `zoneLabel` และพิกัด `base`
- INITIAL_TASKS: 3 งาน (อยู่ในกรุงเทพและใกล้เคียง) กระจายวันที่วันนี้/พรุ่งนี้

### ฟังก์ชันสำคัญ
- Haversine (หน่วยกม.)
```ts
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
```

---

## สถานะงานและป้ายสถานะ (Status Badge)
ใช้ mapping ตาม MVP (ภาษาไทย + สี Tailwind + ไอคอน lucide-react)

- pending: label "รอยืนยัน" class `bg-amber-50 text-amber-700 border-amber-200` icon `Clock3`
- assigned: label "มอบหมายแล้ว" class `bg-blue-50 text-blue-700 border-blue-200` icon `BadgeCheck`
- in_progress: label "กำลังดำเนินการ" class `bg-indigo-50 text-indigo-700 border-indigo-200` icon `Route`
- done: label "เสร็จสิ้น" class `bg-emerald-50 text-emerald-700 border-emerald-200` icon `CheckCircle2`
- issue: label "ติดปัญหา" class `bg-rose-50 text-rose-700 border-rose-200` icon `XCircle`

ตัวอย่างคอมโพเนนต์:
```tsx
export function StatusBadge({ status }: { status: TaskStatus }) {
  const map = {
    pending:      { label: "รอยืนยัน",       className: "bg-amber-50 text-amber-700 border-amber-200", Icon: Clock3 },
    assigned:     { label: "มอบหมายแล้ว",    className: "bg-blue-50 text-blue-700 border-blue-200",   Icon: BadgeCheck },
    in_progress:  { label: "กำลังดำเนินการ",  className: "bg-indigo-50 text-indigo-700 border-indigo-200", Icon: Route },
    done:         { label: "เสร็จสิ้น",       className: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
    issue:        { label: "ติดปัญหา",        className: "bg-rose-50 text-rose-700 border-rose-200", Icon: XCircle },
  } as const;
  const { label, className, Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs border rounded-full ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
```

---

## หน้าจอ/คอมโพเนนต์หลัก

- Dashboard/Page หลัก
  - แถบค้นหา/กรอง: ค้นหาด้วยชื่อ/ที่อยู่, กรองตามวันที่/สถานะ
  - แผนที่อย่างง่าย (MapCanvas) ทางขวา หรือบน mobile ซ้อนด้านบน
  - ลิสต์งาน: แสดง `patientName`, `address`, `date`, `tests`, `StatusBadge`, ปุ่ม “มอบหมาย”
  - ลิสต์เจ้าหน้าที่: ชื่อ/โซน/เบอร์ และระยะจากฐานไปยังงานที่ถูกเลือก (km)

- MapCanvas (Projection พื้นฐาน ไม่ใช้แผนที่จริง)
  - คำนวณ bounding box จากทุก tasks + officers.base
  - มี padding (`pad = 0.01`) เพื่อไม่ให้จุดชิดขอบ
  - project lat/lng เป็น x/y แบบ linear ตาม bounding box (ไม่เที่ยงตรงระดับแผนที่จริง แต่เพียงพอสำหรับ MVP)
  - คลิกจุดงานเพื่อ select และ sync กับลิสต์

ตัวอย่าง pseudo interface:
```tsx
function MapCanvas({
  tasks,
  officers,
  selectedTaskId,
  onSelectTask,
}: {
  tasks: Task[];
  officers: Officer[];
  selectedTaskId?: string | null;
  onSelectTask?: (id: string) => void;
}) { /* ... projection + render circles/markers ... */ }
```

- Assignment UI
  - เลือกงาน แล้วกด “มอบหมาย” เพื่อเลือกเจ้าหน้าที่ เปลี่ยนสถานะ `pending -> assigned`
  - อนุญาตปรับสถานะถัดไป: `assigned -> in_progress -> done` หรือ `issue`
  - ยกเลิกการมอบหมายได้ (กลับเป็น `pending`)

- Animation (optional)
  - ใช้ framer-motion สำหรับ fade/slide เบาๆ ระหว่างรายการ/โมดัล

---

## โครงไฟล์ที่แนะนำ (App Router)
```
src/
  app/
    page.tsx                // Dashboard หลัก
    globals.css             // Tailwind base
  components/
    MapCanvas.tsx
    StatusBadge.tsx
    TaskList.tsx
    OfficerList.tsx
    AssignmentDrawer.tsx    // หรือ Modal
    Filters.tsx             // Search/Date/Status
    GoogleMapsProvider.tsx  // vis.gl APIProvider wrapper
    add/
      AddTaskDialog.tsx
      AddOfficerDialog.tsx
  lib/
    types.ts
    utils.ts                // haversineKm และ helper
    mock.ts                 // OFFICERS, INITIAL_TASKS
    mapStyles.ts            // optional JSON styles
  store/
    providers.tsx           // Context providers compose
    tasks.tsx               // useTasks()
    officers.tsx            // useOfficers()
```

> หากใช้ Pages Router ให้ย้าย `page.tsx` ไป `pages/index.tsx` และตั้งค่าให้สอดคล้อง

---

## พฤติกรรมและ State หลัก
- State หลักอยู่ที่หน้า `page.tsx` (client component):
  - `tasks`, `officers`, `selectedTaskId`, `query` (ตัวกรอง), และ state ของโหมดเส้นทาง `routeOfficerId`
- ตัวกรอง:
  - วันที่: เปรียบเทียบ `task.date` กับวันที่ที่เลือก (รูปแบบ YYYY-MM-DD)
  - สถานะ: filter ตาม `task.status`
  - คำค้น: เช็ค `patientName`/`address` แบบ case-insensitive contains
- การมอบหมาย/ยกเลิกมอบหมาย:
  - มอบหมาย: `task.assignedTo = officer.id`, set `status = 'assigned'`
  - เริ่มงาน: `assigned -> in_progress`
  - สำเร็จ: `in_progress -> done`
  - ติดปัญหา: ตั้ง `status = 'issue'`
- การคำนวณระยะทาง/เส้นทาง:
  - Google Maps mode: ใช้ Distance Matrix เพื่อแนะนำ ETA/ระยะทาง และ Directions เพื่อวาดเส้นทาง
  - Fallback canvas: แสดง marker/selection เท่านั้น (ไม่วาดเส้นทาง)
- โหมดเส้นทาง (Admin Route Mode):
  - เปิดจากปุ่ม “เส้นทาง” ที่แผนที่ หรือจากแท็บ “เจ้าหน้าที่” ในลิสต์
  - เมื่อเปิด จะซ่อน marker ทั้งหมดที่ไม่เกี่ยวข้อง แสดงเฉพาะฐานของเจ้าหน้าที่ที่เลือก และงานที่ `assignedTo` เป็นเจ้าหน้าที่นั้นในวันที่ที่กำลังกรองอยู่
  - แสดงแบนเนอร์กึ่งล่างกลางพร้อมชื่อเจ้าหน้าที่ และปุ่ม “ยกเลิกเส้นทาง”; กด Esc เพื่อออกได้
  - ขณะเปิดโหมดนี้จะซ่อนแผงแนะนำ ETA รายบุคคล (ใช้ได้เฉพาะโหมดทั่วไป)
  - ป้องกันการสลับเส้นทางผิดพลาด: คลิก marker เจ้าหน้าที่จะไม่สลับ หากยังไม่ได้เลือกงานและไม่ได้อยู่ในโหมดเส้นทาง

---

## สไตล์และ Responsive
- ใช้ Tailwind ทำ grid ที่แบ่ง map/list อย่างเหมาะสม
- Mobile: stack เป็นแนวตั้ง (Map อยู่บน, ลิสต์อยู่ล่าง)
- Desktop: สองคอลัมน์ (เช่น ซ้าย: ลิสต์/ควบคุม, ขวา: MapCanvas)
- เน้น contrast สีป้ายสถานะให้ readable

---

## ตัวอย่างหน้า (สรุปรูปแบบโค้ด)
```tsx
// src/app/page.tsx
'use client';
import React, { useMemo, useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { MapCanvas } from '@/components/MapCanvas';
import { haversineKm } from '@/lib/utils';
import type { Task, Officer, TaskStatus } from '@/lib/types';

export default function Page() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [officers] = useState<Officer[]>(OFFICERS);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [query, setQuery] = useState({ text: '', date: '', status: '' as TaskStatus | '' });

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const textOk = !query.text || (t.patientName + ' ' + t.address).toLowerCase().includes(query.text.toLowerCase());
      const dateOk = !query.date || t.date === query.date;
      const statusOk = !query.status || t.status === query.status;
      return textOk && dateOk && statusOk;
    });
  }, [tasks, query]);

  return (
    <div className="p-4 grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        {/* Filters/Search */}
        {/* TaskList: แสดง StatusBadge และปุ่มมอบหมาย */}
      </div>
      <div className="min-h-[320px]">
        <MapCanvas
          tasks={filtered}
          officers={officers}
          selectedTaskId={selectedTaskId}
          onSelectTask={setSelectedTaskId}
        />
      </div>
    </div>
  );
}
```

---

## Acceptance Criteria (นิยามสำเร็จสำหรับ MVP)
- เปิดหน้า Dashboard แล้วเห็น:
  - รายการงานพร้อมสถานะ, รายละเอียดสั้นๆ และปุ่มมอบหมาย
  - รายการเจ้าหน้าที่พร้อมโซน/เบอร์ และระยะไปงานที่เลือกได้
  - แผนที่ (Google Maps ถ้ามี key มิฉะนั้น fallback canvas) พร้อมจุดงาน/ฐานเจ้าหน้าที่; คลิกจุดเพื่อ select ได้
- ค้นหาและกรองทำงานตามคีย์เวิร์ด/วันที่/สถานะ
- เพิ่มงาน/เพิ่มเจ้าหน้าที่ จาก TopNav ได้
- กดมอบหมายแล้วสถานะเปลี่ยนเป็น `assigned` และแสดงผู้รับผิดชอบ
- เปลี่ยนสถานะได้ตาม flow ที่กำหนด (assigned -> in_progress -> done / issue)
- โหมดเส้นทาง (Admin):
  - เลือกเจ้าหน้าที่เพื่อวาดเส้นทางรวมของงานที่ได้รับมอบหมายในวันนั้น
  - ระหว่างโหมดนี้ ซ่อน marker ที่ไม่เกี่ยวข้อง และมีแบนเนอร์แจ้งสถานะ พร้อมปุ่มยกเลิก/กด Esc เพื่อปิด
- ไม่มีการเรียก API ภายนอกด้านข้อมูลงาน/เจ้าหน้าที่ (mock data เท่านั้น)

---

## งานถัดไป (หลัง MVP)
- เชื่อมต่อ Backend/API (REST/GraphQL) + SWR/React Query สำหรับ fetch/cache
- เพิ่ม Auth และสิทธิ์การใช้งาน
- ปรับปรุงแผนที่: ปรับใช้ Map ID/Vector style ที่สอดคล้อง, clustering, offline cache
- Routing ขั้นสูง: บันทึก/แก้ไขเส้นทาง, constraint optimization ฝั่ง server
- บันทึกข้อมูลถาวร และเพิ่มเหตุการณ์/บันทึกผลตรวจ
- รองรับ Realtime (WebSocket) สำหรับอัปเดตสถานะ/คิวงาน
- เพิ่มการกำหนดโซน/ตารางเวร/ความสามารถของเจ้าหน้าที่ในการจัดสรรอัตโนมัติ
- ปรับ i18n ให้รองรับหลายภาษาอย่างเป็นระบบ

---

## Setup (ชั่วคราวสำหรับ Dev)
- ติดตั้ง Next.js + Tailwind ตามมาตรฐาน
- เพิ่ม optional deps หากต้องการ:
  - `lucide-react` สำหรับไอคอน
  - `framer-motion` สำหรับ animation
  - `@vis.gl/react-google-maps` สำหรับ Google Maps integration
- Environment variables (optional สำหรับ Google Maps):
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (จำเป็นเพื่อเปิด Google Maps mode)
  - `NEXT_PUBLIC_GOOGLE_MAP_ID` / `_MINIMAL` / `_CLEAN` / `_DARK` (ถ้ามี Map ID)
- สร้างไฟล์ตามโครงและคัดลอก mock data/ฟังก์ชันจากส่วนนี้ไปยัง `lib/` และ `components/`

> โค้ดจริงในโปรเจคอาจใช้ `pnpm`/`npm`/`yarn` ตามที่มีอยู่แล้วใน `package.json` ของทีม

---

## หมายเหตุด้านเทคนิคของ MapCanvas
- โหมด Google Maps: ใช้ `@vis.gl/react-google-maps` (APIProvider), AdvancedMarker/Marker, Distance Matrix, DirectionsRenderer
- โหมด Fallback: project แบบ linear ภายใน bounding box จาก tasks + officers.base (ไม่มีเส้นทาง)
- ปรับขนาดตาม container (ใช้ `getBoundingClientRect` และ state เก็บขนาด)
- ความทนทาน: การล้างเส้นทางใช้วิธี setDirections ด้วย `{ routes: [] }` แทน `null` เพื่อหลีกเลี่ยง InvalidValueError

---

## คุณภาพโค้ด
- ใช้ TypeScript อย่างเคร่งครัดกับประเภทข้อมูลที่ประกาศไว้
- รักษาโครงสร้างคอมโพเนนต์ให้เล็กและประกอบได้
- หลีกเลี่ยง state ซ้ำซ้อน; คำนวณอนุพันธ์ด้วย `useMemo`
- แยก `types.ts` และ `utils.ts` ให้ชัดเจน
- ป้องกันกรณีไม่มีข้อมูล: ไม่มี tasks/officers ก็ไม่พังและแจ้งผู้ใช้

---

เอกสารนี้ออกแบบให้ทีมสามารถเริ่มสร้างหน้า Next.js + Tailwind ตาม MVP ที่สรุปจากโค้ดต้นทางได้ทันที พร้อมแนวทางขยายในเฟสถัดไปโดยไม่ต้องรื้อสถาปัตยกรรมหลัก
