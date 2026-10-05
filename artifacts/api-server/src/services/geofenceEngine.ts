import { haversineDistance } from "./eta";

export type GeofenceState = "OUTSIDE" | "APPROACHING" | "INSIDE" | "DEPARTED";

export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  return haversineDistance(a, b) * 1000;
}

export function evaluatePickupGeofence(params: {
  bus: { latitude: number; longitude: number };
  pickup: { latitude: number; longitude: number; geofenceRadiusM: number };
  previousState?: GeofenceState;
}): GeofenceState {
  const d = distanceMeters(params.bus, params.pickup);
  const r = params.pickup.geofenceRadiusM;

  if (d <= r) return "INSIDE";
  if (d <= r * 2.5) return "APPROACHING";
  if (params.previousState === "INSIDE" && d > r * 1.2) return "DEPARTED";
  return "OUTSIDE";
}

export function proximityAlertType(etaMinutes: number, geofence: GeofenceState): string | null {
  if (geofence === "INSIDE") return "ARRIVED";
  if (geofence === "DEPARTED") return "DEPARTED";
  if (etaMinutes <= 5) return "PROXIMITY_5";
  if (etaMinutes <= 10) return "PROXIMITY_10";
  return null;
}
