import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BusFront,
  Filter,
  MapPin,
  Phone,
  Radio,
  RefreshCw,
  Signal,
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
  status: 'LIVE' | 'STALE' | 'GPS UNAVAILABLE' | 'DELAYED';
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
    stale: number;
    gpsUnavailable: number;
    delayed?: number;
  };
};

function getStatusBadge(status: LiveBus['status']) {
  switch (status) {
    case 'LIVE':
      return {
        label: 'LIVE',
        dotClass: 'bg-emerald-500',
        badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        color: '#22c55e',
      };
    case 'STALE':
      return {
        label: 'STALE',
        dotClass: 'bg-amber-500',
        badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
        color: '#f59e0b',
      };
    case 'DELAYED':
      return {
        label: 'DELAYED',
        dotClass: 'bg-amber-500',
        badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
        color: '#f59e0b',
      };
    case 'GPS UNAVAILABLE':
    default:
      return {
        label: 'UNAVAILABLE',
        dotClass: 'bg-zinc-600 dark:bg-zinc-400',
        badgeClass: 'bg-muted text-muted-foreground',
        color: '#71717a',
      };
  }
}

// Custom DivIcon for stops
function createStopIcon(sequence: number) {
  return L.divIcon({
    className: 'custom-stop-marker',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;background:#0284c7;border:2px solid white;border-radius:50%;color:white;font-size:10px;font-weight:800;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${sequence}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

// Helper to smoothly fly/set map view when user selects a bus
function MapViewUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

export function AdminLiveBuses() {
  const [filter, setFilter] = useState<'ALL' | 'LIVE' | 'STALE' | 'GPS UNAVAILABLE'>('ALL');
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [showAllStops, setShowAllStops] = useState(false);

  const query = useQuery({
    queryKey: ['admin', 'live-buses'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/live-buses');
      if (!res.ok) throw new Error('Unable to load bus information.');
      return (await res.json()) as LiveBusesResponse;
    },
    refetchInterval: 5000,
  });

  const isLoading = query.isLoading && !query.data;
  const isError = query.isError && !query.data;

  const data = query.data;
  const rawBuses = data?.buses ?? [];
  const allStops = data?.stops ?? [];

  // Strictly exclude MTC or public transit buses from ACMIS campus fleet
  const campusBuses = useMemo(() => {
    return rawBuses
      .filter((b) => !b.busNumber.toUpperCase().includes('MTC') && !b.displayName.toUpperCase().includes('MTC'))
      .sort((a, b) => naturalBusSort(a.busNumber, b.busNumber));
  }, [rawBuses]);

  const filteredBuses = useMemo(() => {
    if (filter === 'ALL') return campusBuses;
    return campusBuses.filter((b) => b.status === filter);
  }, [campusBuses, filter]);

  // Selected bus
  const selectedBus = useMemo(() => {
    if (!selectedBusId) return null;
    return campusBuses.find((b) => b.id === selectedBusId) ?? null;
  }, [campusBuses, selectedBusId]);

  // Stops to show on map:
  // Under Live Map Clutter Rule: default hides all stops to avoid clustering!
  // If a bus is selected, show ONLY that bus's stops.
  const displayedStops = useMemo(() => {
    if (showAllStops) return allStops;
    if (selectedBus) {
      return allStops
        .filter((s) => s.busId === selectedBus.id || (s.busNumber && s.busNumber.toUpperCase() === selectedBus.busNumber.toUpperCase()))
        .sort((a, b) => a.sequence - b.sequence);
    }
    return [];
  }, [showAllStops, selectedBus, allStops]);

  // Selected bus stops list for bottom card
  const selectedBusStopsList = useMemo(() => {
    if (!selectedBus) return [];
    return allStops
      .filter((s) => s.busId === selectedBus.id || (s.busNumber && s.busNumber.toUpperCase() === selectedBus.busNumber.toUpperCase()))
      .sort((a, b) => a.sequence - b.sequence);
  }, [selectedBus, allStops]);

  // Map center logic
  const { mapCenter, mapZoom } = useMemo(() => {
    if (selectedBus && selectedBus.latitude != null && selectedBus.longitude != null) {
      return { mapCenter: [selectedBus.latitude, selectedBus.longitude] as [number, number], mapZoom: 13 };
    }
    if (selectedBus && selectedBusStopsList.length > 0 && selectedBusStopsList[0].latitude != null) {
      return { mapCenter: [selectedBusStopsList[0].latitude, selectedBusStopsList[0].longitude] as [number, number], mapZoom: 12 };
    }
    const firstLive = campusBuses.find((b) => b.status === 'LIVE' && b.latitude != null && b.longitude != null);
    if (firstLive?.latitude != null && firstLive.longitude != null) {
      return { mapCenter: [firstLive.latitude, firstLive.longitude] as [number, number], mapZoom: 11 };
    }
    return { mapCenter: CHENNAI_CENTER, mapZoom: 11 };
  }, [selectedBus, selectedBusStopsList, campusBuses]);

  // ERROR STATE
  if (isError) {
    return (
      <div className="rounded-[28px] border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle size={24} />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-foreground">
            Unable to load this information.
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Could not retrieve real-time campus bus telemetry from the server.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-95"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="rounded-[28px] border border-border bg-card p-12 text-center space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <RefreshCw size={16} className="animate-spin text-primary" />
          Loading live bus GPS tracking...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Top Header & Mode Toggle */}
      <div className="rounded-[28px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Live Operations · GPS Telemetry
            </div>
            <div className="mt-1 flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-foreground">
                {selectedBus ? `BUS ${selectedBus.busNumber} · ${selectedBus.routeName}` : 'Live Buses'}
              </h2>
              {selectedBus && (
                <button
                  type="button"
                  onClick={() => setSelectedBusId(null)}
                  data-testid="button-all-buses-mode"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-foreground hover:bg-muted"
                >
                  <ArrowLeft size={12} /> All Buses
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedBus
                ? 'Showing individual live location, telemetry, and configured route stops for this bus.'
                : 'Monitoring all registered campus buses. Only real driver phone GPS coordinates are displayed.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Dropdown */}
            {!selectedBus && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Filter size={13} /> Status:
                </span>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  data-testid="select-live-buses-filter"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-xs"
                >
                  <option value="ALL">All ({campusBuses.length})</option>
                  <option value="LIVE">Live ({campusBuses.filter((b) => b.status === 'LIVE').length})</option>
                  <option value="STALE">Stale ({campusBuses.filter((b) => b.status === 'STALE').length})</option>
                  <option value="GPS UNAVAILABLE">Unavailable ({campusBuses.filter((b) => b.status === 'GPS UNAVAILABLE').length})</option>
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAllStops(!showAllStops)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                showAllStops ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300' : 'border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {showAllStops ? '✓ All stops shown' : 'Show all stops'}
            </button>

            <button
              type="button"
              onClick={() => void query.refetch()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-muted"
            >
              <RefreshCw size={13} className={query.isFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3 text-[11px] font-extrabold">
          <span className="text-muted-foreground">GPS Status:</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> 🟢 LIVE (Fresh GPS)
          </span>
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> 🟠 STALE (Old GPS)
          </span>
          <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-zinc-500" /> ⚫ UNAVAILABLE (No GPS)
          </span>
          {displayedStops.length > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-sky-600 dark:text-sky-400">
              <span className="h-2 w-2 rounded-full bg-sky-500" /> Blue = Configured Stops ({displayedStops.length})
            </span>
          )}
        </div>
      </div>

      {/* Main Map + Side Panel Layout */}
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* Map Container */}
        <div className="rounded-[28px] border border-border bg-card overflow-hidden h-[540px] shadow-sm flex flex-col">
          <div className="flex-1 w-full relative" data-testid="live-buses-map">
            <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full" scrollWheelZoom>
              <MapViewUpdater center={mapCenter} zoom={mapZoom} />

              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Stops Pins (Only for selected bus, or if Show All Stops is toggled) */}
              {displayedStops.map((stop) => (
                <Marker
                  key={stop.id}
                  position={[stop.latitude, stop.longitude]}
                  icon={createStopIcon(stop.sequence)}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <div className="font-extrabold text-foreground flex items-center gap-1">
                        <MapPin size={12} className="text-sky-500" /> {stop.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Stop #{stop.sequence} · Approx: {stop.time}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Bus GPS Markers */}
              {campusBuses.map((bus) => {
                if (bus.latitude == null || bus.longitude == null) return null;
                const badge = getStatusBadge(bus.status);
                const isSelected = selectedBusId === bus.id;

                return (
                  <CircleMarker
                    key={bus.id}
                    center={[bus.latitude, bus.longitude]}
                    radius={isSelected ? 14 : 10}
                    pathOptions={{
                      color: isSelected ? '#000000' : badge.color,
                      fillColor: badge.color,
                      fillOpacity: 0.9,
                      weight: isSelected ? 3 : 2,
                    }}
                    eventHandlers={{
                      click: () => setSelectedBusId(bus.id),
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1 p-0.5">
                        <div className="font-extrabold text-sm">{bus.displayName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Driver: {bus.driverName}
                        </div>
                        <div className="text-[11px] font-bold" style={{ color: badge.color }}>
                          {bus.status}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Last update: {bus.lastUpdate}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Beside/Below Map: Clean Bus List OR Individual Bus Live View */}
        <div className="space-y-4">
          {selectedBus ? (
            /* INDIVIDUAL BUS LIVE VIEW (Section 7) */
            <div className="rounded-[28px] border-2 border-primary bg-card p-6 shadow-sm space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <div className="mono text-[10px] font-extrabold uppercase text-muted-foreground">
                    Selected Bus
                  </div>
                  <h3 className="display-font text-xl font-extrabold text-foreground">
                    BUS {selectedBus.busNumber} · {selectedBus.routeName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBusId(null)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                >
                  ← All Buses
                </button>
              </div>

              {/* Status & Telemetry Attributes */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    GPS Status
                  </span>
                  <div className="mt-1">
                    {(() => {
                      const badge = getStatusBadge(selectedBus.status);
                      return (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${badge.badgeClass}`}>
                          <span className={`h-2 w-2 rounded-full ${badge.dotClass}`} />
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Driver
                    </span>
                    <div className="font-extrabold text-foreground mt-0.5 flex items-center gap-1">
                      <UserRound size={12} className="text-muted-foreground" />
                      {selectedBus.driverName || 'Not assigned'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Phone
                    </span>
                    <div className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                      <Phone size={11} className="text-muted-foreground" />
                      {selectedBus.driverPhone || 'Not available'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Last updated
                    </span>
                    <div className="font-bold text-foreground mt-0.5">
                      {selectedBus.lastUpdate}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Accuracy
                    </span>
                    <div className="font-bold text-foreground mt-0.5">
                      {selectedBus.accuracy}
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Current Location
                  </span>
                  <div className="font-mono text-xs text-foreground mt-0.5 bg-muted/40 p-2 rounded-xl">
                    {selectedBus.latitude != null && selectedBus.longitude != null
                      ? `${selectedBus.latitude.toFixed(5)}, ${selectedBus.longitude.toFixed(5)}`
                      : 'GPS location unavailable (driver has not started tracking)'}
                  </div>
                </div>

                {/* ROUTE STOPS (Section 7) */}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Route Stops ({selectedBusStopsList.length})
                    </span>
                    <span className="text-[10px] text-muted-foreground">Scheduled</span>
                  </div>

                  {selectedBusStopsList.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      No stops configured for this bus yet.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/40">
                      {selectedBusStopsList.map((stop) => (
                        <div
                          key={stop.id}
                          className="flex items-center justify-between pt-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="grid h-5 w-5 place-items-center rounded-md bg-muted font-mono text-[10px] font-extrabold text-foreground">
                              {stop.sequence}
                            </span>
                            <span className="font-extrabold text-foreground">
                              {stop.name}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {stop.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* BUS LIST BESIDE MAP (Section 6) */
            <div className="rounded-[28px] border border-border bg-card p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  LIVE BUSES ({filteredBuses.length})
                </span>
                <span className="text-[11px] text-muted-foreground">Click a bus to inspect</span>
              </div>

              {filteredBuses.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No buses assigned yet.
                </div>
              ) : (
                <div className="mt-3 max-h-[460px] overflow-y-auto space-y-2 pr-1">
                  {filteredBuses.map((bus) => {
                    const badge = getStatusBadge(bus.status);

                    return (
                      <button
                        key={bus.id}
                        type="button"
                        onClick={() => setSelectedBusId(bus.id)}
                        data-testid={`row-live-bus-${bus.id}`}
                        className="w-full flex items-center justify-between rounded-xl border border-border p-3 text-left transition hover:border-primary/50 hover:bg-muted/40 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${badge.dotClass}`} />
                          <div>
                            <div className="font-extrabold text-xs text-foreground">
                              BUS {bus.busNumber}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase font-bold">
                              {bus.routeName}
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${badge.badgeClass}`}>
                            {badge.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
