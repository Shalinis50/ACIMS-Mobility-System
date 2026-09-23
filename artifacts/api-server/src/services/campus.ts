import { getBuses, getStops, type Coordinate } from "./busTracking";
import { calculateEtaMinutes, distanceInKilometers } from "./eta";

export type CampusLocation = Coordinate & {
  id: string;
  name: string;
  type: string;
  description: string;
};

export type CampusStop = Coordinate & {
  id: string;
  name: string;
  servingBusIds: string[];
  routeNames: string[];
};

export type CampusRoute = {
  id: string;
  name: string;
  busId: string;
  busNumber: string;
  destination: string;
  stopIds: string[];
};

const locations: CampusLocation[] = [
  {
    id: "college",
    name: "College",
    type: "campus",
    description: "Main campus entrance and student arrival point.",
    latitude: 12.9407,
    longitude: 80.1393,
  },
  {
    id: "library",
    name: "Central Library",
    type: "academic",
    description: "The central study and research library.",
    latitude: 12.9381,
    longitude: 80.1369,
  },
  {
    id: "student-center",
    name: "Student Center",
    type: "student-life",
    description: "Student services, clubs, and campus support.",
    latitude: 12.9422,
    longitude: 80.1378,
  },
  {
    id: "science-block",
    name: "Science Block",
    type: "academic",
    description: "Science classrooms and laboratories.",
    latitude: 12.9442,
    longitude: 80.1411,
  },
  {
    id: "tambaram-stop",
    name: "Tambaram Bus Stop",
    type: "transit",
    description: "Roadside stop served by the campus loop.",
    latitude: 12.9249,
    longitude: 80.1275,
  },
];

export function listCampusLocations() {
  return locations.map((location) => ({ ...location }));
}

export function listCampusStops(): CampusStop[] {
  const buses = getBuses();
  const stops = buses.flatMap((bus) => getStops(bus.id) ?? []);
  return stops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    latitude: stop.latitude,
    longitude: stop.longitude,
    servingBusIds: buses.filter((bus) => bus.id === "bus-12").map((bus) => bus.id),
    routeNames: buses.filter((bus) => bus.id === "bus-12").map((bus) => bus.routeLabel),
  }));
}

export function listCampusRoutes(): CampusRoute[] {
  return getBuses().map((bus) => ({
    id: `route-${bus.id}`,
    name: bus.routeLabel,
    busId: bus.id,
    busNumber: bus.busNumber,
    destination: bus.destination,
    stopIds: (getStops(bus.id) ?? []).sort((a, b) => a.sequence - b.sequence).map((stop) => stop.id),
  }));
}

export function getDestination(id: string) {
  return locations.find((location) => location.id === id);
}

export function calculateNavigation(input: {
  destinationId: string;
  startLatitude?: number;
  startLongitude?: number;
  mode?: string;
}) {
  const destination = getDestination(input.destinationId);
  if (!destination) return undefined;

  const start: Coordinate = {
    latitude: input.startLatitude ?? locations[0].latitude,
    longitude: input.startLongitude ?? locations[0].longitude,
  };
  const stops = listCampusStops();
  const relevantStop = stops
    .slice()
    .sort(
      (a, b) =>
        distanceInKilometers(a, destination) - distanceInKilometers(b, destination),
    )[0] ?? stops[0];
  const distanceKm = distanceInKilometers(start, destination);
  const walkingMinutes = Math.max(1, Math.ceil((distanceKm / 5) * 60));
  const busOptions = getBuses().map((bus) => ({
    busId: bus.id,
    busNumber: bus.busNumber,
    destination: bus.destination,
    etaMinutes: calculateEtaMinutes(bus.currentLocation, relevantStop),
    occupancy: bus.currentOccupancy,
    capacity: bus.capacity,
    seatsAvailable: Math.max(0, bus.capacity - bus.currentOccupancy),
    status: bus.status,
  }));

  return {
    start,
    destination,
    mode: input.mode ?? "bus",
    distanceKm: Number(distanceKm.toFixed(2)),
    walkingMinutes,
    relevantStop,
    busOptions,
    routeCoordinates: [start, relevantStop, destination],
  };
}