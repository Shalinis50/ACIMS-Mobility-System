import { getDbBuses, getLatestBusLocation, isBusTrackingActive } from "../../../../src/db/services.ts";
import { getActiveTripForBus } from "../../../../src/db/mobilityOps.ts";
import { calculatePickupEta } from "./pickupEtaEngine.ts";
import { assessTripDelay, summarizeFleetDelays } from "./delayEngine.ts";
import { evaluateFreshness } from "./gpsEngine.ts";
import { getBusShiftTimingContext } from "./shiftTiming.ts";

export async function getCommandCenterSnapshot() {
  const buses = await getDbBuses();
  const fleet = [];
  const delayItems: Array<{ busId: string; delayMinutes: number; status: any }> = [];

  let gpsIssues = 0;
  let onTime = 0;
  let delayed = 0;
  const activeDriverIds = new Set<string>();

  for (const bus of buses.filter((b) => b.active)) {
    const loc = await getLatestBusLocation(bus.id);
    const tracking = await isBusTrackingActive(bus.id);
    const trip = await getActiveTripForBus(bus.id);
    if (trip?.status === "ACTIVE" && trip.driverId) {
      activeDriverIds.add(trip.driverId);
    } else if (tracking.isActive && bus.driverId) {
      activeDriverIds.add(bus.driverId);
    }

    const freshness = loc
      ? evaluateFreshness(loc.recordedAt, new Date())
      : { freshness: "UNAVAILABLE" as const, secondsSinceUpdate: 9999 };

    const isGpsIssue = !tracking.isActive || freshness.freshness === "STALE" || freshness.freshness === "UNAVAILABLE";
    if (isGpsIssue) gpsIssues += 1;

    let delayStatus = "ON_TIME";
    let delayMinutes = 0;
    let etaMinutes: number | null = null;

    if (loc) {
      const eta = calculatePickupEta(bus.id, { latitude: loc.latitude, longitude: loc.longitude }, "tambaram");
      if (eta) {
        etaMinutes = eta.etaMinutes;
        const shiftCtx = await getBusShiftTimingContext(bus.id);
        const delay = shiftCtx
          ? assessTripDelay({
              busId: bus.id,
              shiftStartTime: shiftCtx.shiftStartTime,
              pickupExpectedOffsetMinutes: shiftCtx.pickupExpectedOffsetMinutes,
              currentEtaToPickupMinutes: eta.etaMinutes,
            })
          : { delayMinutes: 0, status: "ON_TIME" as const };
        delayMinutes = delay.delayMinutes;
        delayStatus = delay.status;
        delayItems.push({ busId: bus.id, delayMinutes, status: delay.status });
        if (delay.delayMinutes > 2) delayed += 1;
        else onTime += 1;
      }
    }

    fleet.push({
      busId: bus.id,
      busNumber: bus.busNumber,
      routeId: bus.routeId,
      driverId: bus.driverId,
      tripId: trip?.id ?? null,
      tripStatus: trip?.status ?? "IDLE",
      trackingStatus: tracking.status,
      gpsFreshness: freshness.freshness,
      secondsSinceGps: freshness.secondsSinceUpdate,
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      speed: loc?.speed ?? null,
      heading: loc?.heading ?? null,
      accuracy: loc?.accuracy ?? null,
      lastGpsAt: loc?.recordedAt?.toISOString?.() ?? loc?.recordedAt ?? null,
      etaMinutes,
      delayMinutes,
      delayStatus,
      isGpsIssue,
    });
  }

  const summary = summarizeFleetDelays(delayItems);

  return {
    generatedAt: new Date().toISOString(),
    counters: {
      activeBuses: fleet.length,
      activeDrivers: activeDriverIds.size,
      activeTrips: fleet.filter((f) => f.tripStatus === "ACTIVE").length,
      onTime: summary.onTime,
      delayed: summary.delayedBuses,
      gpsIssues,
      minorDelays: summary.minor,
      moderateDelays: summary.moderate,
      majorDelays: summary.major,
    },
    fleet,
  };
}
