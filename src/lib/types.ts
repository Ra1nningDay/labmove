export type TaskStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "done"
  | "issue";

export type Task = {
  id: string;
  patientName: string;
  address: string;
  coords: { lat: number; lng: number };
  date: string; // YYYY-MM-DD
  tests: string[];
  status: TaskStatus;
  assignedTo?: string; // officer.id
};

export type Officer = {
  id: string;
  name: string;
  phone: string;
  zoneLabel: string;
  base?: { lat: number; lng: number }; // Optional - can be derived from address
  address?: string; // Optional - for geocoding
};
