import { getProfileWithDetails, getDbBuses, getDbCampusLocations, calculateDbCampusWalkingRoute, getUserNotifications } from "../../../../src/db/services.ts";
import { getActiveTripForBus, listPickupPoints, listShifts } from "../../../../src/db/mobilityOps.ts";
import { computeStudentPickupEta, type StudentPickupEtaResult } from "./etaService.ts";
import { getStudentPickupPoint, listPickupPointsForStudentRoute, updateStudentPickupPoint } from "./pickupPointService.ts";
import { getBusShiftTimingContext } from "./shiftTiming.ts";
import { haversineMeters } from "./publicTransitService";
import { buildMissedBusMtcOptions, isMtcDataAvailable, mtcUnavailableMessage } from "./mtc/mtcService.ts";
import { MTC_SOURCE_LABEL } from "./mtc/mtcSchema.ts";

export type DeviceCoords = {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp?: string;
};

export type DataConfidence = "KNOWN" | "UNKNOWN" | "STALE" | "PREDICTED" | "SCHEDULED" | "LIVE";

function hasDeviceGps(coords?: DeviceCoords): coords is DeviceCoords & { latitude: number; longitude: number } {
  return (
    typeof coords?.latitude === "number" &&
    typeof coords?.longitude === "number" &&
    !Number.isNaN(coords.latitude) &&
    !Number.isNaN(coords.longitude) &&
    !(coords.latitude === 0 && coords.longitude === 0)
  );
}

