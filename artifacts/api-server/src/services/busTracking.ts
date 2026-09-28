import { calculateEtaMinutes } from "./eta";

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type BusStop = Coordinate & {
  id: string;
  name: string;
  sequence: number;
  minutesFromPrevious: number;
};

export type BusLocation = Coordinate & {
  busId: string;
  nextStopId: string;
  nextStop: string;
  etaMinutes: number;
  status: string;
  updatedAt: Date;
  source: string;
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
  etaMinutes: number;
  status: string;
  updatedAt: Date;
  active: boolean;
  routeId: string;
  driverId?: string;
};

const defaultStops: BusStop[] = [
  {
    id: "vandalur",
    name: "Vandalur",
    latitude: 12.8924,
    longitude: 80.0812,
    sequence: 0,
    minutesFromPrevious: 0,
  },
  {
    id: "perungalathur",
    name: "Perungalathur",
    latitude: 12.9055,
    longitude: 80.0918,
    sequence: 1,
    minutesFromPrevious: 5,
  },
  {
    id: "tambaram",
    name: "Tambaram",
    latitude: 12.9249,
    longitude: 80.1275,
    sequence: 2,
    minutesFromPrevious: 8,
  },
  {
    id: "college",
    name: "College",
    latitude: 12.9407,
    longitude: 80.1393,
    sequence: 3,
    minutesFromPrevious: 6,
  },
];

const fleetState: Bus[] = [
  {
    id: "bus-12",
    busNumber: "12",
    origin: "Vandalur Transit Hub",
    destination: "Academic Quad",
    routeLabel: "Campus Loop A",
    capacity: 40,
    currentLocation: { latitude: 12.9161, longitude: 80.1119 },
    nextStop: "Tambaram Terminal",
    nextStopId: "tambaram",
    etaMinutes: 3,
    status: "On Time",
    updatedAt: new Date(),
    active: true,
    routeId: "route-bus-12",
    driverId: "driver-arun",
  },
  {
    id: "bus-4b",
    busNumber: "4B",
    origin: "North Residence Complex",
    destination: "Tech & Innovation Park",
    routeLabel: "Engineering Express",
    capacity: 45,
    currentLocation: { latitude: 12.9312, longitude: 80.1215 },
    nextStop: "Bio-Engineering Center",
    nextStopId: "bio-center",
    etaMinutes: 5,
    status: "Delayed (+6 min)",
    updatedAt: new Date(Date.now() - 1000 * 45),
    active: true,
    routeId: "route-bus-4b",
    driverId: "driver-suresh",
  },
  {
    id: "bus-7",
    busNumber: "7",
    origin: "Hostel Village",
    destination: "Central Library & Union",
    routeLabel: "North Campus Shuttle",
    capacity: 35,
    currentLocation: { latitude: 12.9015, longitude: 80.0984 },
    nextStop: "Athletic Pavilion",
    nextStopId: "athletics",
    etaMinutes: 2,
    status: "On Time",
    updatedAt: new Date(Date.now() - 1000 * 20),
    active: true,
    routeId: "route-bus-7",
    driverId: "driver-venkat",
  },
  {
    id: "bus-18",
    busNumber: "18",
    origin: "Metro Central Station",
    destination: "Medical Sciences Center",
    routeLabel: "Metro Connector Feeder",
    capacity: 50,
    currentLocation: { latitude: 12.9287, longitude: 80.1352 },
    nextStop: "Hospital Gate North",
    nextStopId: "hospital-gate",
    etaMinutes: 9,
    status: "Delayed (+10 min)",
    updatedAt: new Date(Date.now() - 1000 * 90),
    active: true,
    routeId: "route-bus-18",
    driverId: "driver-rajesh",
  },
  {
    id: "bus-21",
    busNumber: "21",
    origin: "South Commuter Lot",
    destination: "Main Auditorium",
    routeLabel: "South Perimeter Circle",
    capacity: 30,
    currentLocation: { latitude: 12.8955, longitude: 80.0864 },
    nextStop: "Faculty Enclave",
    nextStopId: "faculty-enclave",
    etaMinutes: 4,
    status: "Boarding",
    updatedAt: new Date(Date.now() - 1000 * 30),
    active: true,
    routeId: "route-bus-21",
    driverId: "driver-karthik",
  },
];

let segmentIndex = 1;
let segmentProgress = 0.45;

function roundCoordinate(value: number) {
  return Number(value.toFixed(6));
}

function interpolate(start: Coordinate, end: Coordinate, progress: number) {
  return {
    latitude: roundCoordinate(
      start.latitude + (end.latitude - start.latitude) * progress,
    ),
    longitude: roundCoordinate(
      start.longitude + (end.longitude - start.longitude) * progress,
    ),
  };
}

function updateDerivedState(bus: Bus, source: string, timestamp = new Date()) {
  bus.updatedAt = timestamp;
  return {
    busId: bus.id,
    ...bus.currentLocation,
    nextStopId: bus.nextStopId,
    nextStop: bus.nextStop,
    etaMinutes: bus.etaMinutes,
    status: bus.status,
    updatedAt: timestamp,
    source,
    currentStop: bus.origin,
  };
}

export function getBuses(): Bus[] {
  return fleetState.map((bus) => ({ ...bus, currentLocation: { ...bus.currentLocation } }));
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

export function getStops(id: string): BusStop[] {
  return defaultStops.map((stop) => ({ ...stop }));
}

export function getLocation(id: string) {
  const bus = fleetState.find((candidate) => candidate.id === id);
  if (!bus) return undefined;
  return updateDerivedState(bus, "simulated");
}

export function updateLocation(
  id: string,
  location: Coordinate,
  source = "driver-device",
  timestamp = new Date(),
) {
  const bus = fleetState.find((candidate) => candidate.id === id);
  if (!bus) return undefined;
  bus.currentLocation = {
    latitude: location.latitude,
    longitude: location.longitude,
  };
  return updateDerivedState(bus, source, timestamp);
}

export function advanceSimulation() {
  const bus = fleetState.find((b) => b.id === "bus-12") ?? fleetState[0];

  // Advance along the route segment (~4 ticks per segment)
  segmentProgress += 0.25;

  const totalSegments = defaultStops.length - 1;
  if (segmentProgress >= 1.0) {
    segmentIndex = (segmentIndex + 1) % totalSegments;
    segmentProgress = 0.05;
  }

  const current = defaultStops[segmentIndex] ?? defaultStops[0];
  const next = defaultStops[segmentIndex + 1] ?? defaultStops[1];

  let etaMinutes: number;
  let status: string;

  if (segmentProgress < 0.35) {
    etaMinutes = 3;
    status = "On Time";
  } else if (segmentProgress < 0.65) {
    etaMinutes = 2;
    status = "On Time";
  } else if (segmentProgress < 0.90) {
    etaMinutes = 1;
    status = "On Time";
  } else {
    etaMinutes = 0;
    status = "Arriving now";
  }

  bus.nextStop = next.name;
  bus.nextStopId = next.id;
  bus.etaMinutes = etaMinutes;
  bus.status = status;
  bus.currentLocation = interpolate(current, next, Math.min(1, segmentProgress));
  bus.updatedAt = new Date();

  return updateDerivedState(bus, "simulated");
}

export function startSimulation(onTick: () => void) {
  const timer = setInterval(onTick, 10_000);
  timer.unref();
  return () => clearInterval(timer);
}

