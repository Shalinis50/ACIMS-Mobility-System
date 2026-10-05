import { getRouteForBus } from "./routesData";

export type DelayAssessment = {
  delayMinutes: number;
  status: "ON_TIME" | "MINOR_DELAY" | "MODERATE_DELAY" | "MAJOR_DELAY";
  expectedArrivalMinutesFromShiftStart: number;
  predictedArrivalMinutesFromShiftStart: number;
};

function classifyDelay(delayMinutes: number): DelayAssessment["status"] {
  if (delayMinutes <= 2) return "ON_TIME";
  if (delayMinutes <= 5) return "MINOR_DELAY";
  if (delayMinutes <= 10) return "MODERATE_DELAY";
  return "MAJOR_DELAY";
}

/**
 * Rule-based delay: compares expected schedule offset vs predicted progress along route.
 */
export function assessTripDelay(params: {
  busId: string;
  shiftStartTime: string; // HH:MM
  pickupExpectedOffsetMinutes: number;
  currentEtaToPickupMinutes: number;
  now?: Date;
}): DelayAssessment {
  const now = params.now ?? new Date();
  const [h, m] = params.shiftStartTime.split(":").map(Number);
  const shiftStart = new Date(now);
  shiftStart.setHours(h || 0, m || 0, 0, 0);

  const minutesSinceShiftStart = Math.max(0, Math.round((now.getTime() - shiftStart.getTime()) / 60000));
  const expectedArrival = params.pickupExpectedOffsetMinutes;
  const predictedArrival = minutesSinceShiftStart + params.currentEtaToPickupMinutes;
  const delayMinutes = Math.max(0, predictedArrival - expectedArrival);

  return {
    delayMinutes,
    status: classifyDelay(delayMinutes),
    expectedArrivalMinutesFromShiftStart: expectedArrival,
    predictedArrivalMinutesFromShiftStart: predictedArrival,
  };
}

export function summarizeFleetDelays(
  items: Array<{ busId: string; delayMinutes: number; status: DelayAssessment["status"] }>,
) {
  return {
    onTime: items.filter((i) => i.status === "ON_TIME").length,
    minor: items.filter((i) => i.status === "MINOR_DELAY").length,
    moderate: items.filter((i) => i.status === "MODERATE_DELAY").length,
    major: items.filter((i) => i.status === "MAJOR_DELAY").length,
    delayedBuses: items.filter((i) => i.delayMinutes > 2).length,
  };
}

export type DelayPrediction = {
  currentStatus: DelayAssessment["status"];
  prediction: "ON_TRACK" | "LIKELY_DELAY";
  expectedDelayMinutesMin: number;
  expectedDelayMinutesMax: number;
  rationale: string;
};

/** Lightweight delay prediction for admin ETA view (not ML). */
export function predictTripDelay(params: {
  assessment: DelayAssessment;
  gpsStale: boolean;
  speedMps: number | null;
  secondsSinceGps: number;
}): DelayPrediction {
  const { assessment, gpsStale, speedMps, secondsSinceGps } = params;
  let prediction: DelayPrediction["prediction"] = "ON_TRACK";
  let min = assessment.delayMinutes;
  let max = assessment.delayMinutes + 2;
  let rationale = "Progress matches schedule within tolerance.";

  const slow = speedMps != null && speedMps < 2.5;
  if (gpsStale || secondsSinceGps > 45) {
    prediction = "LIKELY_DELAY";
    min = Math.max(min, 3);
    max = Math.max(max, min + 5);
    rationale = "GPS feed is stale; arrival confidence is reduced.";
  } else if (slow && assessment.delayMinutes >= 1) {
    prediction = "LIKELY_DELAY";
    min = Math.max(min + 2, 4);
    max = min + 4;
    rationale = "Low road speed with existing schedule slip.";
  } else if (assessment.status === "MODERATE_DELAY" || assessment.status === "MAJOR_DELAY") {
    prediction = "LIKELY_DELAY";
    min = assessment.delayMinutes;
    max = assessment.delayMinutes + 6;
    rationale = "Current delay may persist to destination.";
  }

  return {
    currentStatus: assessment.status,
    prediction,
    expectedDelayMinutesMin: min,
    expectedDelayMinutesMax: max,
    rationale,
  };
}
