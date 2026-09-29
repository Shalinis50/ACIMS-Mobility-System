import type { Coordinate, RouteStop, RouteDefinition } from "./routesData";
import { haversineDistance, calculateCumulativeDistances } from "./routesData";

const AVERAGE_SPEED_KMH = 22; // Average campus shuttle velocity

export { haversineDistance, calculateCumulativeDistances };

/**
 * Backward compatibility alias
 */
export function distanceInKilometers(from: Coordinate, to: Coordinate): number {
  return haversineDistance(from, to);
}

/**
 * Find the closest point along the route path to the given coordinate
 */
export function findNearestPathIndex(
  currentCoord: Coordinate,
  path: Coordinate[],
): { index: number; distanceKm: number } {
  let minDistance = Infinity;
  let bestIndex = 0;

  for (let i = 0; i < path.length; i++) {
    const dist = haversineDistance(currentCoord, path[i]);
    if (dist < minDistance) {
      minDistance = dist;
      bestIndex = i;
    }
  }

  return { index: bestIndex, distanceKm: minDistance };
}

/**
 * Calculate the remaining distance along the route path from current position
 * to a target stop (identified by its pathIndex).
 */
export function calculateRemainingDistance(
  currentCoord: Coordinate,
  targetPathIndex: number,
  path: Coordinate[],
  cumulativeDistances: number[],
): number {
  const { index: nearestIndex } = findNearestPathIndex(currentCoord, path);

  // If bus has already passed or is at target stop
  if (nearestIndex >= targetPathIndex) {
    // Check direct distance to stop
    const directDist = haversineDistance(currentCoord, path[targetPathIndex]);
    return directDist < 0.08 ? 0 : directDist;
  }

  // Distance from current position to next path vertex
  const nextVertexIndex = Math.min(nearestIndex + 1, targetPathIndex);
  const distanceToNextVertex = haversineDistance(currentCoord, path[nextVertexIndex]);

  // Distance along path vertices from nextVertexIndex to targetPathIndex
  const distanceAlongVertices =
    cumulativeDistances[targetPathIndex] - cumulativeDistances[nextVertexIndex];

  return Math.max(0, distanceToNextVertex + Math.max(0, distanceAlongVertices));
}

/**
 * Calculate ETA in minutes based on real geographic distance and average speed.
 * Overload 1: calculateEtaMinutes(remainingDistanceKm, averageSpeedKmh)
 * Overload 2: calculateEtaMinutes(fromCoord, toCoord, averageSpeedKmh) - backward compatible
 */
export function calculateEtaMinutes(
  arg1: number | Coordinate,
  arg2?: number | Coordinate,
  arg3 = AVERAGE_SPEED_KMH,
): number {
  if (typeof arg1 === "number") {
    const remainingDistanceKm = arg1;
    const speedKmh = typeof arg2 === "number" ? arg2 : AVERAGE_SPEED_KMH;
    if (remainingDistanceKm <= 0.05) return 0; // At stop
    const minutes = (remainingDistanceKm / speedKmh) * 60;
    return Math.max(1, Math.round(minutes));
  }

  // Backward compatible with (from: Coordinate, to: Coordinate, speedKmh?)
  const from = arg1;
  const to = arg2 as Coordinate;
  const speed = typeof arg3 === "number" ? arg3 : AVERAGE_SPEED_KMH;
  const dist = haversineDistance(from, to);
  if (dist <= 0.05) return 0;
  return Math.max(1, Math.ceil((dist / speed) * 60));
}

/**
 * Format ETA for display (e.g. "Arriving now", "approximately 1 min", "approximately 4 min")
 */
export function formatEta(etaMinutes: number): string {
  if (etaMinutes <= 0) return "Arriving now";
  if (etaMinutes === 1) return "approximately 1 min";
  return `approximately ${etaMinutes} min`;
}

export type StopContext = {
  previousStop: RouteStop;
  nextStop: RouteStop;
  currentStop: RouteStop | null;
  isAtStop: boolean;
  remainingDistanceToNextKm: number;
  remainingDistanceToDestKm: number;
  etaToNextMinutes: number;
  etaToDestMinutes: number;
  formattedEta: string;
  nearestPathIndex: number;
};

/**
 * Determine stop context along the route:
 * - previous stop
 * - next stop
 * - current stop (if at stop)
 * - isAtStop flag
 * - realistic remaining distance and ETA
 */
export function determineStopContext(
  route: RouteDefinition,
  currentCoord: Coordinate,
): StopContext {
  const { path, stops, cumulativeDistances, averageSpeedKmh } = route;
  const { index: nearestPathIndex } = findNearestPathIndex(currentCoord, path);

  const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
  const firstStop = sortedStops[0];
  const lastStop = sortedStops[sortedStops.length - 1];

  let prevStop: RouteStop = firstStop;
  let nextStop: RouteStop = lastStop;

  for (let i = 0; i < sortedStops.length; i++) {
    const s = sortedStops[i];
    if (s.pathIndex <= nearestPathIndex) {
      prevStop = s;
    }
    if (s.pathIndex > nearestPathIndex) {
      nextStop = s;
      break;
    }
  }

  // Check if bus is currently at a stop (within 80m of prevStop or nextStop)
  const distToPrev = haversineDistance(currentCoord, prevStop);
  const distToNext = haversineDistance(currentCoord, nextStop);
  const isAtPrev = distToPrev <= 0.08;
  const isAtNext = distToNext <= 0.08;
  const isAtStop = isAtPrev || isAtNext;
  const currentStop = isAtNext ? nextStop : isAtPrev ? prevStop : null;

  const remainingDistanceToNextKm = calculateRemainingDistance(
    currentCoord,
    nextStop.pathIndex,
    path,
    cumulativeDistances,
  );

  const remainingDistanceToDestKm = calculateRemainingDistance(
    currentCoord,
    lastStop.pathIndex,
    path,
    cumulativeDistances,
  );

  const etaToNextMinutes = isAtStop && currentStop?.id === nextStop.id
    ? 0
    : calculateEtaMinutes(remainingDistanceToNextKm, averageSpeedKmh);

  const etaToDestMinutes = calculateEtaMinutes(remainingDistanceToDestKm, averageSpeedKmh);

  return {
    previousStop: prevStop,
    nextStop,
    currentStop,
    isAtStop,
    remainingDistanceToNextKm: Number(remainingDistanceToNextKm.toFixed(2)),
    remainingDistanceToDestKm: Number(remainingDistanceToDestKm.toFixed(2)),
    etaToNextMinutes,
    etaToDestMinutes,
    formattedEta: formatEta(etaToNextMinutes),
    nearestPathIndex,
  };
}