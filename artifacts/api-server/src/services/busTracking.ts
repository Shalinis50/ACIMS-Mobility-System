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
  currentOccupancy: number;
  currentLocation: Coordinate;
  nextStop: string;
  nextStopId: string;
  etaMinutes: number;
  status: string;
  updatedAt: Date;
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
    currentOccupancy: 38,
    currentLocation: { latitude: 12.9161, longitude: 80.1119 },
    nextStop: "Tambaram Terminal",
    nextStopId: "tambaram",
    etaMinutes: 3,
    status: "On Time",
    updatedAt: new Date(),
  },
  {
    id: "bus-4b",
    busNumber: "4B",
    origin: "North Residence Complex",
    destination: "Tech & Innovation Park",
    routeLabel: "Engineering Express",
    capacity: 45,
    currentOccupancy: 26,
    currentLocation: { latitude: 12.9312, longitude: 80.1215 },
    nextStop: "Bio-Engineering Center",
    nextStopId: "bio-center",
    etaMinutes: 5,
    status: "Delayed (+6 min)",
    updatedAt: new Date(Date.now() - 1000 * 45),
  },
  {
    id: "bus-7",
    busNumber: "7",
    origin: "Hostel Village",
    destination: "Central Library & Union",
    routeLabel: "North Campus Shuttle",
    capacity: 35,
    currentOccupancy: 12,
    currentLocation: { latitude: 12.9015, longitude: 80.0984 },
    nextStop: "Athletic Pavilion",
    nextStopId: "athletics",
    etaMinutes: 2,
    status: "On Time",
    updatedAt: new Date(Date.now() - 1000 * 20),
  },
  {
    id: "bus-18",
    busNumber: "18",
    origin: "Metro Central Station",
    destination: "Medical Sciences Center",
    routeLabel: "Metro Connector Feeder",
    capacity: 50,
    currentOccupancy: 48,
    currentLocation: { latitude: 12.9287, longitude: 80.1352 },
    nextStop: "Hospital Gate North",
    nextStopId: "hospital-gate",
    etaMinutes: 9,
    status: "Delayed (+10 min)",
    updatedAt: new Date(Date.now() - 1000 * 90),
  },
  {
    id: "bus-21",
    busNumber: "21",
    origin: "South Commuter Lot",
    destination: "Main Auditorium",
    routeLabel: "South Perimeter Circle",
    capacity: 30,
    currentOccupancy: 20,
    currentLocation: { latitude: 12.8955, longitude: 80.0864 },
    nextStop: "Faculty Enclave",
    nextStopId: "faculty-enclave",
    etaMinutes: 4,
    status: "Boarding",
    updatedAt: new Date(Date.now() - 1000 * 30),
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

export function updateOccupancy(id: string, currentOccupancy: number) {
  const bus = fleetState.find((candidate) => candidate.id === id);
  if (!bus) return undefined;
  bus.currentOccupancy = Math.min(
    bus.capacity,
    Math.max(0, Math.round(currentOccupancy)),
  );
  bus.updatedAt = new Date();
  return { ...bus, currentLocation: { ...bus.currentLocation } };
}

export function advanceSimulation() {
  const bus = fleetState[0];
  const current = defaultStops[segmentIndex] ?? defaultStops[0];
  const next = defaultStops[segmentIndex + 1] ?? defaultStops[defaultStops.length - 1];

  segmentProgress += 0.12;
  if (segmentProgress >= 1 && segmentIndex < defaultStops.length - 2) {
    segmentIndex += 1;
    segmentProgress = 0;
  }

  bus.currentLocation = interpolate(current, next, segmentProgress);
  return updateDerivedState(bus, "simulated");
}

export function startSimulation(onTick: () => void) {
  const timer = setInterval(onTick, 10_000);
  timer.unref();
  return () => clearInterval(timer);
}

