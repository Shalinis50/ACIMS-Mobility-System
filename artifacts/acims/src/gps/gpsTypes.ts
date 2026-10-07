/**
 * Adapted from TrackItRide src/gps/gpsTypes.ts for ACMIS Mobility System
 */

export type GpsHardwareStatus =
  | "GPS CONNECTED"
  | "GPS WAITING"
  | "GPS POOR ACCURACY"
  | "GPS DENIED"
  | "GPS DISCONNECTED";

export type LocationFreshness = "LIVE" | "RECENT" | "STALE" | "UNAVAILABLE";

export interface BrowserGpsFix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  speed: number | null;
  speedKph: number | null;
  bearing: number | null;
  heading: number | null;
  timestamp: number;
  recordedAt: string;
}

/**
 * Standardized ACMIS real-device GPS payload for Socket.IO (`driverLocationUpdate`)
 * and HTTP (`POST /api/bus/location`).
 * Matches both Android FusedLocationProviderClient payload and ACMIS backend schema.
 */
export interface AcimsGpsPayload {
  // Exact real-time payload fields (Android FusedLocationProviderClient & Socket.IO)
  driverId: string;
  busId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  bearing: number | null;
  timestamp: number;

  // Snake_case & ACMIS fields for full backend compatibility
  bus_id: string;
  trip_id: string | null;
  driver_id?: string;
  heading: number | null;
  recorded_at: string;
  tripId?: string | null;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
}

export interface GpsTrackerError {
  code: "PERMISSION_DENIED" | "POSITION_UNAVAILABLE" | "TIMEOUT" | "UNSUPPORTED" | "INVALID_FIX";
  message: string;
  timestamp: string;
}

export interface GpsValidationCheck {
  valid: boolean;
  reason?: string;
  isPoorAccuracy: boolean;
}

export const GPS_FRESHNESS_THRESHOLDS = {
  LIVE_MAX_SECONDS: 30,
  RECENT_MAX_SECONDS: 90,
} as const;

export function validateBrowserGpsFix(fix: BrowserGpsFix): GpsValidationCheck {
  if (
    typeof fix.latitude !== "number" ||
    typeof fix.longitude !== "number" ||
    Number.isNaN(fix.latitude) ||
    Number.isNaN(fix.longitude)
  ) {
    return { valid: false, reason: "Invalid numeric coordinates", isPoorAccuracy: false };
  }

  if (fix.latitude < -90 || fix.latitude > 90 || fix.longitude < -180 || fix.longitude > 180) {
    return { valid: false, reason: "Coordinates out of terrestrial bounds", isPoorAccuracy: false };
  }

  if (Math.abs(fix.latitude) < 0.0001 && Math.abs(fix.longitude) < 0.0001) {
    return { valid: false, reason: "Null Island (0,0) uncalibrated fix rejected", isPoorAccuracy: false };
  }

  const isPoorAccuracy = typeof fix.accuracy === "number" && fix.accuracy > 40;
  return { valid: true, isPoorAccuracy };
}
