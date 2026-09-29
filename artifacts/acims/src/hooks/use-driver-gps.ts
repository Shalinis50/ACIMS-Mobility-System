import { useState, useEffect, useRef, useCallback } from 'react';
import {
  postBusLocation,
  postBusLocationBatch,
  startBusTracking,
  stopBusTracking,
} from '@workspace/api-client-react';

export type DriverTrackingStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'permission_denied'
  | 'gps_unavailable'
  | 'timeout'
  | 'stopped';

export interface DriverGpsPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: string;
}

export interface DriverGpsState {
  status: DriverTrackingStatus;
  isTracking: boolean;
  busId: string;
  driverId: string;
  driverName: string;
  currentCoords: DriverGpsPoint | null;
  lastSentAt: Date | null;
  pointsSentCount: number;
  queuedPointsCount: number;
  errorMessage: string | null;
  isOffline: boolean;
}

const OFFLINE_DRIVER_QUEUE_KEY = 'acims_driver_offline_gps_queue';

export function useDriverGps(initialBusId = 'bus-24', initialDriverId = 'driver-arun', initialDriverName = 'Arun Kumar') {
  const [busId, setBusId] = useState(initialBusId);
  const [driverId, setDriverId] = useState(initialDriverId);
  const [driverName, setDriverName] = useState(initialDriverName);

  const [state, setState] = useState<DriverGpsState>({
    status: 'idle',
    isTracking: false,
    busId: initialBusId,
    driverId: initialDriverId,
    driverName: initialDriverName,
    currentCoords: null,
    lastSentAt: null,
    pointsSentCount: 0,
    queuedPointsCount: 0,
    errorMessage: null,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  });

  const watchIdRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const busIdRef = useRef(busId);
  busIdRef.current = busId;

  // Sync state with selected bus/driver
  useEffect(() => {
    setState((prev) => ({ ...prev, busId, driverId, driverName }));
  }, [busId, driverId, driverName]);

  // Monitor network status
  useEffect(() => {
    isMountedRef.current = true;
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOffline: false }));
      void flushOfflineBatch();
    };
    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOffline: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for queued points
    try {
      const raw = localStorage.getItem(OFFLINE_DRIVER_QUEUE_KEY);
      if (raw) {
        const queue = JSON.parse(raw);
        if (Array.isArray(queue)) {
          setState((prev) => ({ ...prev, queuedPointsCount: queue.length }));
        }
      }
    } catch {}

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const flushOfflineBatch = useCallback(async () => {
    try {
      const raw = localStorage.getItem(OFFLINE_DRIVER_QUEUE_KEY);
      if (!raw) return;
      const queue: DriverGpsPoint[] = JSON.parse(raw);
      if (Array.isArray(queue) && queue.length > 0) {
        await postBusLocationBatch({
          bus_id: busIdRef.current,
          locations: queue,
        });
        localStorage.removeItem(OFFLINE_DRIVER_QUEUE_KEY);
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            queuedPointsCount: 0,
            pointsSentCount: prev.pointsSentCount + queue.length,
            lastSentAt: new Date(),
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to flush offline driver GPS batch:', err);
    }
  }, []);

  const transmitLocation = useCallback(
    async (coords: DriverGpsPoint) => {
      if (!navigator.onLine) {
        // Collect real coordinates in local queue
        try {
          const raw = localStorage.getItem(OFFLINE_DRIVER_QUEUE_KEY);
          const queue: DriverGpsPoint[] = raw ? JSON.parse(raw) : [];
          queue.push(coords);
          if (queue.length > 200) queue.shift();
          localStorage.setItem(OFFLINE_DRIVER_QUEUE_KEY, JSON.stringify(queue));
          if (isMountedRef.current) {
            setState((prev) => ({ ...prev, queuedPointsCount: queue.length }));
          }
        } catch {}
        return;
      }

      try {
        await postBusLocation({
          bus_id: busIdRef.current,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          speed: coords.speed,
          heading: coords.heading,
          timestamp: coords.timestamp,
          driverId,
          driverName,
        });

        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            lastSentAt: new Date(),
            pointsSentCount: prev.pointsSentCount + 1,
          }));
        }
      } catch (err) {
        console.warn('Live bus GPS transmission error:', err);
      }
    },
    [driverId, driverName]
  );

  const startTracking = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        status: 'gps_unavailable',
        errorMessage: 'Geolocation is not supported by your browser or device.',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      status: 'requesting',
      errorMessage: null,
    }));

    try {
      await startBusTracking(busId, driverId, driverName);
    } catch (err) {
      console.warn('Failed to start session on backend:', err);
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    };

    const successCallback = (position: GeolocationPosition) => {
      if (!isMountedRef.current) return;
      const { latitude, longitude, accuracy, speed, heading } = position.coords;

      const point: DriverGpsPoint = {
        latitude,
        longitude,
        accuracy: accuracy ?? 10,
        speed: speed !== null ? Math.round(speed * 3.6) : 0, // km/h
        heading: heading !== null ? Math.round(heading) : 0,
        timestamp: new Date(position.timestamp || Date.now()).toISOString(),
      };

      setState((prev) => ({
        ...prev,
        status: 'active',
        isTracking: true,
        currentCoords: point,
        errorMessage: null,
      }));

      void transmitLocation(point);
    };

    const errorCallback = (error: GeolocationPositionError) => {
      if (!isMountedRef.current) return;
      let status: DriverTrackingStatus = 'gps_unavailable';
      let message = error.message;

      switch (error.code) {
        case error.PERMISSION_DENIED:
          status = 'permission_denied';
          message = 'Location permission was denied. Please allow GPS access in settings to broadcast bus location.';
          break;
        case error.POSITION_UNAVAILABLE:
          status = 'gps_unavailable';
          message = 'GPS signal is currently unavailable. Please verify GPS/location service is enabled.';
          break;
        case error.TIMEOUT:
          status = 'timeout';
          message = 'GPS signal request timed out. Retrying GPS acquisition...';
          break;
      }

      setState((prev) => ({
        ...prev,
        status,
        errorMessage: message,
      }));
    };

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        successCallback,
        errorCallback,
        options
      );
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        status: 'gps_unavailable',
        errorMessage: err?.message || 'Could not initialize GPS watchPosition.',
      }));
    }
  }, [busId, driverId, driverName, transmitLocation]);

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    try {
      await stopBusTracking(busIdRef.current);
    } catch (err) {
      console.warn('Failed to notify backend of stop tracking:', err);
    }

    setState((prev) => ({
      ...prev,
      isTracking: false,
      status: 'stopped',
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    ...state,
    busId,
    setBusId,
    driverId,
    setDriverId,
    driverName,
    setDriverName,
    startTracking,
    stopTracking,
    flushOfflineBatch,
  };
}
