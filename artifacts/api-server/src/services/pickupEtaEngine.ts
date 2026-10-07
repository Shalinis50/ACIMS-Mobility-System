import { getRouteForBus } from "./routesData";
import { calculateEtaMinutes, calculateRemainingDistance, findNearestPathIndex } from "./eta";
import { calculateCumulativeDistances } from "./routesData";
import type { Coordinate } from "./routesData";
import { getDelayThresholds } from "./mobilityConfig.ts";

function delayStatusFromMinutes(delay: number): PickupEtaResult["delayStatus"] {
  const t = getDelayThresholds();
  if (delay <= t.onTimeMax) return "ON_TIME";
  if (delay <= t.minorMax) return "MINOR_DELAY";
  if (delay <= t.moderateMax) return "MODERATE_DELAY";
  return "MAJOR_DELAY";
}

export type PickupEtaResult = {
  pickupStopId: string;
  pickupStopName: string;
  etaMinutes: number;
  formattedEta: string;
  remainingDistanceKm: number;
  delayStatus: "ON_TIME" | "MINOR_DELAY" | "MODERATE_DELAY" | "MAJOR_DELAY";
};

export type PickupEtaOptions = {
  speedKmh?: number;
  scheduleDelayMinutes?: number;
};

/**
 * ETA from current bus position to a student's official pickup stop on the route.
 */
export function calculatePickupEta(
  busId: string,
  busCoord: Coordinate,
  pickupStopId: string,
  scheduleDelayMinutesOrOptions: number | PickupEtaOptions = 0,
): PickupEtaResult | null {
  const options: PickupEtaOptions =
    typeof scheduleDelayMinutesOrOptions === "number"
      ? { scheduleDelayMinutes: scheduleDelayMinutesOrOptions }
      : scheduleDelayMinutesOrOptions;
  const scheduleDelayMinutes = options.scheduleDelayMinutes ?? 0;
  const route = getRouteForBus(busId);
  if (!route) return null;

  const pickup = route.stops.find((s) => s.id === pickupStopId || s.name.toLowerCase().includes(pickupStopId.toLowerCase()));
  if (!pickup) return null;

  const cumulative = route.cumulativeDistances ?? calculateCumulativeDistances(route.path);
  const remainingKm = calculateRemainingDistance(busCoord, pickup.pathIndex, route.path, cumulative);
  const speed = options.speedKmh ?? route.averageSpeedKmh ?? 22;
  const etaMinutes = calculateEtaMinutes(remainingKm, speed) + scheduleDelayMinutes;

  const formattedEta =
    etaMinutes <= 0 ? "Arriving now" : etaMinutes === 1 ? "approximately 1 min" : `approximately ${etaMinutes} min`;

  return {
    pickupStopId: pickup.id,
    pickupStopName: pickup.name,
    etaMinutes,
    formattedEta,
    remainingDistanceKm: Number(remainingKm.toFixed(2)),
    delayStatus: delayStatusFromMinutes(scheduleDelayMinutes),
  };
}
