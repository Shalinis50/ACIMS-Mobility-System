import { EventEmitter } from "node:events";
import { distanceInKilometers } from "./eta";

export const busLocationEvents = new EventEmitter();
export const studentLocationEvents = new EventEmitter();

// Allow up to 100 concurrent listeners without warnings
busLocationEvents.setMaxListeners(100);
studentLocationEvents.setMaxListeners(100);

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
};

export type Student = {
  id: string;
  userId: string;
  regNumber: string;
  department: string;
  pickupStopId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  licenseNumber?: string;
  active: boolean;
  assignedBusId?: string;
  createdAt: Date;
};

export type Bus = {
  id: string;
  busNumber: string;
  plateNumber: string;
  active: boolean;
  status: string;
  origin: string;
  destination: string;
  routeLabel: string;
  nextStop: string;
  nextStopId: string;
  etaMinutes: number;
  updatedAt: Date;
  currentLocation?: Coordinate;
};

export type Stop = Coordinate & {
  id: string;
  name: string;
  code: string;
  sequenceOrder: number;
  address?: string;
  createdAt: Date;
};

export type Route = {
  id: string;
  name: string;
  code: string;
  origin: string;
  destination: string;
  active: boolean;
  stopIds: string[];
  assignedBusIds: string[];
  createdAt: Date;
};

export type RouteStop = {
  id: string;
  routeId: string;
  stopId: string;
  stopSequence: number;
  scheduledMinutesFromStart: number;
};

export type Trip = {
  id: string;
  routeId: string;
  busId: string;
  driverId?: string;
  tripDate: string;
  scheduledStartTime: string;
  status: string;
  createdAt: Date;
};

export type LiveLocation = Coordinate & {
  id: string;
  busId: string;
  accuracy: number;
  speed: number;
  heading: number;
  source: string;
  recordedAt: Date;
  createdAt?: Date;
  trackingStatus?: "TRACKING_ACTIVE" | "TRACKING_STALE" | "OFFLINE";
};

export type BusLocationRecord = Coordinate & {
  id: string;
  busId: string;
  accuracy: number;
  speed: number;
  heading: number;
  source: string;
  recordedAt: Date;
  createdAt: Date;
};

export type StudentLocationRecord = Coordinate & {
  id: string;
  studentId: string;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  source: string;
  recordedAt: Date;
  createdAt: Date;
};

export type BusTrackingSession = {
  busId: string;
  driverId?: string;
  driverName?: string;
  isActive: boolean;
  startedAt?: Date;
  stoppedAt?: Date;
  lastRealGpsUpdate?: Date;
  lastAccuracy?: number;
  pointsReceived: number;
};

// Registered transport nodes serving Rajalakshmi Engineering College (REC) Chennai
const stopsData: Stop[] = [
  {
    id: "stop-thandalam",
    name: "REC Main Gate / Thandalam",
    code: "REC-MG",
    latitude: 13.0088,
    longitude: 80.0035,
    sequenceOrder: 0,
    address: "Rajalakshmi Engineering College Campus, NH4, Thandalam, Chennai",
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "stop-poonamallee",
    name: "Poonamallee Bus Terminus",
    code: "PM-01",
    latitude: 13.0494,
    longitude: 80.0988,
    sequenceOrder: 1,
    address: "Poonamallee Trunk Road, Chennai",
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "stop-sriperumbudur",
    name: "Sriperumbudur Bus Stand",
    code: "SPB-01",
    latitude: 12.9691,
    longitude: 79.9442,
    sequenceOrder: 2,
    address: "Bangalore Highway Junction, Sriperumbudur",
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "stop-tambaram",
    name: "Tambaram Sanatorium / MEPZ",
    code: "TB-01",
    latitude: 12.9268,
    longitude: 80.1289,
    sequenceOrder: 3,
    address: "GST Road, Tambaram Sanatorium, Chennai",
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "stop-porur",
    name: "Porur Junction",
    code: "POR-01",
    latitude: 13.0359,
    longitude: 80.1587,
    sequenceOrder: 4,
    address: "Mount-Poonamallee Road, Porur",
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "stop-guindy",
    name: "Guindy Kathipara Interchange",
    code: "GDY-01",
    latitude: 13.0067,
    longitude: 80.2023,
    sequenceOrder: 5,
    address: "Kathipara Junction, Guindy",
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "stop-koyambedu",
    name: "Koyambedu CMBT Terminal",
    code: "CMBT-01",
    latitude: 13.0694,
    longitude: 80.2057,
    sequenceOrder: 6,
    address: "Chennai Mofussil Bus Terminus, Koyambedu",
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "stop-avadi",
    name: "Avadi Bus Terminus",
    code: "AVD-01",
    latitude: 13.1186,
    longitude: 80.1017,
    sequenceOrder: 7,
    address: "Station Road, Avadi, Chennai",
    createdAt: new Date("2026-01-01"),
  },
];

