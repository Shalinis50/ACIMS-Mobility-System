import {
  type Coordinate,
  type RouteStop,
  type RouteDefinition,
  getRouteForBus,
  getAllRoutes,
  getRouteById,
} from "./routesData";
import { determineStopContext, formatEta, haversineDistance } from "./eta";

export type { Coordinate, RouteStop };

export type BusStop = Coordinate & {
  id: string;
  name: string;
  sequence: number;
  pathIndex: number;
  minutesFromPrevious: number;
};

export type BusLocation = Coordinate & {
  busId: string;
  nextStopId: string;
  nextStop: string;
  previousStopId?: string;
  previousStop?: string;
  currentStop?: string;
  isAtStop?: boolean;
  etaMinutes: number;
  formattedEta?: string;
  remainingDistanceKm?: number;
  status: string;
  updatedAt: Date;
  source: string; // "simulated" | "driver-gps"
  isSimulated?: boolean;
  routeId?: string;
  routeName?: string;
  busNumber?: string;
  origin?: string;
  destination?: string;
  pathIndex?: number;
};

export type Bus = {
  id: string;
  busNumber: string;
  origin: string;
  destination: string;
  routeLabel: string;
  capacity: number;
  currentLocation: Coordinate;
  nextStop: string;
  nextStopId: string;
  previousStop?: string;
  previousStopId?: string;
  isAtStop?: boolean;
  etaMinutes: number;
  formattedEta?: string;
  remainingDistanceKm?: number;
  status: string;
  updatedAt: Date;
  active: boolean;
  routeId: string;
  driverId?: string;
  locationMode: "simulated" | "driver-gps";
  pathIndex: number;
};

const fleetState: Bus[] = [];

// Tracks whether each bus has received live driver GPS recently
const lastDriverGpsTime: Record<string, number> = {};

function buildDerivedLocation(bus: Bus): BusLocation {
  const route = getRouteForBus(bus.id);
  const isSimulated = bus.locationMode === "simulated";

  return {
    busId: bus.id,
    latitude: bus.currentLocation.latitude,
    longitude: bus.currentLocation.longitude,
    nextStopId: bus.nextStopId,
    nextStop: bus.nextStop,
    previousStopId: bus.previousStopId,
    previousStop: bus.previousStop,
    isAtStop: bus.isAtStop,
    etaMinutes: bus.etaMinutes,
    formattedEta: bus.formattedEta || formatEta(bus.etaMinutes),
    remainingDistanceKm: bus.remainingDistanceKm,
    status: bus.status,
    updatedAt: bus.updatedAt,
    source: isSimulated ? "simulated" : "driver-gps",
    isSimulated,
    routeId: route?.id,
    routeName: route?.name,
    busNumber: bus.busNumber,
    origin: bus.origin,
    destination: bus.destination,
    pathIndex: bus.pathIndex,
  };
}

export function getBuses(): Bus[] {
  return fleetState.map((bus) => ({
    ...bus,
    currentLocation: { ...bus.currentLocation },
  }));
}

export function getBus(id: string): Bus | undefined {
  const bus = fleetState.find((candidate) => candidate.id === id);
  return bus ? { ...bus, currentLocation: { ...bus.currentLocation } } : undefined;
}

export function createBusInFleet(bus: Bus): Bus {
  fleetState.push(bus);
  return { ...bus, currentLocation: { ...bus.currentLocation } };
}

export function updateBusInFleet(id: string, updates: Partial<Bus>): Bus | undefined {
  const bus = fleetState.find((candidate) => candidate.id === id);
  if (!bus) return undefined;
  Object.assign(bus, updates);
  bus.updatedAt = new Date();
  return { ...bus, currentLocation: { ...bus.currentLocation } };
}

export function deactivateBusInFleet(id: string): Bus | undefined {
  const bus = fleetState.find((candidate) => candidate.id === id);
  if (!bus) return undefined;
  bus.active = !bus.active;
  bus.status = bus.active ? "Standby" : "Inactive";
  bus.updatedAt = new Date();
  return { ...bus, currentLocation: { ...bus.currentLocation } };
}

