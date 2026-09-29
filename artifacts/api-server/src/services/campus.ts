import {
  type CampusBuilding,
  type CampusBusStop,
  type CampusPath,
  type PointOfInterest,
  REC_BUILDINGS,
  REC_CAMPUS_STOPS,
  REC_POINTS_OF_INTEREST,
  REC_CAMPUS_PATHS,
  REC_CAMPUS_CENTER,
  REC_CAMPUS_BOUNDS,
  calculateCampusWalkingRoute,
  campusDistanceMeters,
} from "./campusData";
import { getBuses, getStops, type Coordinate } from "./busTracking";
import { calculateEtaMinutes, distanceInKilometers } from "./eta";
import { listRoutes } from "./admin";

export type {
  CampusBuilding,
  CampusBusStop,
  CampusPath,
  PointOfInterest,
};

export type CampusLocation = Coordinate & {
  id: string;
  name: string;
  type: string;
  description: string;
  code?: string;
  category?: string;
};

export type CampusStop = Coordinate & {
  id: string;
  name: string;
  servingBusIds: string[];
  routeNames: string[];
  description?: string;
};

export type CampusRoute = {
  id: string;
  name: string;
  busId: string;
  busNumber: string;
  destination: string;
  stopIds: string[];
};

export function getCampusMobilityData() {
  return {
    campus: "Rajalakshmi Engineering College (REC)",
    campusTamil: "ராஜலட்சுமி பொறியியல் கல்லூரி",
    center: REC_CAMPUS_CENTER,
    bounds: REC_CAMPUS_BOUNDS,
    buildings: REC_BUILDINGS,
    campusStops: REC_CAMPUS_STOPS,
    campusPaths: REC_CAMPUS_PATHS,
    pointsOfInterest: REC_POINTS_OF_INTEREST,
  };
}

export function listCampusLocations(): CampusLocation[] {
  const buildingLocations: CampusLocation[] = REC_BUILDINGS.map((b) => ({
    id: b.id,
    name: b.name,
    type: b.category,
    description: b.description,
    code: b.code,
    category: b.category,
    latitude: b.latitude,
    longitude: b.longitude,
  }));

  const poiLocations: CampusLocation[] = REC_POINTS_OF_INTEREST.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.category,
    description: `Near ${p.landmarkNear}`,
    category: p.category,
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  return [...buildingLocations, ...poiLocations];
}

export function listCampusStops(): CampusStop[] {
  const buses = getBuses();
  return REC_CAMPUS_STOPS.map((stop) => {
    return {
      id: stop.id,
      name: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      description: stop.description,
      servingBusIds: buses.map((b) => b.id),
      routeNames: stop.servedRoutes,
    };
  });
}

export function listCampusRoutes(): CampusRoute[] {
  const adminRoutes = listRoutes().filter((route) => route.active);
  const buses = getBuses();

  return adminRoutes.map((route) => {
    const assignedBus = buses.find(
      (bus) => bus.routeId === route.id || route.assignedBusIds.includes(bus.id),
    );
    return {
      id: route.id,
      name: route.name,
      busId: assignedBus?.id ?? (route.assignedBusIds[0] || ""),
      busNumber: assignedBus?.busNumber ?? "",
      destination: route.destination,
      stopIds: [...route.stopIds],
    };
  });
}

export function getDestination(id: string): CampusLocation | undefined {
  const all = listCampusLocations();
  return all.find((loc) => loc.id === id);
}

export { calculateCampusWalkingRoute };

export function calculateNavigation(input: {
  destinationId: string;
  startLatitude?: number;
  startLongitude?: number;
  startLocationId?: string;
  mode?: string;
}) {
  const destination = getDestination(input.destinationId);
  if (!destination) return undefined;

  const startLoc = input.startLocationId ? getDestination(input.startLocationId) : null;
  const start: Coordinate = startLoc
    ? { latitude: startLoc.latitude, longitude: startLoc.longitude }
    : {
        latitude: input.startLatitude ?? REC_CAMPUS_CENTER.latitude,
        longitude: input.startLongitude ?? REC_CAMPUS_CENTER.longitude,
      };

  const walkingResult = input.startLocationId
    ? calculateCampusWalkingRoute(input.startLocationId, input.destinationId)
    : null;

  const distanceKm = walkingResult
    ? walkingResult.distanceMeters / 1000
    : distanceInKilometers(start, destination);
  const walkingMinutes = walkingResult
    ? walkingResult.walkingMinutes
    : Math.max(1, Math.ceil((distanceKm / 4.8) * 60));

  const stops = listCampusStops();
  const relevantStop = stops
    .slice()
    .sort(
      (a, b) =>
        distanceInKilometers(a, destination) - distanceInKilometers(b, destination),
    )[0] ?? stops[0];

  return {
    start,
    destination,
    mode: "campus-walk",
    distanceKm: Number(distanceKm.toFixed(2)),
    distanceMeters: Math.round(distanceKm * 1000),
    walkingMinutes,
    relevantStop,
    routeCoordinates: walkingResult?.pathWaypoints ?? [start, destination],
  };
}