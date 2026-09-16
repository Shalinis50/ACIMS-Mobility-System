import type { Coordinate } from "./busTracking";

const AVERAGE_SPEED_KMH = 24;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceInKilometers(from: Coordinate, to: Coordinate) {
  const earthRadius = 6371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const latitudeA = toRadians(from.latitude);
  const latitudeB = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.sin(longitudeDelta / 2) ** 2 * Math.cos(latitudeA) * Math.cos(latitudeB);

  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function calculateEtaMinutes(
  from: Coordinate,
  to: Coordinate,
  averageSpeedKmh = AVERAGE_SPEED_KMH,
) {
  const distance = distanceInKilometers(from, to);
  return Math.max(1, Math.ceil((distance / averageSpeedKmh) * 60));
}