export function getStops(busId: string): BusStop[] {
  const route = getRouteForBus(busId);
  return route.stops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    sequence: stop.sequence,
    pathIndex: stop.pathIndex,
    latitude: stop.latitude,
    longitude: stop.longitude,
    minutesFromPrevious: stop.minutesFromPrevious,
  }));
}

export function getRouteDetails(busId: string) {
  const route = getRouteForBus(busId);
  return {
    routeId: route.id,
    busId,
    busNumber: route.routeNumber,
    name: route.name,
    origin: route.origin,
    destination: route.destination,
    path: route.path,
    stops: route.stops,
    totalDistanceKm: route.totalDistanceKm,
    cumulativeDistances: route.cumulativeDistances,
  };
}

export function getLocation(id: string): BusLocation | undefined {
  const bus = fleetState.find((candidate) => candidate.id === id);
  if (!bus) return undefined;
  return buildDerivedLocation(bus);
}

/**
 * Ingest Driver GPS update from driver's device or browser Geolocation API
 */
export function updateLocation(
  id: string,
  location: Coordinate,
  source = "driver-gps",
  timestamp = new Date().toISOString(),
) {
  const bus = fleetState.find((candidate) => candidate.id === id);
  if (!bus) return undefined;

  const route = getRouteForBus(id);
  const context = determineStopContext(route, location);

  bus.currentLocation = {
    latitude: Number(location.latitude.toFixed(6)),
    longitude: Number(location.longitude.toFixed(6)),
  };
  bus.nextStop = context.nextStop.name;
  bus.nextStopId = context.nextStop.id;
  bus.previousStop = context.previousStop.name;
  bus.previousStopId = context.previousStop.id;
  bus.isAtStop = context.isAtStop;
  bus.etaMinutes = context.etaToNextMinutes;
  bus.formattedEta = context.formattedEta;
  bus.remainingDistanceKm = context.remainingDistanceToNextKm;
  bus.pathIndex = context.nearestPathIndex;
  bus.locationMode = "driver-gps";
  bus.status = context.isAtStop
    ? `At Stop: ${context.currentStop?.name || context.nextStop.name}`
    : "On Time (Driver GPS)";
  bus.updatedAt = new Date(timestamp);

  lastDriverGpsTime[id] = Date.now();

  return buildDerivedLocation(bus);
}

/**
 * Advance demo simulation along the route path for each bus.
 * If a bus has received real driver GPS within the last 60 seconds,
 * the simulation does not override that vehicle.
 */
export function advanceSimulation() {
  const now = Date.now();

  for (const bus of fleetState) {
    if (!bus.active) continue;

    // If driver GPS is actively updating this bus, skip simulation
    const driverTime = lastDriverGpsTime[bus.id] || 0;
    if (now - driverTime < 60_000 && bus.locationMode === "driver-gps") {
      continue;
    }

    const route = getRouteForBus(bus.id);
    if (!route?.path?.length) continue;
    bus.locationMode = "simulated";
    const path = route.path;

    // Advance pathIndex smoothly along the path
    bus.pathIndex = (bus.pathIndex + 1) % path.length;
    const currentPoint = path[bus.pathIndex];

    const context = determineStopContext(route, currentPoint);

    bus.currentLocation = {
      latitude: currentPoint.latitude,
      longitude: currentPoint.longitude,
    };
    bus.nextStop = context.nextStop.name;
    bus.nextStopId = context.nextStop.id;
    bus.previousStop = context.previousStop.name;
    bus.previousStopId = context.previousStop.id;
    bus.isAtStop = context.isAtStop;
    bus.etaMinutes = context.etaToNextMinutes;
    bus.formattedEta = context.formattedEta;
    bus.remainingDistanceKm = context.remainingDistanceToNextKm;
    bus.updatedAt = new Date();

    if (context.isAtStop) {
      bus.status = `At Stop: ${context.currentStop?.name || context.nextStop.name}`;
    } else {
      bus.status = "On Time";
    }
  }

  const primaryBus = fleetState[0];
  if (!primaryBus) return null;
  return buildDerivedLocation(primaryBus);
}

export function startSimulation(onTick: () => void) {
  const timer = setInterval(onTick, 5_000);
  timer.unref();
  return () => clearInterval(timer);
}
