import { getLatestBusLocation, isBusTrackingActive, getDbBusById } from "../../../../src/db/services.ts";
import { getActiveTripForBus } from "../../../../src/db/mobilityOps.ts";
import { evaluateFreshness } from "./gpsEngine.ts";
import { calculatePickupEta } from "./pickupEtaEngine.ts";
import { getRouteForBus } from "./routesData";
import { findNearestPathIndex } from "./eta";
import { getStudentPickupPoint } from "./pickupPointService.ts";
import { assessPickupDelay, type PickupDelayResult } from "./delayPredictionService.ts";
import { getMvpCollegeRoute, isMvpCollegeRouteActive } from "./mvpCollegeRouteService.ts";

export type StudentPickupEtaResult = {
  studentId: string;
  busId: string;
  busNumber: string;
  tripId: string | null;
  pickup: {
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    sequenceNumber: number;
  };
  etaMinutes: number | null;
  formattedEta: string;
  remainingDistanceKm: number | null;
  scheduledArrivalAt: string | null;
  predictedArrivalAt: string | null;
  delay: PickupDelayResult | null;
  stopPassed: boolean;
  gps: {
    status: "LIVE" | "STALE" | "UNAVAILABLE";
    lastUpdateAt: string | null;
    secondsSinceUpdate: number;
    latitude: number | null;
    longitude: number | null;
    speedMps: number | null;
  };
  routeLabel: string;
  directionLabel: string;
};

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export async function computeStudentPickupEta(studentUserId: string): Promise<StudentPickupEtaResult | null> {
  const pickupView = await getStudentPickupPoint(studentUserId);
  if (!pickupView) return null;

  const mvp = getMvpCollegeRoute();
  const recPickup = pickupView.routeId.startsWith("rec-route-");
  const busId = recPickup
    ? pickupView.assignedBusId
    : isMvpCollegeRouteActive()
      ? mvp.busId
      : pickupView.assignedBusId;
  if (!busId) return null;
  if (!recPickup && isMvpCollegeRouteActive() && pickupView.assignedRouteId && pickupView.assignedRouteId !== mvp.routeId) {
    return null;
  }

  const bus = await getDbBusById(busId);
  if (!bus) return null;

  const trip = await getActiveTripForBus(busId);
  const tracking = await isBusTrackingActive(busId);
  const loc = await getLatestBusLocation(busId);
  const route = getRouteForBus(busId);

  const freshness = loc
    ? evaluateFreshness(loc.recordedAt, new Date())
    : { freshness: "UNAVAILABLE" as const, secondsSinceUpdate: 9999 };

  const gpsLive = tracking.isActive && (freshness.freshness === "LIVE" || freshness.freshness === "RECENT");
  const gpsStatus: StudentPickupEtaResult["gps"]["status"] =
    !loc || freshness.freshness === "UNAVAILABLE" || freshness.freshness === "OFFLINE"
      ? "UNAVAILABLE"
      : freshness.freshness === "STALE"
        ? "STALE"
        : "LIVE";

  let stopPassed = false;
  if (route && loc) {
    const stop = route.stops.find((s) => s.id === pickupView.pickupPointId);
    if (stop) {
      const { index: busIndex } = findNearestPathIndex(
        { latitude: loc.latitude, longitude: loc.longitude },
        route.path,
      );
      stopPassed = busIndex > stop.pathIndex + 1;
    }
  }

  let etaMinutes: number | null = null;
  let formattedEta = "ETA currently unavailable";
  let remainingDistanceKm: number | null = null;

  if (gpsLive && loc && !stopPassed) {
    const speedKmh =
      loc.speed != null && loc.speed > 0.5 ? loc.speed * 3.6 : route?.averageSpeedKmh ?? 22;
    const eta = calculatePickupEta(
      busId,
      { latitude: loc.latitude, longitude: loc.longitude },
      pickupView.pickupPointId,
      { speedKmh, scheduleDelayMinutes: trip?.delayMinutes ?? 0 },
    );
    if (eta) {
      etaMinutes = eta.etaMinutes;
      formattedEta = eta.formattedEta;
      remainingDistanceKm = eta.remainingDistanceKm;
    }
  }

  const delay =
    etaMinutes != null && gpsLive
      ? await assessPickupDelay({
          busId,
          pickupExpectedOffsetMinutes: pickupView.expectedOffsetMinutes,
          etaMinutes,
          speedMps: loc?.speed ?? null,
          secondsSinceGps: freshness.secondsSinceUpdate,
          gpsStale: gpsStatus !== "LIVE",
        })
      : null;

  const now = new Date();
  const predictedArrivalAt =
    etaMinutes != null && gpsLive ? new Date(now.getTime() + etaMinutes * 60000) : null;

  let scheduledArrivalAt: Date | null = null;
  if (delay?.scheduledArrivalAt) {
    scheduledArrivalAt = delay.scheduledArrivalAt;
  }

  return {
    studentId: studentUserId,
    busId,
    busNumber: bus.busNumber,
    tripId: trip?.id ?? null,
    pickup: {
      id: pickupView.pickupPointId,
      name: pickupView.pickupPointName,
      latitude: pickupView.latitude,
      longitude: pickupView.longitude,
      sequenceNumber: pickupView.sequenceNumber,
    },
    etaMinutes,
    formattedEta,
    remainingDistanceKm,
    scheduledArrivalAt: scheduledArrivalAt ? formatClock(scheduledArrivalAt) : null,
    predictedArrivalAt: predictedArrivalAt ? formatClock(predictedArrivalAt) : null,
    delay,
    stopPassed,
    gps: {
      status: gpsStatus,
      lastUpdateAt: loc?.recordedAt ? new Date(loc.recordedAt).toISOString() : null,
      secondsSinceUpdate: freshness.secondsSinceUpdate,
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      speedMps: loc?.speed ?? null,
    },
    routeLabel: route?.name ?? bus.routeId ?? "Campus route",
    directionLabel: route ? `${route.origin} → ${route.destination}` : "Home → College",
  };
}
