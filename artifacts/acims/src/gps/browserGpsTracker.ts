/**
 * Adapted from TrackItRide src/gps/browserGpsTracker.ts for ACMIS Mobility System
 * Uses navigator.geolocation.watchPosition() with high accuracy to capture real hardware GPS.
 */

import {
  type BrowserGpsFix,
  type GpsHardwareStatus,
  type GpsTrackerError,
  validateBrowserGpsFix,
} from "./gpsTypes";

export interface BrowserGpsTrackerOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  onFix: (fix: BrowserGpsFix) => void;
  onStatusChange?: (status: GpsHardwareStatus) => void;
  onError?: (error: GpsTrackerError) => void;
}

function calculateBearingDegrees(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number | null {
  const dLat = Math.abs(to.latitude - from.latitude);
  const dLng = Math.abs(to.longitude - from.longitude);
  // Ignore microscopic jitter (< ~2 meters)
  if (dLat < 0.00002 && dLng < 0.00002) {
    return null;
  }
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

export class BrowserGpsTracker {
  private watchId: number | null = null;
  private isPaused = false;
  private lastFix: BrowserGpsFix | null = null;
  private readonly options: Required<
    Pick<BrowserGpsTrackerOptions, "enableHighAccuracy" | "timeout" | "maximumAge">
  > &
    BrowserGpsTrackerOptions;

  constructor(options: BrowserGpsTrackerOptions) {
    this.options = {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 15000,
      maximumAge: options.maximumAge ?? 2000,
      ...options,
    };
  }

  public start(): boolean {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      this.options.onStatusChange?.("GPS DISCONNECTED");
      this.options.onError?.({
        code: "UNSUPPORTED",
        message: "Browser does not support hardware GPS geolocation.",
        timestamp: new Date().toISOString(),
      });
      return false;
    }

    this.stop();
    this.isPaused = false;
    this.options.onStatusChange?.("GPS WAITING");

    const geoOptions: PositionOptions = {
      enableHighAccuracy: this.options.enableHighAccuracy,
      timeout: this.options.timeout,
      maximumAge: this.options.maximumAge,
    };

    // Request an immediate initial satellite fix alongside continuous watchPosition
    navigator.geolocation.getCurrentPosition(
      (pos) => this.handlePosition(pos),
      (err) => this.handleError(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => this.handleError(err),
      geoOptions
    );

    return true;
  }

  public pause(): void {
    this.isPaused = true;
    this.options.onStatusChange?.("GPS WAITING");
  }

  public resume(): void {
    this.isPaused = false;
    if (this.watchId === null) {
      this.start();
      return;
    }
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => this.handlePosition(pos),
        () => {},
        {
          enableHighAccuracy: this.options.enableHighAccuracy,
          timeout: this.options.timeout,
          maximumAge: this.options.maximumAge,
        }
      );
    }
  }

  public stop(): void {
    if (this.watchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isPaused = false;
    this.options.onStatusChange?.("GPS DISCONNECTED");
  }

  public isRunning(): boolean {
    return this.watchId !== null && !this.isPaused;
  }

  private handlePosition(pos: GeolocationPosition): void {
    if (this.isPaused) return;

    const { coords, timestamp } = pos;
    const rawSpeedMs = coords.speed;
    const speedKph =
      rawSpeedMs !== null && !Number.isNaN(rawSpeedMs) && rawSpeedMs >= 0
        ? Math.round(rawSpeedMs * 3.6 * 10) / 10
        : null;

    let heading: number | null =
      coords.heading !== null && !Number.isNaN(coords.heading) && coords.heading >= 0
        ? Math.round(coords.heading)
        : null;

    if (heading === null && this.lastFix) {
      heading = calculateBearingDegrees(this.lastFix, {
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    }

    const fixTimestamp = timestamp || Date.now();
    const fix: BrowserGpsFix = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy:
        coords.accuracy !== null && !Number.isNaN(coords.accuracy)
          ? Math.round(coords.accuracy)
          : null,
      altitude:
        coords.altitude !== null && !Number.isNaN(coords.altitude)
          ? Math.round(coords.altitude)
          : null,
      altitudeAccuracy:
        coords.altitudeAccuracy !== null && !Number.isNaN(coords.altitudeAccuracy)
          ? Math.round(coords.altitudeAccuracy)
          : null,
      speed: speedKph,
      speedKph,
      bearing: heading,
      heading,
      timestamp: fixTimestamp,
      recordedAt: new Date(fixTimestamp).toISOString(),
    };

    const check = validateBrowserGpsFix(fix);
    if (!check.valid) {
      this.options.onError?.({
        code: "INVALID_FIX",
        message: check.reason || "Invalid GPS coordinate reading",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.lastFix = fix;
    this.options.onStatusChange?.(
      check.isPoorAccuracy ? "GPS POOR ACCURACY" : "GPS CONNECTED"
    );
    this.options.onFix(fix);
  }

  private handleError(err: GeolocationPositionError): void {
    const nowIso = new Date().toISOString();
    if (err.code === err.PERMISSION_DENIED) {
      this.stop();
      this.options.onStatusChange?.("GPS DENIED");
      this.options.onError?.({
        code: "PERMISSION_DENIED",
        message:
          "Location permission denied. Allow GPS access in your browser and device settings.",
        timestamp: nowIso,
      });
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      this.options.onStatusChange?.("GPS DISCONNECTED");
      this.options.onError?.({
        code: "POSITION_UNAVAILABLE",
        message:
          "Device GPS signal unavailable. Ensure Location Services are enabled on your phone.",
        timestamp: nowIso,
      });
    } else if (err.code === err.TIMEOUT) {
      this.options.onStatusChange?.(
        this.lastFix ? "GPS POOR ACCURACY" : "GPS WAITING"
      );
      this.options.onError?.({
        code: "TIMEOUT",
        message: "GPS fix timed out (15s). Still listening for satellite lock...",
        timestamp: nowIso,
      });
    }
  }
}

export function createBrowserGpsTracker(
  options: BrowserGpsTrackerOptions
): BrowserGpsTracker {
  return new BrowserGpsTracker(options);
}
