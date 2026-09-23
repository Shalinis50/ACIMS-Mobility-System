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
];

const drivers: Driver[] = [
  {
    id: "driver-arun",
    name: "Arun Kumar",
    phone: "Internal transport contact",
    active: true,
    busId: "bus-12",
    routeId: "route-bus-12",
  },
];

const routes: AdminRoute[] = [
  {
    id: "route-bus-12",
    name: "Vandalur → Perungalathur → Tambaram → College",
    destination: "College",
    stopIds: ["vandalur", "perungalathur", "tambaram", "college"],
    active: true,
    assignedBusIds: ["bus-12"],
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

export function updateAdminBus(id: string, input: Omit<AdminBus, "id" | "status">) {
  const bus = buses.find((candidate) => candidate.id === id);
  if (!bus) return undefined;
  Object.assign(bus, input);
  bus.status = input.active ? bus.status === "Inactive" ? "Standby" : bus.status : "Inactive";
  return { ...bus };
}

export function deactivateAdminBus(id: string) {
  const bus = buses.find((candidate) => candidate.id === id);
  if (!bus) return undefined;
  bus.active = false;
  bus.status = "Inactive";
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

export function listRoutes() {
  return routes.map((route) => ({ ...route, stopIds: [...route.stopIds], assignedBusIds: [...route.assignedBusIds] }));
}

export function createRoute(input: Omit<AdminRoute, "id" | "assignedBusIds">) {
  const route: AdminRoute = { ...input, id: `route-${Date.now()}`, assignedBusIds: [] };
  routes.push(route);
  return { ...route, assignedBusIds: [] };
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