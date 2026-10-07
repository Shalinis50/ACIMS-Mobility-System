import { useEffect, useState, useCallback, useRef } from "react";
import { io, type Socket } from "socket.io-client";

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type RouteStop = {
  id: string;
  name: string;
  sequence: number;
  pathIndex?: number;
  latitude: number;
  longitude: number;
  minutesFromPrevious?: number;
};

export type RouteDetails = {
  routeId: string;
  busId: string;
  busNumber: string;
  name: string;
  origin: string;
  destination: string;
  path: Coordinate[];
  stops: RouteStop[];
  totalDistanceKm: number;
  cumulativeDistances?: number[];
};

export type EnrichedBusLocation = {
  busId: string;
  busNumber?: string;
  driverId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  bearing?: number | null;
  altitude?: number | null;
  timestamp?: number;
  nextStopId: string;
  nextStop: string;
  previousStopId?: string;
  previousStop?: string;
  isAtStop?: boolean;
  isApproachingStop?: boolean;
  stopSequenceIndex?: number;
  etaMinutes: number;
  formattedEta?: string;
  etaLabel?: "LIVE ETA" | "ESTIMATED ETA" | "SCHEDULED" | "UNAVAILABLE";
  etaConfidence?: "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";
  remainingDistanceKm?: number;
  status: string;
  freshness: "LIVE" | "RECENT" | "STALE" | "UNAVAILABLE" | "OFFLINE";
  isLive: boolean;
  trackingStatus?: "ACTIVE" | "PAUSED" | "ENDED" | "IDLE";
  recordedAt: string;
  receivedAt?: string;
  networkDelayMs?: number;
  secondsAgo?: number;
  quality?: "HIGH" | "ACCEPTABLE" | "POOR" | "INVALID";
  source: string;
  routeId?: string;
  routeName?: string;
  origin?: string;
  destination?: string;
  pathIndex?: number;
  updatedAt: string; // for backward compatibility with older UI widgets
};

export type FreshnessState = {
  isLive: boolean;
  isRecent: boolean;
  isStale: boolean;
  isUnavailable: boolean;
  secondsAgo: number;
  freshnessLabel: string;
  statusBadge: "LIVE" | "RECENT" | "STALE" | "UNAVAILABLE";
};

export function computeFreshness(
  recordedAtString?: string | Date,
  trackingStatus: string = "ACTIVE"
): FreshnessState {
  if (!recordedAtString || trackingStatus === "ENDED" || trackingStatus === "IDLE") {
    return {
      isLive: false,
      isRecent: false,
      isStale: false,
      isUnavailable: true,
      secondsAgo: Infinity,
      freshnessLabel: trackingStatus === "ENDED" ? "Trip ended" : "Waiting for driver GPS",
      statusBadge: "UNAVAILABLE",
    };
  }

  const date = typeof recordedAtString === "string" ? new Date(recordedAtString) : recordedAtString;
  if (date.getTime() <= 0 || isNaN(date.getTime())) {
    return {
      isLive: false,
      isRecent: false,
      isStale: false,
      isUnavailable: true,
      secondsAgo: Infinity,
      freshnessLabel: "Waiting for driver GPS",
      statusBadge: "UNAVAILABLE",
    };
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const secondsAgo = Math.floor(diffMs / 1000);

  if (trackingStatus === "PAUSED") {
    return {
      isLive: false,
      isRecent: false,
      isStale: true,
      isUnavailable: false,
      secondsAgo,
      freshnessLabel: `Tracking paused · ${secondsAgo}s ago`,
      statusBadge: "STALE",
    };
  }

  if (secondsAgo <= 30) {
    return {
      isLive: true,
      isRecent: false,
      isStale: false,
      isUnavailable: false,
      secondsAgo,
      freshnessLabel: secondsAgo < 2 ? "Updated just now" : `Updated ${secondsAgo}s ago`,
      statusBadge: "LIVE",
    };
  }

  if (secondsAgo <= 90) {
    return {
      isLive: false,
      isRecent: true,
      isStale: false,
      isUnavailable: false,
      secondsAgo,
      freshnessLabel: `Updated ${secondsAgo}s ago`,
      statusBadge: "RECENT",
    };
  }

  if (secondsAgo <= 600) {
    const mins = Math.max(1, Math.floor(secondsAgo / 60));
    return {
      isLive: false,
      isRecent: false,
      isStale: true,
      isUnavailable: false,
      secondsAgo,
      freshnessLabel: secondsAgo < 120 ? `Last seen ${secondsAgo}s ago` : `Last seen ${mins}m ago`,
      statusBadge: "STALE",
    };
  }

  return {
    isLive: false,
    isRecent: false,
    isStale: false,
    isUnavailable: true,
    secondsAgo,
    freshnessLabel: "Waiting for driver GPS",
    statusBadge: "UNAVAILABLE",
  };
}

let sharedSocket: Socket | null = null;

export function getAcimsSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  if (!sharedSocket) {
    sharedSocket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });
  }
  return sharedSocket;
}