export function formatAge(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "unknown";
  if (seconds >= 9000) return "unknown";
  if (seconds < 60) return `${Math.round(seconds)} second${Math.round(seconds) === 1 ? "" : "s"} ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
}

export async function getMyBus(studentId: string) {
  const eta = await computeStudentPickupEta(studentId);
  if (!eta) {
    return { found: false as const, reason: "no_bus" as const, eta: null };
  }
  return { found: true as const, reason: null, eta };
}

export async function getMyActiveTrip(studentId: string) {
  const eta = await computeStudentPickupEta(studentId);
  if (!eta?.busId) return { found: false as const, trip: null, eta: null };
  const trip = await getActiveTripForBus(eta.busId);
  return { found: Boolean(trip), trip, eta };
}

export async function getMyPickupPoint(studentId: string) {
  const pickup = await getStudentPickupPoint(studentId);
  return pickup;
}

export async function getMyBusLocation(studentId: string): Promise<{
  found: boolean;
  eta: StudentPickupEtaResult | null;
  confidence: DataConfidence;
}> {
  const eta = await computeStudentPickupEta(studentId);
  if (!eta) return { found: false, eta: null, confidence: "UNKNOWN" };
  const confidence: DataConfidence =
    eta.gps.status === "LIVE" ? "LIVE" : eta.gps.status === "STALE" ? "STALE" : "UNKNOWN";
  return { found: true, eta, confidence };
}

export async function getMyETA(studentId: string) {
  const eta = await computeStudentPickupEta(studentId);
  if (!eta) return { available: false as const, eta: null, reason: "no_assignment" as const };
  if (eta.gps.status !== "LIVE" || eta.etaMinutes == null) {
    return { available: false as const, eta, reason: "gps_unavailable" as const };
  }
  return { available: true as const, eta, reason: null };
}

export async function getMyDelay(studentId: string) {
  const eta = await computeStudentPickupEta(studentId);
  if (!eta) return { available: false as const, eta: null, reason: "no_assignment" as const };
  if (eta.gps.status !== "LIVE" || !eta.delay) {
    return { available: false as const, eta, reason: "insufficient_data" as const };
  }
  return { available: true as const, eta, reason: null };
}

export async function getMyShift(studentId: string) {
  const eta = await computeStudentPickupEta(studentId);
  const busId = eta?.busId;
  if (!busId) return { available: false as const, shift: null, eta: null };
  const shift = await getBusShiftTimingContext(busId);
  if (!shift?.shiftStartTime) return { available: false as const, shift: null, eta };
  return { available: true as const, shift, eta };
}

export async function getAvailableShifts() {
  const rows = await listShifts();
  return rows.filter((s) => s.active && s.startTime);
}

export async function getAvailableBuses() {
  const buses = await getDbBuses();
  return buses.filter((b) => b.active);
}

export async function getPickupPoints(studentId: string) {
  return listPickupPointsForStudentRoute(studentId);
}

export async function getNearestPickupPoint(studentId: string, coords?: DeviceCoords) {
  if (!hasDeviceGps(coords)) {
    return { needsLocation: true as const, nearest: null };
  }
  const points = await listPickupPointsForStudentRoute(studentId);
  if (!points.length) {
    const all = await listPickupPoints();
    const ranked = all
      .filter((p) => p.active && p.latitude != null && p.longitude != null)
      .map((p) => ({
        ...p,
        distanceMeters: Math.round(haversineMeters(coords.latitude, coords.longitude, p.latitude as number, p.longitude as number)),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
    return { needsLocation: false as const, nearest: ranked[0] ?? null };
  }
  const ranked = points
    .filter((p) => p.active && p.latitude != null && p.longitude != null)
    .map((p) => ({
      ...p,
      distanceMeters: Math.round(haversineMeters(coords.latitude, coords.longitude, p.latitude as number, p.longitude as number)),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
  return { needsLocation: false as const, nearest: ranked[0] ?? null };
}

export async function getCampusLocations() {
  return getDbCampusLocations();
}

export async function findCampusLocation(query: string) {
  const term = query.trim().replace(/^(the|a|an)\s+/i, "");
  if (!term) return null;
  const all = await getDbCampusLocations();
  const lower = term.toLowerCase();
  const byName =
    all.find((l) => l.name.toLowerCase() === lower) ||
    all.find((l) => l.id.toLowerCase() === lower) ||
    all.find((l) => l.name.toLowerCase().includes(lower) || l.id.toLowerCase().includes(lower));
  return byName ?? null;
}

export async function getCampusRoute(destinationId: string, coords?: DeviceCoords) {
  const start = hasDeviceGps(coords)
    ? { latitude: coords.latitude, longitude: coords.longitude }
    : "REC Main Gate";
  return calculateDbCampusWalkingRoute(start, destinationId);
}

export async function getNearestCampusBusStop(coords?: DeviceCoords) {
  if (!hasDeviceGps(coords)) {
    return { needsLocation: true as const, nearest: null };
  }
  const locations = await getDbCampusLocations();
  const stops = locations.filter((l) => /transit|stop|gate/i.test(`${l.category} ${l.name}`));
  const pool = stops.length ? stops : locations;
  const ranked = pool
    .map((l) => ({
      ...l,
      distanceMeters: Math.round(haversineMeters(coords.latitude, coords.longitude, l.latitude, l.longitude)),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
  return { needsLocation: false as const, nearest: ranked[0] ?? null };
}

export async function getMissedBusAlternatives(studentId: string, coords?: DeviceCoords) {
  const eta = await computeStudentPickupEta(studentId);
  const shifts = await getAvailableShifts();
  const otherShifts = shifts;

  let mtc: { available: boolean; message?: string; options: Array<Record<string, unknown>> } = {
    available: false,
    message: mtcUnavailableMessage(),
    options: [],
  };
  if (hasDeviceGps(coords)) {
    mtc = buildMissedBusMtcOptions({ latitude: coords.latitude, longitude: coords.longitude });
  } else if (eta?.pickup.latitude != null && eta.pickup.longitude != null) {
    mtc = buildMissedBusMtcOptions({ latitude: eta.pickup.latitude, longitude: eta.pickup.longitude });
  } else if (isMtcDataAvailable()) {
    mtc = { available: true, options: [], message: "MTC is integrated, but a location is needed to list nearby stages." };
  }

  return {
    eta,
    stopPassed: eta?.stopPassed ?? false,
    upcomingShifts: otherShifts.map((s) => ({
      id: s.id,
      name: s.name,
      shiftType: s.shiftType,
      startTime: s.startTime,
      direction: s.direction,
    })),
    mtc,
  };
}

export async function getMTCOptions(coords?: DeviceCoords) {
  if (!isMtcDataAvailable()) {
    return { available: false as const, message: mtcUnavailableMessage(), options: [] as const, source: MTC_SOURCE_LABEL };
  }
  if (!hasDeviceGps(coords)) {
    return {
      available: true as const,
      needsLocation: true as const,
      message: "I need your location permission to find nearby MTC stages.",
      options: [] as const,
      source: MTC_SOURCE_LABEL,
    };
  }
  const result = buildMissedBusMtcOptions({ latitude: coords.latitude, longitude: coords.longitude });
  return { ...result, source: MTC_SOURCE_LABEL, needsLocation: false as const };
}

export async function getNotifications(studentId: string) {
  return getUserNotifications(studentId);
}

export async function changePickupPoint(studentId: string, pickupPointId: string) {
  return updateStudentPickupPoint(studentId, pickupPointId);
}

export async function getStudentDisplayName(studentId: string): Promise<string> {
  const profile = await getProfileWithDetails(studentId);
  return profile?.name?.split(" ")[0] || "there";
}

export function hasLiveDeviceGps(coords?: DeviceCoords) {
  return hasDeviceGps(coords);
}
