import { transportDb, type Bus as DbBus, type Driver as DbDriver, type Route as DbRoute } from "./transportDb";

export type AdminBus = {
  id: string;
  busNumber: string;
  plateNumber: string;
  routeId: string;
  driverId?: string;
  active: boolean;
  status: string;
};

export type Driver = DbDriver;
export type AdminRoute = DbRoute;

export function listAdminBuses(): AdminBus[] {
  const allBuses = transportDb.getAllBuses();
  const allRoutes = transportDb.getAllRoutes();
  const allDrivers = transportDb.getAllDrivers();

  return allBuses.map((bus) => {
    const route = allRoutes.find((r) => r.assignedBusIds.includes(bus.id));
    const driver = allDrivers.find((d) => d.assignedBusId === bus.id);
    return {
      id: bus.id,
      busNumber: bus.busNumber,
      plateNumber: bus.plateNumber,
      routeId: route?.id ?? "unassigned",
      driverId: driver?.id,
      active: bus.active,
      status: bus.status,
    };
  });
}

export function createAdminBus(input: { busNumber: string; plateNumber: string; active?: boolean }) {
  const bus = transportDb.createBus({
    busNumber: input.busNumber,
    plateNumber: input.plateNumber,
    active: input.active,
  });
  return {
    id: bus.id,
    busNumber: bus.busNumber,
    plateNumber: bus.plateNumber,
    routeId: "unassigned",
    active: bus.active,
    status: bus.status,
  };
}

export function updateAdminBus(id: string, input: Partial<Omit<AdminBus, "id">>) {
  const updated = transportDb.updateBus(id, input);
  if (!updated) return undefined;
  return {
    id: updated.id,
    busNumber: updated.busNumber,
    plateNumber: updated.plateNumber,
    routeId: input.routeId ?? "unassigned",
    driverId: input.driverId,
    active: updated.active,
    status: updated.status,
  };
}

export function deactivateAdminBus(id: string) {
  const bus = transportDb.getBus(id);
  if (!bus) return undefined;
  const newActive = !bus.active;
  const updated = transportDb.updateBus(id, {
    active: newActive,
    status: newActive ? "Standby" : "Inactive",
  });
  if (!updated) return undefined;
  return {
    id: updated.id,
    busNumber: updated.busNumber,
    plateNumber: updated.plateNumber,
    routeId: "unassigned",
    active: updated.active,
    status: updated.status,
  };
}

export function listDrivers(): Driver[] {
  return transportDb.getAllDrivers();
}

export function createDriver(input: { name: string; phone: string; licenseNumber?: string; assignedBusId?: string }) {
  return transportDb.createDriver(input);
}

export function updateDriver(id: string, input: Partial<Omit<Driver, "id">>) {
  const drivers = transportDb.getAllDrivers();
  const driver = drivers.find((d) => d.id === id);
  if (!driver) return undefined;
  Object.assign(driver, input);
  return { ...driver };
}

export function listRoutes(): AdminRoute[] {
  return transportDb.getAllRoutes();
}

export function createRoute(input: { name: string; code: string; origin: string; destination: string; stopIds: string[] }) {
  return transportDb.createRoute(input);
}

export function updateRoute(id: string, input: Partial<Omit<AdminRoute, "id">>) {
  const route = transportDb.getRoute(id);
  if (!route) return undefined;
  Object.assign(route, input);
  return { ...route };
}

export function getAdminQueues() {
  const buses = transportDb.getAllBuses();
  return buses.map((bus) => ({
    busId: bus.id,
    busNumber: bus.busNumber,
    status: bus.status,
    active: bus.active,
    routeLabel: bus.routeLabel,
  }));
}