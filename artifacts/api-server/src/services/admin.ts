import {
  getBuses,
  getBus,
  createBusInFleet,
  updateBusInFleet,
  deactivateBusInFleet,
  type Bus,
} from "./busTracking";

export type AdminBus = {
  id: string;
  busNumber: string;
  routeId: string;
  driverId?: string;
  capacity: number;
  active: boolean;
  status: string;
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  busId?: string;
  routeId?: string;
};

export type AdminRoute = {
  id: string;
  name: string;
  destination: string;
  stopIds: string[];
  active: boolean;
  assignedBusIds: string[];
};

const STOP_NAMES: Record<string, string> = {
  vandalur: "Vandalur Transit Hub",
  perungalathur: "Perungalathur Junction",
  tambaram: "Tambaram Terminal",
  college: "College Main Terminal",
  "north-residence": "North Residence Complex",
  "bio-center": "Bio-Engineering Center",
  "hostel-village": "Hostel Village",
  athletics: "Athletic Pavilion",
  library: "Central Library",
  "metro-central": "Metro Central Station",
  "hospital-gate": "Hospital Gate North",
  "south-lot": "South Commuter Lot",
  "faculty-enclave": "Faculty Enclave",
  "student-center": "Student Center",
  "jb-estate": "JB Estate",
  ponnu: "Ponnu",
  ramratna: "Ramratna",
  "medical-sciences": "Medical Sciences Center",
  auditorium: "Main Auditorium",
  "academic-quad": "Academic Quad",
};

