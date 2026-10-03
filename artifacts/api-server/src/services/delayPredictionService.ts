import { assessTripDelay, predictTripDelay, type DelayAssessment } from "./delayEngine.ts";
import { getBusShiftTimingContext } from "./shiftTiming.ts";
import { getDelayThresholds } from "./mobilityConfig.ts";

export type PickupDelayResult = {
  delayMinutes: number;
  status: DelayAssessment["status"];
  scheduledArrivalAt: Date | null;
  predictedArrivalAt: Date | null;
  prediction: ReturnType<typeof predictTripDelay>;
};

export function classifyDelayMinutes(delayMinutes: number): DelayAssessment["status"] {
  const t = getDelayThresholds();
  if (delayMinutes <= t.onTimeMax) return "ON_TIME";
  if (delayMinutes <= t.minorMax) return "MINOR_DELAY";
  if (delayMinutes <= t.moderateMax) return "MODERATE_DELAY";
  return "MAJOR_DELAY";
}

export async function assessPickupDelay(params: {
  busId: string;
  pickupExpectedOffsetMinutes: number;
  etaMinutes: number;
  speedMps?: number | null;
  secondsSinceGps?: number;
  gpsStale?: boolean;
}): Promise<PickupDelayResult> {
  const shiftCtx = await getBusShiftTimingContext(params.busId);
  const now = new Date();

  let assessment: DelayAssessment;
  let scheduledArrivalAt: Date | null = null;

  if (shiftCtx) {
    assessment = assessTripDelay({
      busId: params.busId,
      shiftStartTime: shiftCtx.shiftStartTime,
      pickupExpectedOffsetMinutes: params.pickupExpectedOffsetMinutes,
      currentEtaToPickupMinutes: params.etaMinutes,
      now,
    });
    const [h, m] = shiftCtx.shiftStartTime.split(":").map(Number);
    scheduledArrivalAt = new Date(now);
    scheduledArrivalAt.setHours(h || 0, m || 0, 0, 0);
    scheduledArrivalAt = new Date(
      scheduledArrivalAt.getTime() + params.pickupExpectedOffsetMinutes * 60000,
    );
  } else {
    assessment = {
      delayMinutes: 0,
      status: "ON_TIME",
      expectedArrivalMinutesFromShiftStart: 0,
      predictedArrivalMinutesFromShiftStart: 0,
    };
  }

  assessment = {
    ...assessment,
    status: classifyDelayMinutes(assessment.delayMinutes),
  };

  const prediction = predictTripDelay({
    assessment,
    gpsStale: params.gpsStale ?? false,
    speedMps: params.speedMps ?? null,
    secondsSinceGps: params.secondsSinceGps ?? 0,
  });

  const predictedArrivalAt = new Date(now.getTime() + params.etaMinutes * 60000);

  return {
    delayMinutes: assessment.delayMinutes,
    status: assessment.status,
    scheduledArrivalAt,
    predictedArrivalAt,
    prediction,
  };
}
