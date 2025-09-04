import type { Officer, Task } from "@/lib/types";

export const OFFICERS: Officer[] = [
  { id: "o1", name: "พรชัย", phone: "081-111-1111", zoneLabel: "เขต A", base: { lat: 13.7563, lng: 100.5018 } },
  { id: "o2", name: "กัลยา", phone: "089-222-2222", zoneLabel: "เขต B", base: { lat: 13.745, lng: 100.54 } },
  { id: "o3", name: "วีรพล", phone: "086-333-3333", zoneLabel: "เขต C", base: { lat: 13.72, lng: 100.49 } },
];

const today = new Date();
const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

export const INITIAL_TASKS: Task[] = [
  {
    id: "t1",
    patientName: "คุณสุพัตรา",
    address: "ถ.พระราม 4",
    coords: { lat: 13.7246, lng: 100.532 },
    date: toIsoDate(today),
    tests: ["CBC", "FBS"],
    status: "pending",
  },
  {
    id: "t2",
    patientName: "คุณสมหมาย",
    address: "ลาดพร้าว 71",
    coords: { lat: 13.81, lng: 100.61 },
    date: toIsoDate(today),
    tests: ["Lipid"],
    status: "pending",
  },
  {
    id: "t3",
    patientName: "คุณศิริพร",
    address: "ประชาชื่น",
    coords: { lat: 13.82, lng: 100.54 },
    date: toIsoDate(new Date(today.getTime() + 86400000)),
    tests: ["HbA1c"],
    status: "pending",
  },
];

