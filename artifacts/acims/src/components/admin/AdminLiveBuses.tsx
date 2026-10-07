import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  Activity,
  AlertTriangle,
  BusFront,
  Clock,
  Filter,
  MapPin,
  Phone,
  Radio,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';
import { naturalBusSort } from '@/lib/naturalSort';
import 'leaflet/dist/leaflet.css';

const CHENNAI_CENTER: [number, number] = [13.0489, 80.12];

export type LiveBus = {
  id: string;
  busNumber: string;
  displayName: string;
  routeName: string;
  driverName: string;
  driverPhone?: string;
  status: 'LIVE' | 'GPS UNAVAILABLE' | 'NOT STARTED' | 'DELAYED';
  latitude: number | null;
  longitude: number | null;
  accuracy: string;
  lastUpdate: string;
  routeLabel: string;
  nextStop: string;
  eta: string;
  active: boolean;
};

export type MapStop = {
  id: string;
  name: string;
  busId?: string;
  busNumber?: string;
  busDisplayName?: string;
  routeName?: string;
  sequence: number;
  latitude: number;
  longitude: number;
  time: string;
};

type LiveBusesResponse = {
  buses: LiveBus[];
  stops: MapStop[];
  counters: {
    total: number;
    live: number;
    gpsUnavailable: number;
    delayed: number;
    notStarted: number;
  };
};

function getMarkerColor(status: LiveBus['status']) {
  switch (status) {
    case 'LIVE':
      return '#22c55e'; // Green
    case 'DELAYED':
      return '#f59e0b'; // Amber
    case 'GPS UNAVAILABLE':
      return '#ef4444'; // Red
    case 'NOT STARTED':
    default:
      return '#94a3b8'; // Grey
  }
}

