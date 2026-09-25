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
    name: "College Main Entrance",
    type: "campus",
    description: "Main campus entrance, security checkpoint, and primary student arrival terminal.",
    latitude: 12.9407,
    longitude: 80.1393,
  },
  {
    id: "library",
    name: "Central Library",
    type: "academic",
    description: "The central study, digital archives, and research library complex.",
    latitude: 12.9381,
    longitude: 80.1369,
  },
  {
    id: "student-center",
    name: "Student Center & Dining Hall",
    type: "student-life",
    description: "Student union, recreational lounges, cafeteria, and mobility desk.",
    latitude: 12.9422,
    longitude: 80.1378,
  },
  {
    id: "science-block",
    name: "Science & Engineering Block",
    type: "academic",
    description: "Laboratories, research wings, and lecture theatres.",
    latitude: 12.9442,
    longitude: 80.1411,
  },
  {
    id: "tech-park",
    name: "Tech & Innovation Park",
    type: "academic",
    description: "Incubation center, software labs, and engineering workshops.",
    latitude: 12.9312,
    longitude: 80.1215,
  },
  {
    id: "north-residence",
    name: "North Residence Complex",
    type: "residence",
    description: "Student housing dorms and north campus courtyard.",
    latitude: 12.9458,
    longitude: 80.1352,
  },
  {
    id: "hostel-village",
    name: "Hostel Village",
    type: "residence",
    description: "Undergraduate hostels and resident recreational grounds.",
    latitude: 12.9015,
    longitude: 80.0984,
  },
  {
    id: "sports-complex",
    name: "Athletic Pavilion & Sports Complex",
    type: "recreation",
    description: "Track and field stadium, indoor gymnasium, and tennis courts.",
    latitude: 12.9355,
    longitude: 80.1325,
  },
  {
    id: "medical-center",
    name: "Medical Sciences Center",
    type: "health",
    description: "Campus health clinic, first-aid center, and pharmacy.",
    latitude: 12.9287,
    longitude: 80.1352,
  },
  {
    id: "south-lot",
    name: "South Commuter Lot",
    type: "transit",
    description: "Park-and-ride facility and southern perimeter bus turnaround.",
    latitude: 12.8955,
    longitude: 80.0864,
  },
  {
    id: "tambaram-stop",
    name: "Tambaram Bus Stop",
    type: "transit",
    description: "Main arterial transit interchange connected to campus loop routes.",
    latitude: 12.9249,
    longitude: 80.1275,
  },
];

const allStops: Array<Coordinate & { id: string; name: string; sequence: number }> = [
  { id: "college", name: "College Main Terminal", sequence: 0, latitude: 12.9407, longitude: 80.1393 },
  { id: "tambaram", name: "Tambaram Terminal", sequence: 1, latitude: 12.9249, longitude: 80.1275 },
  { id: "perungalathur", name: "Perungalathur Junction", sequence: 2, latitude: 12.9055, longitude: 80.0918 },
  { id: "vandalur", name: "Vandalur Transit Hub", sequence: 3, latitude: 12.8924, longitude: 80.0812 },
  { id: "bio-center", name: "Bio-Engineering Center Stop", sequence: 4, latitude: 12.9312, longitude: 80.1215 },
  { id: "athletics", name: "Athletic Pavilion Stop", sequence: 5, latitude: 12.9015, longitude: 80.0984 },
  { id: "hospital-gate", name: "Hospital Gate North", sequence: 6, latitude: 12.9287, longitude: 80.1352 },
  { id: "faculty-enclave", name: "Faculty Enclave Stop", sequence: 7, latitude: 12.8955, longitude: 80.0864 },
];

export function listCampusLocations() {
  return locations.map((location) => ({ ...location }));
}

export function listCampusStops(): CampusStop[] {
  const buses = getBuses();
  return allStops.map((stop) => {
    // Check which buses serve this stop (either by nextStopId or route context)
    const servingBuses = buses.filter((bus) => {
      const busStops = getStops(bus.id);
      return busStops.some((s) => s.id === stop.id) || bus.nextStopId === stop.id;
    });

    const servingBusList = servingBuses.length > 0 ? servingBuses : buses.slice(0, 2);

    return {
      id: stop.id,
      name: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      servingBusIds: servingBusList.map((bus) => bus.id),
      routeNames: servingBusList.map((bus) => `${bus.busNumber} · ${bus.routeLabel}`),
    };
  });
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
  const isWalkOnly = input.mode === "walk";

  const busOptions = isWalkOnly
    ? []
    : getBuses().map((bus) => ({
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
    mode: input.mode ?? "walk-transit",
    distanceKm: Number(distanceKm.toFixed(2)),
    walkingMinutes,
    relevantStop,
    busOptions,
    routeCoordinates: isWalkOnly ? [start, destination] : [start, relevantStop, destination],
  };
}