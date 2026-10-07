/**
 * Adapted from TrackItRide src/supabase/liveBusLocation.ts for ACMIS Mobility System
 * Streams real driver GPS fixes via Socket.IO (`driverLocationUpdate` -> bus-specific room `bus:<busId>`)
 * and persists via ACMIS Express + PostgreSQL (`POST /api/bus/location`).
 */

import type { AcimsGpsPayload, BrowserGpsFix } from "../gps/gpsTypes";
import {
  type EnrichedBusLocation,
  emitDriverLocationOverSocket,
  sendDriverGpsUpdate,
  subscribeToBusLocation,
} from "./realtime-location";

export interface LiveBusUploadResult {
  ok: boolean;
  httpStatus: number;
  uploadedAt: string;
  telemetry?: EnrichedBusLocation;
  error?: string;
}

/**
 * Builds the standardized real-time GPS payload:
 * {
 *   driverId, busId, latitude, longitude, accuracy, speed, bearing, timestamp
 * }
 * Emits it immediately over Socket.IO to the ACMIS Node.js server (`driverLocationUpdate`)
 * and persists it via `POST /api/bus/location`.
 */
export async function upsertLiveBusLocation(params: {
  busId: string;
  tripId?: string | null;
  driverId?: string;
  fix: BrowserGpsFix;
  token?: string | null;
}): Promise<LiveBusUploadResult> {
  const { busId, tripId = null, driverId, fix, token } = params;
  const uploadedAt = new Date().toISOString();
  const effectiveDriverId = driverId || "driver-active";
  const effectiveBearing = fix.bearing ?? fix.heading ?? null;
  const effectiveSpeed = fix.speed ?? fix.speedKph ?? null;
  const effectiveTimestamp = fix.timestamp || Date.now();

  const payload: AcimsGpsPayload = {
    driverId: effectiveDriverId,
    busId,
    latitude: fix.latitude,
    longitude: fix.longitude,
    accuracy: fix.accuracy,
    speed: effectiveSpeed,
    bearing: effectiveBearing,
    timestamp: effectiveTimestamp,
    // Snake_case & ACMIS fields for full backend compatibility
    bus_id: busId,
    trip_id: tripId,
    driver_id: effectiveDriverId,
    heading: effectiveBearing,
    recorded_at: fix.recordedAt,
    tripId,
    altitude: fix.altitude,
    altitudeAccuracy: fix.altitudeAccuracy,
  };

  // Emit immediately over Socket.IO to ACMIS server -> bus-specific room (`bus:<busId>`)
  emitDriverLocationOverSocket({
    driverId: effectiveDriverId,
    busId,
    latitude: fix.latitude,
    longitude: fix.longitude,
    accuracy: fix.accuracy,
    speed: effectiveSpeed,
    bearing: effectiveBearing,
    timestamp: effectiveTimestamp,
  });

  try {
    const res = await fetch("/api/bus/location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-acims-driver-id": effectiveDriverId,
        "x-acims-user-id": effectiveDriverId,
        "x-acims-role": "DRIVER",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        ok: true,
        httpStatus: res.status,
        uploadedAt,
        telemetry: data.telemetry,
      };
    }

    const errData = await res.json().catch(() => ({}));
    return {
      ok: false,
      httpStatus: res.status,
      uploadedAt,
      error: errData.error || `HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      ok: false,
      httpStatus: 0,
      uploadedAt,
      error: err?.message || "Network error",
    };
  }
}

export { subscribeToBusLocation, sendDriverGpsUpdate };
