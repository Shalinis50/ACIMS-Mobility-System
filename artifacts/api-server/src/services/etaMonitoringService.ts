import { getCommandCenterSnapshot } from "./commandCenterService.ts";
import { getMvpCollegeRoute, isMvpCollegeRouteActive } from "./mvpCollegeRouteService.ts";
import { getStudentUserIdsForBus } from "../../../../src/db/services.ts";
import { computeStudentPickupEta } from "./etaService.ts";
import { getBusShiftTimingContext } from "./shiftTiming.ts";
import { assessPickupDelay } from "./delayPredictionService.ts";

export async function getAdminEtaMonitoring() {
  const snapshot = await getCommandCenterSnapshot();
  const rows: Array<Record<string, unknown>> = [];

  const mvp = getMvpCollegeRoute();
  const fleetRows = isMvpCollegeRouteActive()
    ? snapshot.fleet.filter((f) => f.busId === mvp.busId)
    : snapshot.fleet;

  for (const fleet of fleetRows) {
    const studentIds = await getStudentUserIdsForBus(fleet.busId);
    if (!studentIds.length) {
      rows.push({
        busId: fleet.busId,
        busNumber: fleet.busNumber,
        routeId: fleet.routeId,
        tripId: fleet.tripId,
        studentId: null,
        pickupPointName: null,
        scheduledArrival: null,
        predictedArrival: null,
        etaMinutes: fleet.etaMinutes,
        delayMinutes: fleet.delayMinutes,
        delayStatus: fleet.delayStatus,
        gpsStatus: fleet.isGpsIssue ? "STALE" : "LIVE",
        lastGpsUpdate: fleet.lastGpsAt,
        secondsSinceGps: fleet.secondsSinceGps,
        latitude: fleet.latitude,
        longitude: fleet.longitude,
      });
      continue;
    }

    for (const studentId of studentIds) {
      const eta = await computeStudentPickupEta(studentId);
      if (!eta) continue;
      rows.push({
        busId: eta.busId,
        busNumber: eta.busNumber,
        routeId: fleet.routeId,
        tripId: eta.tripId,
        studentId,
        pickupPointId: eta.pickup.id,
        pickupPointName: eta.pickup.name,
        scheduledArrival: eta.scheduledArrivalAt,
        predictedArrival: eta.predictedArrivalAt,
        etaMinutes: eta.etaMinutes,
        delayMinutes: eta.delay?.delayMinutes ?? 0,
        delayStatus: eta.delay?.status ?? "ON_TIME",
        gpsStatus: eta.gps.status,
        lastGpsUpdate: eta.gps.lastUpdateAt,
        secondsSinceGps: eta.gps.secondsSinceUpdate,
        latitude: eta.gps.latitude,
        longitude: eta.gps.longitude,
        stopPassed: eta.stopPassed,
      });
    }
  }

  return { generatedAt: new Date().toISOString(), rows };
}

export async function getAdminDelayMonitoring() {
  const snapshot = await getCommandCenterSnapshot();
  const now = new Date();

  const mvp = getMvpCollegeRoute();
  const fleetRows = isMvpCollegeRouteActive()
    ? snapshot.fleet.filter((f) => f.busId === mvp.busId)
    : snapshot.fleet;

  const rows = await Promise.all(
    fleetRows.map(async (fleet) => {
      const shiftCtx = await getBusShiftTimingContext(fleet.busId);
      let delayMinutes = fleet.delayMinutes ?? 0;
      let delayStatus = fleet.delayStatus ?? "ON_TIME";
      let prediction = null;

      if (shiftCtx && fleet.etaMinutes != null) {
        const assessed = await assessPickupDelay({
          busId: fleet.busId,
          pickupExpectedOffsetMinutes: shiftCtx.pickupExpectedOffsetMinutes,
          etaMinutes: fleet.etaMinutes,
          speedMps: fleet.speed,
          secondsSinceGps: fleet.secondsSinceGps,
          gpsStale: fleet.isGpsIssue,
        });
        delayMinutes = assessed.delayMinutes;
        delayStatus = assessed.status;
        prediction = assessed.prediction;
      }

      return {
        busId: fleet.busId,
        busNumber: fleet.busNumber,
        routeId: fleet.routeId,
        tripId: fleet.tripId,
        scheduledEtaMinutes: shiftCtx?.pickupExpectedOffsetMinutes ?? null,
        predictedEtaMinutes: fleet.etaMinutes,
        delayMinutes,
        delayStatus,
        gpsStatus: fleet.isGpsIssue ? "STALE" : "LIVE",
        lastGpsUpdate: fleet.lastGpsAt,
        prediction,
        shiftStart: shiftCtx?.shiftStartTime ?? null,
        evaluatedAt: now.toISOString(),
      };
    }),
  );

  return { generatedAt: now.toISOString(), rows };
}