export function getStopNameById(id: string): string {
  return STOP_NAMES[id] || id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const drivers: Driver[] = [
  {
    id: "driver-arun",
    name: "Arun Kumar",
    phone: "+91 98401 23451",
    active: true,
    busId: "bus-12",
    routeId: "route-bus-12",
  },
  {
    id: "driver-suresh",
    name: "Suresh Mani",
    phone: "+91 98402 34562",
    active: true,
    busId: "bus-4b",
    routeId: "route-bus-4b",
  },
  {
    id: "driver-venkat",
    name: "Venkat Raman",
    phone: "+91 98403 45673",
    active: true,
    busId: "bus-7",
    routeId: "route-bus-7",
  },
  {
    id: "driver-rajesh",
    name: "Rajesh Kannan",
    phone: "+91 98404 56784",
    active: true,
    busId: "bus-18",
    routeId: "route-bus-18",
  },
  {
    id: "driver-karthik",
    name: "Karthik Raja",
    phone: "+91 98405 67895",
    active: true,
    busId: "bus-21",
    routeId: "route-bus-21",
  },
];

const routes: AdminRoute[] = [
  {
    id: "route-bus-18",
    name: "Metro Connector Feeder (Metro Central → Medical Center)",
    destination: "Medical Sciences Center",
    stopIds: ["metro-central", "jb-estate", "ponnu", "ramratna", "medical-sciences"],
    active: true,
    assignedBusIds: ["bus-18"],
  },
  {
    id: "route-bus-12",
    name: "Campus Loop A (Vandalur → Tambaram → College)",
    destination: "Academic Quad",
    stopIds: ["vandalur", "perungalathur", "tambaram", "college"],
    active: true,
    assignedBusIds: ["bus-12"],
  },
  {
    id: "route-bus-4b",
    name: "Engineering Express (North Residence → Tech Park)",
    destination: "Tech & Innovation Park",
    stopIds: ["north-residence", "bio-center", "college"],
    active: true,
    assignedBusIds: ["bus-4b"],
  },
  {
    id: "route-bus-7",
    name: "North Campus Shuttle (Hostel Village → Library)",
    destination: "Central Library & Union",
    stopIds: ["hostel-village", "athletics", "library", "college"],
    active: true,
    assignedBusIds: ["bus-7"],
  },
  {
    id: "route-bus-21",
    name: "South Perimeter Circle (South Lot → Auditorium)",
    destination: "Main Auditorium",
    stopIds: ["south-lot", "faculty-enclave", "student-center"],
    active: true,
    assignedBusIds: ["bus-21"],
  },
];

export function listAdminBuses(): AdminBus[] {
  return getBuses().map((bus) => ({
    id: bus.id,
    busNumber: bus.busNumber,
    routeId: bus.routeId,
    driverId: bus.driverId,
    capacity: bus.capacity,
    active: bus.active,
    status: bus.status,
  }));
}

export function createAdminBus(input: Omit<AdminBus, "id" | "status">): AdminBus {
  const route = routes.find((r) => r.id === input.routeId);
  const routeLabel = route ? (route.name.split('(')[0]?.trim() || route.name) : `Route ${input.busNumber}`;
  const destination = route?.destination || "Campus Terminal";
  const origin = route?.name.includes("→") ? route.name.split("→")[0].replace(/.*\(|\)/g, "").trim() : "Main Transit Hub";
  const nextStop = route?.stopIds?.[0] ? getStopNameById(route.stopIds[0]) : "Campus Main Gate";
  const nextStopId = route?.stopIds?.[0] || "college";

  const busId = `bus-${input.busNumber.toLowerCase().replace(/[^a-z0-9]/g, "") || Date.now()}`;
  const active = input.active ?? true;

  const newBus: Bus = {
    id: busId,
    busNumber: input.busNumber,
    origin,
    destination,
    routeLabel,
    capacity: input.capacity,
    currentLocation: { latitude: 12.9407, longitude: 80.1393 },
    nextStop,
    nextStopId,
    etaMinutes: 5,
    status: active ? "Standby" : "Inactive",
    updatedAt: new Date(),
    active,
    routeId: input.routeId,
    driverId: input.driverId,
  };

  createBusInFleet(newBus);

  if (route && !route.assignedBusIds.includes(newBus.id)) {
    route.assignedBusIds.push(newBus.id);
  }

  return {
    id: newBus.id,
    busNumber: newBus.busNumber,
    routeId: newBus.routeId,
    driverId: newBus.driverId,
    capacity: newBus.capacity,
    active: newBus.active,
    status: newBus.status,
  };
}

export function updateAdminBus(id: string, input: Partial<Omit<AdminBus, "id">>): AdminBus | undefined {
  const existing = getBus(id);
  if (!existing) return undefined;

  const updates: Partial<Bus> = {};
  if (input.busNumber !== undefined) updates.busNumber = input.busNumber;
  if (input.capacity !== undefined) {
    updates.capacity = input.capacity;
  }
  if (input.driverId !== undefined) updates.driverId = input.driverId;
  if (input.routeId !== undefined && input.routeId !== existing.routeId) {
    updates.routeId = input.routeId;
    const route = routes.find((r) => r.id === input.routeId);
    if (route) {
      updates.routeLabel = route.name.split('(')[0]?.trim() || route.name;
      updates.destination = route.destination;
      if (route.stopIds?.length > 0) {
        updates.nextStop = getStopNameById(route.stopIds[0]);
        updates.nextStopId = route.stopIds[0];
      }
      if (!route.assignedBusIds.includes(id)) {
        route.assignedBusIds.push(id);
      }
    }
  }
  if (input.active !== undefined) {
    updates.active = input.active;
    updates.status = input.active ? (existing.status === "Inactive" ? "Standby" : existing.status) : "Inactive";
  }

  const updated = updateBusInFleet(id, updates);
  if (!updated) return undefined;

  return {
    id: updated.id,
    busNumber: updated.busNumber,
    routeId: updated.routeId,
    driverId: updated.driverId,
    capacity: updated.capacity,
    active: updated.active,
    status: updated.status,
  };
}

export function deactivateAdminBus(id: string): AdminBus | undefined {
  const updated = deactivateBusInFleet(id);
  if (!updated) return undefined;

  return {
    id: updated.id,
    busNumber: updated.busNumber,
    routeId: updated.routeId,
    driverId: updated.driverId,
    capacity: updated.capacity,
    active: updated.active,
    status: updated.status,
  };
}

export function listDrivers() {
  return drivers.map((driver) => ({ ...driver }));
}

export function createDriver(input: Omit<Driver, "id">) {
  const driver: Driver = { ...input, id: `driver-${Date.now()}` };
  drivers.push(driver);
  return { ...driver };
}

export function updateDriver(id: string, input: Partial<Omit<Driver, "id">>) {
  const driver = drivers.find((candidate) => candidate.id === id);
  if (!driver) return undefined;
  Object.assign(driver, input);
  return { ...driver };
}

export function listRoutes() {
  return routes.map((route) => ({ ...route, stopIds: [...route.stopIds], assignedBusIds: [...route.assignedBusIds] }));
}

export function createRoute(input: Omit<AdminRoute, "id" | "assignedBusIds">) {
  const route: AdminRoute = { ...input, id: `route-${Date.now()}`, assignedBusIds: [] };
  routes.push(route);
  return { ...route, assignedBusIds: [] };
}

export function updateRoute(id: string, input: Partial<Omit<AdminRoute, "id">>) {
  const route = routes.find((candidate) => candidate.id === id);
  if (!route) return undefined;
  Object.assign(route, input);
  if (input.stopIds) {
    route.stopIds = [...input.stopIds];
  }
  if (input.assignedBusIds) {
    route.assignedBusIds = [...input.assignedBusIds];
  }

  // Synchronize route changes to any buses in the shared fleet assigned to this route
  const buses = getBuses();
  for (const bus of buses) {
    if (bus.routeId === route.id || route.assignedBusIds.includes(bus.id)) {
      const updates: Partial<Bus> = {};
      if (input.destination) updates.destination = input.destination;
      if (input.name) updates.routeLabel = input.name.split('(')[0]?.trim() || input.name;
      if (input.stopIds && input.stopIds.length > 0) {
        updates.nextStop = getStopNameById(input.stopIds[0]);
        updates.nextStopId = input.stopIds[0];
      }
      updateBusInFleet(bus.id, updates);
    }
  }

  return { ...route, stopIds: [...route.stopIds], assignedBusIds: [...route.assignedBusIds] };
}

export function getAdminQueues() {
  return getBuses().map((bus) => ({
    busId: bus.id,
    busNumber: bus.busNumber,
    queueSize: bus.id === "bus-12" ? 3 : 0,
    capacity: bus.capacity,
    status: "Active",
  }));
}