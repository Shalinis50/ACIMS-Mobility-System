import { getBuses } from "./busTracking";

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

const buses: AdminBus[] = [
  {
    id: "bus-12",
    busNumber: "12",
    routeId: "route-bus-12",
    driverId: "driver-arun",
    capacity: 40,
    active: true,
    status: "Moving",
  },
  {
    id: "bus-4b",
    busNumber: "4B",
    routeId: "route-bus-4b",
    driverId: "driver-suresh",
    capacity: 45,
    active: true,
    status: "Delayed (+6 min)",
  },
  {
    id: "bus-7",
    busNumber: "7",
    routeId: "route-bus-7",
    driverId: "driver-venkat",
    capacity: 35,
    active: true,
    status: "Moving",
  },
  {
    id: "bus-18",
    busNumber: "18",
    routeId: "route-bus-18",
    driverId: "driver-rajesh",
    capacity: 50,
    active: true,
    status: "Delayed (+10 min)",
  },
  {
    id: "bus-21",
    busNumber: "21",
    routeId: "route-bus-21",
    driverId: "driver-karthik",
    capacity: 30,
    active: true,
    status: "Boarding",
  },
];

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
    id: "route-bus-18",
    name: "Metro Connector Feeder (Metro Central → Medical Center)",
    destination: "Medical Sciences Center",
    stopIds: ["metro-central", "hospital-gate", "tambaram"],
    active: true,
    assignedBusIds: ["bus-18"],
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

export function listAdminBuses() {
  return buses.map((bus) => ({ ...bus }));
}

export function createAdminBus(input: Omit<AdminBus, "id" | "status">) {
  const bus: AdminBus = { ...input, id: `bus-${Date.now()}`, status: input.active ? "Standby" : "Inactive" };
  buses.push(bus);
  return { ...bus };
}

export function updateAdminBus(id: string, input: Partial<Omit<AdminBus, "id">>) {
  const bus = buses.find((candidate) => candidate.id === id);
  if (!bus) return undefined;
  Object.assign(bus, input);
  if (input.active !== undefined) {
    bus.status = input.active ? (bus.status === "Inactive" ? "Standby" : bus.status) : "Inactive";
  }
  return { ...bus };
}

export function deactivateAdminBus(id: string) {
  const bus = buses.find((candidate) => candidate.id === id);
  if (!bus) return undefined;
  bus.active = !bus.active;
  bus.status = bus.active ? "Standby" : "Inactive";
  return { ...bus };
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
  return { ...route, stopIds: [...route.stopIds], assignedBusIds: [...route.assignedBusIds] };
}

export function getAdminQueues() {
  return getBuses().map((bus) => ({
    busId: bus.id,
    busNumber: bus.busNumber,
    queueSize: bus.currentOccupancy >= bus.capacity ? 3 : 0,
    occupancy: bus.currentOccupancy,
    capacity: bus.capacity,
    status: bus.currentOccupancy >= bus.capacity ? "Overloaded" : "Open",
  }));
}