const routesData: Route[] = [
  {
    id: "route-rec-24",
    name: "Route 24 (Tambaram → MEPZ → Poonamallee → REC)",
    code: "R-24",
    origin: "Tambaram Sanatorium / MEPZ",
    destination: "REC Main Gate / Thandalam",
    active: true,
    stopIds: ["stop-tambaram", "stop-porur", "stop-poonamallee", "stop-thandalam"],
    assignedBusIds: ["bus-24"],
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "route-rec-54",
    name: "Route 54 (Poonamallee → Thandalam → REC)",
    code: "R-54",
    origin: "Poonamallee Bus Terminus",
    destination: "REC Main Gate / Thandalam",
    active: true,
    stopIds: ["stop-poonamallee", "stop-thandalam"],
    assignedBusIds: ["bus-54"],
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "route-rec-153",
    name: "Route 153 (Koyambedu CMBT → Porur → REC)",
    code: "R-153",
    origin: "Koyambedu CMBT Terminal",
    destination: "REC Main Gate / Thandalam",
    active: true,
    stopIds: ["stop-koyambedu", "stop-porur", "stop-poonamallee", "stop-thandalam"],
    assignedBusIds: ["bus-153"],
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "route-rec-83",
    name: "Route 83 (Sriperumbudur → Thandalam → REC)",
    code: "R-83",
    origin: "Sriperumbudur Bus Stand",
    destination: "REC Main Gate / Thandalam",
    active: true,
    stopIds: ["stop-sriperumbudur", "stop-thandalam"],
    assignedBusIds: ["bus-83"],
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "route-rec-580",
    name: "Route 580 (Avadi → Poonamallee → REC)",
    code: "R-580",
    origin: "Avadi Bus Terminus",
    destination: "REC Main Gate / Thandalam",
    active: true,
    stopIds: ["stop-avadi", "stop-poonamallee", "stop-thandalam"],
    assignedBusIds: ["bus-580"],
    createdAt: new Date("2026-01-01"),
  },
];