// Custom Leaflet DivIcon for stops
function createStopIcon() {
  return L.divIcon({
    className: 'custom-stop-pin',
    html: `<div style="width:10px;height:10px;background:#0284c7;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

export function AdminLiveBuses() {
  const [filter, setFilter] = useState<'ALL' | 'LIVE' | 'GPS UNAVAILABLE' | 'DELAYED' | 'NOT STARTED'>('ALL');
  const [selectedBus, setSelectedBus] = useState<LiveBus | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'live-buses'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/live-buses');
      if (!res.ok) throw new Error('Live buses unavailable');
      return (await res.json()) as LiveBusesResponse;
    },
    refetchInterval: 5000,
  });

  const data = query.data;
  const buses = data?.buses ?? [];
  const stops = data?.stops ?? [];
  const counters = data?.counters ?? {
    total: 0,
    live: 0,
    gpsUnavailable: 0,
    delayed: 0,
    notStarted: 0,
  };

  const filteredBuses = useMemo(() => {
    const campusBuses = buses.filter(
      (b) => !b.busNumber.toUpperCase().includes('MTC') && !b.displayName.toUpperCase().includes('MTC')
    );
    const list = filter === 'ALL' ? campusBuses : campusBuses.filter((b) => b.status === filter);
    return list.sort((a, b) => naturalBusSort(a.busNumber, b.busNumber));
  }, [buses, filter]);

  const mapCenter = useMemo(() => {
    if (selectedBus && selectedBus.latitude != null && selectedBus.longitude != null) {
      return [selectedBus.latitude, selectedBus.longitude] as [number, number];
    }
    const liveWithCoords = buses.find((b) => b.latitude != null && b.longitude != null);
    if (liveWithCoords?.latitude != null && liveWithCoords.longitude != null) {
      return [liveWithCoords.latitude, liveWithCoords.longitude] as [number, number];
    }
    return CHENNAI_CENTER;
  }, [selectedBus, buses]);

  const stopIcon = useMemo(() => createStopIcon(), []);

  return (
    <div className="space-y-5">
      {/* Top Header & Filters */}
      <div className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Real-Time Monitoring
            </div>
            <h2 className="mt-0.5 text-2xl font-extrabold text-foreground">
              Live Buses
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Monitoring all registered campus buses. Only real GPS broadcasts are shown.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                <Filter size={13} /> Filter:
              </span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                data-testid="select-live-buses-filter"
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-xs"
              >
                <option value="ALL">All buses ({counters.total})</option>
                <option value="LIVE">Live ({counters.live})</option>
                <option value="DELAYED">Delayed ({counters.delayed})</option>
                <option value="GPS UNAVAILABLE">GPS unavailable ({counters.gpsUnavailable})</option>
                <option value="NOT STARTED">Not started ({counters.notStarted})</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => query.refetch()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-muted"
            >
              <RefreshCw size={13} className={query.isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-[11px] font-extrabold">
          <span className="text-muted-foreground">Legend:</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Green = Live
          </span>
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Amber = Delayed
          </span>
          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Red = GPS unavailable
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-400" /> Grey = Not started
          </span>
          <span className="ml-auto text-muted-foreground flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-500" /> Blue = Stops
          </span>
        </div>
      </div>

      {/* Main Map + Inspection Panel Layout */}
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* Map Container */}
        <div className="rounded-[28px] border border-border bg-card overflow-hidden h-[540px] shadow-sm flex flex-col">
          <div className="flex-1 w-full" data-testid="live-buses-map">
            <MapContainer center={mapCenter} zoom={11} className="h-full w-full" scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Stops Pins */}
              {stops.map((stop) => (
                <Marker
                  key={stop.id}
                  position={[stop.latitude, stop.longitude]}
                  icon={stopIcon}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <div className="font-extrabold text-foreground flex items-center gap-1">
                        <MapPin size={12} className="text-sky-500" /> {stop.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {stop.busDisplayName || stop.routeName || 'Campus Line'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Stop #{stop.sequence} · Approx: {stop.time}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Bus Markers with real GPS */}
              {buses.map((bus) => {
                if (bus.latitude == null || bus.longitude == null) return null;
                const color = getMarkerColor(bus.status);

                return (
                  <CircleMarker
                    key={bus.id}
                    center={[bus.latitude, bus.longitude]}
                    radius={12}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: 3 }}
                    eventHandlers={{
                      click: () => setSelectedBus(bus),
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1 p-0.5">
                        <div className="font-extrabold text-sm">{bus.displayName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Driver: {bus.driverName}
                        </div>
                        <div className="text-[11px] font-bold" style={{ color }}>
                          {bus.status}
                        </div>
                        {bus.nextStop && (
                          <div className="text-[10px] text-muted-foreground">
                            Next: {bus.nextStop}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground">
                          Updated: {bus.lastUpdate}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Selected Bus or List Inspection Panel */}
        <div className="space-y-4">
          {selectedBus ? (
            <div className="rounded-[28px] border-2 border-primary bg-card p-6 shadow-sm space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="display-font text-lg font-extrabold text-foreground">
                  {selectedBus.displayName}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedBus(null)}
                  className="rounded-lg bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Driver & Contact
                  </span>
                  <div className="font-extrabold text-foreground flex items-center gap-1.5 mt-0.5">
                    <UserRound size={13} className="text-muted-foreground" />
                    {selectedBus.driverName}
                  </div>
                  <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Phone size={11} className="text-muted-foreground" />
                    {selectedBus.driverPhone || 'Phone not available'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Current Status
                  </span>
                  <div className="mt-1">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold"
                      style={{
                        background: `${getMarkerColor(selectedBus.status)}20`,
                        color: getMarkerColor(selectedBus.status),
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: getMarkerColor(selectedBus.status) }}
                      />
                      {selectedBus.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Last update
                    </span>
                    <div className="font-bold text-foreground mt-0.5">
                      {selectedBus.lastUpdate}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      GPS accuracy
                    </span>
                    <div className="font-bold text-foreground mt-0.5">
                      {selectedBus.accuracy}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Current location
                  </span>
                  <div className="font-mono text-xs text-foreground mt-0.5">
                    {selectedBus.latitude != null && selectedBus.longitude != null
                      ? `${selectedBus.latitude.toFixed(5)}, ${selectedBus.longitude.toFixed(5)}`
                      : 'Coordinates unavailable'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Route
                  </span>
                  <div className="font-extrabold text-foreground mt-0.5">
                    {selectedBus.routeLabel}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/60">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Next stop
                    </span>
                    <div className="font-extrabold text-foreground mt-0.5">
                      {selectedBus.nextStop}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      ETA
                    </span>
                    <div className="font-extrabold text-foreground mt-0.5">
                      {selectedBus.eta}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Bus Quick Select ({filteredBuses.length})
                </span>
                <span className="text-[11px] text-muted-foreground">Click bus to inspect</span>
              </div>

              <div className="mt-3 max-h-[460px] overflow-y-auto space-y-2 pr-1">
                {filteredBuses.map((bus) => (
                  <button
                    key={bus.id}
                    type="button"
                    onClick={() => setSelectedBus(bus)}
                    className="w-full flex items-center justify-between rounded-xl border border-border p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
                  >
                    <div>
                      <div className="font-extrabold text-xs text-foreground">
                        {bus.displayName}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {bus.driverName}
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-extrabold"
                      style={{
                        background: `${getMarkerColor(bus.status)}15`,
                        color: getMarkerColor(bus.status),
                      }}
                    >
                      {bus.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
