import { useMemo, useState, useEffect } from 'react';
import {
  BusFront,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  Route as RouteIcon,
  ShieldAlert,
  User,
  Activity,
  AlertTriangle,
  RotateCw,
  Clock,
  Compass,
  CheckCircle2,
  Footprints,
  Eye,
  EyeOff,
} from 'lucide-react';
import { divIcon } from 'leaflet';
import { Circle, CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import {
  getListBusesQueryKey,
  useListBuses,
  useListBusStops,
  useRoutePulse,
  useBusLiveLocationQuery,
  useStudentProfile,
  type LiveBusLocationData,
} from '@workspace/api-client-react';
import { useStudentGps } from '@/hooks/use-student-gps';
import { EmptyState, ErrorState, formatUpdatedAt, LoadingRows, PageHeading, statusLabel, useSelectedBusId } from '@/components/acims-ui';
import 'leaflet/dist/leaflet.css';

export default function LiveMap() {
  const selectedBusId = useSelectedBusId();
  const busesQuery = useListBuses({ query: { queryKey: getListBusesQueryKey() } });
  const buses = Array.isArray(busesQuery.data) ? busesQuery.data : [];
  const bus = useMemo(() => buses.find((item) => item.id === selectedBusId) ?? buses[0], [buses, selectedBusId]);
  const busId = bus?.id ?? '';

  // Student profile & pickup stop
  const studentProfileQuery = useStudentProfile();
  const studentProfile = studentProfileQuery.data;
  const pickupStopId = studentProfile?.pickupStopId ?? 'stop-tambaram';

  // Real-time bus location polling (every 3 seconds)
  const locationQuery = useBusLiveLocationQuery(busId, {
    enabled: !!busId,
    refetchInterval: 3000,
  });

  // Real-time SSE listener for sub-second updates from Phone 2
  const [sseLocation, setSseLocation] = useState<LiveBusLocationData | null>(null);

  useEffect(() => {
    if (!busId) return;
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/location/bus/${encodeURIComponent(busId)}/stream`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.busId === busId) {
            setSseLocation(data);
          }
        } catch {
          // ignore non-json heartbeats
        }
      };
      eventSource.onerror = () => {
        // Fall back gracefully to polling
        eventSource?.close();
      };
    } catch {
      // EventSource fallback
    }

    return () => {
      eventSource?.close();
    };
  }, [busId]);

  const liveLocation: LiveBusLocationData | undefined = sseLocation ?? locationQuery.data;

  // Real Student GPS (Phone 1)
  const studentGps = useStudentGps('student-20418', false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Route stops
  const stopsQuery = useListBusStops(busId, { query: { enabled: !!busId } });

  if (busesQuery.isLoading) return <LoadingRows count={4} />;
  if (busesQuery.isError) return <ErrorState onRetry={() => void busesQuery.refetch()} />;
  if (!bus) return <EmptyState icon={RouteIcon} title="No route to draw" message="Choose an active campus route to see its live stop pattern." />;

  const stops = stopsQuery.data ?? [];
  const trackingStatus = liveLocation?.trackingStatus ?? 'OFFLINE';
  const pickupStop = stops.find((s) => s.id === pickupStopId);

  // Student distance to pickup stop calculation
  let studentDistanceToStopText: string | null = null;
  let studentWalkingMinutes: number | null = null;
  if (studentGps.coords && pickupStop) {
    const lat1 = studentGps.coords.latitude;
    const lon1 = studentGps.coords.longitude;
    const lat2 = pickupStop.latitude;
    const lon2 = pickupStop.longitude;

    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distKm = R * c;

    if (distKm < 1) {
      studentDistanceToStopText = `${Math.round(distKm * 1000)} m`;
    } else {
      studentDistanceToStopText = `${distKm.toFixed(2)} km`;
    }
    studentWalkingMinutes = Math.max(1, Math.round(distKm * 12.5));
  }

  return (
    <div className="page-in space-y-6">
      <PageHeading
        eyebrow="PHONE 1 · STUDENT LIVE RADAR"
        title="Live Two-Phone GPS Map"
        description="Real-time map connecting Student Phone GPS and Bus Driver Phone GPS through backend telemetry."
        action={
          <div className="flex flex-wrap items-center gap-3">
            {/* Student GPS Permission Toggle */}
            {!studentGps.isWatching ? (
              <button
                type="button"
                onClick={studentGps.startWatching}
                data-testid="button-enable-student-gps"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-extrabold text-white shadow transition hover:bg-blue-500 hover:shadow-md"
              >
                <LocateFixed size={14} />
                <span>Enable My Student Phone GPS</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={studentGps.stopWatching}
                data-testid="button-disable-student-gps"
                className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-500 transition hover:bg-blue-500/20"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                </span>
                <span>My GPS Active (±{Math.round(studentGps.coords?.accuracy ?? 10)}m)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowDiagnostics((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <Activity size={14} />
              <span>{showDiagnostics ? 'Hide Telemetry' : 'Telemetry Monitor'}</span>
            </button>
          </div>
        }
      />

      {/* Bus Tracking Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 soft-shadow">
        <div className="flex items-center gap-3">
          {trackingStatus === 'TRACKING_ACTIVE' ? (
            <span className="relative flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
            </span>
          ) : trackingStatus === 'TRACKING_STALE' ? (
            <span className="h-3 w-3 rounded-full bg-amber-500" />
          ) : (
            <span className="h-3 w-3 rounded-full bg-muted-foreground/40" />
          )}

          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <span>Bus #{bus.busNumber} Driver Signal:</span>
              {trackingStatus === 'TRACKING_ACTIVE' && (
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-500">
                  TRACKING ACTIVE · Real Driver GPS
                </span>
              )}
              {trackingStatus === 'TRACKING_STALE' && (
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-500">
                  SIGNAL STALE ({liveLocation?.lastUpdateSecondsAgo ?? 45}s ago)
                </span>
              )}
              {trackingStatus === 'OFFLINE' && (
                <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                  OFFLINE · Waiting for Driver to Start
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {trackingStatus === 'TRACKING_ACTIVE'
                ? `Updated ${formatUpdatedAt(liveLocation?.updatedAt)} · Accuracy: ±${Math.round(liveLocation?.accuracy ?? 10)}m · Speed: ${liveLocation?.speed ?? 0} km/h`
                : trackingStatus === 'TRACKING_STALE'
                  ? 'Last real GPS update was received over 30 seconds ago. Bus marker shows last verified location.'
                  : 'Driver has not enabled tracking on Phone 2 yet. No simulated coordinates are displayed.'}
            </div>
          </div>
        </div>

        {/* Student walk indicator if GPS active */}
        {studentDistanceToStopText && pickupStop && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
            <Footprints size={15} />
            <span>
              {studentDistanceToStopText} to your stop ({pickupStop.name}) · ~{studentWalkingMinutes} min walk
            </span>
          </div>
        )}
      </div>

      {/* Student GPS Error Notice if Permission Denied */}
      {studentGps.permissionState === 'denied' && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          <div className="flex items-center gap-2 font-extrabold">
            <AlertTriangle size={15} />
            <span>Student Phone GPS Permission Blocked</span>
          </div>
          <p className="mt-1 text-muted-foreground">
            {studentGps.errorMessage || 'Please tap the site settings / lock icon in your browser address bar and grant location access to see your live position on the map.'}
          </p>
        </div>
      )}

      {/* Two-Phone Live Telemetry Diagnostic Panel (collapsible) */}
      {showDiagnostics && (
        <section className="grid gap-4 rounded-[28px] border border-border bg-secondary/35 p-6 sm:grid-cols-2">
          {/* Phone 1: Student */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold text-blue-500">
                <User size={16} />
                <span>PHONE 1 · STUDENT PHONE GPS</span>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${studentGps.isWatching ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                {studentGps.isWatching ? 'GPS ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <div>Coordinates: <span className="mono font-bold text-foreground">{studentGps.coords ? `${studentGps.coords.latitude.toFixed(6)}, ${studentGps.coords.longitude.toFixed(6)}` : 'No fix'}</span></div>
              <div>Accuracy: <span className="mono font-bold text-foreground">{studentGps.coords ? `±${Math.round(studentGps.coords.accuracy)} m` : 'N/A'}</span></div>
              <div>Speed: <span className="mono font-bold text-foreground">{studentGps.coords?.speed !== null && studentGps.coords?.speed !== undefined ? `${studentGps.coords.speed} km/h` : 'N/A'}</span></div>
              <div>Backend transmission: <span className="font-bold text-foreground">{studentGps.lastSentAt ? formatUpdatedAt(studentGps.lastSentAt.toISOString()) : 'Standing by'}</span></div>
            </div>
          </div>

          {/* Phone 2: Bus Driver */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-500">
                <BusFront size={16} />
                <span>PHONE 2 · BUS DRIVER PHONE GPS</span>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${trackingStatus === 'TRACKING_ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : trackingStatus === 'TRACKING_STALE' ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'}`}>
                {trackingStatus}
              </span>
            </div>
            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <div>Coordinates: <span className="mono font-bold text-foreground">{liveLocation ? `${liveLocation.latitude.toFixed(6)}, ${liveLocation.longitude.toFixed(6)}` : 'Waiting for broadcast'}</span></div>
              <div>Accuracy: <span className="mono font-bold text-foreground">{liveLocation?.accuracy ? `±${Math.round(liveLocation.accuracy)} m` : 'N/A'}</span></div>
              <div>Speed / Heading: <span className="mono font-bold text-foreground">{liveLocation ? `${liveLocation.speed} km/h · ${liveLocation.heading}°` : 'N/A'}</span></div>
              <div>Stream connection: <span className="font-bold text-foreground">{sseLocation ? 'Real-time SSE active' : 'Live Polling (3s)'}</span></div>
            </div>
          </div>
        </section>
      )}

      {/* Main Map + Stop Sequence */}
      <section className="grid gap-5 xl:grid-cols-[1.5fr_.7fr]">
        <div className="relative min-h-[520px] overflow-hidden rounded-[28px] border border-border bg-secondary/35 p-3 sm:p-5">
          <div className="absolute left-6 top-6 z-[500] rounded-xl border border-border bg-card/90 px-3 py-2 shadow-sm backdrop-blur">
            <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Active vehicle</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-extrabold">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-accent">
                <BusFront size={15} />
              </span>
              Bus #{bus.busNumber}
            </div>
          </div>

          <RouteMap
            stops={stops}
            location={liveLocation}
            studentCoords={studentGps.coords}
            pickupStopId={pickupStopId}
            busNumber={bus.busNumber}
            trackingStatus={trackingStatus}
          />

          <div className="pointer-events-none absolute bottom-5 left-5 right-5 z-[500] flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/90 px-4 py-3 text-[11px] font-bold shadow-sm backdrop-blur">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Route
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-300" /> Bus (Phone 2)
            </span>
            {studentGps.coords && (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-blue-300" /> You (Phone 1)
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Your pickup stop
            </span>
            <span className="ml-auto flex items-center gap-1 text-muted-foreground">
              <Radio size={13} /> {liveLocation?.source ?? 'driver-phone-gps'}
            </span>
          </div>
        </div>

        {/* Route Stops List with Pickup Highlight */}
        <div className="rounded-[28px] border border-border bg-card p-6 sm:p-7">
          <div className="flex items-start justify-between">
            <div>
              <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Route context</div>
              <h2 className="mt-2 display-font text-2xl font-extrabold">
                {bus.origin} <span className="text-muted-foreground">→</span> {bus.destination}
              </h2>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-extrabold">
              {statusLabel(liveLocation?.trackingStatus === 'OFFLINE' ? 'Standby' : bus.status)}
            </span>
          </div>

          <div className="mt-7 space-y-0">
            {stops.length ? (
              stops
                .sort((a, b) => a.sequence - b.sequence)
                .map((stop, index) => {
                  const isPickup = stop.id === pickupStopId;
                  const isNext = stop.id === (liveLocation?.nextStopId ?? bus.nextStopId);
                  return (
                    <div key={stop.id} data-testid={`row-stop-${stop.id}`} className="group relative flex gap-4 pb-6 last:pb-0">
                      <div className="relative flex w-4 justify-center">
                        <span
                          className={`z-10 mt-1 h-3.5 w-3.5 rounded-full border-4 ${
                            isPickup
                              ? 'border-amber-500 bg-amber-400 ring-2 ring-amber-300'
                              : isNext
                                ? 'border-accent-foreground bg-accent'
                                : index === 0
                                  ? 'border-secondary-foreground bg-secondary'
                                  : 'border-muted bg-card'
                          }`}
                        />
                        {index < stops.length - 1 && <span className="absolute top-4 h-full w-px bg-border" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-extrabold ${isPickup ? 'text-amber-500 font-black' : isNext ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {stop.name}
                          </span>
                          {isPickup && (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-500">
                              Your Pickup
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                          {isNext ? (
                            <>
                              <span className="font-bold text-accent-foreground">Next stop</span>
                              <span>·</span>
                              <span>{liveLocation?.etaMinutes ?? bus.etaMinutes} min away</span>
                            </>
                          ) : (
                            <span>{stop.minutesFromPrevious ? `${stop.minutesFromPrevious} min from previous` : 'Origin stop'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : (
              <LoadingRows count={4} />
            )}
          </div>

          <div className="mt-7 flex items-center gap-2 rounded-xl bg-muted px-3 py-3 text-[11px] leading-5 text-muted-foreground">
            <Navigation size={14} className="shrink-0 text-accent-foreground" />
            {trackingStatus === 'OFFLINE'
              ? 'Bus is currently offline. When driver starts live tracking on Phone 2, coordinates will appear in real time.'
              : `Bus is moving toward ${liveLocation?.nextStop ?? bus.nextStop}.`}
          </div>
        </div>
      </section>

      {/* Map Stat Cards */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <MapStat
          icon={MapPin}
          label="Next stop"
          value={liveLocation?.nextStop ?? bus.nextStop}
        />
        <MapStat
          icon={Navigation}
          label="Live ETA"
          value={trackingStatus === 'OFFLINE' ? 'Bus offline' : `${liveLocation?.etaMinutes ?? bus.etaMinutes} min`}
        />
        <MapStat
          icon={Radio}
          label="Signal Accuracy"
          value={liveLocation?.accuracy ? `±${Math.round(liveLocation.accuracy)} m` : 'Awaiting GPS'}
        />
      </div>
    </div>
  );
}

function RouteMap({
  stops,
  location,
  studentCoords,
  pickupStopId,
  busNumber,
  trackingStatus,
}: {
  stops: Array<{ id: string; name: string; latitude: number; longitude: number; sequence: number }>;
  location?: LiveBusLocationData;
  studentCoords: { latitude: number; longitude: number; accuracy: number } | null;
  pickupStopId: string;
  busNumber: string;
  trackingStatus: string;
}) {
  const sortedStops = stops.slice().sort((a, b) => a.sequence - b.sequence);
  const firstStop = sortedStops[0] ?? { latitude: 12.9812, longitude: 80.1425 };
  const route = sortedStops.map((stop) => [stop.latitude, stop.longitude] as [number, number]);

  // Bus Marker DivIcon with heading rotation
  const busIcon = useMemo(() => {
    const isOffline = trackingStatus === 'OFFLINE';
    const bg = isOffline ? 'hsl(215 16% 47%)' : 'hsl(142 76% 36%)';
    return divIcon({
      className: 'acims-bus-marker',
      html: `<div style="background:${bg};color:white;width:44px;height:44px;border-radius:14px;border:3px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.3);display:grid;place-items:center;font-weight:900;font-size:12px;letter-spacing:-0.5px;">#${busNumber}</div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }, [busNumber, trackingStatus]);

  // Student Marker DivIcon (Phone 1)
  const studentIcon = useMemo(() => {
    return divIcon({
      className: 'acims-student-marker',
      html: `<div style="background:hsl(217 91% 60%);color:white;width:34px;height:34px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.4);display:grid;place-items:center;font-weight:900;font-size:10px;">YOU</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }, []);

  const busPosition: [number, number] = location
    ? [location.latitude, location.longitude]
    : [firstStop.latitude, firstStop.longitude];

  const mapCenter: [number, number] = studentCoords
    ? [studentCoords.latitude, studentCoords.longitude]
    : busPosition;

  return (
    <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={false} className="h-[490px] min-h-[460px] w-full rounded-[22px]">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={route} pathOptions={{ color: 'hsl(193 62% 22%)', weight: 6, opacity: 0.8 }} />

      {/* Stops */}
      {sortedStops.map((stop, index) => {
        const isNext = stop.id === location?.nextStopId;
        const isPickup = stop.id === pickupStopId;
        return (
          <CircleMarker
            key={stop.id}
            center={[stop.latitude, stop.longitude]}
            radius={isPickup ? 11 : isNext ? 9 : 7}
            pathOptions={{
              color: isPickup ? 'hsl(38 92% 50%)' : isNext ? 'hsl(39 96% 58%)' : 'hsl(193 62% 22%)',
              fillColor: isPickup ? 'hsl(38 92% 50%)' : isNext ? 'hsl(39 96% 58%)' : 'white',
              fillOpacity: 1,
              weight: isPickup ? 4 : 3,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              {stop.name}
              {isPickup ? ' ★ Your Registered Pickup' : isNext ? ` · ${location?.etaMinutes} min` : index === 0 ? ' · Origin' : ''}
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* Bus Marker (Phone 2) - Only displayed if location is present */}
      {location && (
        <>
          <Marker position={busPosition} icon={busIcon}>
            <Tooltip direction="top" offset={[0, -22]}>
              {`Bus #${busNumber} · ${trackingStatus === 'TRACKING_ACTIVE' ? 'Live Phone GPS' : trackingStatus} · ±${Math.round(location.accuracy)}m`}
            </Tooltip>
          </Marker>
          {location.accuracy > 0 && (
            <Circle
              center={busPosition}
              radius={Math.min(100, location.accuracy)}
              pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.1, weight: 1 }}
            />
          )}
        </>
      )}

      {/* Student Marker (Phone 1) */}
      {studentCoords && (
        <>
          <Marker position={[studentCoords.latitude, studentCoords.longitude]} icon={studentIcon}>
            <Tooltip direction="top" offset={[0, -18]}>
              You are here (Phone 1 GPS) · ±{Math.round(studentCoords.accuracy)}m
            </Tooltip>
          </Marker>
          <Circle
            center={[studentCoords.latitude, studentCoords.longitude]}
            radius={Math.max(10, studentCoords.accuracy)}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1 }}
          />
        </>
      )}
    </MapContainer>
  );
}

function MapStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Icon size={16} />
      </span>
      <div>
        <div className="mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
        <div data-testid={`text-map-${label.toLowerCase().replace(' ', '-')}`} className="mt-1 text-sm font-extrabold">
          {value}
        </div>
      </div>
    </div>
  );
}