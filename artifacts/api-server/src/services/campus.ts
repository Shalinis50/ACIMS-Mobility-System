import { getBuses, getStops, type Coordinate } from "./busTracking";
import { calculateEtaMinutes, distanceInKilometers } from "./eta";
import { transportDb } from "./transportDb";

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

// Verified coordinates for Rajalakshmi Engineering College (REC), Thandalam, Chennai (NH4)
const locations: CampusLocation[] = [
  {
    id: "rec-main-gate",
    name: "REC Main Entrance & Terminal",
    type: "transit",
    description: "Main campus entrance gate on Bangalore Highway (NH4), primary security checkpoint, and shuttle arrival terminal.",
    latitude: 13.0088,
    longitude: 80.0035,
  },
  {
    id: "rec-admin-block",
    name: "Administrative Block & Deanery",
    type: "academic",
    description: "Principal's office, administrative affairs, registrar, and central reception.",
    latitude: 13.0082,
    longitude: 80.0041,
  },
  {
    id: "rec-central-library",
    name: "Central Library & Digital Hub",
    type: "academic",
    description: "Multi-floor central library, digital research repository, and study halls.",
    latitude: 13.0080,
    longitude: 80.0038,
  },
  {
    id: "rec-csd-it-block",
    name: "CS, IT & Design Block",
    type: "academic",
    description: "Departments of Computer Science, Design, AI & ML, and software computing labs.",
    latitude: 13.0086,
    longitude: 80.0033,
  },
  {
    id: "rec-mech-civil-block",
    name: "Mechanical & Civil Engg Block",
    type: "academic",
    description: "Mechanical workshops, robotics center, and civil engineering laboratories.",
    latitude: 13.0091,
    longitude: 80.0046,
  },
  {
    id: "rec-biotech-block",
    name: "Biotechnology & Chemical Block",
    type: "academic",
    description: "Biotech laboratories, chemical analysis wings, and research auditoriums.",
    latitude: 13.0076,
    longitude: 80.0035,
  },
  {
    id: "rec-canteen",
    name: "Student Food Court & Canteen",
    type: "student-life",
    description: "Central dining hall, cafeteria, mobility desk, and student amenities.",
    latitude: 13.0078,
    longitude: 80.0048,
  },
  {
    id: "rec-sports-pavilion",
    name: "Sports Complex & Track",
    type: "recreation",
    description: "Indoor sports arena, athletic track, and recreational courts.",
    latitude: 13.0094,
    longitude: 80.0052,
  },
  {
    id: "rec-hostels",
    name: "Hostel Village Enclave",
    type: "residence",
    description: "Student residential quarters, guest houses, and evening study halls.",
    latitude: 13.0070,
    longitude: 80.0050,
  },
];

export function listCampusLocations() {
  return locations.map((location) => ({ ...location }));
}

export function listCampusStops(): CampusStop[] {
  const registeredStops = transportDb.getAllStops();
  const buses = getBuses();

  return registeredStops.map((stop) => {
    const servingRoutes = transportDb.getRoutesForStop(stop.id);
    const busIds = servingRoutes.flatMap((r) => r.assignedBusIds);
    const uniqueBusIds = Array.from(new Set(busIds));
    const servingBuses = buses.filter((b) => uniqueBusIds.includes(b.id));

    return {
      id: stop.id,
      name: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      servingBusIds: servingBuses.map((b) => b.id),
      routeNames: servingRoutes.map((r) => r.name),
    };
  });
}

export function listCampusRoutes(): CampusRoute[] {
  const routes = transportDb.getAllRoutes();
  return routes.map((r) => ({
    id: r.id,
    name: r.name,
    busId: r.assignedBusIds[0] ?? "",
    busNumber: r.code,
    destination: r.destination,
    stopIds: [...r.stopIds],
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
  const walkingMinutes = Math.max(1, Math.ceil((distanceKm / 4.5) * 60));
  const isWalkOnly = input.mode === "walk";

  const busOptions = isWalkOnly
    ? []
    : getBuses().map((bus) => ({
        busId: bus.id,
        busNumber: bus.busNumber,
        destination: bus.destination,
        etaMinutes: bus.currentLocation && relevantStop
          ? calculateEtaMinutes(bus.currentLocation, relevantStop)
          : bus.etaMinutes,
        status: bus.status,
      }));

  return {
    start,
    destination,
    mode: input.mode ?? "walk-transit",
    distanceKm: Number(distanceKm.toFixed(2)),
    walkingMinutes,
    relevantStop,
    busOptions,
    routeCoordinates: isWalkOnly ? [start, destination] : [start, relevantStop, destination],
  };
}