import { useState, useEffect, useRef, useCallback } from 'react';
import { postStudentLocation, type LiveStudentLocation } from '@workspace/api-client-react';

export type GpsPermissionState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'error';

export interface StudentGpsState {
  permissionState: GpsPermissionState;
  isWatching: boolean;
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number | null;
    heading: number | null;
    timestamp: number;
  } | null;
  errorMessage: string | null;
  lastSentAt: Date | null;
  isOffline: boolean;
}

const OFFLINE_STUDENT_QUEUE_KEY = 'acims_student_offline_gps_queue';

export function useStudentGps(studentId = 'student-20418', autoStart = false) {
  const [state, setState] = useState<StudentGpsState>({
    permissionState: 'idle',
    isWatching: false,
    coords: null,
    errorMessage: null,
    lastSentAt: null,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  });

  const watchIdRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Monitor network online/offline
  useEffect(() => {
    isMountedRef.current = true;
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOffline: false }));
      flushOfflineQueue();
    };
    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOffline: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const flushOfflineQueue = useCallback(async () => {
    try {
      const raw = localStorage.getItem(OFFLINE_STUDENT_QUEUE_KEY);
      if (!raw) return;
      const queue = JSON.parse(raw);
      if (Array.isArray(queue) && queue.length > 0) {
        const latest = queue[queue.length - 1];
        await postStudentLocation(latest);
        localStorage.removeItem(OFFLINE_STUDENT_QUEUE_KEY);
      }
    } catch {
      // ignore offline storage errors
    }
  }, []);

  const sendFixToBackend = useCallback(
    async (coords: {
      latitude: number;
      longitude: number;
      accuracy: number;
      speed: number | null;
      heading: number | null;
      timestamp: number;
    }) => {
      const payload = {
        studentId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        speed: coords.speed,
        heading: coords.heading,
        timestamp: new Date(coords.timestamp).toISOString(),
      };

      if (!navigator.onLine) {
        try {
          const raw = localStorage.getItem(OFFLINE_STUDENT_QUEUE_KEY);
          const queue = raw ? JSON.parse(raw) : [];
          queue.push(payload);
          // Keep at most 20 points
          if (queue.length > 20) queue.shift();
          localStorage.setItem(OFFLINE_STUDENT_QUEUE_KEY, JSON.stringify(queue));
        } catch {
          // quota fallback
        }
        return;
      }

      try {
        await postStudentLocation(payload);
        if (isMountedRef.current) {
          setState((prev) => ({ ...prev, lastSentAt: new Date() }));
        }
      } catch (err) {
        console.warn('Failed to transmit student GPS to ACIMS backend:', err);
      }
    },
    [studentId]
  );

  const startWatching = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        permissionState: 'unavailable',
        errorMessage: 'GPS is not supported by your browser or device.',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      permissionState: 'requesting',
      errorMessage: null,
    }));

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
      const coords = {
        latitude,
        longitude,
        accuracy: accuracy ?? 10,
        speed: speed !== null ? Math.round(speed * 3.6) : null, // convert m/s to km/h
        heading: heading !== null ? Math.round(heading) : null,
        timestamp: position.timestamp || Date.now(),
      };

      setState((prev) => ({
        ...prev,
        permissionState: 'granted',
        isWatching: true,
        coords,
        errorMessage: null,
      }));

      void sendFixToBackend(coords);
    };

    const errorCallback = (error: GeolocationPositionError) => {
      if (!isMountedRef.current) return;
      let perm: GpsPermissionState = 'error';
      let message = error.message || 'An error occurred while retrieving GPS coordinates.';

      switch (error.code) {
        case error.PERMISSION_DENIED:
          perm = 'denied';
          message = 'Location access was denied. Please allow location permissions in your browser.';
          break;
        case error.POSITION_UNAVAILABLE:
          perm = 'unavailable';
          message = 'GPS location is temporarily unavailable on your device.';
          break;
        case error.TIMEOUT:
          perm = 'timeout';
          message = 'GPS location request timed out. Retrying signal acquisition...';
          break;
      }

      setState((prev) => ({
        ...prev,
        permissionState: perm,
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
        permissionState: 'error',
        errorMessage: err?.message || 'Could not initialize GPS watchPosition.',
      }));
    }
  }, [sendFixToBackend]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isWatching: false,
      permissionState: 'idle',
    }));
  }, []);

  useEffect(() => {
    if (autoStart) {
      startWatching();
    }
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [autoStart, startWatching]);

  return {
    ...state,
    startWatching,
    stopWatching,
  };
}
