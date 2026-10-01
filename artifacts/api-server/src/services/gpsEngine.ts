export type GpsQuality = "HIGH" | "ACCEPTABLE" | "POOR" | "INVALID";

export type GpsFreshness = "LIVE" | "RECENT" | "STALE" | "UNAVAILABLE" | "OFFLINE";

export type EtaConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";

export type EtaLabel = "LIVE ETA" | "ESTIMATED ETA" | "SCHEDULED" | "UNAVAILABLE";

export interface GpsValidationResult {
  isValid: boolean;
  quality: GpsQuality;
  rejectionReason?: string;
  isAnomaly: boolean;
  networkDelayMs: number;
}

export interface RouteStopInfo {
  id: string;
  name: string;
  sequence: number;
  latitude: number;
  longitude: number;
  minutesFromPrevious?: number;
}

export interface RouteInfo {
  id: string;
  name: string;
  origin: string;
  destination: string;
  stops: RouteStopInfo[];
}

export interface ComputedTelemetry {
  busId: string;
  busNumber: string;
  driverId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  
  // Next Stop Engine
  nextStop: string;
  nextStopId: string;
  previousStop?: string;
  previousStopId?: string;
  isAtStop: boolean;
  isApproachingStop: boolean;
  stopSequenceIndex: number;
  
  // ETA Engine
  etaMinutes: number;
  formattedEta: string;
  etaLabel: EtaLabel;
  etaConfidence: EtaConfidence;
  remainingDistanceKm: number;
  
  // Status & Freshness Engine
  status: string;
  freshness: GpsFreshness;
  isLive: boolean;
  trackingStatus: "ACTIVE" | "PAUSED" | "ENDED" | "IDLE";
  
  // Time and Delay Metadata
  recordedAt: string;
  receivedAt: string;
  networkDelayMs: number;
  secondsAgo: number;
  quality: GpsQuality;
  source: "real-device-gps" | "unverified";
}

/**
 * Great-circle distance between two geographic coordinates using the Haversine formula
 * Returns distance in kilometers
 */
