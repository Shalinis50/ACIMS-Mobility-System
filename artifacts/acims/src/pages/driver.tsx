import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  AlertTriangle,
  Compass,
  Gauge,
  MapPin,
  Mountain,
  Pause,
  Play,
  Power,
  Radio,
  RefreshCw,
  ShieldCheck,
  Signal,
  Smartphone,
  Terminal,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useListBuses, getListBusesQueryKey } from "@workspace/api-client-react";
import { PageHeading, selectBus } from "@/components/acims-ui";
import { useAuth } from "@/lib/auth-context";
import {
  enqueueOfflineGpsPoint,
  flushOfflineGpsQueue,
  getOfflineGpsQueueCount,
  subscribeToBusLocation,
} from "@/lib/realtime-location";
import {
  createBrowserGpsTracker,
  type BrowserGpsTracker,
} from "@/gps/browserGpsTracker";
import type { BrowserGpsFix, GpsHardwareStatus } from "@/gps/gpsTypes";
import { upsertLiveBusLocation } from "@/lib/liveBusLocation";

export default function DriverTrackingPage() {
  const { profile, token } = useAuth();
  const { data: buses } = useListBuses({
    query: { queryKey: getListBusesQueryKey() },
  });

  const driverUserId = profile?.userId || "driver-arun";
  const [selectedBusId, setSelectedBusId] = useState(profile?.assignedBusId || "bus-12");
  const [driverName, setDriverName] = useState(profile?.name || "Driver Arun");
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  // Trip & GPS states
  const [sessionStatus, setSessionStatus] = useState<
    "IDLE" | "STARTING" | "ACTIVE" | "PAUSED" | "ENDED"
  >("IDLE");
  const [hasFirstGpsPoint, setHasFirstGpsPoint] = useState(false);

  // Explicit GPS hardware states required by specification
  const [gpsStatus, setGpsStatus] = useState<GpsHardwareStatus>("GPS DISCONNECTED");
  const [backendConnection, setBackendConnection] = useState<"CONNECTED" | "OFFLINE">("CONNECTED");
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  // Layer 1: Browser GPS Debug State
  const [lastFix, setLastFix] = useState<BrowserGpsFix | null>(null);
  const [lastGpsUpdateDisplay, setLastGpsUpdateDisplay] = useState<string>("Never");

  // Layer 2: Backend Upload Debug State
  const [uploadStatus, setUploadStatus] = useState<"IDLE" | "UPLOADING" | "SUCCESS" | "ERROR" | "QUEUED_OFFLINE">("IDLE");
  const [lastUploadDisplay, setLastUploadDisplay] = useState<string>("Never");
  const [lastHttpResponse, setLastHttpResponse] = useState<string>("—");
  const [pingCount, setPingCount] = useState(0);
  const [nextStopLabel, setNextStopLabel] = useState<string | null>(null);

  // Layer 3: Realtime SSE Debug State
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [lastSseReceivedDisplay, setLastSseReceivedDisplay] = useState<string>("Waiting for event...");
  const [lastSseCoords, setLastSseCoords] = useState<string | null>(null);

  const [geoError, setGeoError] = useState<string | null>(null);

  const trackerRef = useRef<BrowserGpsTracker | null>(null);
  const sessionStatusRef = useRef(sessionStatus);
  sessionStatusRef.current = sessionStatus;
  const activeTripIdRef = useRef<string | null>(activeTripId);
  activeTripIdRef.current = activeTripId;

  // Sync profile data
  useEffect(() => {
    if (profile?.role === "DRIVER") {
      if (profile.name) setDriverName(profile.name);
      if (profile.assignedBusId) {
        setSelectedBusId(profile.assignedBusId);
        selectBus(profile.assignedBusId);
      }
    }
  }, [profile]);

  const handleSelectBusChange = (nextBusId: string) => {
    setSelectedBusId(nextBusId);
    selectBus(nextBusId);
  };

  // Sync offline queue count
  useEffect(() => {
    setOfflineQueueCount(getOfflineGpsQueueCount());
  }, [pingCount]);

  // Subscribe to SSE stream for the selected bus to verify end-to-end RealtimeHub delivery
  useEffect(() => {
    if (!selectedBusId) return;
    const unsubscribe = subscribeToBusLocation(
      selectedBusId,
      (loc) => {
        if (loc && loc.recordedAt && new Date(loc.recordedAt).getTime() > 0) {
          setLastSseReceivedDisplay(
            `${new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })} (${loc.freshness})`
          );
          setLastSseCoords(
            `${Number(loc.latitude).toFixed(6)}, ${Number(loc.longitude).toFixed(6)}`
          );
          if (loc.nextStop) setNextStopLabel(loc.nextStop);
        }
      },
      (connected) => {
        setSseConnected(connected);
      }
    );
    return () => unsubscribe();
  }, [selectedBusId]);

  const selectedBus = buses?.find((b) => b.id === selectedBusId) ?? buses?.[0];

  /**
   * Stops BrowserGpsTracker watchPosition and ends the backend driver session
   */
  const stopTracking = useCallback(async () => {
    if (trackerRef.current) {
      trackerRef.current.stop();
      trackerRef.current = null;
    }
    setSessionStatus("ENDED");
    setGpsStatus("GPS DISCONNECTED");
    setHasFirstGpsPoint(false);
    setActiveTripId(null);

    try {
      const res = await fetch("/api/driver/session/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-acims-driver-id": driverUserId,
          "x-acims-user-id": driverUserId,
          "x-acims-role": "DRIVER",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ busId: selectedBusId }),
      });
      setLastHttpResponse(`POST /api/driver/session/stop → ${res.status}`);
    } catch {
      // Session stop will reconcile when online
    }
  }, [selectedBusId, driverUserId, token]);

  /**
   * Handles each real device GPS fix emitted by BrowserGpsTracker
   */
  const handleBrowserGpsFix = useCallback(
    async (fix: BrowserGpsFix) => {
      if (
        sessionStatusRef.current === "PAUSED" ||
        sessionStatusRef.current === "IDLE" ||
        sessionStatusRef.current === "ENDED"
      ) {
        return;
      }

      setHasFirstGpsPoint(true);
      setSessionStatus((prev) => (prev === "STARTING" ? "ACTIVE" : prev));
      setLastFix(fix);
      setLastGpsUpdateDisplay(
        new Date(fix.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );

      if (!navigator.onLine) {
        setBackendConnection("OFFLINE");
        setUploadStatus("QUEUED_OFFLINE");
        setLastHttpResponse("Offline — queued locally");
        enqueueOfflineGpsPoint({
          busId: selectedBusId,
          latitude: fix.latitude,
          longitude: fix.longitude,
          accuracy: fix.accuracy,
          altitude: fix.altitude,
          altitudeAccuracy: fix.altitudeAccuracy,
          speed: fix.speedKph,
          heading: fix.heading,
          timestamp: fix.recordedAt,
          driverId: driverUserId,
        });
        setOfflineQueueCount(getOfflineGpsQueueCount());
        return;
      }

      setUploadStatus("UPLOADING");
      const uploadRes = await upsertLiveBusLocation({
        busId: selectedBusId,
        tripId: activeTripIdRef.current,
        driverId: driverUserId,
        fix,
        token,
      });

      const timeStr = new Date(uploadRes.uploadedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastUploadDisplay(timeStr);

      if (uploadRes.ok) {
        setBackendConnection("CONNECTED");
        setUploadStatus("SUCCESS");
        setLastHttpResponse(`${uploadRes.httpStatus} OK (POST /api/bus/location)`);
        setPingCount((c) => c + 1);
        setGeoError(null);
        if (uploadRes.telemetry?.nextStop) {
          setNextStopLabel(uploadRes.telemetry.nextStop);
        }

        if (getOfflineGpsQueueCount() > 0) {
          flushOfflineGpsQueue(selectedBusId, driverUserId, token)
            .then(() => setOfflineQueueCount(getOfflineGpsQueueCount()))
            .catch(() => {});
        }
      } else if (uploadRes.httpStatus === 403) {
        setUploadStatus("ERROR");
        setLastHttpResponse(`403 Forbidden (${uploadRes.error})`);
        setGeoError(uploadRes.error || "Driver is not authorized for this bus.");
        await stopTracking();
      } else if (uploadRes.httpStatus === 400) {
        setUploadStatus("ERROR");
        setLastHttpResponse(`400 Bad Request (${uploadRes.error})`);
        setGeoError(uploadRes.error || "GPS point rejected by quality validation.");
      } else {
        setBackendConnection("OFFLINE");
        setUploadStatus("QUEUED_OFFLINE");
        setLastHttpResponse(
          uploadRes.httpStatus
            ? `${uploadRes.httpStatus} Error (${uploadRes.error})`
            : `Network Error (${uploadRes.error})`
        );
        enqueueOfflineGpsPoint({
          busId: selectedBusId,
          latitude: fix.latitude,
          longitude: fix.longitude,
          accuracy: fix.accuracy,
          altitude: fix.altitude,
          altitudeAccuracy: fix.altitudeAccuracy,
          speed: fix.speedKph,
          heading: fix.heading,
          timestamp: fix.recordedAt,
          driverId: driverUserId,
        });
        setOfflineQueueCount(getOfflineGpsQueueCount());
      }
    },
    [selectedBusId, driverUserId, token, stopTracking]
  );

  /**
   * START TRIP:
   * 1. Start ACMIS driver session (/api/driver/session/start)
   * 2. Start BrowserGpsTracker (navigator.geolocation.watchPosition with high accuracy)
   */
  const startTrip = async () => {
    if (trackerRef.current) {
      trackerRef.current.stop();
      trackerRef.current = null;
    }

    selectBus(selectedBusId);
    setGeoError(null);
    setSessionStatus("STARTING");
    setGpsStatus("GPS WAITING");
    setHasFirstGpsPoint(false);
    setUploadStatus("IDLE");

    try {
      const sessionRes = await fetch("/api/driver/session/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-acims-driver-id": driverUserId,
          "x-acims-user-id": driverUserId,
          "x-acims-role": "DRIVER",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ busId: selectedBusId, driverId: driverUserId }),
      });

      if (sessionRes.status === 403 || sessionRes.status === 400) {
        const errData = await sessionRes.json().catch(() => ({}));
        setLastHttpResponse(`${sessionRes.status} (${errData.error || "Session start failed"})`);
        setGeoError(errData.error || "Driver is not authorized to start a trip for this bus.");
        setSessionStatus("IDLE");
        setGpsStatus("GPS DISCONNECTED");
        return;
      }

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json().catch(() => ({}));
        const tripId = sessionData?.trip?.id || sessionData?.session?.id || null;
        setActiveTripId(tripId);
        activeTripIdRef.current = tripId;
        setBackendConnection("CONNECTED");
        setLastHttpResponse(`${sessionRes.status} OK (POST /api/driver/session/start)`);
      }
    } catch {
      setBackendConnection("OFFLINE");
      setLastHttpResponse("Offline on session start");
    }

    const tracker = createBrowserGpsTracker({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 2000,
      onFix: (fix) => {
        void handleBrowserGpsFix(fix);
      },
      onStatusChange: (status) => {
        setGpsStatus(status);
      },
      onError: (err) => {
        setGeoError(err.message);
        if (err.code === "PERMISSION_DENIED" || err.code === "UNSUPPORTED") {
          setSessionStatus("IDLE");
        }
      },
    });

    trackerRef.current = tracker;
    tracker.start();
  };

  /**
   * PAUSE TRIP
   */
  const pauseTrip = async () => {
    setSessionStatus("PAUSED");
    trackerRef.current?.pause();
    try {
      const res = await fetch("/api/driver/session/pause", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-acims-driver-id": driverUserId,
          "x-acims-user-id": driverUserId,
          "x-acims-role": "DRIVER",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ busId: selectedBusId }),
      });
      setLastHttpResponse(`POST /api/driver/session/pause → ${res.status}`);
    } catch {}
  };

  /**
   * RESUME TRIP
   */
  const resumeTrip = async () => {
    setSessionStatus("ACTIVE");
    trackerRef.current?.resume();
    try {
      const res = await fetch("/api/driver/session/resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-acims-driver-id": driverUserId,
          "x-acims-user-id": driverUserId,
          "x-acims-role": "DRIVER",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ busId: selectedBusId }),
      });
      setLastHttpResponse(`POST /api/driver/session/resume → ${res.status}`);
    } catch {}
  };

  // Cleanup tracker on unmount
  useEffect(() => {
    return () => {
      if (trackerRef.current) {
        trackerRef.current.stop();
        trackerRef.current = null;
      }
    };
  }, []);

  // Flush offline GPS queue when browser comes back online
  useEffect(() => {
    const handleOnline = () => {
      setBackendConnection("CONNECTED");
      flushOfflineGpsQueue(selectedBusId, driverUserId, token)
        .then(() => setOfflineQueueCount(getOfflineGpsQueueCount()))
        .catch(() => {});
    };
    const handleOffline = () => {
      setBackendConnection("OFFLINE");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [selectedBusId, driverUserId, token]);

  const isTrackingActive = sessionStatus === "ACTIVE" && hasFirstGpsPoint;
  const isWaitingForGps =
    sessionStatus === "STARTING" || (sessionStatus === "ACTIVE" && !hasFirstGpsPoint);
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
          <div className="flex items-center gap-2">
            <Link
              href="/map"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-primary hover:bg-muted transition"
            >
              <MapPin size={12} /> Open Student Map
            </Link>
            <span className="mono text-[10px] font-extrabold uppercase tracking-[0.2em] rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
              Driver GPS Console
            </span>
          </div>
        </div>

        <div className="mt-4">
          <PageHeading
            eyebrow="Real-Time Bus Tracking Engine"
            title="Driver GPS Console"
            description="Captures real hardware GPS coordinates via browserGpsTracker (watchPosition) and streams them to ACMIS PostgreSQL, realtimeHub SSE, and Student Google Maps."
          />
        </div>

        {/* PROMINENT GPS HARDWARE STATUS BANNER */}
        <div
          data-testid="driver-gps-status-banner"
          className={`mt-6 flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-extrabold transition ${
            gpsStatus === "GPS CONNECTED"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
              : gpsStatus === "GPS WAITING"
              ? "border-blue-500/40 bg-blue-500/10 text-blue-900 dark:text-blue-100"
              : gpsStatus === "GPS POOR ACCURACY"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
              : gpsStatus === "GPS DENIED"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-card text-muted-foreground"
          }`}
        >
          <Smartphone
            size={20}
            className={`shrink-0 ${
              gpsStatus === "GPS CONNECTED"
                ? "text-emerald-600"
                : gpsStatus === "GPS WAITING"
                ? "text-blue-600 animate-pulse"
                : gpsStatus === "GPS POOR ACCURACY"
                ? "text-amber-600"
                : gpsStatus === "GPS DENIED"
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span data-testid="driver-gps-status-text">{gpsStatus}</span>
            <span className="text-xs font-medium opacity-80">
              {gpsStatus === "GPS CONNECTED" &&
                `· Live satellite lock (±${lastFix?.accuracy ?? 10}m)`}
              {gpsStatus === "GPS WAITING" &&
                (isPaused
                  ? "· Trip paused — GPS transmission on hold"
                  : "· Acquiring high-accuracy satellite fix from device...")}
              {gpsStatus === "GPS POOR ACCURACY" &&
                `· Accuracy ±${lastFix?.accuracy ?? "?"}m — move near a window or outdoors`}
              {gpsStatus === "GPS DENIED" &&
                "· Location permission blocked by browser or phone settings"}
              {gpsStatus === "GPS DISCONNECTED" &&
                "· Start trip to begin capturing real device GPS"}
            </span>
          </div>
          {gpsStatus === "GPS CONNECTED" && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-300">
              <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-emerald-500" />
              LIVE
            </span>
          )}
        </div>

        {/* OFFLINE QUEUE NOTICE */}
        {offlineQueueCount > 0 && (
          <div className="mt-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs flex items-center justify-between text-amber-950 dark:text-amber-100">
            <div className="flex items-center gap-2">
              <WifiOff size={15} className="text-amber-600 shrink-0" />
              <span>
                <strong>{offlineQueueCount}</strong> real GPS fixes queued offline. Will upload automatically upon reconnection.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                flushOfflineGpsQueue(selectedBusId, driverUserId, token).then(() =>
                  setOfflineQueueCount(getOfflineGpsQueueCount())
                );
              }}
              className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-amber-700"
            >
              Sync Now
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
                <span>Driver: {driverUserId}</span>
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Select Bus</label>
                <select
                  disabled={sessionStatus !== "IDLE" && sessionStatus !== "ENDED"}
                  value={selectedBusId}
                  onChange={(e) => handleSelectBusChange(e.target.value)}
                  data-testid="select-driver-bus"
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
                <label className="text-xs font-bold text-muted-foreground">Driver Name</label>
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
              <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
                <span>
                  Route: <strong className="text-foreground">{selectedBus.origin}</strong> →{" "}
                  <strong className="text-foreground">{selectedBus.destination}</strong>
                </span>
                <span className="font-bold text-foreground">
                  Next Stop: {nextStopLabel || selectedBus.nextStop}
                </span>
              </div>
            )}
          </div>

          {/* Primary Trip Control Buttons (START TRIP / PAUSE / RESUME / STOP) */}
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-md text-center space-y-3">
            {sessionStatus === "IDLE" || sessionStatus === "ENDED" ? (
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => void startTrip()}
                  data-testid="button-start-driver-gps"
                  className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-accent px-6 text-base font-extrabold text-accent-foreground shadow-lg transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Radio size={22} className="animate-pulse" />
                  <span>START TRIP (Real Phone GPS)</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 sm:flex-row">
                {isPaused ? (
                  <button
                    type="button"
                    onClick={() => void resumeTrip()}
                    data-testid="button-resume-driver-gps"
                    className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-extrabold text-white shadow-md hover:bg-emerald-700"
                  >
                    <Play size={18} />
                    <span>RESUME TRIP</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void pauseTrip()}
                    data-testid="button-pause-driver-gps"
                    className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-secondary px-5 text-sm font-extrabold text-secondary-foreground hover:bg-muted"
                  >
                    <Pause size={18} />
                    <span>PAUSE TRIP</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void stopTracking()}
                  data-testid="button-stop-driver-gps"
                  className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-destructive px-5 text-sm font-extrabold text-destructive-foreground shadow-md hover:opacity-90"
                >
                  <Power size={18} />
                  <span>STOP TRIP</span>
                </button>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              {isWaitingForGps ? (
                <span className="font-extrabold text-foreground flex items-center justify-center gap-1.5">
                  <RefreshCw size={13} className="animate-spin" />
                  GPS WAITING · Acquiring high-accuracy satellite fix from device...
                </span>
              ) : isTrackingActive ? (
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  {gpsStatus} · Streaming live coordinates to ACMIS backend &amp; student map
                </span>
              ) : isPaused ? (
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  Trip Paused · GPS transmission paused until you tap RESUME TRIP
                </span>
              ) : (
                "Tap START TRIP to request device GPS permission and begin live bus tracking."
              )}
            </div>
          </div>

          {/* DRIVER DEBUG INFORMATION PANEL (GPS -> BACKEND -> REALTIME) */}
          <div
            data-testid="driver-debug-panel"
            className="rounded-[28px] border-2 border-border bg-card p-6 shadow-md space-y-5"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-primary" />
                <span className="mono text-xs font-extrabold uppercase tracking-wider text-foreground">
                  Live Pipeline Diagnostics (GPS → Backend → Realtime)
                </span>
              </div>
              <span className="mono text-[11px] font-bold text-muted-foreground">
                Pings Sent: <strong className="text-foreground">{pingCount}</strong>
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* 1. GPS Layer */}
              <div className="rounded-2xl border border-border bg-background p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="mono text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    1. GPS (Browser)
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      gpsStatus === "GPS CONNECTED"
                        ? "bg-emerald-500 pulse-dot"
                        : gpsStatus === "GPS POOR ACCURACY"
                        ? "bg-amber-500"
                        : gpsStatus === "GPS WAITING"
                        ? "bg-blue-500 animate-pulse"
                        : "bg-muted-foreground"
                    }`}
                  />
                </div>
                <dl className="space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Latitude:</dt>
                    <dd className="mono font-bold text-foreground" data-testid="debug-gps-lat">
                      {lastFix ? lastFix.latitude.toFixed(6) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Longitude:</dt>
                    <dd className="mono font-bold text-foreground" data-testid="debug-gps-lng">
                      {lastFix ? lastFix.longitude.toFixed(6) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Accuracy:</dt>
                    <dd className="mono font-bold text-foreground" data-testid="debug-gps-accuracy">
                      {lastFix?.accuracy != null ? `±${lastFix.accuracy} m` : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Speed:</dt>
                    <dd className="mono font-bold text-foreground" data-testid="debug-gps-speed">
                      {lastFix?.speedKph != null ? `${lastFix.speedKph} km/h` : "0 km/h"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Bearing / Heading:</dt>
                    <dd className="mono font-bold text-foreground" data-testid="debug-gps-heading">
                      {(lastFix?.bearing ?? lastFix?.heading) != null
                        ? `${lastFix?.bearing ?? lastFix?.heading}°`
                        : "N/A"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 pt-1 border-t border-border/60">
                    <dt className="text-muted-foreground">Last GPS update:</dt>
                    <dd className="mono font-bold text-foreground" data-testid="debug-gps-time">
                      {lastGpsUpdateDisplay}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* 2. Backend Layer */}
              <div className="rounded-2xl border border-border bg-background p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="mono text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    2. Backend &amp; DB
                  </span>
                  {backendConnection === "CONNECTED" ? (
                    <Wifi size={13} className="text-emerald-500" />
                  ) : (
                    <WifiOff size={13} className="text-destructive" />
                  )}
                </div>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Upload status:</dt>
                    <dd
                      data-testid="debug-backend-status"
                      className={`mono font-extrabold ${
                        uploadStatus === "SUCCESS"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : uploadStatus === "ERROR"
                          ? "text-destructive"
                          : uploadStatus === "UPLOADING"
                          ? "text-blue-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {uploadStatus}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Last upload:</dt>
                    <dd className="mono font-bold text-foreground" data-testid="debug-backend-time">
                      {lastUploadDisplay}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Trip ID:</dt>
                    <dd className="mono font-bold text-foreground truncate max-w-[110px]">
                      {activeTripId || "session-auto"}
                    </dd>
                  </div>
                  <div className="pt-1 border-t border-border/60">
                    <div className="text-muted-foreground text-[10px]">HTTP response:</div>
                    <div
                      data-testid="debug-backend-http"
                      className="mono mt-0.5 text-[11px] font-bold text-foreground break-all"
                    >
                      {lastHttpResponse}
                    </div>
                  </div>
                </dl>
              </div>

              {/* 3. Realtime Layer */}
              <div className="rounded-2xl border border-border bg-background p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="mono text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    3. Socket.IO &amp; SSE Room
                  </span>
                  <Radio
                    size={13}
                    className={
                      sseConnected
                        ? "text-emerald-500 animate-pulse"
                        : "text-muted-foreground"
                    }
                  />
                </div>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Room status:</dt>
                    <dd
                      data-testid="debug-sse-status"
                      className={`mono font-extrabold ${
                        sseConnected
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600"
                      }`}
                    >
                      {sseConnected ? `CONNECTED (bus:${selectedBusId})` : "RECONNECTING"}
                    </dd>
                  </div>
                  <div className="pt-1 border-t border-border/60">
                    <div className="text-muted-foreground text-[10px]">Last received update:</div>
                    <div
                      data-testid="debug-sse-last-update"
                      className="mono mt-0.5 text-[11px] font-bold text-foreground"
                    >
                      {lastSseReceivedDisplay}
                    </div>
                  </div>
                  {lastSseCoords && (
                    <div className="pt-1 border-t border-border/60">
                      <div className="text-muted-foreground text-[10px]">Broadcast Coords:</div>
                      <div className="mono mt-0.5 text-[11px] font-bold text-foreground">
                        {lastSseCoords}
                      </div>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>

          {/* Geo Error Warning */}
          {geoError && (
            <div
              data-testid="driver-gps-error"
              className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-bold text-destructive flex items-center gap-2"
            >
              <AlertTriangle size={16} className="shrink-0" />
              <span>{geoError}</span>
            </div>
          )}

          {/* Quality Warning if Accuracy is Poor */}
          {gpsStatus === "GPS POOR ACCURACY" && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-amber-600" />
              <span>
                GPS POOR ACCURACY (±{lastFix?.accuracy}m). Move near a window or outdoors for stronger satellite lock.
              </span>
            </div>
          )}

          {/* Two-Phone Verification Guide */}
          <div className="rounded-2xl border border-border bg-muted/30 p-5 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <ShieldCheck size={14} className="text-accent-foreground" />
              <span>Two-Phone Physical Verification Guide</span>
            </div>
            <p>
              1. <strong>Phone A (Driver):</strong> Open <code>/driver</code>, select your bus, tap <strong>START TRIP</strong>, allow GPS access, and walk outdoors.
            </p>
            <p>
              2. <strong>Phone B (Student):</strong> Open <code>/map</code> and select the <strong>SAME bus</strong>.
            </p>
            <p>
              3. Phone A&apos;s real GPS flows through <code>browserGpsTracker.ts</code> → <code>POST /api/bus/location</code> → PostgreSQL → <code>realtimeHub</code> SSE → Phone B Google Maps moving bus marker with zero page refresh.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
