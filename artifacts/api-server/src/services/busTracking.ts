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

const busId = "bus-12";

const stops: BusStop[] = [
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

const busState: Bus = {
  id: busId,
  busNumber: "12",
  origin: "Vandalur",
  destination: "Tambaram",
  routeLabel: "Vandalur → Perungalathur → Tambaram → College",
  capacity: 40,
  currentOccupancy: 40,
  currentLocation: { latitude: 12.9161, longitude: 80.1119 },
  nextStop: "Tambaram",
  nextStopId: "tambaram",
  etaMinutes: 3,
  status: "Moving",
  updatedAt: new Date(),
};

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

function updateDerivedState(source: string, timestamp = new Date()) {
  const nextStop = stops[segmentIndex + 1] ?? stops[stops.length - 1];
  const currentStop = stops[segmentIndex] ?? stops[0];
  busState.nextStop = nextStop.name;
  busState.nextStopId = nextStop.id;
  busState.etaMinutes = calculateEtaMinutes(busState.currentLocation, nextStop);
  busState.currentLocation = busState.currentLocation;
  busState.status = "Moving";
  busState.updatedAt = timestamp;

  return {
    busId: busState.id,
    ...busState.currentLocation,
    nextStopId: nextStop.id,
    nextStop: nextStop.name,
    etaMinutes: busState.etaMinutes,
    status: busState.status,
    updatedAt: timestamp,
    source,
    currentStop: currentStop.name,
  };
}

export function getBuses() {
  const bus = getBus(busId);
  return bus ? [bus] : [];
}

export function getBus(id: string) {
  return id === busId ? { ...busState, currentLocation: { ...busState.currentLocation } } : undefined;
}

export function getStops(id: string) {
  return id === busId ? stops.map((stop) => ({ ...stop })) : undefined;
}

export function getLocation(id: string) {
  if (id !== busId) return undefined;
  return updateDerivedState("simulated");
}

export function updateLocation(
  id: string,
  location: Coordinate,
  source = "driver-device",
  timestamp = new Date(),
) {
  if (id !== busId) return undefined;
  busState.currentLocation = {
    latitude: location.latitude,
    longitude: location.longitude,
  };
  return updateDerivedState(source, timestamp);
}

export function updateOccupancy(id: string, currentOccupancy: number) {
  if (id !== busId) return undefined;
  busState.currentOccupancy = Math.min(
    busState.capacity,
    Math.max(0, Math.round(currentOccupancy)),
  );
  busState.updatedAt = new Date();
  return getBus(id);
}

export function advanceSimulation() {
  const current = stops[segmentIndex] ?? stops[0];
  const next = stops[segmentIndex + 1] ?? stops[stops.length - 1];

  segmentProgress += 0.12;
  if (segmentProgress >= 1 && segmentIndex < stops.length - 2) {
    segmentIndex += 1;
    segmentProgress = 0;
  }

  busState.currentLocation = interpolate(current, next, segmentProgress);
  return updateDerivedState("simulated");
}

export function startSimulation(onTick: () => void) {
  const timer = setInterval(onTick, 10_000);
  timer.unref();
  return () => clearInterval(timer);
}