/**
 * Emits a real driver GPS location update over Socket.IO to the ACMIS Node.js server
 * (`driverLocationUpdate`), which validates, persists, and broadcasts to the bus-specific room (`bus:<busId>`).
 */
export function emitDriverLocationOverSocket(payload: {
  driverId: string;
  busId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  bearing: number | null;
  timestamp: number;
}): void {
  const socket = getAcimsSocket();
  if (!socket) return;
  socket.emit("driverLocationUpdate", payload);
}

/**
 * Realtime Bus Location Subscription
 * Joins the bus-specific Socket.IO room (`bus:<busId>`) for instant room-scoped updates,
 * backed by Server-Sent Events (SSE) and initial snapshot fetch.
 */
export function subscribeToBusLocation(
  busId: string,
  callback: (location: EnrichedBusLocation) => void,
  onConnectionChange?: (connected: boolean) => void
): () => void {
  let active = true;
  let eventSource: EventSource | null = null;
  let fallbackTimer: NodeJS.Timeout | null = null;
  let socketConnected = false;
  let sseConnected = false;

  const updateConnectionState = () => {
    if (!active) return;
    onConnectionChange?.(socketConnected || sseConnected);
  };

  const handleIncomingLocation = (raw: any) => {
    if (!active || !raw) return;
    if (raw.busId && raw.busId !== busId) return;
    const data = raw as EnrichedBusLocation;
    if (data.bearing != null && data.heading == null) {
      data.heading = data.bearing;
    } else if (data.heading != null && data.bearing == null) {
      data.bearing = data.heading;
    }
    if (!data.recordedAt && typeof data.timestamp === "number" && data.timestamp > 0) {
      data.recordedAt = new Date(data.timestamp).toISOString();
    }
    data.updatedAt = data.recordedAt || new Date().toISOString();
    callback(data);
  };

  // Initial immediate fetch
  const fetchSnapshot = async () => {
    if (!active) return;
    try {
      const res = await fetch(`/api/buses/${busId}/location`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok && active) {
        const data = (await res.json()) as EnrichedBusLocation;
        handleIncomingLocation(data);
      }
    } catch {
      // Degraded or offline
    }
  };

  void fetchSnapshot();

  // 1. Connect to bus-specific Socket.IO room (`bus:<busId>`)
  const socket = getAcimsSocket();
  const joinRoom = () => {
    if (!active || !socket) return;
    socketConnected = socket.connected;
    updateConnectionState();
    socket.emit("joinBusRoom", { busId });
  };

  const onSocketConnect = () => {
    socketConnected = true;
    updateConnectionState();
    joinRoom();
  };

  const onSocketDisconnect = () => {
    socketConnected = false;
    updateConnectionState();
  };

  const onSocketBusLocation = (payload: any) => {
    handleIncomingLocation(payload);
  };

  const onSocketSessionChange = (payload: any) => {
    if (!active) return;
    if (!payload?.busId || payload.busId === busId) {
      void fetchSnapshot();
    }
  };

  if (socket) {
    socket.on("connect", onSocketConnect);
    socket.on("disconnect", onSocketDisconnect);
    socket.on("busLocationUpdate", onSocketBusLocation);
    socket.on("locationUpdate", onSocketBusLocation);
    socket.on("session_change", onSocketSessionChange);
    if (socket.connected) {
      joinRoom();
    }
  }

  // 2. Connect to live SSE channel as dual-transport resilience
  const connectSSE = () => {
    if (!active || typeof EventSource === "undefined") {
      startPolling();
      return;
    }

    try {
      eventSource = new EventSource(`/api/realtime/bus/${busId}`);

      eventSource.addEventListener("location", (e: MessageEvent) => {
        if (!active) return;
        try {
          const telemetry = JSON.parse(e.data) as EnrichedBusLocation;
          handleIncomingLocation(telemetry);
        } catch (err) {
          console.error("Error parsing realtime location event:", err);
        }
      });

      eventSource.addEventListener("session_change", (_e: MessageEvent) => {
        if (!active) return;
        void fetchSnapshot();
      });

      eventSource.onopen = () => {
        sseConnected = true;
        updateConnectionState();
      };

      eventSource.onerror = () => {
        sseConnected = false;
        updateConnectionState();
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        startPolling();
        setTimeout(() => {
          if (active && !eventSource) {
            connectSSE();
          }
        }, 8000);
      };
    } catch {
      startPolling();
    }
  };

  const startPolling = () => {
    if (fallbackTimer) return;
    fallbackTimer = setInterval(() => {
      void fetchSnapshot();
    }, 4000);
  };

  connectSSE();

  return () => {
    active = false;
    if (socket) {
      socket.emit("leaveBusRoom", { busId });
      socket.off("connect", onSocketConnect);
      socket.off("disconnect", onSocketDisconnect);
      socket.off("busLocationUpdate", onSocketBusLocation);
      socket.off("locationUpdate", onSocketBusLocation);
      socket.off("session_change", onSocketSessionChange);
    }
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (fallbackTimer) {
      clearInterval(fallbackTimer);
      fallbackTimer = null;
    }
    onConnectionChange?.(false);
  };
}

