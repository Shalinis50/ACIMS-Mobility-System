/**
 * Adapted from TrackItRide src/maps/busMarker.ts for ACMIS Google Maps
 * Manages a single persistent bus marker state with smooth coordinate interpolation,
 * heading rotation, bus identity preservation, and live/recent/stale visual state.
 */

import { useEffect, useRef, useState } from "react";
import {
  GPS_FRESHNESS_THRESHOLDS,
  type LocationFreshness,
} from "../gps/gpsTypes";

export interface BusMarkerState {
  busId: string;
  busNumber: string;
  tripId?: string | null;
  latitude: number;
  longitude: number;
  heading: number | null;
  speedKph: number | null;
  accuracy: number | null;
  recordedAt: string;
  freshness: LocationFreshness;
  secondsAgo: number;
}

export function getMarkerFreshness(
  recordedAtIso?: string | null,
  trackingStatus: string = "ACTIVE"
): { freshness: LocationFreshness; secondsAgo: number } {
  if (!recordedAtIso || trackingStatus === "ENDED" || trackingStatus === "IDLE") {
    return { freshness: "UNAVAILABLE", secondsAgo: Infinity };
  }
  const timestamp = new Date(recordedAtIso).getTime();
  if (Number.isNaN(timestamp) || timestamp <= 0) {
    return { freshness: "UNAVAILABLE", secondsAgo: Infinity };
  }
  const secondsAgo = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (trackingStatus === "PAUSED") {
    return { freshness: "STALE", secondsAgo };
  }
  if (secondsAgo <= GPS_FRESHNESS_THRESHOLDS.LIVE_MAX_SECONDS) {
    return { freshness: "LIVE", secondsAgo };
  }
  if (secondsAgo <= GPS_FRESHNESS_THRESHOLDS.RECENT_MAX_SECONDS) {
    return { freshness: "RECENT", secondsAgo };
  }
  return { freshness: "STALE", secondsAgo };
}

/**
 * Smoothly interpolates the existing bus marker position when a new GPS coordinate arrives
 * without recreating the marker component.
 */
export function useAnimatedBusMarker(target: {
  busId: string;
  busNumber: string;
  latitude: number | null;
  longitude: number | null;
  heading?: number | null;
  speedKph?: number | null;
  accuracy?: number | null;
  recordedAt?: string | null;
  trackingStatus?: string;
}) {
  const [animatedPosition, setAnimatedPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(() =>
    target.latitude !== null && target.longitude !== null
      ? { lat: target.latitude, lng: target.longitude }
      : null
  );

  const currentPosRef = useRef<{ lat: number; lng: number } | null>(animatedPosition);
  const animFrameRef = useRef<number | null>(null);
  const prevBusIdRef = useRef<string>(target.busId);

  useEffect(() => {
    if (target.latitude === null || target.longitude === null) {
      setAnimatedPosition(null);
      currentPosRef.current = null;
      return;
    }

    const nextLat = target.latitude;
    const nextLng = target.longitude;

    // If switching buses or initializing first point, snap immediately
    if (prevBusIdRef.current !== target.busId || !currentPosRef.current) {
      prevBusIdRef.current = target.busId;
      const initial = { lat: nextLat, lng: nextLng };
      currentPosRef.current = initial;
      setAnimatedPosition(initial);
      return;
    }

    const startLat = currentPosRef.current.lat;
    const startLng = currentPosRef.current.lng;

    // Skip animation if coordinates haven't meaningfully changed
    if (Math.abs(nextLat - startLat) < 1e-7 && Math.abs(nextLng - startLng) < 1e-7) {
      return;
    }

    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const durationMs = 850;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Ease-out cubic interpolation
      const ease = 1 - Math.pow(1 - t, 3);
      const lat = startLat + (nextLat - startLat) * ease;
      const lng = startLng + (nextLng - startLng) * ease;
      const interpolated = { lat, lng };
      currentPosRef.current = interpolated;
      setAnimatedPosition(interpolated);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [target.busId, target.latitude, target.longitude]);

  const { freshness, secondsAgo } = getMarkerFreshness(
    target.recordedAt,
    target.trackingStatus
  );

  return {
    position: animatedPosition,
    heading: target.heading ?? null,
    freshness,
    secondsAgo,
  };
}
