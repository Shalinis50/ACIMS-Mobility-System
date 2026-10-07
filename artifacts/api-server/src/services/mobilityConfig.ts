export type DelayThresholds = {
  onTimeMax: number;
  minorMax: number;
  moderateMax: number;
};

export function getDelayThresholds(): DelayThresholds {
  return {
    onTimeMax: Number(process.env.ACIMS_DELAY_ON_TIME_MAX ?? 2),
    minorMax: Number(process.env.ACIMS_DELAY_MINOR_MAX ?? 5),
    moderateMax: Number(process.env.ACIMS_DELAY_MODERATE_MAX ?? 10),
  };
}

/** Minimum delay change (minutes) before sending an updated delay notification. */
export function getDelayNotifyDeltaMinutes(): number {
  return Number(process.env.ACIMS_DELAY_NOTIFY_DELTA_MIN ?? 5);
}

export const ETA_NOTIFY_WINDOWS = {
  tenMinutes: { min: 8, max: 10 },
  fiveMinutes: { min: 4, max: 5 },
} as const;
