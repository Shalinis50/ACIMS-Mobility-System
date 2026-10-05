import { executeQuery } from "@workspace/db";
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

/**
 * List all buses from PostgreSQL buses table.
 */
export async function listAdminBuses(): Promise<AdminBus[]> {
  try {
    const res = await executeQuery<{
      id: string;
      bus_number: string;
      route_id: string;
      driver_id: string | null;
      capacity: number;
      active: boolean;
      status: string;
    }>(`SELECT id, bus_number, route_id, driver_id, capacity, active, status FROM buses ORDER BY created_at ASC;`);

    return res.rows.map((bus) => ({
      id: bus.id,
      busNumber: bus.bus_number,
      routeId: bus.route_id,
      driverId: bus.driver_id || undefined,
      capacity: bus.capacity,
      active: bus.active,
      status: bus.status,
    }));
  } catch (err) {
    console.error("[Admin Service] Failed to list buses from PostgreSQL:", err);
    return [];
  }
}

/**
 * Create a new bus in PostgreSQL buses table.
 */
export async function createAdminBus(input: Omit<AdminBus, "id" | "status">): Promise<AdminBus> {
  const route = routes.find((r) => r.id === input.routeId);
  const routeLabel = route ? (route.name.split('(')[0]?.trim() || route.name) : `Route ${input.busNumber}`;
  const destination = route?.destination || "Campus Terminal";
  const origin = route?.name.includes("→") ? route.name.split("→")[0].replace(/.*\(|\)/g, "").trim() : "Main Transit Hub";
  const nextStop = route?.stopIds?.[0] ? getStopNameById(route.stopIds[0]) : "Campus Main Gate";
  const nextStopId = route?.stopIds?.[0] || "college";

  const busId = `bus-${input.busNumber.toLowerCase().replace(/[^a-z0-9]/g, "") || Date.now()}`;
  const active = input.active ?? true;
  const status = active ? "Standby" : "Inactive";

  // Persist to PostgreSQL buses table
  await executeQuery(
    `INSERT INTO buses (id, bus_number, route_id, driver_id, capacity, active, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());`,
    [busId, input.busNumber, input.routeId, input.driverId || null, input.capacity, active, status]
  );

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
    status,
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

/**
 * Update a bus in PostgreSQL buses table.
 */
export async function updateAdminBus(id: string, input: Partial<Omit<AdminBus, "id">>): Promise<AdminBus | undefined> {
  const existing = await executeQuery<{
    id: string;
    bus_number: string;
    route_id: string;
    driver_id: string | null;
    capacity: number;
    active: boolean;
    status: string;
  }>(`SELECT * FROM buses WHERE id = $1;`, [id]);

  if (existing.rows.length === 0) return undefined;
  const current = existing.rows[0];

  const newNumber = input.busNumber !== undefined ? input.busNumber : current.bus_number;
  const newRouteId = input.routeId !== undefined ? input.routeId : current.route_id;
  const newDriverId = input.driverId !== undefined ? input.driverId : current.driver_id;
  const newCapacity = input.capacity !== undefined ? input.capacity : current.capacity;
  const newActive = input.active !== undefined ? input.active : current.active;
  const newStatus = input.active !== undefined ? (input.active ? "Standby" : "Inactive") : current.status;

  await executeQuery(
    `UPDATE buses
     SET bus_number = $1, route_id = $2, driver_id = $3, capacity = $4, active = $5, status = $6
     WHERE id = $7;`,
    [newNumber, newRouteId, newDriverId || null, newCapacity, newActive, newStatus, id]
  );

  updateBusInFleet(id, {
    busNumber: newNumber,
    routeId: newRouteId,
    driverId: newDriverId || undefined,
    capacity: newCapacity,
    active: newActive,
    status: newStatus,
  });

  return {
    id,
    busNumber: newNumber,
    routeId: newRouteId,
    driverId: newDriverId || undefined,
    capacity: newCapacity,
    active: newActive,
    status: newStatus,
  };
}

/**
 * Deactivate a bus in PostgreSQL buses table.
 */
export async function deactivateAdminBus(id: string): Promise<AdminBus | undefined> {
  return updateAdminBus(id, { active: false });
}

/**
 * List all drivers from PostgreSQL drivers table.
 */
export async function listDrivers(): Promise<Driver[]> {
  try {
    const res = await executeQuery<{
      id: string;
      name: string;
      phone: string;
      bus_id: string | null;
      route_id: string | null;
      active: boolean;
    }>(`SELECT id, name, phone, bus_id, route_id, active FROM drivers ORDER BY created_at ASC;`);

    return res.rows.map((driver) => ({
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      busId: driver.bus_id || undefined,
      routeId: driver.route_id || undefined,
      active: driver.active,
    }));
  } catch (err) {
    console.error("[Admin Service] Failed to list drivers from PostgreSQL:", err);
    return [];
  }
}

/**
 * Create a new driver in PostgreSQL drivers and profiles tables.
 */
export async function createDriver(input: Omit<Driver, "id">): Promise<Driver> {
  const id = `driver-${Date.now()}`;
  const profileId = `prof_${id}`;

  await executeQuery(
    `INSERT INTO profiles (id, role, full_name, phone, created_at, updated_at)
     VALUES ($1, 'driver', $2, $3, NOW(), NOW());`,
    [profileId, input.name, input.phone]
  );

  await executeQuery(
    `INSERT INTO drivers (id, profile_id, name, phone, bus_id, route_id, active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());`,
    [id, profileId, input.name, input.phone, input.busId || null, input.routeId || null, input.active ?? true]
  );

  return {
    id,
    name: input.name,
    phone: input.phone,
    active: input.active ?? true,
    busId: input.busId,
    routeId: input.routeId,
  };
}

/**
 * Update an existing driver in PostgreSQL drivers table.
 */
export async function updateDriver(id: string, input: Partial<Omit<Driver, "id">>): Promise<Driver | undefined> {
  const existing = await executeQuery<{
    id: string;
    name: string;
    phone: string;
    bus_id: string | null;
    route_id: string | null;
    active: boolean;
  }>(`SELECT * FROM drivers WHERE id = $1;`, [id]);

  if (existing.rows.length === 0) return undefined;
  const current = existing.rows[0];

  const newName = input.name !== undefined ? input.name : current.name;
  const newPhone = input.phone !== undefined ? input.phone : current.phone;
  const newActive = input.active !== undefined ? input.active : current.active;
  const newBusId = input.busId !== undefined ? input.busId : (current.bus_id || null);
  const newRouteId = input.routeId !== undefined ? input.routeId : (current.route_id || null);

  await executeQuery(
    `UPDATE drivers
     SET name = $1, phone = $2, active = $3, bus_id = $4, route_id = $5
     WHERE id = $6;`,
    [newName, newPhone, newActive, newBusId, newRouteId, id]
  );

  return {
    id,
    name: newName,
    phone: newPhone,
    active: newActive,
    busId: newBusId || undefined,
    routeId: newRouteId || undefined,
  };
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
    queueSize: 0,
    capacity: bus.capacity,
    status: "Active",
  }));
}
