import { useState, useMemo } from 'react';
import {
  BusFront,
  Navigation,
  Play,
  Square,
  Radio,
  LocateFixed,
  AlertTriangle,
  Wifi,
  WifiOff,
  Gauge,
  Compass,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Send,
} from 'lucide-react';
import { useListBuses, useListBusStops, getListBusesQueryKey } from '@workspace/api-client-react';
import { useDriverGps } from '@/hooks/use-driver-gps';
import { PageHeading, formatUpdatedAt, LoadingRows, EmptyState } from '@/components/acims-ui';
import { MapContainer, TileLayer, Marker, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DRIVERS_LIST = [
  { id: 'driver-arun', name: 'Arun Kumar', phone: '+91 98401 23451', defaultBusId: 'bus-24' },
  { id: 'driver-suresh', name: 'Suresh Mani', phone: '+91 98402 34562', defaultBusId: 'bus-54' },
  { id: 'driver-venkat', name: 'Venkat Raman', phone: '+91 98403 45673', defaultBusId: 'bus-153' },
  { id: 'driver-rajesh', name: 'Rajesh Kannan', phone: '+91 98404 56784', defaultBusId: 'bus-83' },
  { id: 'driver-karthik', name: 'Karthik Raja', phone: '+91 98405 67895', defaultBusId: 'bus-580' },
];

export default function DriverPage() {
  const [selectedDriverId, setSelectedDriverId] = useState('driver-arun');
  const currentDriver = DRIVERS_LIST.find((d) => d.id === selectedDriverId) ?? DRIVERS_LIST[0];

  const busesQuery = useListBuses({ query: { queryKey: getListBusesQueryKey() } });
  const buses = Array.isArray(busesQuery.data) ? busesQuery.data : [];

  const {
    status,
    isTracking,
    busId,
    setBusId,
    driverId,
    setDriverId,
    driverName,
    setDriverName,
    currentCoords,
    lastSentAt,
    pointsSentCount,
    queuedPointsCount,
    errorMessage,
    isOffline,
    startTracking,
    stopTracking,
    flushOfflineBatch,
  } = useDriverGps(currentDriver.defaultBusId, currentDriver.id, currentDriver.name);

  const selectedBus = useMemo(() => buses.find((b) => b.id === busId) ?? buses[0], [buses, busId]);
  const stopsQuery = useListBusStops(busId, { query: { enabled: !!busId } });
  const stops = stopsQuery.data ?? [];

  const handleDriverChange = (driverIdToSet: string) => {
    const driver = DRIVERS_LIST.find((d) => d.id === driverIdToSet);
    if (driver) {
      setSelectedDriverId(driver.id);
      setDriverId(driver.id);
      setDriverName(driver.name);
      if (!isTracking) {
        setBusId(driver.defaultBusId);
      }
    }
  };

  const accuracyRating = useMemo(() => {
    if (!currentCoords?.accuracy) return null;
    const acc = currentCoords.accuracy;
    if (acc <= 10) return { label: 'Excellent precision', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' };
    if (acc <= 25) return { label: 'Good precision', color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' };
    if (acc <= 50) return { label: 'Fair precision', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' };
    return { label: 'Low precision - Check GPS', color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' };
  }, [currentCoords?.accuracy]);

  return (
    <div className="page-in space-y-6">
      <PageHeading
        eyebrow="PHONE 2 · DRIVER LIVE GPS MODE"
        title="Bus Tracking Terminal"
        description="Physical driver device cockpit. Broadcasts real device GPS to students along your assigned route."
        action={
          <div className="flex items-center gap-3">
            {isOffline ? (
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-500">
                <WifiOff size={14} /> Offline Mode (Queuing)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-500">
                <Wifi size={14} /> Network Online
              </span>
            )}
            <div className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold">
              Driver: <span className="text-foreground">{currentDriver.name}</span>
            </div>
          </div>
        }
      />

      {/* Driver & Bus Selector Header */}
      <section className="rounded-[28px] border border-border bg-card p-6 soft-shadow sm:p-7">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Select Authenticated Driver
            </label>
            <select
              disabled={isTracking}
              value={selectedDriverId}
              onChange={(e) => handleDriverChange(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none transition focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              {DRIVERS_LIST.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Assigned Bus Vehicle
            </label>
            <select
              disabled={isTracking}
              value={busId}
              onChange={(e) => setBusId(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none transition focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              {buses.map((b) => (
                <option key={b.id} value={b.id}>
                  Bus #{b.busNumber} · {b.destination} ({b.plateNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end">
            {!isTracking ? (
              <button
                type="button"
                onClick={startTracking}
                data-testid="button-start-live-tracking"
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5 hover:bg-emerald-500 active:translate-y-0"
              >
                <Play size={16} fill="white" />
                <span>START LIVE TRACKING</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopTracking}
                data-testid="button-stop-live-tracking"
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-destructive px-6 text-sm font-extrabold text-destructive-foreground shadow-lg shadow-destructive/20 transition hover:-translate-y-0.5 hover:bg-destructive/90 active:translate-y-0"
              >
                <Square size={16} fill="currentColor" />
                <span>STOP LIVE TRACKING</span>
              </button>
            )}
          </div>
        </div>

        {/* Permission / Status Alert Banner */}
        {status === 'active' && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
              </span>
              <div>
                <div className="text-sm font-extrabold">LIVE TRACKING ACTIVE</div>
                <div className="text-xs text-muted-foreground">
                  Broadcasting real phone GPS to students on Bus #{selectedBus?.busNumber}
                </div>
              </div>
            </div>
            {currentCoords?.accuracy && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold">
                GPS Accuracy: ±{Math.round(currentCoords.accuracy)} m
              </span>
            )}
          </div>
        )}

        {status === 'requesting' && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm font-bold text-accent-foreground">
            <RotateCw size={18} className="animate-spin text-accent" />
            <span>Requesting phone GPS permission... Please tap "Allow" on your device prompt.</span>
          </div>
        )}

        {status === 'permission_denied' && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <div className="flex items-center gap-2 font-extrabold">
              <AlertTriangle size={17} />
              <span>Location Permission Denied</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              ACIMS cannot broadcast bus coordinates without browser location permission. Please tap the lock/site settings icon in your browser address bar and set Location to "Allow".
            </p>
            <button
              type="button"
              onClick={startTracking}
              className="mt-3 rounded-full bg-destructive px-4 py-1.5 text-xs font-bold text-destructive-foreground"
            >
              Try Again
            </button>
          </div>
        )}

        {status === 'gps_unavailable' && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <div className="flex items-center gap-2 font-extrabold">
              <AlertTriangle size={17} />
              <span>GPS Unavailable on Device</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{errorMessage || 'Your device or browser does not have an active GPS fix.'}</p>
          </div>
        )}

        {status === 'stopped' && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-secondary/50 p-4 text-xs font-bold text-muted-foreground">
            <span>Tracking stopped. Bus #{selectedBus?.busNumber} is now marked offline.</span>
            <span className="text-[11px]">Last sent: {lastSentAt ? lastSentAt.toLocaleTimeString() : 'N/A'}</span>
          </div>
        )}
      </section>

      {/* Live Telemetry Dashboards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TelemetryCard
          icon={LocateFixed}
          label="GPS Accuracy"
          value={currentCoords ? `±${Math.round(currentCoords.accuracy)} m` : isTracking ? 'Acquiring...' : 'Inactive'}
          subtext={accuracyRating ? accuracyRating.label : 'Device hardware precision'}
          badgeClass={accuracyRating?.color}
        />

        <TelemetryCard
          icon={Gauge}
          label="Current Speed"
          value={currentCoords ? `${currentCoords.speed} km/h` : isTracking ? '0 km/h' : '0 km/h'}
          subtext="Derived from GPS Doppler"
        />

        <TelemetryCard
          icon={Compass}
          label="Heading / Direction"
          value={currentCoords && currentCoords.heading ? `${currentCoords.heading}° ${getCompassDirection(currentCoords.heading)}` : 'N/A'}
          subtext="Bearing along transit line"
        />

        <TelemetryCard
          icon={Radio}
          label="Broadcast Telemetry"
          value={`${pointsSentCount} points sent`}
          subtext={queuedPointsCount > 0 ? `${queuedPointsCount} queued offline` : lastSentAt ? `Last ping: ${formatUpdatedAt(lastSentAt.toISOString())}` : 'Standing by'}
          badgeClass={queuedPointsCount > 0 ? 'text-amber-500 bg-amber-500/10 border-amber-500/30' : undefined}
        />
      </section>

      {/* Coordinates & Route Details */}
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="overflow-hidden rounded-[28px] border border-border bg-card p-6 soft-shadow sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Live Driver Signal Map
              </div>
              <h3 className="mt-1 text-lg font-extrabold">Bus #{selectedBus?.busNumber} Route Corridor</h3>
            </div>
            <span className="mono text-xs font-bold text-muted-foreground">
              {currentCoords ? `${currentCoords.latitude.toFixed(6)}, ${currentCoords.longitude.toFixed(6)}` : 'Waiting for GPS fix'}
            </span>
          </div>

          <div className="mt-4 h-[380px] overflow-hidden rounded-2xl border border-border">
            <DriverLiveMap
              stops={stops}
              currentCoords={currentCoords}
              busNumber={selectedBus?.busNumber ?? '24'}
            />
          </div>
        </div>

        {/* Route Stops Checklist */}
        <div className="rounded-[28px] border border-border bg-card p-6 soft-shadow sm:p-7">
          <div className="flex items-center justify-between">
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Upcoming Route Stops
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-extrabold">
              {stops.length} registered stops
            </span>
          </div>

          <div className="mt-5 space-y-4 max-h-[380px] overflow-y-auto pr-2">
            {stops.map((stop, idx) => (
              <div
                key={stop.id}
                className="flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3"
              >
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <div className="text-xs font-extrabold text-foreground">{stop.name}</div>
                  <div className="mono mt-0.5 text-[10px] text-muted-foreground">
                    Code: {stop.code} {stop.minutesFromPrevious ? `· +${stop.minutesFromPrevious}m` : '· Origin'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {queuedPointsCount > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500 font-bold">
              <span>{queuedPointsCount} GPS points stored offline</span>
              <button
                type="button"
                onClick={flushOfflineBatch}
                className="rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-extrabold text-black"
              >
                Sync Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TelemetryCard({
  icon: Icon,
  label,
  value,
  subtext,
  badgeClass,
}: {
  icon: any;
  label: string;
  value: string;
  subtext: string;
  badgeClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 soft-shadow">
      <div className="flex items-center justify-between">
        <span className="mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-muted text-muted-foreground">
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">{value}</div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        {badgeClass ? (
          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>{subtext}</span>
        ) : (
          <span>{subtext}</span>
        )}
      </div>
    </div>
  );
}

function DriverLiveMap({
  stops,
  currentCoords,
  busNumber,
}: {
  stops: any[];
  currentCoords: any;
  busNumber: string;
}) {
  const sortedStops = stops.slice().sort((a, b) => a.sequence - b.sequence);
  const routePoints = sortedStops.map((s) => [s.latitude, s.longitude] as [number, number]);

  const defaultCenter: [number, number] = [13.0088, 80.0035];
  const center: [number, number] = currentCoords
    ? [currentCoords.latitude, currentCoords.longitude]
    : sortedStops[0]
      ? [sortedStops[0].latitude, sortedStops[0].longitude]
      : defaultCenter;

  const busMarkerIcon = useMemo(
    () =>
      divIcon({
        className: 'acims-driver-marker',
        html: `<div style="background:hsl(142 76% 36%);color:white;width:38px;height:38px;border-radius:12px;border:3px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.3);display:grid;place-items:center;font-weight:900;font-size:12px;">#${busNumber}</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      }),
    [busNumber]
  );

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {routePoints.length > 1 && (
        <Polyline positions={routePoints} pathOptions={{ color: 'hsl(193 62% 22%)', weight: 5, opacity: 0.8 }} />
      )}
      {sortedStops.map((stop, idx) => (
        <CircleMarker
          key={stop.id}
          center={[stop.latitude, stop.longitude]}
          radius={6}
          pathOptions={{ color: 'hsl(193 62% 22%)', fillColor: 'white', fillOpacity: 1, weight: 3 }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            {idx + 1}. {stop.name}
          </Tooltip>
        </CircleMarker>
      ))}
      {currentCoords && (
        <Marker position={[currentCoords.latitude, currentCoords.longitude]} icon={busMarkerIcon}>
          <Tooltip direction="top" offset={[0, -18]}>
            Bus #{busNumber} (Your Phone GPS) · ±{Math.round(currentCoords.accuracy)}m
          </Tooltip>
        </Marker>
      )}
    </MapContainer>
  );
}

function getCompassDirection(heading: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((heading % 360) / 22.5) % 16;
  return directions[index];
}
