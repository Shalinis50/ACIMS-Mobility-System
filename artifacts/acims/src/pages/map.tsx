import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  BusFront,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  Clock3,
  Smartphone,
  UserCheck,
} from "lucide-react";
import {
  useListBuses,
  getListBusesQueryKey,
} from "@workspace/api-client-react";
import {
  ErrorState,
  LoadingRows,
  PageHeading,
  selectBus,
  useSelectedBusId,
} from "@/components/acims-ui";
import { useNetworkStatus } from "@/hooks/use-network";
import { OfflineMobilityView } from "@/components/offline-mobility-view";
import { saveLastKnownBusSnapshot } from "@/lib/offline-storage";
import { useBusRealtimeLocation } from "@/lib/realtime-location";
import {
  normalizeAcimsRoute,
  type RoutePathCoordinate,
  type RouteStopModel,
} from "@/routes/routeTypes";
import { estimateEta } from "@/eta/estimateEta";
import { GoogleBusMap } from "@/maps/GoogleBusMap";

export default function LiveMap() {
  const { isOnline } = useNetworkStatus();
  const selectedBusId = useSelectedBusId();
  const busesQuery = useListBuses({
    query: { enabled: isOnline, queryKey: getListBusesQueryKey() },
  });

  // Support ?busId= query parameter for direct linking from My Bus or Driver page
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlBusId = params.get("busId");
    if (urlBusId) {
      selectBus(urlBusId);
    }
  }, []);

  const activeBusId = selectedBusId || busesQuery.data?.[0]?.id || "bus-12";

  const bus = useMemo(() => {
    return (
      busesQuery.data?.find((b) => b.id === activeBusId) ??
      busesQuery.data?.[0]
    );
  }, [busesQuery.data, activeBusId]);

  const effectiveBusId = bus?.id ?? activeBusId;

  // Realtime SSE Location Hook (GET /api/realtime/bus/:busId)
  const {
    location,
    routeDetails,
    freshness,
    isRealtimeConnected,
  } = useBusRealtimeLocation(effectiveBusId, isOnline);

  // Student's own real device GPS location for Google Map display
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  } | null>(null);
  const [centerOnUserTrigger, setCenterOnUserTrigger] = useState(0);
  const [followBus, setFollowBus] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Cache bus state for offline view
  useEffect(() => {
    if (bus) {
      saveLastKnownBusSnapshot(bus);
    }
  }, [bus]);

  const normalizedRoute = useMemo(
    () => normalizeAcimsRoute(routeDetails, effectiveBusId),
    [routeDetails, effectiveBusId]
  );

  const busNumber =
    location?.busNumber ||
    normalizedRoute?.busNumber ||
    bus?.busNumber ||
    effectiveBusId.replace("bus-", "");
  const routeName =
    location?.routeName ||
    normalizedRoute?.name ||
    bus?.routeLabel ||
    "Campus Transit Line";
  const origin =
    location?.origin ||
    normalizedRoute?.origin ||
    bus?.origin ||
    "Route Origin";
  const destination =
    location?.destination ||
    normalizedRoute?.destination ||
    bus?.destination ||
    "Campus Terminal";

  const stops: RouteStopModel[] = useMemo(
    () => normalizedRoute?.stops ?? [],
    [normalizedRoute]
  );

  const path: RoutePathCoordinate[] = useMemo(
    () => normalizedRoute?.path ?? [],
    [normalizedRoute]
  );

  const hasVerifiedGps =
    Boolean(location) &&
    location?.source === "real-device-gps" &&
    freshness.statusBadge !== "UNAVAILABLE";

  const currentBusCoord: RoutePathCoordinate | null = useMemo(() => {
    if (location && typeof location.latitude === "number" && typeof location.longitude === "number") {
      return { latitude: location.latitude, longitude: location.longitude };
    }
    if (stops.length > 0) {
      return { latitude: stops[0].latitude, longitude: stops[0].longitude };
    }
    return null;
  }, [location, stops]);

  // Split route path into Traveled vs Remaining based on live bus pathIndex
  const busPathIndex = location?.pathIndex ?? 0;

  const traveledPathCoords: RoutePathCoordinate[] = useMemo(() => {
    if (path.length === 0) return [];
    const subset = path.slice(0, Math.min(path.length, busPathIndex + 1));
    if (currentBusCoord && subset.length > 0) {
      return [...subset, currentBusCoord];
    }
    return subset;
  }, [path, busPathIndex, currentBusCoord]);

  const remainingPathCoords: RoutePathCoordinate[] = useMemo(() => {
    if (path.length === 0) return [];
    const subset = path.slice(Math.max(0, busPathIndex));
    if (currentBusCoord && subset.length > 0) {
      return [currentBusCoord, ...subset];
    }
    return subset;
  }, [path, busPathIndex, currentBusCoord]);

  // Compute fallback Haversine ETA via adapted estimateEta.ts if needed (never on fake coordinates)
  const targetStopModel = useMemo(() => {
    if (stops.length === 0) return null;
    return (
      stops.find((s) => s.id === location?.nextStopId) ||
      stops[location?.stopSequenceIndex ?? 0] ||
      stops[0]
    );
  }, [stops, location]);

  const fallbackEta = useMemo(() => {
    if (!targetStopModel) return null;
    return estimateEta({
      busLocation:
        hasVerifiedGps && location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
              speedKph: location.speed,
            }
          : null,
      targetStop: targetStopModel,
      freshness: freshness.statusBadge,
    });
  }, [targetStopModel, hasVerifiedGps, location, freshness.statusBadge]);

  if (!isOnline) {
    return (
      <OfflineMobilityView
        initialTab="routes"
        selectedBusId={effectiveBusId}
      />
    );
  }

  if (busesQuery.isLoading && !bus) return <LoadingRows count={4} />;
  if (busesQuery.isError)
    return <ErrorState onRetry={() => void busesQuery.refetch()} />;

  const nextStopName =
    location?.nextStop ||
    targetStopModel?.name ||
    bus?.nextStop ||
    "Awaiting route stop";
  const prevStopName =
    location?.previousStop || stops[0]?.name || origin;
  const isAtStop = location?.isAtStop ?? fallbackEta?.isAtStop ?? false;
  const formattedEta = hasVerifiedGps
    ? location?.formattedEta ||
      fallbackEta?.formattedEta ||
      `${location?.etaMinutes ?? 1} min`
    : "Waiting for live GPS";

  return (
    <div className="page-in space-y-6">
      {/* Page Header */}
      <PageHeading
        eyebrow="Real-Time Campus Transit"
        title="Live Bus Tracking"
        description="Live Google Maps bus tracking powered by real onboard driver GPS, PostgreSQL persistence, and instant Server-Sent Events (SSE)."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Bus Selector so Student Phone B can select the exact same bus as Driver Phone A */}
            {busesQuery.data && busesQuery.data.length > 0 && (
              <select
                value={effectiveBusId}
                onChange={(e) => selectBus(e.target.value)}
                data-testid="select-student-map-bus"
                aria-label="Select bus to track"
                className="h-9 rounded-full border border-border bg-card px-3 text-xs font-extrabold text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                {busesQuery.data.map((b) => (
                  <option key={b.id} value={b.id}>
                    Bus #{b.busNumber} — {b.routeLabel}
                  </option>
                ))}
              </select>
            )}

            {/* Live / Recent / Stale / Unavailable Freshness Badge */}
            {freshness.statusBadge === "LIVE" ? (
              <div
                data-testid="badge-status-live"
                className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 shadow-xs"
              >
                <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-500" />
                <span>LIVE</span>
                <span className="text-[10px] font-medium text-emerald-700/80 dark:text-emerald-400/80">
                  · {freshness.freshnessLabel}
                </span>
              </div>
            ) : freshness.statusBadge === "RECENT" ? (
              <div
                data-testid="badge-status-recent"
                className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/15 px-3 py-1.5 text-xs font-extrabold text-blue-800 dark:text-blue-300"
              >
                <Clock3 size={13} className="text-blue-600 dark:text-blue-400" />
                <span>RECENT</span>
                <span className="text-[10px] font-medium text-blue-700/80 dark:text-blue-400/80">
                  · {freshness.freshnessLabel}
                </span>
              </div>
            ) : freshness.statusBadge === "STALE" ? (
              <div
                data-testid="badge-status-stale"
                className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-xs font-extrabold text-amber-800 dark:text-amber-300"
              >
                <Clock3 size={13} className="text-amber-600 dark:text-amber-400" />
                <span>STALE</span>
                <span className="text-[10px] font-medium text-amber-700/80 dark:text-amber-400/80">
                  · {freshness.freshnessLabel}
                </span>
              </div>
            ) : (
              <div
                data-testid="badge-status-unavailable"
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-extrabold text-muted-foreground"
              >
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                <span>UNAVAILABLE · {freshness.freshnessLabel}</span>
              </div>
            )}

            {/* Link to Driver Console */}
            <Link
              href="/driver"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition"
              title="Open Driver Phone Console"
            >
              <Smartphone size={13} className="text-accent-foreground" />
              <span>Driver Console</span>
            </Link>
          </div>
        }
      />

      {/* Primary Live Card Banner */}
      <section className="rounded-[28px] border-2 border-primary/20 bg-card p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-primary text-accent shadow-md">
              <BusFront size={28} strokeWidth={2.4} />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-black text-primary">
                {busNumber}
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="display-font text-2xl font-black text-foreground sm:text-3xl">
                  Bus {busNumber}
                </h2>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-extrabold text-secondary-foreground">
                  {routeName}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-black ${
                    isRealtimeConnected
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/15 text-amber-700"
                  }`}
                >
                  {isRealtimeConnected ? `SOCKET.IO ROOM bus:${effectiveBusId}` : "SOCKET RECONNECTING"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <span>{origin}</span>
                <span className="text-border">→</span>
                <span>{destination}</span>
              </div>
            </div>
          </div>

          {/* Next Stop & Geographic ETA Card */}
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-muted/30 p-4 sm:gap-8">
            <div>
              <div className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Next stop
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-base font-extrabold text-foreground sm:text-lg">
                <MapPin size={17} className="text-accent-foreground shrink-0" />
                <span data-testid="live-map-next-stop">{nextStopName}</span>
                {isAtStop && hasVerifiedGps && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                    At Stop
                  </span>
                )}
              </div>
            </div>

            <div className="border-l border-border pl-4 sm:pl-8">
              <div className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {hasVerifiedGps
                  ? `${location?.etaLabel || "LIVE ETA"} (Haversine)`
                  : "ETA STATUS"}
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span
                  data-testid="live-map-eta"
                  className="text-base font-extrabold text-primary dark:text-accent sm:text-lg"
                >
                  {formattedEta}
                </span>
                {hasVerifiedGps &&
                  location?.etaConfidence &&
                  location.etaConfidence !== "UNAVAILABLE" && (
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        location.etaConfidence === "HIGH"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {location.etaConfidence}
                    </span>
                  )}
              </div>
            </div>

            {hasVerifiedGps && location?.remainingDistanceKm !== undefined && (
              <div className="hidden border-l border-border pl-4 sm:block sm:pl-8">
                <div className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Distance
                </div>
                <div className="mt-0.5 text-base font-extrabold text-foreground sm:text-lg">
                  {location.remainingDistanceKm} km
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Google Map & Stop Sequence Layout */}
      <section className="grid gap-6 xl:grid-cols-[1.5fr_.7fr]">
        {/* Google Maps Container */}
        <div className="relative min-h-[520px] overflow-hidden rounded-[28px] border border-border bg-secondary/30 p-3 sm:p-5">
          {/* Top-Left Floating Info Overlay */}
          <div className="pointer-events-none absolute left-6 top-6 z-10 flex flex-col gap-1 rounded-2xl border border-border bg-card/95 px-4 py-2.5 shadow-md backdrop-blur-md">
            <div className="mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Google Maps Live Corridor
            </div>
            <div className="flex items-center gap-2 text-sm font-black text-foreground">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-accent text-xs font-bold">
                {busNumber}
              </span>
              <span>{routeName}</span>
            </div>
            {hasVerifiedGps && location && (
              <div
                data-testid="live-map-bus-coords"
                className="font-mono text-[10px] font-bold text-muted-foreground"
              >
                GPS: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                {location.speed != null ? ` · ${location.speed} km/h` : ""}
              </div>
            )}
          </div>

          {/* Top-Right Camera Controls */}
          <div className="absolute right-6 top-6 z-10 flex items-center gap-2">
            {userLocation && (
              <button
                type="button"
                onClick={() => {
                  setFollowBus(false);
                  setCenterOnUserTrigger((c) => c + 1);
                }}
                title="Center on my current location"
                data-testid="button-center-user-location"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/95 px-3 py-2 text-xs font-extrabold text-foreground shadow-sm backdrop-blur hover:bg-card transition"
              >
                <UserCheck size={14} className="text-blue-600" />
                <span className="hidden sm:inline">My Location</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setFollowBus((prev) => !prev)}
              title={
                followBus
                  ? "Follow Bus Mode: Enabled"
                  : "Follow Bus Mode: Click to Enable"
              }
              data-testid="button-toggle-follow-bus"
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-extrabold shadow-sm backdrop-blur transition ${
                followBus
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card/95 text-muted-foreground hover:bg-card"
              }`}
            >
              <LocateFixed
                size={14}
                className={followBus ? "animate-pulse" : ""}
              />
              <span>{followBus ? "Following Bus" : "Follow Bus"}</span>
            </button>
          </div>

          {/* Google Maps Visualizer */}
          <GoogleBusMap
            busId={effectiveBusId}
            busNumber={busNumber}
            stops={stops}
            traveledPath={traveledPathCoords}
            remainingPath={remainingPathCoords}
            fullPath={path}
            location={location}
            userLocation={userLocation}
            followBus={followBus}
            centerOnUserTrigger={centerOnUserTrigger}
          />

          {/* Bottom Map Legend */}
          <div className="pointer-events-none absolute bottom-5 left-5 right-5 z-10 flex flex-wrap items-center gap-3.5 rounded-2xl border border-border bg-card/95 px-4 py-2.5 text-[11px] font-bold shadow-md backdrop-blur-md">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-full bg-teal-700" />
              <span>Remaining Route</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-full bg-slate-500" />
              <span>Traveled Portion</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border-2 border-slate-900 bg-amber-400" />
              <span>Next Stop</span>
            </span>
            {userLocation && (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow" />
                <span>Your Location</span>
              </span>
            )}
            <span className="ml-auto flex items-center gap-1.5 text-muted-foreground">
              <Radio size={13} className="text-primary dark:text-accent" />
              <span>
                {hasVerifiedGps
                  ? `Real Device GPS (${freshness.statusBadge})`
                  : "Waiting for Driver GPS"}
              </span>
            </span>
          </div>
        </div>

        {/* Right Sidebar: Stop Sequence & Context */}
        <div className="rounded-[28px] border border-border bg-card p-6 sm:p-7">
          <div className="flex items-start justify-between">
            <div>
              <div className="mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Stop Sequence
              </div>
              <h3 className="mt-1 text-xl font-extrabold text-foreground">
                {stops.length} Route Stops
              </h3>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-extrabold text-secondary-foreground">
              {location?.status || "Standby"}
            </span>
          </div>

          {/* Timeline of Stops */}
          <div className="mt-6 space-y-0">
            {stops.map((stop, index) => {
              const isNext = stop.id === location?.nextStopId;
              const isPassed =
                hasVerifiedGps &&
                (stop.pathIndex ?? index * 6) < busPathIndex &&
                !isNext;
              const isThisStopActive = Boolean(
                hasVerifiedGps && isAtStop && isNext
              );

              return (
                <div
                  key={stop.id}
                  data-testid={`stop-timeline-row-${stop.id}`}
                  className="group relative flex gap-4 pb-6 last:pb-0"
                >
                  {/* Spine connection */}
                  <div className="relative flex w-4 justify-center">
                    <span
                      className={`z-10 mt-1 h-4 w-4 rounded-full border-4 transition-all ${
                        isThisStopActive
                          ? "border-emerald-500 bg-emerald-100 ring-4 ring-emerald-500/20"
                          : isNext
                          ? "border-accent-foreground bg-accent ring-4 ring-accent/30"
                          : isPassed
                          ? "border-slate-400 bg-slate-300 dark:bg-slate-700"
                          : "border-muted bg-card"
                      }`}
                    />
                    {index < stops.length - 1 && (
                      <span
                        className={`absolute top-4 h-full w-0.5 ${
                          isPassed
                            ? "bg-slate-400 dark:bg-slate-700"
                            : "bg-border"
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-extrabold ${
                          isNext
                            ? "text-primary dark:text-accent font-black"
                            : isPassed
                            ? "text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {stop.name}
                      </span>
                      {isNext && (
                        <span className="rounded-full bg-accent/30 px-2 py-0.5 text-[10px] font-extrabold text-accent-foreground">
                          Next
                        </span>
                      )}
                      {isThisStopActive && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                          Bus Here
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      {isNext ? (
                        <span className="font-bold text-accent-foreground">
                          {hasVerifiedGps
                            ? `Arriving in ${formattedEta}`
                            : "Awaiting live driver GPS"}
                        </span>
                      ) : isPassed ? (
                        <span>Passed</span>
                      ) : (
                        <span>Stop #{index + 1}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Context Footer */}
          <div className="mt-6 rounded-2xl bg-muted/50 p-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Navigation size={14} className="text-primary dark:text-accent" />
              <span>Live Telemetry Status</span>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              {hasVerifiedGps ? (
                <>
                  Bus #{busNumber} is moving from <strong>{prevStopName}</strong>{" "}
                  toward <strong>{nextStopName}</strong>.
                  {location?.remainingDistanceKm
                    ? ` ~${location.remainingDistanceKm} km remaining.`
                    : ""}
                </>
              ) : (
                <>
                  No active GPS broadcast for Bus #{busNumber} right now. Start
                  a trip on <strong>/driver</strong> to stream live coordinates.
                </>
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
