import { useEffect, useMemo, useState } from 'react';
import type { RecRoute, RecRouteStop } from '@/data/recRoutes';

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export type SimulatedBusState = {
  isSimulated: boolean;
  busPosition: { latitude: number; longitude: number; heading: number } | null;
  currentNearestStop: RecRouteStop | null;
  nextStop: RecRouteStop | null;
  etaMinutes: number | null;
  formattedEta: string;
  isMoving: boolean;
  speedKmh: number;
  remainingDistanceKm: number | null;
};

export function useRouteSimulation(
  route: RecRoute | null,
  selectedBoardingStopId?: string | null
): SimulatedBusState {
  // Only Route 18 supports simulation
  const isSimulated = route?.routeNumber === '18';
  const path = route?.path || [];

  const [stepIndex, setStepIndex] = useState(0);

  // Reset step index when route changes
  useEffect(() => {
    setStepIndex(0);
  }, [route?.id]);

  // Automatic simulation ticker (Zero controls visible to student)
  useEffect(() => {
    if (!isSimulated || path.length === 0) return;

    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % path.length);
    }, 2200);

    return () => clearInterval(interval);
  }, [isSimulated, path.length]);

  return useMemo(() => {
    if (!isSimulated || !route || path.length === 0) {
      return {
        isSimulated: false,
        busPosition: null,
        currentNearestStop: null,
        nextStop: null,
        etaMinutes: null,
        formattedEta: 'Scheduled',
        isMoving: false,
        speedKmh: 0,
        remainingDistanceKm: null,
      };
    }

    const currentCoord = path[stepIndex % path.length];
    const nextCoord = path[(stepIndex + 1) % path.length];

    // Compute heading
    const dLon = toRad(nextCoord[1] - currentCoord[1]);
    const lat1 = toRad(currentCoord[0]);
    const lat2 = toRad(nextCoord[0]);
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const heading = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);

    const busPos = {
      latitude: currentCoord[0],
      longitude: currentCoord[1],
      heading,
    };

    // Calculate nearest stop & next stop from route stops
    const stops = route.stops;
    let closestStop: RecRouteStop | null = null;
    let minStopDist = Infinity;
    let closestStopIdx = 0;

    stops.forEach((s, idx) => {
      const dist = haversineDistanceKm(busPos.latitude, busPos.longitude, s.lat, s.lng);
      if (dist < minStopDist) {
        minStopDist = dist;
        closestStop = s;
        closestStopIdx = idx;
      }
    });

    // Next stop along route sequence
    const nextStop =
      closestStopIdx < stops.length - 1
        ? stops[closestStopIdx + 1]
        : stops[stops.length - 1];

    // Determine target stop for student ETA calculation:
    // If student selected a specific boarding stop that hasn't passed yet, target that stop.
    // Otherwise target the next upcoming stop.
    let targetStop = nextStop;
    if (selectedBoardingStopId) {
      const selectedStop = stops.find(
        (s) =>
          s.id === selectedBoardingStopId ||
          s.name.toLowerCase() === selectedBoardingStopId.toLowerCase()
      );
      if (selectedStop && selectedStop.sequence >= (closestStop?.sequence || 1)) {
        targetStop = selectedStop;
      }
    }

    // Compute remaining distance to target stop along path
    const remainingDistanceKm = haversineDistanceKm(
      busPos.latitude,
      busPos.longitude,
      targetStop.lat,
      targetStop.lng
    );

    // Dynamic ETA: speed ~32 km/h in suburban Chennai corridor
    const simulatedSpeed = 32;
    const computedEtaMinutes = Math.max(
      1,
      Math.round((remainingDistanceKm / simulatedSpeed) * 60)
    );

    return {
      isSimulated: true,
      busPosition: busPos,
      currentNearestStop: closestStop,
      nextStop,
      etaMinutes: computedEtaMinutes,
      formattedEta: `${computedEtaMinutes} min`,
      isMoving: true,
      speedKmh: simulatedSpeed,
      remainingDistanceKm: Number(remainingDistanceKm.toFixed(1)),
    };
  }, [isSimulated, route, path, stepIndex, selectedBoardingStopId]);
}