const routeStopsData: RouteStop[] = [
  { id: "rs-24-1", routeId: "route-rec-24", stopId: "stop-tambaram", stopSequence: 1, scheduledMinutesFromStart: 0 },
  { id: "rs-24-2", routeId: "route-rec-24", stopId: "stop-porur", stopSequence: 2, scheduledMinutesFromStart: 18 },
  { id: "rs-24-3", routeId: "route-rec-24", stopId: "stop-poonamallee", stopSequence: 3, scheduledMinutesFromStart: 32 },
  { id: "rs-24-4", routeId: "route-rec-24", stopId: "stop-thandalam", stopSequence: 4, scheduledMinutesFromStart: 45 },

  { id: "rs-54-1", routeId: "route-rec-54", stopId: "stop-poonamallee", stopSequence: 1, scheduledMinutesFromStart: 0 },
  { id: "rs-54-2", routeId: "route-rec-54", stopId: "stop-thandalam", stopSequence: 2, scheduledMinutesFromStart: 16 },

  { id: "rs-153-1", routeId: "route-rec-153", stopId: "stop-koyambedu", stopSequence: 1, scheduledMinutesFromStart: 0 },
  { id: "rs-153-2", routeId: "route-rec-153", stopId: "stop-porur", stopSequence: 2, scheduledMinutesFromStart: 22 },
  { id: "rs-153-3", routeId: "route-rec-153", stopId: "stop-poonamallee", stopSequence: 3, scheduledMinutesFromStart: 36 },
  { id: "rs-153-4", routeId: "route-rec-153", stopId: "stop-thandalam", stopSequence: 4, scheduledMinutesFromStart: 52 },

  { id: "rs-83-1", routeId: "route-rec-83", stopId: "stop-sriperumbudur", stopSequence: 1, scheduledMinutesFromStart: 0 },
  { id: "rs-83-2", routeId: "route-rec-83", stopId: "stop-thandalam", stopSequence: 2, scheduledMinutesFromStart: 15 },

  { id: "rs-580-1", routeId: "route-rec-580", stopId: "stop-avadi", stopSequence: 1, scheduledMinutesFromStart: 0 },
  { id: "rs-580-2", routeId: "route-rec-580", stopId: "stop-poonamallee", stopSequence: 2, scheduledMinutesFromStart: 24 },
  { id: "rs-580-3", routeId: "route-rec-580", stopId: "stop-thandalam", stopSequence: 3, scheduledMinutesFromStart: 38 },
];

const busesData: Bus[] = [
  {
    id: "bus-24",
    busNumber: "24",
    plateNumber: "TN-21-BH-4024",
    active: true,
    status: "Moving",
    origin: "Tambaram Sanatorium / MEPZ",
    destination: "REC Main Gate / Thandalam",
    routeLabel: "Route 24 (Tambaram → REC)",
    nextStop: "Porur Junction",
    nextStopId: "stop-porur",
    etaMinutes: 6,
    updatedAt: new Date(),
  },
  {
    id: "bus-54",
    busNumber: "54",
    plateNumber: "TN-21-BH-4054",
    active: true,
    status: "Moving",
    origin: "Poonamallee Bus Terminus",
    destination: "REC Main Gate / Thandalam",
    routeLabel: "Route 54 (Poonamallee → REC)",
    nextStop: "REC Main Gate / Thandalam",
    nextStopId: "stop-thandalam",
    etaMinutes: 11,
    updatedAt: new Date(Date.now() - 1000 * 40),
  },
  {
    id: "bus-153",
    busNumber: "153",
    plateNumber: "TN-21-BH-4153",
    active: true,
    status: "Moving",
    origin: "Koyambedu CMBT Terminal",
    destination: "REC Main Gate / Thandalam",
    routeLabel: "Route 153 (Koyambedu → REC)",
    nextStop: "Porur Junction",
    nextStopId: "stop-porur",
    etaMinutes: 9,
    updatedAt: new Date(Date.now() - 1000 * 55),
  },
  {
    id: "bus-83",
    busNumber: "83",
    plateNumber: "TN-21-BH-4083",
    active: true,
    status: "Boarding",
    origin: "Sriperumbudur Bus Stand",
    destination: "REC Main Gate / Thandalam",
    routeLabel: "Route 83 (Sriperumbudur → REC)",
    nextStop: "REC Main Gate / Thandalam",
    nextStopId: "stop-thandalam",
    etaMinutes: 14,
    updatedAt: new Date(Date.now() - 1000 * 90),
  },
  {
    id: "bus-580",
    busNumber: "580",
    plateNumber: "TN-21-BH-4580",
    active: true,
    status: "Standby",
    origin: "Avadi Bus Terminus",
    destination: "REC Main Gate / Thandalam",
    routeLabel: "Route 580 (Avadi → REC)",
    nextStop: "Poonamallee Bus Terminus",
    nextStopId: "stop-poonamallee",
    etaMinutes: 22,
    updatedAt: new Date(Date.now() - 1000 * 120),
  },
];

