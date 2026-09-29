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
  latitude: number;
  longitude: number;
  nextStopId: string;
  nextStop: string;
  previousStopId?: string;
  previousStop?: string;
  currentStop?: string;
  isAtStop?: boolean;
  etaMinutes: number;
  formattedEta?: string;
  remainingDistanceKm?: number;
  status: string;
  updatedAt: string;
  source: string; // "simulated" | "driver-gps"
  isSimulated?: boolean;
  routeId?: string;
  routeName?: string;
  busNumber?: string;
  origin?: string;
  destination?: string;
  pathIndex?: number;
};

export type FreshnessState = {
  isLive: boolean;
  isStale: boolean;
  isUnavailable: boolean;
  secondsAgo: number;
  freshnessLabel: string;
  statusBadge: "LIVE" | "STALE" | "UNAVAILABLE";
};

export function computeFreshness(updatedAtString?: string | Date): FreshnessState {
  if (!updatedAtString) {
    return {
      isLive: false,
      isStale: false,
      isUnavailable: true,
      secondsAgo: Infinity,
      freshnessLabel: "Location unavailable",
      statusBadge: "UNAVAILABLE",
    };
  }

  const date = typeof updatedAtString === "string" ? new Date(updatedAtString) : updatedAtString;
  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const secondsAgo = Math.floor(diffMs / 1000);

  if (secondsAgo <= 30) {
    return {
      isLive: true,
      isStale: false,
      isUnavailable: false,
      secondsAgo,
      freshnessLabel: secondsAgo < 5 ? "Updated just now" : `Last updated ${secondsAgo} sec ago`,
      statusBadge: "LIVE",
    };
  }

  if (secondsAgo <= 120) {
    return {
      isLive: false,
      isStale: true,
      isUnavailable: false,
      secondsAgo,
      freshnessLabel: `Signal delayed · ${secondsAgo} sec ago`,
      statusBadge: "STALE",
    };
  }

  return {
    isLive: false,
    isStale: false,
    isUnavailable: true,
    secondsAgo,
    freshnessLabel: "Location unavailable",
    statusBadge: "UNAVAILABLE",
  };
}

/**
 * Realtime Bus Location Subscription
 * 
 * Future Supabase architecture:
 * ```ts
 * const channel = supabase.channel(`bus-location:${busId}`)
 *   .on('broadcast', { event: 'location' }, payload => callback(payload.new))
 *   .subscribe();
 * return () => { supabase.removeChannel(channel); }
 * ```
 */
export function subscribeToBusLocation(
  busId: string,
  callback: (location: EnrichedBusLocation) => void,
  options: { intervalMs?: number } = {},
): () => void {
  const intervalMs = options.intervalMs ?? 3000;
  let active = true;

  const fetchLatest = async () => {
    if (!active) return;
    try {
      const res = await fetch(`/api/buses/${busId}/location`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = (await res.json()) as EnrichedBusLocation;
        if (active && data) {
          callback(data);
        }
      }
    } catch {
      // In offline or degraded network, callback receives no update
    }
  };

  // Immediate fetch
  void fetchLatest();

  // Polling stream (serves as realtime bridge until Supabase socket is attached)
  const timer = setInterval(() => {
    void fetchLatest();
  }, intervalMs);

  return () => {
    active = false;
    clearInterval(timer);
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
  coords: Coordinate,
): Promise<EnrichedBusLocation | null> {
  try {
    const res = await fetch("/api/bus/location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        busId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: new Date().toISOString(),
      }),
    });
    if (res.ok) {
      return (await res.json()) as EnrichedBusLocation;
    }
    return null;
  } catch (err) {
    console.error("Failed to transmit driver GPS coordinates:", err);
    return null;
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
        setFreshness(computeFreshness(newLocation.updatedAt));
        setIsLoading(false);
      },
      { intervalMs: 3000 },
    );

    return () => {
      unsubscribe();
    };
  }, [busId, enabled]);

  // Update freshness tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (locationRef.current?.updatedAt) {
        setFreshness(computeFreshness(locationRef.current.updatedAt));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const refresh = useCallback(async () => {
    if (!busId) return;
    try {
      const data = await customFetch<EnrichedBusLocation>(`/api/buses/${busId}/location`);
      if (data) {
        setLocation(data);
        setFreshness(computeFreshness(data.updatedAt));
      }
    } catch (e) {
      setError("Could not refresh live location");
    }
  }, [busId]);

  return {
    location,
    routeDetails,
    freshness,
    isLoading,
    error,
    refresh,
  };
}
