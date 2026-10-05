import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  AlertTriangle,
  BusFront,
  CheckCircle2,
  Compass,
  Gauge,
  MapPin,
  Pause,
  Play,
  Power,
  Radio,
  RefreshCw,
  ShieldCheck,
  Signal,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useListBuses, getListBusesQueryKey } from "@workspace/api-client-react";
import { PageHeading } from "@/components/acims-ui";
import { useAuth } from "@/lib/auth-context";
import {
  enqueueOfflineGpsPoint,
  flushOfflineGpsQueue,
  getOfflineGpsQueueCount,
} from "@/lib/realtime-location";

export default function DriverTrackingPage() {
  const { profile } = useAuth();
  const { data: buses, isLoading: isBusesLoading } = useListBuses({
    query: { queryKey: getListBusesQueryKey() },
  });

  const driverUserId = profile?.userId || "driver-arun";
  const [selectedBusId, setSelectedBusId] = useState(profile?.assignedBusId || "bus-12");
  const [driverName, setDriverName] = useState(profile?.name || "Driver Arun");

  // Tracking states
  const [sessionStatus, setSessionStatus] = useState<"IDLE" | "STARTING" | "ACTIVE" | "PAUSED" | "ENDED">("IDLE");
  const [hasFirstGpsPoint, setHasFirstGpsPoint] = useState(false);

  // Connection monitoring states
  const [gpsConnection, setGpsConnection] = useState<"DISCONNECTED" | "WAITING" | "CONNECTED" | "POOR" | "DENIED">("DISCONNECTED");
  const [backendConnection, setBackendConnection] = useState<"CONNECTED" | "OFFLINE">("CONNECTED");
  const [realtimeConnection, setRealtimeConnection] = useState<"CONNECTED" | "DISCONNECTED">("DISCONNECTED");
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  // Telemetry details
  const [lastCoords, setLastCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    altitude?: number | null;
    speed?: number | null;
    heading?: number | null;
    timestamp: string;
    networkDelayMs?: number;
    quality?: "HIGH" | "ACCEPTABLE" | "POOR" | "INVALID";
  } | null>(null);

  const [pingCount, setPingCount] = useState(0);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const simulatorIntervalRef = useRef<number | null>(null);
  const simulatorPathRef = useRef<Array<{ latitude: number; longitude: number }>>([]);
  const pathIndexRef = useRef(0);
  const [mobileLinkSource, setMobileLinkSource] = useState<"none" | "device" | "simulator">("none");
  const isPausedRef = useRef(false);
  isPausedRef.current = sessionStatus === "PAUSED";

  const mobileDeviceConnected =
    mobileLinkSource !== "none" && (hasFirstGpsPoint || sessionStatus === "ACTIVE" || sessionStatus === "STARTING");

  function bearingDeg(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number },
  ): number {
    const y = Math.sin(((to.longitude - from.longitude) * Math.PI) / 180) * Math.cos((to.latitude * Math.PI) / 180);
    const x =
      Math.cos((from.latitude * Math.PI) / 180) * Math.sin((to.latitude * Math.PI) / 180) -
      Math.sin((from.latitude * Math.PI) / 180) *
        Math.cos((to.latitude * Math.PI) / 180) *
        Math.cos(((to.longitude - from.longitude) * Math.PI) / 180);
    return (Math.atan2(y, x) * 180) / Math.PI;
  }

  function clearSimulatorInterval() {
    if (simulatorIntervalRef.current !== null) {
      window.clearInterval(simulatorIntervalRef.current);
      simulatorIntervalRef.current = null;
    }
  }

  // Sync profile data
  useEffect(() => {
    if (profile?.role === "DRIVER") {
      if (profile.name) setDriverName(profile.name);
      if (profile.assignedBusId) setSelectedBusId(profile.assignedBusId);
    }
  }, [profile]);

  // Sync offline queue count
  useEffect(() => {
    setOfflineQueueCount(getOfflineGpsQueueCount());
  }, [pingCount]);

  const selectedBus = buses?.find((b) => b.id === selectedBusId) ?? buses?.[0];

  /**
   * Transmits real device GPS coordinates to backend
   */
  const transmitLocation = useCallback(async (coords: GeolocationCoordinates, timestampMs: number) => {
    if (isPausedRef.current) return;

    const recordedAt = new Date(timestampMs).toISOString();

    // Check online status
    if (!navigator.onLine) {
      setBackendConnection("OFFLINE");
      enqueueOfflineGpsPoint({
        busId: selectedBusId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        altitude: coords.altitude,
        altitudeAccuracy: coords.altitudeAccuracy,
        speed: coords.speed,
        heading: coords.heading,
        timestamp: recordedAt,
        driverId: driverUserId,
      });
      setOfflineQueueCount(getOfflineGpsQueueCount());
      return;
    }

    try {
      const payload = {
        busId: selectedBusId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        speed: coords.speed !== null && !isNaN(coords.speed) ? Math.round(coords.speed * 3.6) : null, // km/h
        heading: coords.heading !== null && !isNaN(coords.heading) ? Math.round(coords.heading) : null,
        accuracy: coords.accuracy !== null && !isNaN(coords.accuracy) ? Math.round(coords.accuracy) : null,
        altitude: coords.altitude !== null && !isNaN(coords.altitude) ? Math.round(coords.altitude) : null,
        altitudeAccuracy: coords.altitudeAccuracy !== null && !isNaN(coords.altitudeAccuracy) ? Math.round(coords.altitudeAccuracy) : null,
        timestamp: recordedAt,
        driverId: driverUserId,
      };

      const res = await fetch("/api/bus/location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-acims-driver-id": driverUserId,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        setBackendConnection("CONNECTED");
        setRealtimeConnection("CONNECTED");
        setHasFirstGpsPoint(true);
        setSessionStatus("ACTIVE");

        const acc = coords.accuracy ? Math.round(coords.accuracy) : 10;
        if (acc > 40) {
          setGpsConnection("POOR");
        } else {
          setGpsConnection("CONNECTED");
        }

        setLastCoords({
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
          accuracy: acc,
          altitude: coords.altitude ? Math.round(coords.altitude) : null,
          speed: payload.speed,
          heading: payload.heading,
          timestamp: recordedAt,
          networkDelayMs: json.validation?.networkDelayMs ?? 0,
          quality: json.validation?.quality ?? "ACCEPTABLE",
        });

        setPingCount((c) => c + 1);
        setLastPingTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        setGeoError(null);

        // If any offline points were queued, flush them now
        if (getOfflineGpsQueueCount() > 0) {
          flushOfflineGpsQueue(selectedBusId)
            .then(() => setOfflineQueueCount(getOfflineGpsQueueCount()))
            .catch(() => {});
        }
      } else if (res.status === 403) {
        const errorJson = await res.json().catch(() => ({}));
        setGeoError(errorJson.error || "Driver is not authorized to broadcast for this bus.");
        await stopTracking();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setGeoError(errJson.error || `HTTP Error ${res.status}`);
      }
    } catch (err: any) {
      setBackendConnection("OFFLINE");
      setRealtimeConnection("DISCONNECTED");
      enqueueOfflineGpsPoint({
        busId: selectedBusId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        speed: coords.speed,
        heading: coords.heading,
        timestamp: recordedAt,
        driverId: driverUserId,
      });
      setOfflineQueueCount(getOfflineGpsQueueCount());
    }
  }, [selectedBusId, driverUserId]);

  /**
   * START TRACKING: Verify auth, start session, begin watchPosition
   */
  const startTracking = async () => {
    clearSimulatorInterval();
    setMobileLinkSource("device");
    if (!navigator.geolocation) {
      setGpsConnection("DENIED");
      setGeoError("Geolocation is not supported by your browser or device.");
      setMobileLinkSource("none");
      return;
    }

    setGeoError(null);
    setSessionStatus("STARTING");
    setGpsConnection("WAITING");
    setHasFirstGpsPoint(false);

    try {
      // 1. Authenticate & create tracking session on backend
      const sessionRes = await fetch("/api/driver/session/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-acims-driver-id": driverUserId,
        },
        body: JSON.stringify({ busId: selectedBusId, driverId: driverUserId }),
      });

      if (sessionRes.status === 403) {
        const errData = await sessionRes.json().catch(() => ({}));
        setGeoError(errData.error || "Driver not authorized for this vehicle.");
        setSessionStatus("IDLE");
        setGpsConnection("DISCONNECTED");
        return;
      }
      setBackendConnection("CONNECTED");
    } catch {
      setBackendConnection("OFFLINE");
    }

    // 2. Initial instant fix request
    navigator.geolocation.getCurrentPosition(
      (pos) => void transmitLocation(pos.coords, pos.timestamp),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsConnection("DENIED");
          setGeoError("Location permission denied. Please allow location access in your device settings.");
          setSessionStatus("IDLE");
        } else {
          setGeoError(`Acquiring satellite fix: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // 3. Continuous continuous GPS watch stream
    const id = navigator.geolocation.watchPosition(
      (pos) => void transmitLocation(pos.coords, pos.timestamp),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsConnection("DENIED");
          setGeoError("Location permission denied by user or system.");
          void stopTracking();
        } else {
          setGeoError(`GPS signal advisory: ${err.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000,
      }
    );
    watchIdRef.current = id;
  };

  /** Demo: sends GPS fixes along the real route path (desktop / lab testing). */
  const startSimulatorTracking = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    clearSimulatorInterval();
    setMobileLinkSource("simulator");
    setGeoError(null);
    setSessionStatus("STARTING");
    setGpsConnection("WAITING");
    setHasFirstGpsPoint(false);

    try {
      const sessionRes = await fetch("/api/driver/session/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-acims-driver-id": driverUserId,
        },
        body: JSON.stringify({ busId: selectedBusId, driverId: driverUserId }),
      });
      if (sessionRes.status === 403) {
        const errData = await sessionRes.json().catch(() => ({}));
        setGeoError(errData.error || "Driver not authorized for this vehicle.");
        setSessionStatus("IDLE");
        setGpsConnection("DISCONNECTED");
        setMobileLinkSource("none");
        return;
      }
      setBackendConnection("CONNECTED");
    } catch {
      setBackendConnection("OFFLINE");
    }

    const pathRes = await fetch(`/api/driver/simulator-path/${encodeURIComponent(selectedBusId)}`);
    if (!pathRes.ok) {
      setGeoError("Could not load route path for GPS simulator.");
      setSessionStatus("IDLE");
      setMobileLinkSource("none");
      return;
    }
    const data = (await pathRes.json()) as { path: Array<{ latitude: number; longitude: number }> };
    simulatorPathRef.current = data.path ?? [];
    pathIndexRef.current = 0;
    if (!simulatorPathRef.current.length) {
      setGeoError("Route has no path points for simulation.");
      setMobileLinkSource("none");
      return;
    }

    const tick = () => {
      if (isPausedRef.current) return;
      const path = simulatorPathRef.current;
      const i = pathIndexRef.current % path.length;
      const j = (pathIndexRef.current + 1) % path.length;
      const pt = path[i];
      const next = path[j];
      pathIndexRef.current += 1;
      const coords = {
        latitude: pt.latitude,
        longitude: pt.longitude,
        accuracy: 12,
        altitude: null,
        altitudeAccuracy: null,
        heading: bearingDeg(pt, next),
        speed: 6.5,
      } as GeolocationCoordinates;
      void transmitLocation(coords, Date.now());
    };

    tick();
    simulatorIntervalRef.current = window.setInterval(tick, 5000);
  };

  /**
   * PAUSE TRACKING: Stop publishing without destroying session
   */
  const pauseTracking = async () => {
    setSessionStatus("PAUSED");
    try {
      await fetch("/api/driver/session/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busId: selectedBusId }),
      });
    } catch {}
  };

  /**
   * RESUME TRACKING: Resume GPS watch
   */
  const resumeTracking = async () => {
    setSessionStatus("ACTIVE");
    try {
      await fetch("/api/driver/session/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busId: selectedBusId }),
      });
    } catch {}
  };

  /**
   * STOP TRACKING: clearWatch and mark session ENDED
   */
  const stopTracking = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    clearSimulatorInterval();
    setMobileLinkSource("none");
    setSessionStatus("ENDED");
    setGpsConnection("DISCONNECTED");
    setRealtimeConnection("DISCONNECTED");
    setHasFirstGpsPoint(false);

    try {
      await fetch("/api/driver/session/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busId: selectedBusId }),
      });
    } catch {}
  };

  // Clean up watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearSimulatorInterval();
    };
  }, []);

  // Listen for online reconnection to flush offline queue
  useEffect(() => {
    const handleOnline = () => {
      setBackendConnection("CONNECTED");
      flushOfflineGpsQueue(selectedBusId)
        .then(() => setOfflineQueueCount(getOfflineGpsQueueCount()))
        .catch(() => {});
    };
    const handleOffline = () => setBackendConnection("OFFLINE");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [selectedBusId]);

  const isTrackingActive = sessionStatus === "ACTIVE" && hasFirstGpsPoint;
  const isWaitingForGps = sessionStatus === "STARTING" || (sessionStatus === "ACTIVE" && !hasFirstGpsPoint);
  const isPaused = sessionStatus === "PAUSED";

  return (
    <div className="page-in min-h-screen bg-background text-foreground pb-16">
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft size={14} /> Back to Portal
          </Link>
          <span className="mono text-[10px] font-extrabold uppercase tracking-[0.2em] rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
            Driver GPS Console
          </span>
        </div>

        <div className="mt-4">
          <PageHeading
            eyebrow="Real-Time Bus Tracking Engine"
            title="Driver GPS Console"
            description="Broadcast your device's genuine satellite GPS coordinates directly to the ACMIS live network. Students track this vehicle in real time with zero simulation."
          />
        </div>

        {mobileDeviceConnected && (
          <div
            className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-900 dark:text-emerald-100"
            data-testid="driver-gps-connected"
          >
            <Smartphone size={20} className="shrink-0 text-emerald-600" />
            <span>
              GPS connected
              {mobileLinkSource === "simulator"
                ? " (demo — simulated fixes along route)"
                : " (live device GPS)"}
            </span>
            <span className="ml-auto hidden sm:inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700">
              <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-500" />
              LINKED
            </span>
          </div>
        )}

        {/* CONNECTION MONITORING STRIP */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {/* GPS Connection */}
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GPS Status</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-black">
              {gpsConnection === "CONNECTED" ? (
                <>
                  <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-emerald-700 dark:text-emerald-300">CONNECTED</span>
                </>
              ) : gpsConnection === "POOR" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-amber-700 dark:text-amber-300">POOR SIGNAL</span>
                </>
              ) : gpsConnection === "WAITING" ? (
                <>
                  <RefreshCw size={12} className="animate-spin text-accent" />
                  <span className="text-foreground">WAITING FIX</span>
                </>
              ) : gpsConnection === "DENIED" ? (
                <>
                  <AlertTriangle size={12} className="text-destructive" />
                  <span className="text-destructive">PERMISSION DENIED</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="text-muted-foreground">STANDBY</span>
                </>
              )}
            </div>
          </div>

          {/* Backend Connection */}
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Backend</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-black">
              {backendConnection === "CONNECTED" ? (
                <>
                  <Wifi size={12} className="text-emerald-500" />
                  <span className="text-emerald-700 dark:text-emerald-300">CONNECTED</span>
                </>
              ) : (
                <>
                  <WifiOff size={12} className="text-destructive" />
                  <span className="text-destructive">OFFLINE</span>
                </>
              )}
            </div>
          </div>

          {/* Realtime Stream */}
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Realtime</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-black">
              {realtimeConnection === "CONNECTED" ? (
                <>
                  <Radio size={12} className="text-emerald-500 animate-pulse" />
                  <span className="text-emerald-700 dark:text-emerald-300">STREAMING</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="text-muted-foreground">OFFLINE</span>
                </>
              )}
            </div>
          </div>

          {/* Session State */}
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Session</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-black">
              {isTrackingActive ? (
                <span className="text-emerald-700 dark:text-emerald-300">ACTIVE</span>
              ) : isPaused ? (
                <span className="text-amber-700 dark:text-amber-300">PAUSED</span>
              ) : isWaitingForGps ? (
                <span className="text-accent-foreground">WAITING GPS</span>
              ) : (
                <span className="text-muted-foreground">IDLE</span>
              )}
            </div>
          </div>
        </div>

        {/* OFFLINE QUEUE NOTICE */}
        {offlineQueueCount > 0 && (
          <div className="mt-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs flex items-center justify-between text-amber-950 dark:text-amber-100">
            <div className="flex items-center gap-2">
              <WifiOff size={15} className="text-amber-600 shrink-0" />
              <span>
                <strong>{offlineQueueCount}</strong> GPS fixes queued offline. Will upload automatically upon reconnection with original timestamps.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                flushOfflineGpsQueue(selectedBusId).then(() => setOfflineQueueCount(getOfflineGpsQueueCount()));
              }}
              className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-amber-700"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* Console Container */}
        <div className="mt-5 space-y-5">
          {/* Vehicle & Driver Selector */}
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                Assigned Vehicle &amp; Driver
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Smartphone size={14} className="text-accent-foreground" />
                <span>Verified Association</span>
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Select Bus</label>
                <select
                  disabled={sessionStatus !== "IDLE" && sessionStatus !== "ENDED"}
                  value={selectedBusId}
                  onChange={(e) => setSelectedBusId(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  {buses?.map((bus) => (
                    <option key={bus.id} value={bus.id}>
                      Bus #{bus.busNumber} — {bus.routeLabel} ({bus.destination})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground">Driver Call Sign</label>
                <input
                  type="text"
                  disabled={sessionStatus !== "IDLE" && sessionStatus !== "ENDED"}
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
              </div>
            </div>

            {selectedBus && (
              <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  Route: <strong className="text-foreground">{selectedBus.origin}</strong> →{" "}
                  <strong className="text-foreground">{selectedBus.destination}</strong>
                </span>
                <span className="font-bold text-foreground">Next: {selectedBus.nextStop}</span>
              </div>
            )}
          </div>

          {/* Primary Action Buttons */}
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-md text-center space-y-3">
            {sessionStatus === "IDLE" || sessionStatus === "ENDED" ? (
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={startTracking}
                  data-testid="button-start-driver-gps"
                  className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-accent px-6 text-base font-extrabold text-accent-foreground shadow-lg transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Radio size={22} className="animate-pulse" />
                  <span>Start live tracking (device GPS)</span>
                </button>
                <button
                  type="button"
                  onClick={() => void startSimulatorTracking()}
                  data-testid="button-simulate-driver-gps"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-muted/50 px-6 text-sm font-extrabold text-foreground hover:bg-muted"
                >
                  <Smartphone size={18} />
                  <span>Simulate GPS along route (demo)</span>
                </button>
                <p className="text-[11px] text-muted-foreground">
                  Use the demo simulator on a laptop: posts real coordinates to the backend so students see live ETA on My bus.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 sm:flex-row">
                {isPaused ? (
                  <button
                    type="button"
                    onClick={resumeTracking}
                    className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-extrabold text-white shadow-md hover:bg-emerald-700"
                  >
                    <Play size={18} />
                    <span>Resume Tracking</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pauseTracking}
                    className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-secondary px-5 text-sm font-extrabold text-secondary-foreground hover:bg-muted"
                  >
                    <Pause size={18} />
                    <span>Pause Tracking</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={stopTracking}
                  data-testid="button-stop-driver-gps"
                  className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-destructive px-5 text-sm font-extrabold text-destructive-foreground shadow-md hover:opacity-90"
                >
                  <Power size={18} />
                  <span>Stop Tracking</span>
                </button>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              {isWaitingForGps ? (
                <span className="font-extrabold text-accent-foreground flex items-center justify-center gap-1.5">
                  <RefreshCw size={13} className="animate-spin" />
                  Waiting for GPS... (Acquiring device satellite fix)
                </span>
              ) : isTrackingActive ? (
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  Live Tracking Active · Telemetry streaming to students
                </span>
              ) : isPaused ? (
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  Tracking is Paused · Location updates paused without ending session
                </span>
              ) : (
                "Tap Start to request location permission and initiate live satellite broadcast."
              )}
            </div>
          </div>

          {/* LIVE TELEMETRY DISPLAY */}
          {(sessionStatus === "ACTIVE" || sessionStatus === "PAUSED" || sessionStatus === "STARTING") && (
            <div className="rounded-[28px] border-2 border-accent/70 bg-card p-6 shadow-xl space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${isTrackingActive ? "bg-emerald-500 pulse-dot" : "bg-amber-400"}`} />
                  <span className="mono text-xs font-extrabold uppercase tracking-wider text-foreground">
                    {isWaitingForGps ? "Waiting for First GPS Point" : isPaused ? "Telemetry Paused" : "Live Device GPS Fix"}
                  </span>
                </div>
                <span className="mono text-[11px] font-bold text-muted-foreground">
                  Pings Sent: <strong className="text-foreground">{pingCount}</strong>
                </span>
              </div>

              {lastCoords ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground">
                        <MapPin size={12} className="text-accent-foreground" />
                        <span>Latitude / Longitude</span>
                      </div>
                      <div className="mono mt-1 text-sm font-extrabold text-foreground">
                        {lastCoords.latitude}, {lastCoords.longitude}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-background p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground">
                        <Gauge size={12} className="text-accent-foreground" />
                        <span>Ground Speed</span>
                      </div>
                      <div className="mono mt-1 text-sm font-extrabold text-foreground">
                        {lastCoords.speed ?? 0} <span className="text-xs font-bold text-muted-foreground">km/h</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-background p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground">
                        <Signal size={12} className="text-accent-foreground" />
                        <span>GPS Accuracy</span>
                      </div>
                      <div className="mono mt-1 text-sm font-extrabold text-foreground">
                        ±{lastCoords.accuracy ?? 5} <span className="text-xs font-bold text-muted-foreground">m</span>
                        <span className={`ml-1.5 text-[10px] font-black uppercase ${
                          lastCoords.quality === "HIGH" ? "text-emerald-600" : lastCoords.quality === "ACCEPTABLE" ? "text-foreground" : "text-amber-500"
                        }`}>
                          ({lastCoords.quality})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Network Delay and Heading Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-border pt-3 text-muted-foreground">
                    <div>
                      Network Transit Delay:{" "}
                      <strong className="text-foreground">
                        {lastCoords.networkDelayMs ? `${lastCoords.networkDelayMs} ms` : "< 50 ms"}
                      </strong>
                    </div>
                    <div className="text-right">
                      Compass Heading:{" "}
                      <strong className="text-foreground">
                        {lastCoords.heading !== null ? `${lastCoords.heading}°` : "N/A"}
                      </strong>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground animate-pulse space-y-2">
                  <Compass size={24} className="mx-auto text-accent-foreground animate-spin" />
                  <div>Waiting for GPS... (Requesting position from phone hardware)</div>
                </div>
              )}

              {lastPingTime && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-2">
                  <span>Last server handshake:</span>
                  <span className="mono font-bold text-foreground">{lastPingTime}</span>
                </div>
              )}
            </div>
          )}

          {/* Geo Error Warning */}
          {geoError && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-bold text-destructive flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{geoError}</span>
            </div>
          )}

          {/* Quality Warning if Accuracy is Poor */}
          {lastCoords?.quality === "POOR" && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-amber-600" />
              <span>GPS accuracy is currently poor (±{lastCoords.accuracy}m). Move near a window or outdoors for better satellite reception.</span>
            </div>
          )}

          {/* Instructions Box */}
          <div className="rounded-2xl border border-border bg-muted/30 p-5 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <ShieldCheck size={14} className="text-accent-foreground" />
              <span>Two-Phone Physical Verification Guide</span>
            </div>
            <p>
              1. <strong>Phone B (Driver Phone):</strong> Keep this page open and tap <strong>Start Live Tracking</strong>.
            </p>
            <p>
              2. <strong>Phone A (Student Phone):</strong> Open <strong>Live Map</strong> or <strong>Today Dashboard</strong>.
            </p>
            <p>
              3. As Phone B moves, verified GPS coordinates stream to Supabase/Cloud SQL and push directly via Realtime to Phone A with no refresh needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