/**
 * Fetch full route path coordinates and stops
 */
export async function fetchRouteDetails(busId: string): Promise<RouteDetails | null> {
  try {
    const res = await fetch(`/api/buses/${busId}/route`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      return (await res.json()) as RouteDetails;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Ingest Driver GPS update from Driver device / browser Geolocation
 */
export async function sendDriverGpsUpdate(
  busId: string,
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    altitude?: number | null;
    altitudeAccuracy?: number | null;
    speed?: number | null;
    heading?: number | null;
    bearing?: number | null;
    timestamp?: string | number;
  },
  driverId?: string,
  token?: string | null
): Promise<{
  success: boolean;
  telemetry?: EnrichedBusLocation;
  validation?: { quality?: "HIGH" | "ACCEPTABLE" | "POOR" | "INVALID"; networkDelayMs?: number };
  status?: number;
  error?: string;
}> {
  try {
    const effectiveDriverId = driverId || "driver-active";
    const effectiveBearing = coords.bearing ?? coords.heading ?? null;
    const epochTimestamp =
      typeof coords.timestamp === "number"
        ? coords.timestamp
        : coords.timestamp
        ? new Date(coords.timestamp).getTime()
        : Date.now();

    emitDriverLocationOverSocket({
      driverId: effectiveDriverId,
      busId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy ?? null,
      speed: coords.speed ?? null,
      bearing: effectiveBearing,
      timestamp: epochTimestamp,
    });

    const payload = {
      driverId: effectiveDriverId,
      busId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
      altitudeAccuracy: coords.altitudeAccuracy,
      speed: coords.speed,
      bearing: effectiveBearing,
      heading: effectiveBearing,
      timestamp: epochTimestamp,
      recorded_at: new Date(epochTimestamp).toISOString(),
    };

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
        success: true,
        telemetry: data.telemetry,
        validation: data.validation,
        status: res.status,
      };
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, status: res.status, error: err.error || `HTTP ${res.status}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || "Network transmission failed" };
  }
}

// -------------------------------------------------------------
// DRIVER OFFLINE GPS LOCAL QUEUEING
// -------------------------------------------------------------
const OFFLINE_GPS_KEY = "acims_offline_gps_queue";

export interface QueuedGpsPoint {
  busId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: string;
  driverId?: string;
}

export function enqueueOfflineGpsPoint(point: QueuedGpsPoint) {
  try {
    const raw = localStorage.getItem(OFFLINE_GPS_KEY);
    const queue: QueuedGpsPoint[] = raw ? JSON.parse(raw) : [];
    queue.push(point);
    if (queue.length > 200) queue.shift();
    localStorage.setItem(OFFLINE_GPS_KEY, JSON.stringify(queue));
  } catch {}
}

export function getOfflineGpsQueueCount(): number {
  try {
    const raw = localStorage.getItem(OFFLINE_GPS_KEY);
    const queue: QueuedGpsPoint[] = raw ? JSON.parse(raw) : [];
    return queue.length;
  } catch {
    return 0;
  }
}

export async function flushOfflineGpsQueue(
  busId: string,
  driverId?: string,
  token?: string | null
): Promise<number> {
  try {
    const raw = localStorage.getItem(OFFLINE_GPS_KEY);
    if (!raw) return 0;
    const queue: QueuedGpsPoint[] = JSON.parse(raw);
    if (queue.length === 0) return 0;

    const pointsToUpload = queue.filter((p) => p.busId === busId);
    if (pointsToUpload.length === 0) return 0;

    const effectiveDriverId = driverId || pointsToUpload[0]?.driverId || "driver-active";

    const res = await fetch("/api/bus/location/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-acims-driver-id": effectiveDriverId,
        "x-acims-user-id": effectiveDriverId,
        "x-acims-role": "DRIVER",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ busId, points: pointsToUpload }),
    });

    if (res.ok) {
      const remaining = queue.filter((p) => p.busId !== busId);
      localStorage.setItem(OFFLINE_GPS_KEY, JSON.stringify(remaining));
      return pointsToUpload.length;
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * React Hook for Realtime Location & Route details
 */
export function useBusRealtimeLocation(busId: string, enabled = true) {
  const [location, setLocation] = useState<EnrichedBusLocation | null>(null);
  const [routeDetails, setRouteDetails] = useState<RouteDetails | null>(null);
  const [freshness, setFreshness] = useState<FreshnessState>(() => computeFreshness());
  const [isLoading, setIsLoading] = useState(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locationRef = useRef(location);
  locationRef.current = location;

  // Load route path once or on busId change
  useEffect(() => {
    if (!busId || !enabled) return;
    let cancelled = false;

    fetchRouteDetails(busId)
      .then((data) => {
        if (!cancelled && data) setRouteDetails(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [busId, enabled]);

  // Subscribe to realtime location updates (Socket.IO bus room + SSE)
  useEffect(() => {
    if (!busId || !enabled) return;
    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToBusLocation(
      busId,
      (newLocation) => {
        setLocation(newLocation);
        setFreshness(computeFreshness(newLocation.recordedAt || newLocation.updatedAt, newLocation.trackingStatus));
        setIsLoading(false);
      },
      (connected) => {
        setIsRealtimeConnected(connected);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [busId, enabled]);

  // Update freshness tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (locationRef.current) {
        setFreshness(
          computeFreshness(
            locationRef.current.recordedAt || locationRef.current.updatedAt,
            locationRef.current.trackingStatus
          )
        );
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const refresh = useCallback(async () => {
    if (!busId) return;
    try {
      const res = await fetch(`/api/buses/${busId}/location`);
      if (res.ok) {
        const data = (await res.json()) as EnrichedBusLocation;
        data.updatedAt = data.recordedAt;
        setLocation(data);
        setFreshness(computeFreshness(data.recordedAt, data.trackingStatus));
      }
    } catch {
      setError("Could not refresh live location");
    }
  }, [busId]);

  return {
    location,
    routeDetails,
    freshness,
    isLoading,
    isRealtimeConnected,
    error,
    refresh,
  };
}