const driversData: Driver[] = [
  { id: "driver-arun", name: "Arun Kumar", phone: "+91 98401 23451", active: true, assignedBusId: "bus-24", createdAt: new Date() },
  { id: "driver-suresh", name: "Suresh Mani", phone: "+91 98402 34562", active: true, assignedBusId: "bus-54", createdAt: new Date() },
  { id: "driver-venkat", name: "Venkat Raman", phone: "+91 98403 45673", active: true, assignedBusId: "bus-153", createdAt: new Date() },
  { id: "driver-rajesh", name: "Rajesh Kannan", phone: "+91 98404 56784", active: true, assignedBusId: "bus-83", createdAt: new Date() },
  { id: "driver-karthik", name: "Karthik Raja", phone: "+91 98405 67895", active: true, assignedBusId: "bus-580", createdAt: new Date() },
];

const tripsData: Trip[] = [
  { id: "trip-today-24", routeId: "route-rec-24", busId: "bus-24", driverId: "driver-arun", tripDate: new Date().toISOString().split("T")[0], scheduledStartTime: "07:15 AM", status: "Active", createdAt: new Date() },
  { id: "trip-today-54", routeId: "route-rec-54", busId: "bus-54", driverId: "driver-suresh", tripDate: new Date().toISOString().split("T")[0], scheduledStartTime: "07:30 AM", status: "Active", createdAt: new Date() },
  { id: "trip-today-153", routeId: "route-rec-153", busId: "bus-153", driverId: "driver-venkat", tripDate: new Date().toISOString().split("T")[0], scheduledStartTime: "07:05 AM", status: "Active", createdAt: new Date() },
  { id: "trip-today-83", routeId: "route-rec-83", busId: "bus-83", driverId: "driver-rajesh", tripDate: new Date().toISOString().split("T")[0], scheduledStartTime: "07:45 AM", status: "Active", createdAt: new Date() },
  { id: "trip-today-580", routeId: "route-rec-580", busId: "bus-580", driverId: "driver-karthik", tripDate: new Date().toISOString().split("T")[0], scheduledStartTime: "07:20 AM", status: "Scheduled", createdAt: new Date() },
];

const liveLocationsData: Map<string, LiveLocation> = new Map([
  [
    "bus-24",
    {
      id: "loc-bus-24",
      busId: "bus-24",
      latitude: 12.9812,
      longitude: 80.1425,
      accuracy: 7.8,
      speed: 34,
      heading: 305,
      source: "driver-phone-gps",
      recordedAt: new Date(Date.now() - 1000 * 20),
      createdAt: new Date(Date.now() - 1000 * 20),
      trackingStatus: "TRACKING_ACTIVE",
    },
  ],
  [
    "bus-54",
    {
      id: "loc-bus-54",
      busId: "bus-54",
      latitude: 13.0315,
      longitude: 80.0521,
      accuracy: 12.4,
      speed: 30,
      heading: 260,
      source: "driver-phone-gps",
      recordedAt: new Date(Date.now() - 1000 * 45),
      createdAt: new Date(Date.now() - 1000 * 45),
      trackingStatus: "TRACKING_STALE",
    },
  ],
  [
    "bus-153",
    {
      id: "loc-bus-153",
      busId: "bus-153",
      latitude: 13.0512,
      longitude: 80.1789,
      accuracy: 9.1,
      speed: 36,
      heading: 245,
      source: "driver-phone-gps",
      recordedAt: new Date(Date.now() - 1000 * 55),
      createdAt: new Date(Date.now() - 1000 * 55),
      trackingStatus: "TRACKING_STALE",
    },
  ],
  [
    "bus-83",
    {
      id: "loc-bus-83",
      busId: "bus-83",
      latitude: 12.9712,
      longitude: 79.9510,
      accuracy: 15.0,
      speed: 0,
      heading: 0,
      source: "driver-phone-gps",
      recordedAt: new Date(Date.now() - 1000 * 95),
      createdAt: new Date(Date.now() - 1000 * 95),
      trackingStatus: "TRACKING_STALE",
    },
  ],
]);

