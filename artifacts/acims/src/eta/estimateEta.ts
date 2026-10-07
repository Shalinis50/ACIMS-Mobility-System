/**
 * Adapted from TrackItRide src/eta/estimateEta.ts for ACMIS Mobility System
 * Straight-line Haversine distance & dynamic speed fallback ETA calculator.
 * Note: This computes straight-line/Haversine distance ETA from verified live GPS
 * coordinates and does not run on fake/unverified coordinates.
 */

import type { LocationFreshness } from "../gps/gpsTypes";
import type { RouteStopModel } from "../routes/routeTypes";

export interface EtaEstimateResult {
  stopId: string;
  stopName: string;
  distanceKm: number;
  distanceMeters: number;
  etaMinutes: number | null;
  formattedEta: string;
  isAtStop: boolean;
  isApproachingStop: boolean;
  method: "haversine-fallback";
}

export function haversineDistanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      sinLon * sinLon;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function estimateEta(params: {
  busLocation: {
    latitude: number;
    longitude: number;
    speedKph?: number | null;
  } | null;
  targetStop: RouteStopModel;
  freshness: LocationFreshness;
  fallbackSpeedKph?: number;
}): EtaEstimateResult {
  const { busLocation, targetStop, freshness, fallbackSpeedKph = 22 } = params;

  if (!busLocation || freshness === "UNAVAILABLE") {
    return {
      stopId: targetStop.id,
      stopName: targetStop.name,
      distanceKm: 0,
      distanceMeters: 0,
      etaMinutes: null,
      formattedEta: "Waiting for live GPS",
      isAtStop: false,
      isApproachingStop: false,
      method: "haversine-fallback",
    };
  }

  const distanceKm = haversineDistanceKm(busLocation, targetStop);
  const distanceMeters = Math.round(distanceKm * 1000);
  const isAtStop = distanceMeters <= 80;
  const isApproachingStop = !isAtStop && distanceMeters <= 250;

  const effectiveSpeedKph =
    typeof busLocation.speedKph === "number" && busLocation.speedKph > 5
      ? busLocation.speedKph
      : fallbackSpeedKph;

  let etaMinutes = Math.round((distanceKm / effectiveSpeedKph) * 60);
  if (isAtStop) {
    etaMinutes = 0;
  } else if (isApproachingStop) {
    etaMinutes = 1;
  } else {
    etaMinutes = Math.max(1, etaMinutes);
  }

  const formattedEta = isAtStop
    ? "Arriving now"
    : etaMinutes === 1
    ? "1 min"
    : `${etaMinutes} min`;

  return {
    stopId: targetStop.id,
    stopName: targetStop.name,
    distanceKm: Number(distanceKm.toFixed(2)),
    distanceMeters,
    etaMinutes,
    formattedEta,
    isAtStop,
    isApproachingStop,
    method: "haversine-fallback",
  };
}