export function haversineDistanceKm(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.latitude * Math.PI) / 180) *
      Math.cos((coord2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validates GPS coordinate quality and detects impossible values / jumps
 */
export function validateGpsCoordinate(
  point: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    speed?: number | null;
    recordedAt: Date | string;
  },
  lastValidPoint?: {
    latitude: number;
    longitude: number;
    recordedAt: Date | string;
  } | null,
  receivedAt: Date = new Date()
): GpsValidationResult {
  const recordedDate = new Date(point.recordedAt);
  const networkDelayMs = Math.max(0, receivedAt.getTime() - recordedDate.getTime());

  // 1. Boundary checks: Latitude [-90, 90], Longitude [-180, 180]
  if (
    typeof point.latitude !== "number" ||
    typeof point.longitude !== "number" ||
    isNaN(point.latitude) ||
    isNaN(point.longitude) ||
    point.latitude < -90 ||
    point.latitude > 90 ||
    point.longitude < -180 ||
    point.longitude > 180
  ) {
    return {
      isValid: false,
      quality: "INVALID",
      rejectionReason: "Coordinates outside valid terrestrial latitude/longitude range",
      isAnomaly: true,
      networkDelayMs,
    };
  }

  // 2. Reject Null Island (0,0) as GPS sensor failure
  if (Math.abs(point.latitude) < 0.0001 && Math.abs(point.longitude) < 0.0001) {
    return {
      isValid: false,
      quality: "INVALID",
      rejectionReason: "Coordinate at (0,0) indicates uncalibrated GPS hardware",
      isAnomaly: true,
      networkDelayMs,
    };
  }

  // 3. Accuracy quality grading
  const accuracy = typeof point.accuracy === "number" && !isNaN(point.accuracy) ? point.accuracy : 15;
  let quality: GpsQuality = "ACCEPTABLE";
  if (accuracy <= 15) {
    quality = "HIGH";
  } else if (accuracy <= 40) {
    quality = "ACCEPTABLE";
  } else if (accuracy <= 100) {
    quality = "POOR";
  } else {
    quality = "INVALID";
    return {
      isValid: false,
      quality: "INVALID",
      rejectionReason: `GPS accuracy too low (±${Math.round(accuracy)}m exceeds 100m maximum tolerance)`,
      isAnomaly: false,
      networkDelayMs,
    };
  }

  // 4. Kinematic jump / anomaly check against previous point
  let isAnomaly = false;
  if (lastValidPoint) {
    const prevDate = new Date(lastValidPoint.recordedAt);
    const timeDeltaSec = (recordedDate.getTime() - prevDate.getTime()) / 1000;
    
    if (timeDeltaSec > 0 && timeDeltaSec < 10) {
      const distanceKm = haversineDistanceKm(
        { latitude: lastValidPoint.latitude, longitude: lastValidPoint.longitude },
        { latitude: point.latitude, longitude: point.longitude }
      );
      const calculatedSpeedKmh = (distanceKm / timeDeltaSec) * 3600;

      // College bus maximum plausible ground speed = 120 km/h
      if (calculatedSpeedKmh > 120 && distanceKm > 0.2) {
        return {
          isValid: false,
          quality: "INVALID",
          rejectionReason: `Impossible coordinate displacement: ${Math.round(distanceKm * 1000)}m in ${Math.round(timeDeltaSec)}s (${Math.round(calculatedSpeedKmh)} km/h)`,
          isAnomaly: true,
          networkDelayMs,
        };
      }
    }
  }

  return {
    isValid: true,
    quality,
    isAnomaly,
    networkDelayMs,
  };
}

/**
 * Computes centralized location freshness based on recorded_at timestamp and session status
 */
export function evaluateFreshness(
  recordedAt: Date | string | null,
  trackingStatus: "ACTIVE" | "PAUSED" | "ENDED" | "IDLE" = "IDLE",
  currentTime: Date = new Date()
): { freshness: GpsFreshness; secondsAgo: number } {
  if (!recordedAt) {
    return { freshness: "UNAVAILABLE", secondsAgo: Infinity };
  }

  const recordedDate = new Date(recordedAt);
  const diffSec = Math.max(0, Math.floor((currentTime.getTime() - recordedDate.getTime()) / 1000));

  if (trackingStatus === "ENDED" || trackingStatus === "IDLE") {
    return { freshness: "UNAVAILABLE", secondsAgo: diffSec };
  }

  if (trackingStatus === "PAUSED") {
    return { freshness: "STALE", secondsAgo: diffSec };
  }

  // ACTIVE tracking session thresholds
  if (diffSec <= 30) {
    return { freshness: "LIVE", secondsAgo: diffSec };
  } else if (diffSec <= 90) {
    return { freshness: "RECENT", secondsAgo: diffSec };
  } else {
    return { freshness: "STALE", secondsAgo: diffSec };
  }
}

/**
 * Next Stop & Dynamic ETA Calculation Engine
 */
export function calculateNextStopAndEta(
  currentCoord: { latitude: number; longitude: number; speed?: number | null },
  stops: RouteStopInfo[],
  freshness: GpsFreshness
): {
  nextStop: string;
  nextStopId: string;
  previousStop?: string;
  previousStopId?: string;
  isAtStop: boolean;
  isApproachingStop: boolean;
  stopSequenceIndex: number;
  remainingDistanceKm: number;
  etaMinutes: number;
  formattedEta: string;
  etaLabel: EtaLabel;
  etaConfidence: EtaConfidence;
  statusText: string;
} {
  if (!stops || stops.length === 0) {
    return {
      nextStop: "Depot",
      nextStopId: "depot",
      isAtStop: false,
      isApproachingStop: false,
      stopSequenceIndex: 0,
      remainingDistanceKm: 0,
      etaMinutes: 0,
      formattedEta: "Unavailable",
      etaLabel: "UNAVAILABLE",
      etaConfidence: "UNAVAILABLE",
      statusText: "Route stops unavailable",
    };
  }

  // Find nearest stop along route
  let closestStopIndex = 0;
  let minStopDistanceKm = Infinity;

  stops.forEach((stop, idx) => {
    const distKm = haversineDistanceKm(currentCoord, {
      latitude: stop.latitude,
      longitude: stop.longitude,
    });
    if (distKm < minStopDistanceKm) {
      minStopDistanceKm = distKm;
      closestStopIndex = idx;
    }
  });

  // Stopping detection thresholds
  const isAtStop = minStopDistanceKm <= 0.08; // <= 80 meters
  const isApproachingStop = minStopDistanceKm <= 0.25 && !isAtStop; // <= 250 meters

  // If bus is at the stop, next stop along route advances to subsequent stop
  let targetStopIndex = closestStopIndex;
  if (isAtStop && closestStopIndex < stops.length - 1) {
    targetStopIndex = closestStopIndex + 1;
  }

  const targetStop = stops[targetStopIndex] || stops[stops.length - 1];
  const previousStopObj = targetStopIndex > 0 ? stops[targetStopIndex - 1] : undefined;

  // Calculate distance from current bus position to the target stop
  const directDistanceToStopKm = haversineDistanceKm(currentCoord, {
    latitude: targetStop.latitude,
    longitude: targetStop.longitude,
  });

  // Real ETA calculation using actual device ground speed or realistic campus transit speed
  const effectiveSpeedKmh =
    typeof currentCoord.speed === "number" && currentCoord.speed > 5
      ? currentCoord.speed
      : 22; // Average campus shuttle velocity: 22 km/h

  let etaMinutes = Math.round((directDistanceToStopKm / effectiveSpeedKmh) * 60);
  if (isAtStop) {
    etaMinutes = 0;
  } else if (isApproachingStop) {
    etaMinutes = 1;
  } else {
    etaMinutes = Math.max(1, etaMinutes);
  }

  // ETA Label & Confidence
  let etaLabel: EtaLabel = "UNAVAILABLE";
  let etaConfidence: EtaConfidence = "UNAVAILABLE";

  if (freshness === "LIVE") {
    etaLabel = "LIVE ETA";
    etaConfidence = directDistanceToStopKm < 5 ? "HIGH" : "MEDIUM";
  } else if (freshness === "RECENT") {
    etaLabel = "ESTIMATED ETA";
    etaConfidence = "MEDIUM";
  } else if (freshness === "STALE") {
    etaLabel = "SCHEDULED";
    etaConfidence = "LOW";
  } else {
    etaLabel = "UNAVAILABLE";
    etaConfidence = "UNAVAILABLE";
  }

  const formattedEta = isAtStop
    ? "Arriving now"
    : etaMinutes === 1
    ? "1 min"
    : `${etaMinutes} min`;

  // Status message
  let statusText = "";
  if (isAtStop) {
    statusText = `At Stop: ${targetStop.name}`;
  } else if (isApproachingStop) {
    statusText = `Approaching: ${targetStop.name}`;
  } else if (freshness === "LIVE") {
    statusText = `In Transit to ${targetStop.name}`;
  } else if (freshness === "RECENT") {
    statusText = `In Transit to ${targetStop.name} (Recent GPS)`;
  } else if (freshness === "STALE") {
    statusText = `Signal Delayed · Last near ${targetStop.name}`;
  } else {
    statusText = `Tracking Inactive`;
  }

  return {
    nextStop: targetStop.name,
    nextStopId: targetStop.id,
    previousStop: previousStopObj?.name,
    previousStopId: previousStopObj?.id,
    isAtStop,
    isApproachingStop,
    stopSequenceIndex: targetStopIndex,
    remainingDistanceKm: Number(directDistanceToStopKm.toFixed(2)),
    etaMinutes,
    formattedEta,
    etaLabel,
    etaConfidence,
    statusText,
  };
}