// Location history storage (never overwritten, preserved in order)
const busLocationsHistory: BusLocationRecord[] = Array.from(liveLocationsData.values()).map((loc) => ({
  id: loc.id,
  busId: loc.busId,
  latitude: loc.latitude,
  longitude: loc.longitude,
  accuracy: loc.accuracy,
  speed: loc.speed,
  heading: loc.heading,
  source: loc.source,
  recordedAt: loc.recordedAt,
  createdAt: loc.createdAt ?? loc.recordedAt,
}));

// Driver active tracking sessions
const busTrackingSessions: Map<string, BusTrackingSession> = new Map([
  [
    "bus-24",
    {
      busId: "bus-24",
      driverId: "driver-arun",
      driverName: "Arun Kumar",
      isActive: true,
      startedAt: new Date(Date.now() - 1000 * 60 * 30),
      lastRealGpsUpdate: new Date(Date.now() - 1000 * 20),
      lastAccuracy: 7.8,
      pointsReceived: 45,
    },
  ],
  [
    "bus-54",
    {
      busId: "bus-54",
      driverId: "driver-suresh",
      driverName: "Suresh Mani",
      isActive: true,
      startedAt: new Date(Date.now() - 1000 * 60 * 25),
      lastRealGpsUpdate: new Date(Date.now() - 1000 * 45),
      lastAccuracy: 12.4,
      pointsReceived: 38,
    },
  ],
]);

// Student real GPS tracking storage
const studentLocationsMap: Map<string, StudentLocationRecord> = new Map();
const studentLocationsHistory: StudentLocationRecord[] = [];

// Real authenticated student profile
let studentProfile: Student = {
  id: "student-20418",
  userId: "user-shalini",
  regNumber: "211424104050",
  department: "Computer Science & Design",
  pickupStopId: "stop-tambaram",
  createdAt: new Date("2026-01-15"),
  updatedAt: new Date(),
};

