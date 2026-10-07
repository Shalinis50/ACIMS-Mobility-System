/**
 * Adapted from TrackItRide src/routes/routeTypes.ts for ACMIS Mobility System
 * Maps ACMIS database routes, stops, trips, and route_stops into a unified structure.
 */

export interface RoutePathCoordinate {
  latitude: number;
  longitude: number;
}

export interface RouteStopModel {
  id: string;
  routeId?: string;
  name: string;
  sequence: number;
  latitude: number;
  longitude: number;
  pathIndex?: number;
  minutesFromPrevious?: number;
}

export interface BusRouteModel {
  routeId: string;
  busId: string;
  busNumber: string;
  name: string;
  origin: string;
  destination: string;
  path: RoutePathCoordinate[];
  stops: RouteStopModel[];
  totalDistanceKm: number;
}

export interface ActiveTripModel {
  tripId: string;
  busId: string;
  routeId: string;
  driverId?: string | null;
  status: "ACTIVE" | "PAUSED" | "ENDED" | "IDLE";
  startedAt?: string | null;
}

/**
 * Normalizes route and stop payloads returned by ACMIS /api/buses/:busId/route
 * without relying on hardcoded route coordinates.
 */
export function normalizeAcimsRoute(raw: any, fallbackBusId: string): BusRouteModel | null {
  if (!raw) return null;

  const stops: RouteStopModel[] = Array.isArray(raw.stops)
    ? raw.stops
        .map((s: any, idx: number) => ({
          id: String(s.id || `stop-${idx}`),
          routeId: raw.routeId || raw.id,
          name: String(s.name || s.stopName || `Stop ${idx + 1}`),
          sequence: typeof s.sequence === "number" ? s.sequence : typeof s.sequenceNumber === "number" ? s.sequenceNumber : idx,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          pathIndex: typeof s.pathIndex === "number" ? s.pathIndex : idx * 6,
          minutesFromPrevious: typeof s.minutesFromPrevious === "number" ? s.minutesFromPrevious : idx === 0 ? 0 : 3,
        }))
        .filter((s: RouteStopModel) => !Number.isNaN(s.latitude) && !Number.isNaN(s.longitude))
        .sort((a: RouteStopModel, b: RouteStopModel) => a.sequence - b.sequence)
    : [];

  const rawPath: RoutePathCoordinate[] = Array.isArray(raw.path)
    ? raw.path
        .map((p: any) => ({
          latitude: Number(p.latitude ?? p[0]),
          longitude: Number(p.longitude ?? p[1]),
        }))
        .filter((p: RoutePathCoordinate) => !Number.isNaN(p.latitude) && !Number.isNaN(p.longitude))
    : [];

  const path =
    rawPath.length > 0
      ? rawPath
      : stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude }));

  return {
    routeId: String(raw.routeId || raw.id || `route-${fallbackBusId}`),
    busId: String(raw.busId || fallbackBusId),
    busNumber: String(raw.busNumber || raw.routeNumber || fallbackBusId.replace("bus-", "")),
    name: String(raw.name || raw.routeName || "Campus Route"),
    origin: String(raw.origin || stops[0]?.name || "Origin"),
    destination: String(raw.destination || stops[stops.length - 1]?.name || "Destination"),
    path,
    stops,
    totalDistanceKm: typeof raw.totalDistanceKm === "number" ? raw.totalDistanceKm : 0,
  };
}
