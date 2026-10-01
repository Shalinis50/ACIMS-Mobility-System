import { useEffect, useState, useCallback, useRef } from "react";

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
  altitude?: number | null;
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
      freshnessLabel: trackingStatus === "ENDED" ? "Trip ended" : "Location unavailable",
      statusBadge: "UNAVAILABLE",
    };
  }

  const date = typeof recordedAtString === "string" ? new Date(recordedAtString) : recordedAtString;
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
      freshnessLabel: secondsAgo < 5 ? "Updated just now" : `Last updated ${secondsAgo} sec ago`,
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
      freshnessLabel: `Recent GPS · ${secondsAgo} sec ago`,
      statusBadge: "RECENT",
    };
  }

  if (secondsAgo <= 300) {
    return {
      isLive: false,
      isRecent: false,
      isStale: true,
      isUnavailable: false,
      secondsAgo,
      freshnessLabel: `Signal delayed · ${secondsAgo} sec ago`,
      statusBadge: "STALE",
    };
  }

  return {
    isLive: false,
    isRecent: false,
    isStale: false,
    isUnavailable: true,
    secondsAgo,
    freshnessLabel: "Location unavailable",
    statusBadge: "UNAVAILABLE",
  };
}

/**
 * Realtime Bus Location Subscription
 * Uses Server-Sent Events (SSE) for instant zero-polling live updates,
 * with automatic reconnect and background fallback polling.
 */
export function subscribeToBusLocation(
  busId: string,
  callback: (location: EnrichedBusLocation) => void,
  onConnectionChange?: (connected: boolean) => void
): () => void {
  let active = true;
  let eventSource: EventSource | null = null;
  let fallbackTimer: NodeJS.Timeout | null = null;

  // Initial immediate fetch
  const fetchSnapshot = async () => {
    if (!active) return;
    try {
      const res = await fetch(`/api/buses/${busId}/location`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok && active) {
        const data = (await res.json()) as EnrichedBusLocation;
        data.updatedAt = data.recordedAt;
        callback(data);
      }
    } catch {
      // Degraded or offline
    }
  };

  void fetchSnapshot();

  // Connect to live SSE channel
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
          telemetry.updatedAt = telemetry.recordedAt;
          callback(telemetry);
        } catch (err) {
          console.error("Error parsing realtime location event:", err);
        }
      });

      eventSource.addEventListener("session_change", (_e: MessageEvent) => {
        if (!active) return;
        void fetchSnapshot();
      });

      eventSource.onopen = () => {
        if (active) onConnectionChange?.(true);
      };

      eventSource.onerror = () => {
        if (active) onConnectionChange?.(false);
        // Fallback to polling while SSE reconnects
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        startPolling();
        // Retry SSE in 8 seconds
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
    timestamp?: string;
  },
  driverId?: string
): Promise<{ success: boolean; telemetry?: EnrichedBusLocation; error?: string }> {
  try {
    const payload = {
      busId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
      altitudeAccuracy: coords.altitudeAccuracy,
      speed: coords.speed,
      heading: coords.heading,
      timestamp: coords.timestamp || new Date().toISOString(),
      driverId,
    };

    const res = await fetch("/api/bus/location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(driverId ? { "x-acims-driver-id": driverId } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, telemetry: data.telemetry };
    } else {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || `HTTP ${res.status}` };
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
    // Keep max 200 points to prevent storage overflow
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

export async function flushOfflineGpsQueue(busId: string): Promise<number> {
  try {
    const raw = localStorage.getItem(OFFLINE_GPS_KEY);
    if (!raw) return 0;
    const queue: QueuedGpsPoint[] = JSON.parse(raw);
    if (queue.length === 0) return 0;

    const pointsToUpload = queue.filter((p) => p.busId === busId);
    if (pointsToUpload.length === 0) return 0;

    const res = await fetch("/api/bus/location/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ busId, points: pointsToUpload }),
    });

    if (res.ok) {
      // Remove uploaded points
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

  // Subscribe to realtime location updates
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
