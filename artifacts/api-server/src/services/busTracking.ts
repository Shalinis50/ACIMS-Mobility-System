import { transportDb, type Bus, type Coordinate, type LiveLocation, type Stop } from "./transportDb";
import { calculateEtaMinutes, distanceInKilometers } from "./eta";

export type { Coordinate, Bus, LiveLocation };

export type BusStop = Coordinate & {
  id: string;
  name: string;
  code: string;
  sequence: number;
  minutesFromPrevious: number;
};

export type BusLocation = Coordinate & {
  busId: string;
  nextStopId: string;
  nextStop: string;
  etaMinutes: number;
  status: string;
  trackingStatus: "TRACKING_ACTIVE" | "TRACKING_STALE" | "OFFLINE";
  updatedAt: Date;
  source: string;
  accuracy: number;
  speed: number;
  heading: number;
  lastUpdateSecondsAgo: number;
  isRealPhoneGps: boolean;
};

export function getBuses(): Bus[] {
  return transportDb.getAllBuses();
}

export function getBus(id: string): Bus | undefined {
  return transportDb.getBus(id);
}

export function getStops(busId: string): BusStop[] {
  const bus = transportDb.getBus(busId);
  if (!bus) return [];
  // Find trip / route for this bus
  const activeTrips = transportDb.getActiveTrips();
  const trip = activeTrips.find((t) => t.busId === busId);
  const route = trip
    ? transportDb.getRoute(trip.routeId)
    : transportDb.getAllRoutes().find((r) => r.assignedBusIds.includes(busId));

  if (!route) {
    // Return all stops on primary route if none specifically bound
    const firstRoute = transportDb.getAllRoutes()[0];
    return firstRoute ? transportDb.getRouteStops(firstRoute.id) : [];
  }

  return transportDb.getRouteStops(route.id);
}

export function getLocation(busId: string): BusLocation | undefined {
  const bus = transportDb.getBus(busId);
  if (!bus) return undefined;

  const live = transportDb.getLiveLocation(busId);
  if (!live) return undefined;

  const stops = getStops(busId);
  // Calculate nearest next stop
  let nextStop = stops.find((s) => s.id === bus.nextStopId) ?? stops[stops.length - 1];
  let calculatedEta = bus.etaMinutes;

  if (nextStop) {
    const distKm = distanceInKilometers({ latitude: live.latitude, longitude: live.longitude }, nextStop);
    const speed = live.speed > 5 ? live.speed : 25; // actual speed or average 25 km/h
    calculatedEta = Math.max(1, Math.ceil((distKm / speed) * 60));
  }

  const trackingStatus = transportDb.getTrackingStatus(busId);
  const lastUpdateSecondsAgo = Math.max(0, Math.round((Date.now() - live.recordedAt.getTime()) / 1000));

  return {
    busId: bus.id,
    latitude: live.latitude,
    longitude: live.longitude,
    nextStopId: bus.nextStopId,
    nextStop: bus.nextStop,
    etaMinutes: calculatedEta,
    status: bus.status,
    trackingStatus,
    updatedAt: live.recordedAt,
    source: live.source,
    accuracy: live.accuracy ?? 10,
    speed: live.speed,
    heading: live.heading,
    lastUpdateSecondsAgo,
    isRealPhoneGps: live.source.includes("phone") || live.source.includes("driver"),
  };
}

export function updateLocation(
  busId: string,
  location: Coordinate,
  source = "driver-phone-gps",
  timestamp: Date | string = new Date(),
  speed?: number,
  heading?: number,
  accuracy?: number,
  driverId?: string,
  driverName?: string,
) {
  const bus = transportDb.getBus(busId);
  if (!bus) return undefined;

  transportDb.recordLiveLocation({
    busId,
    latitude: location.latitude,
    longitude: location.longitude,
    speed,
    heading,
    source,
    accuracy,
    recordedAt: timestamp,
    driverId,
    driverName,
  });

  return getLocation(busId);
}