export const transportDb = {
  // Students
  getStudentProfile(studentId = "student-20418") {
    return { ...studentProfile };
  },

  updateStudentPickupStop(stopId: string | null, studentId = "student-20418") {
    studentProfile.pickupStopId = stopId;
    studentProfile.updatedAt = new Date();
    return { ...studentProfile };
  },

  // Stops
  getAllStops(): Stop[] {
    return stopsData.map((s) => ({ ...s }));
  },

  getStop(stopId: string): Stop | undefined {
    return stopsData.find((s) => s.id === stopId);
  },

  findNearestStop(userCoord: Coordinate): { stop: Stop; distanceKm: number } | undefined {
    if (!stopsData.length) return undefined;
    let closestStop = stopsData[0];
    let minDistance = distanceInKilometers(userCoord, closestStop);

    for (let i = 1; i < stopsData.length; i++) {
      const current = stopsData[i];
      const dist = distanceInKilometers(userCoord, current);
      if (dist < minDistance) {
        minDistance = dist;
        closestStop = current;
      }
    }

    return {
      stop: { ...closestStop },
      distanceKm: Number(minDistance.toFixed(2)),
    };
  },

  // Routes
  getAllRoutes(): Route[] {
    return routesData.map((r) => ({ ...r, stopIds: [...r.stopIds], assignedBusIds: [...r.assignedBusIds] }));
  },

  getRoute(routeId: string): Route | undefined {
    const route = routesData.find((r) => r.id === routeId);
    return route ? { ...route, stopIds: [...route.stopIds], assignedBusIds: [...route.assignedBusIds] } : undefined;
  },

  getRoutesForStop(stopId: string): Route[] {
    const matchingRouteStops = routeStopsData.filter((rs) => rs.stopId === stopId);
    const routeIds = new Set(matchingRouteStops.map((rs) => rs.routeId));
    return routesData.filter((r) => routeIds.has(r.id) && r.active).map((r) => ({ ...r }));
  },

  getRouteStops(routeId: string): Array<Stop & { sequence: number; minutesFromPrevious: number }> {
    const rs = routeStopsData.filter((item) => item.routeId === routeId).sort((a, b) => a.stopSequence - b.stopSequence);
    let prevMinutes = 0;
    return rs.map((item) => {
      const stop = stopsData.find((s) => s.id === item.stopId);
      const minutesFromPrevious = Math.max(0, item.scheduledMinutesFromStart - prevMinutes);
      prevMinutes = item.scheduledMinutesFromStart;
      return {
        id: item.stopId,
        name: stop?.name ?? item.stopId,
        code: stop?.code ?? "",
        sequenceOrder: item.stopSequence,
        sequence: item.stopSequence,
        minutesFromPrevious,
        latitude: stop?.latitude ?? 13.0088,
        longitude: stop?.longitude ?? 80.0035,
        address: stop?.address,
        createdAt: stop?.createdAt ?? new Date(),
      };
    });
  },

  // Trips
  getActiveTrips(): Trip[] {
    return tripsData.filter((t) => t.status === "Active").map((t) => ({ ...t }));
  },

  getTripForRoute(routeId: string): Trip | undefined {
    return tripsData.find((t) => t.routeId === routeId && (t.status === "Active" || t.status === "Scheduled"));
  },

  // Buses
  getAllBuses(): Bus[] {
    return busesData.map((bus) => {
      const live = liveLocationsData.get(bus.id);
      return {
        ...bus,
        currentLocation: live ? { latitude: live.latitude, longitude: live.longitude } : undefined,
        updatedAt: live ? live.recordedAt : bus.updatedAt,
      };
    });
  },

  getBus(busId: string): Bus | undefined {
    const bus = busesData.find((b) => b.id === busId);
    if (!bus) return undefined;
    const live = liveLocationsData.get(bus.id);
    return {
      ...bus,
      currentLocation: live ? { latitude: live.latitude, longitude: live.longitude } : undefined,
      updatedAt: live ? live.recordedAt : bus.updatedAt,
    };
  },

  // Live Location & Tracking
  getLiveLocation(busId: string): LiveLocation | undefined {
    const live = liveLocationsData.get(busId);
    if (!live) return undefined;
    const status = this.getTrackingStatus(busId);
    return { ...live, trackingStatus: status };
  },

  getTrackingStatus(busId: string): "TRACKING_ACTIVE" | "TRACKING_STALE" | "OFFLINE" {
    const session = busTrackingSessions.get(busId);
    if (session && session.isActive === false) {
      return "OFFLINE";
    }
    const live = liveLocationsData.get(busId);
    if (!live) return "OFFLINE";
    const ageMs = Date.now() - live.recordedAt.getTime();
    if (ageMs <= 30000) return "TRACKING_ACTIVE";
    if (ageMs <= 120000) return "TRACKING_STALE";
    return "OFFLINE";
  },

  getBusSession(busId: string): BusTrackingSession | undefined {
    return busTrackingSessions.get(busId);
  },

  getAllBusSessions(): BusTrackingSession[] {
    return Array.from(busTrackingSessions.values());
  },

  startBusTracking(busId: string, driverId?: string, driverName?: string): BusTrackingSession {
    const existing = busTrackingSessions.get(busId);
    const session: BusTrackingSession = {
      busId,
      driverId: driverId ?? existing?.driverId,
      driverName: driverName ?? existing?.driverName,
      isActive: true,
      startedAt: new Date(),
      lastRealGpsUpdate: existing?.lastRealGpsUpdate,
      lastAccuracy: existing?.lastAccuracy,
      pointsReceived: existing?.pointsReceived ?? 0,
    };
    busTrackingSessions.set(busId, session);
    const bus = busesData.find((b) => b.id === busId);
    if (bus) {
      bus.status = "Moving";
      bus.updatedAt = new Date();
    }
    busLocationEvents.emit("session_change", session);
    return session;
  },

  stopBusTracking(busId: string): BusTrackingSession {
    const existing = busTrackingSessions.get(busId);
    const session: BusTrackingSession = {
      busId,
      driverId: existing?.driverId,
      driverName: existing?.driverName,
      isActive: false,
      startedAt: existing?.startedAt,
      stoppedAt: new Date(),
      lastRealGpsUpdate: existing?.lastRealGpsUpdate,
      lastAccuracy: existing?.lastAccuracy,
      pointsReceived: existing?.pointsReceived ?? 0,
    };
    busTrackingSessions.set(busId, session);
    const bus = busesData.find((b) => b.id === busId);
    if (bus) {
      bus.status = "Standby";
      bus.updatedAt = new Date();
    }
    busLocationEvents.emit("session_change", session);
    const lastLoc = liveLocationsData.get(busId);
    if (lastLoc) {
      busLocationEvents.emit(`location:${busId}`, { ...lastLoc, trackingStatus: "OFFLINE" });
    }
    return session;
  },

  recordLiveLocation(input: {
    busId: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    source?: string;
    recordedAt?: Date | string;
    driverId?: string;
    driverName?: string;
  }): LiveLocation {
    const bus = busesData.find((b) => b.id === input.busId);
    const recordedAtDate = input.recordedAt
      ? typeof input.recordedAt === "string"
        ? new Date(input.recordedAt)
        : input.recordedAt
      : new Date();

    const accuracy = typeof input.accuracy === "number" && !isNaN(input.accuracy) ? input.accuracy : 10;
    const speed = typeof input.speed === "number" && !isNaN(input.speed) ? input.speed : 0;
    const heading = typeof input.heading === "number" && !isNaN(input.heading) ? input.heading : 0;
    const source = input.source ?? "driver-phone-gps";

    const location: LiveLocation = {
      id: `loc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      busId: input.busId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy,
      speed,
      heading,
      source,
      recordedAt: recordedAtDate,
      createdAt: new Date(),
      trackingStatus: "TRACKING_ACTIVE",
    };
    liveLocationsData.set(input.busId, location);

    // Save to historical queue (never overwrite past positions)
    busLocationsHistory.push({
      id: location.id,
      busId: location.busId,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy,
      speed,
      heading,
      source,
      recordedAt: recordedAtDate,
      createdAt: location.createdAt ?? new Date(),
    });
    if (busLocationsHistory.length > 3000) {
      busLocationsHistory.splice(0, 500);
    }

    // Maintain driver session
    let session = busTrackingSessions.get(input.busId);
    if (!session) {
      session = {
        busId: input.busId,
        driverId: input.driverId,
        driverName: input.driverName,
        isActive: true,
        startedAt: new Date(),
        lastRealGpsUpdate: recordedAtDate,
        lastAccuracy: accuracy,
        pointsReceived: 1,
      };
    } else {
      session.isActive = true;
      session.lastRealGpsUpdate = recordedAtDate;
      session.lastAccuracy = accuracy;
      session.pointsReceived += 1;
      if (input.driverId) session.driverId = input.driverId;
      if (input.driverName) session.driverName = input.driverName;
    }
    busTrackingSessions.set(input.busId, session);

    if (bus) {
      bus.updatedAt = location.recordedAt;
      bus.status = speed > 5 ? "Moving" : "Boarding";

      // Dynamically calculate upcoming stop along the bus route
      const route = routesData.find((r) => r.assignedBusIds.includes(bus.id));
      if (route) {
        const stops = this.getRouteStops(route.id);
        if (stops.length > 0) {
          let closestStop = stops[0];
          let minDistance = distanceInKilometers(location, closestStop);
          for (let i = 1; i < stops.length; i++) {
            const d = distanceInKilometers(location, stops[i]);
            if (d < minDistance) {
              minDistance = d;
              closestStop = stops[i];
            }
          }
          bus.nextStopId = closestStop.id;
          bus.nextStop = closestStop.name;
          const effectiveSpeed = speed > 5 ? speed : 24;
          bus.etaMinutes = Math.max(1, Math.ceil((minDistance / effectiveSpeed) * 60));
        }
      }
    }

    busLocationEvents.emit("location", location);
    busLocationEvents.emit(`location:${input.busId}`, location);

    return location;
  },

  getBusLocationHistory(busId: string, limit = 50): BusLocationRecord[] {
    return busLocationsHistory
      .filter((loc) => loc.busId === busId)
      .slice(-limit);
  },

  // Student GPS Tracking
  recordStudentLocation(input: {
    studentId?: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    speed?: number | null;
    heading?: number | null;
    timestamp?: string | Date;
    source?: string;
  }): StudentLocationRecord {
    const studentId = input.studentId || "student-20418";
    const recordedAtDate = input.timestamp
      ? typeof input.timestamp === "string"
        ? new Date(input.timestamp)
        : input.timestamp
      : new Date();

    const record: StudentLocationRecord = {
      id: `sloc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studentId,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      speed: input.speed ?? 0,
      heading: input.heading ?? 0,
      source: input.source ?? "student-phone-gps",
      recordedAt: recordedAtDate,
      createdAt: new Date(),
    };

    studentLocationsMap.set(studentId, record);
    studentLocationsHistory.push(record);
    if (studentLocationsHistory.length > 2000) {
      studentLocationsHistory.splice(0, 300);
    }

    studentLocationEvents.emit("location", record);
    studentLocationEvents.emit(`location:${studentId}`, record);

    return record;
  },

  getStudentLocation(studentId = "student-20418"): StudentLocationRecord | undefined {
    return studentLocationsMap.get(studentId);
  },

  // Admin mutation helpers
  createBus(input: { busNumber: string; plateNumber: string; active?: boolean }): Bus {
    const newBus: Bus = {
      id: `bus-${input.busNumber.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`,
      busNumber: input.busNumber,
      plateNumber: input.plateNumber,
      active: input.active ?? true,
      status: "Standby",
      origin: "Depot",
      destination: "REC Main Gate / Thandalam",
      routeLabel: `Line ${input.busNumber}`,
      nextStop: "REC Main Gate / Thandalam",
      nextStopId: "stop-thandalam",
      etaMinutes: 0,
      updatedAt: new Date(),
    };
    busesData.push(newBus);
    return { ...newBus };
  },

  updateBus(busId: string, input: Partial<Omit<Bus, "id">>): Bus | undefined {
    const bus = busesData.find((b) => b.id === busId);
    if (!bus) return undefined;
    Object.assign(bus, input);
    bus.updatedAt = new Date();
    return { ...bus };
  },

  createDriver(input: { name: string; phone: string; licenseNumber?: string; assignedBusId?: string }): Driver {
    const driver: Driver = {
      id: `driver-${Date.now()}`,
      name: input.name,
      phone: input.phone,
      licenseNumber: input.licenseNumber,
      assignedBusId: input.assignedBusId,
      active: true,
      createdAt: new Date(),
    };
    driversData.push(driver);
    return { ...driver };
  },

  getAllDrivers(): Driver[] {
    return driversData.map((d) => ({ ...d }));
  },

  createRoute(input: { name: string; code: string; origin: string; destination: string; stopIds: string[] }): Route {
    const route: Route = {
      id: `route-${input.code.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`,
      name: input.name,
      code: input.code,
      origin: input.origin,
      destination: input.destination,
      active: true,
      stopIds: input.stopIds,
      assignedBusIds: [],
      createdAt: new Date(),
    };
    routesData.push(route);
    input.stopIds.forEach((stopId, idx) => {
      routeStopsData.push({
        id: `rs-${route.id}-${idx}`,
        routeId: route.id,
        stopId,
        stopSequence: idx + 1,
        scheduledMinutesFromStart: idx * 12,
      });
    });
    return { ...route };
  },
};
