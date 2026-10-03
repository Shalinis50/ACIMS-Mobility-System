import { getActiveTripForBus } from "../../../../src/db/mobilityOps.ts";
import { getStudentUserIdsForBus, isBusTrackingActive } from "../../../../src/db/services.ts";
import { evaluateFreshness } from "./gpsEngine.ts";
import { computeStudentPickupEta } from "./etaService.ts";
import { processStudentPickupNotifications } from "./notificationService.ts";
import { isBusOnCollegeRoute } from "./mvpCollegeRouteService.ts";

export type BusTelemetryInput = {
  id: string;
  busNumber?: string;
  latitude: number;
  longitude: number;
  speed?: number | null;
  heading?: number | null;
  tripId?: string | null;
  recordedAt?: Date | string;
};

/**
 * Runs personalized pickup ETA, delay assessment, and deduplicated notifications per student on the bus.
 */
export async function processMobilityTelemetry(telemetry: BusTelemetryInput) {
  const busId = telemetry.id;
  if (!isBusOnCollegeRoute(busId)) {
    return { processed: 0, skipped: "NOT_COLLEGE_ROUTE_BUS" as const };
  }
  const trip = await getActiveTripForBus(busId);
  const tracking = await isBusTrackingActive(busId);
  if (!tracking.isActive && !trip) {
    return { processed: 0, skipped: "NO_ACTIVE_TRIP" as const };
  }

  const studentIds = await getStudentUserIdsForBus(busId);
  if (!studentIds.length) return { processed: 0, tripId: trip?.id };

  let processed = 0;
  for (const studentId of studentIds) {
    const eta = await computeStudentPickupEta(studentId);
    if (!eta || eta.busId !== busId) continue;

    const freshness = eta.gps.lastUpdateAt
      ? evaluateFreshness(new Date(eta.gps.lastUpdateAt), new Date())
      : { freshness: "UNAVAILABLE" as const, secondsSinceUpdate: 9999 };

    if (freshness.freshness === "UNAVAILABLE" || freshness.freshness === "OFFLINE") {
      const partial = { ...eta, etaMinutes: null as number | null, formattedEta: "ETA currently unavailable" };
      const { sent } = await processStudentPickupNotifications({
        eta: partial,
        busNumber: telemetry.busNumber ?? eta.busNumber,
      });
      processed += sent;
      continue;
    }

    const { sent } = await processStudentPickupNotifications({
      eta,
      busNumber: telemetry.busNumber ?? eta.busNumber,
    });
    processed += sent;
  }

  return { processed, tripId: trip?.id };
}
