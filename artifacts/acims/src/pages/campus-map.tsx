import { useMemo, useState } from 'react';
import { ArrowUpRight, BusFront, Compass, Layers3, LocateFixed, MapPin, Navigation, Route as RouteIcon, Search } from 'lucide-react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { Link, useLocation } from 'wouter';
import { getListBusesQueryKey, useListBuses, useListCampusLocations, getListCampusLocationsQueryKey, useListCampusStops, getListCampusStopsQueryKey, useListCampusRoutes, getListCampusRoutesQueryKey } from '@workspace/api-client-react';
import { EmptyState, ErrorState, LoadingRows, PageHeading, statusLabel } from '@/components/acims-ui';
import 'leaflet/dist/leaflet.css';

const COLLEGE_CENTER: [number, number] = [12.9407, 80.1393];

export default function CampusMapPage() {
  const [, setNavLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('');

  const locationsQuery = useListCampusLocations({ query: { queryKey: getListCampusLocationsQueryKey() } });
  const stopsQuery = useListCampusStops({ query: { queryKey: getListCampusStopsQueryKey() } });
  const routesQuery = useListCampusRoutes({ query: { queryKey: getListCampusRoutesQueryKey() } });
  const busesQuery = useListBuses({ query: { queryKey: getListBusesQueryKey(), refetchInterval: 15000 } });

  const locations = locationsQuery.data ?? [];
  const stops = stopsQuery.data ?? [];
  const routes = routesQuery.data ?? [];
  const buses = busesQuery.data ?? [];

  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0];
  const selectedStop = stops.find((stop) => stop.id === selectedStopId);
  const selectedLocation = locations.find((loc) => loc.id === selectedLocationId);

  const filteredLocations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? locations.filter((location) => `${location.name} ${location.type} ${location.description}`.toLowerCase().includes(term)) : locations;
  }, [locations, search]);

  const routeLine = useMemo(() => {
    if (!selectedRoute) return [];
    return selectedRoute.stopIds.map((stopId) => {
      const stop = stops.find((item) => item.id === stopId);
      return stop ? [stop.latitude, stop.longitude] as [number, number] : null;
    }).filter((point): point is [number, number] => Boolean(point));
  }, [selectedRoute, stops]);

  const center: [number, number] = useMemo(() => {
    if (selectedLocation) return [selectedLocation.latitude, selectedLocation.longitude];
    if (selectedStop) return [selectedStop.latitude, selectedStop.longitude];
    if (userCoords) return userCoords;
    if (routeLine[0]) return routeLine[0];
    return COLLEGE_CENTER;
  }, [selectedLocation, selectedStop, userCoords, routeLine]);

  const locateUser = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }
    setLocationStatus('Locating your position…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserCoords(coords);
        setLocationStatus('Your location is visible on the map.');
      },
      () => {
        setLocationStatus('Permission denied. Using College Main coordinates.');
        setUserCoords(COLLEGE_CENTER);
      },
      { timeout: 8000 }
    );
  };

  const navigateToDestination = (destId: string) => {
    localStorage.setItem('acims-nav-destination', destId);
    setNavLocation('/navigation');
  };

  const hasError = locationsQuery.isError || stopsQuery.isError || routesQuery.isError || busesQuery.isError;

  if (locationsQuery.isLoading || stopsQuery.isLoading || routesQuery.isLoading || busesQuery.isLoading) return <LoadingRows count={5} />;
  if (hasError) return <ErrorState onRetry={() => { void locationsQuery.refetch(); void stopsQuery.refetch(); void routesQuery.refetch(); void busesQuery.refetch(); }} label="Campus map data could not be refreshed." />;
  if (!locations.length && !stops.length && !routes.length) return <EmptyState icon={MapPin} title="Campus map is quiet" message="There are no campus locations or transport stops available right now." />;

  return <div className="page-in">
    <PageHeading
      eyebrow="Campus mobility map"
      title="Know the ground."
      description="Inspect buildings, bus stops, routes, and live vehicle positions across campus."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={locateUser}
            data-testid="button-campus-locate"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold transition hover:bg-muted"
          >
            <LocateFixed size={14} className="text-accent-foreground" />
            <span>{userCoords ? 'My Location Active' : 'Locate Me'}</span>
          </button>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[11px] font-bold">
            <span className="pulse-dot h-2 w-2 rounded-full bg-accent-foreground" /> {buses.length} active fleet buses
          </div>
        </div>
      }
    />

    {locationStatus && (
      <div className="mb-4 rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
        {locationStatus}
      </div>
    )}

    <section className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]">
      <div className="space-y-4">
        {/* Search */}
        <div className="rounded-[24px] border border-border bg-card p-5 soft-shadow">
          <div className="flex items-center gap-2 text-xs font-extrabold"><Search size={15} className="text-muted-foreground" /> Search campus landmarks</div>
          <input
            data-testid="input-campus-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Library, science, tech park, residence…"
            className="mt-3 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Selected Stop / Location Inspector Card */}
        {selectedStop && (
          <div className="rounded-[24px] border-2 border-accent bg-card p-5 shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="mono text-[10px] uppercase tracking-[0.16em] text-accent-foreground font-extrabold">Bus Stop Selected</span>
                <h3 className="mt-1 text-base font-extrabold">{selectedStop.name}</h3>
              </div>
              <button type="button" onClick={() => setSelectedStopId(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="mt-3">
              <span className="text-[11px] font-bold text-muted-foreground">Routes serving this stop:</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {selectedStop.routeNames.length > 0 ? selectedStop.routeNames.map((r) => (
                  <span key={r} className="rounded-lg bg-secondary px-2 py-1 text-[10px] font-extrabold">{r}</span>
                )) : <span className="text-xs text-muted-foreground">Campus Loop corridor</span>}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => navigateToDestination(selectedStop.id)}
                data-testid="button-nav-to-stop"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
              >
                <Navigation size={13} /> Navigate to this stop
              </button>
            </div>
          </div>
        )}

        {selectedLocation && (
          <div className="rounded-[24px] border-2 border-primary bg-card p-5 shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-extrabold">{selectedLocation.type.toUpperCase()}</span>
                <h3 className="mt-1 text-base font-extrabold">{selectedLocation.name}</h3>
              </div>
              <button type="button" onClick={() => setSelectedLocationId(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{selectedLocation.description}</p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => navigateToDestination(selectedLocation.id)}
                data-testid="button-nav-to-location"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-extrabold text-accent-foreground"
              >
                <Navigation size={13} /> Navigate to this place
              </button>
            </div>
          </div>
        )}

        {/* Route Layers */}
        <div className="rounded-[24px] border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Route layers</div>
              <h2 className="mt-1 text-base font-extrabold">Active campus loops</h2>
            </div>
            <Layers3 size={17} className="text-muted-foreground" />
          </div>
          <div className="mt-3 space-y-2">
            {routes.length ? routes.map((route) => (
              <button
                key={route.id}
                type="button"
                data-testid={`button-campus-route-${route.id}`}
                onClick={() => { setSelectedRouteId(route.id); setSelectedStopId(null); setSelectedLocationId(null); }}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selectedRoute?.id === route.id ? 'border-primary bg-secondary/50 shadow-sm' : 'border-border hover:bg-muted'}`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-accent">
                  <RouteIcon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-extrabold">{route.name}</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">Bus #{route.busNumber} · {route.destination}</span>
                </span>
                <span className="mono text-[10px] text-muted-foreground">{route.stopIds.length} stops</span>
              </button>
            )) : <EmptyState icon={RouteIcon} title="No routes listed" message="ACIMS has not published a campus route yet." />}
          </div>
        </div>

        {/* Places List */}
        <div className="rounded-[24px] border border-border bg-card p-5">
          <div className="mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Places ({filteredLocations.length})</div>
          <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1">
            {filteredLocations.length ? filteredLocations.map((location) => (
              <button
                key={location.id}
                type="button"
                data-testid={`card-campus-location-${location.id}`}
                onClick={() => { setSelectedLocationId(location.id); setSelectedStopId(null); }}
                className={`w-full rounded-xl p-3 text-left transition ${selectedLocationId === location.id ? 'border border-primary bg-secondary/40' : 'bg-muted/70 hover:bg-muted'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-extrabold">{location.name}</div>
                  <span className="rounded-full bg-card px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">{location.type}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{location.description}</p>
              </button>
            )) : <p className="py-4 text-center text-xs text-muted-foreground">No place matches that search.</p>}
          </div>
        </div>
      </div>

      {/* Interactive Leaflet Map */}
      <div className="relative min-h-[620px] overflow-hidden rounded-[28px] border border-border bg-secondary/35 p-3 sm:p-5">
        <div className="absolute left-6 top-6 z-[500] rounded-xl border border-border bg-card/90 px-3.5 py-2.5 shadow-sm backdrop-blur">
          <div className="mono text-[9px] uppercase tracking-[.16em] text-muted-foreground">Active Corridor</div>
          <div className="mt-0.5 text-xs font-extrabold">{selectedRoute?.name ?? 'All campus networks'}</div>
        </div>

        <CampusLeaflet
          center={center}
          stops={stops}
          locations={filteredLocations}
          routeLine={routeLine}
          buses={buses}
          userCoords={userCoords}
          onSelectStop={(stopId) => { setSelectedStopId(stopId); setSelectedLocationId(null); }}
          onSelectLocation={(locId) => { setSelectedLocationId(locId); setSelectedStopId(null); }}
        />

        <div className="pointer-events-none absolute bottom-6 left-6 right-6 z-[500] flex flex-wrap gap-3 rounded-2xl border border-border bg-card/90 px-4 py-2.5 text-[11px] font-bold shadow-sm backdrop-blur">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Active Route</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-accent-foreground bg-accent" /> Bus Stop</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Campus Place</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Live Bus</span>
          {userCoords && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" /> You</span>}
        </div>
      </div>
    </section>

    {/* Fleet Overview Footer */}
    <section className="mt-6">
      <div className="mono mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Active Campus Fleet</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {buses.map((bus) => (
          <div key={bus.id} data-testid={`card-campus-bus-${bus.id}`} className="rounded-2xl border border-border bg-card p-3.5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-foreground"><BusFront size={14} /></span>
              <span className="text-xs font-extrabold">Bus #{bus.busNumber}</span>
              <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[9px] font-extrabold">{statusLabel(bus.status)}</span>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground truncate">{bus.origin} → {bus.destination}</div>
            <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
              <span>Next: {bus.nextStop}</span>
              <span className="text-accent-foreground">{bus.etaMinutes} min</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>;
}

function CampusLeaflet({
  center,
  stops,
  locations,
  routeLine,
  buses,
  userCoords,
  onSelectStop,
  onSelectLocation,
}: {
  center: [number, number];
  stops: Array<{ id: string; name: string; latitude: number; longitude: number; routeNames?: string[] }>;
  locations: Array<{ id: string; name: string; type: string; latitude: number; longitude: number }>;
  routeLine: [number, number][];
  buses: Array<{ id: string; busNumber: string; currentLocation: { latitude: number; longitude: number }; nextStop: string; destination: string }>;
  userCoords: [number, number] | null;
  onSelectStop: (id: string) => void;
  onSelectLocation: (id: string) => void;
}) {
  return (
    <MapContainer center={center} zoom={15} scrollWheelZoom={false} className="h-[600px] min-h-[540px] w-full rounded-[22px]">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {routeLine.length > 1 && (
        <Polyline positions={routeLine} pathOptions={{ color: 'hsl(193 62% 22%)', weight: 6, opacity: 0.85 }} />
      )}

      {/* Bus Stops */}
      {stops.map((stop) => (
        <CircleMarker
          key={stop.id}
          center={[stop.latitude, stop.longitude]}
          radius={9}
          eventHandlers={{ click: () => onSelectStop(stop.id) }}
          pathOptions={{ color: 'hsl(193 62% 22%)', fillColor: 'hsl(67 100% 69%)', fillOpacity: 1, weight: 3 }}
        >
          <Tooltip direction="top">
            <strong>{stop.name}</strong> (Click to inspect)
          </Tooltip>
        </CircleMarker>
      ))}

      {/* Campus Buildings & Locations */}
      {locations.map((location) => (
        <CircleMarker
          key={location.id}
          center={[location.latitude, location.longitude]}
          radius={7}
          eventHandlers={{ click: () => onSelectLocation(location.id) }}
          pathOptions={{ color: 'hsl(8 100% 61%)', fillColor: 'hsl(8 100% 71%)', fillOpacity: 1, weight: 2 }}
        >
          <Tooltip direction="top">
            <strong>{location.name}</strong> · {location.type}
          </Tooltip>
        </CircleMarker>
      ))}

      {/* Live Moving Buses */}
      {buses.map((bus) => (
        <Marker
          key={bus.id}
          position={[bus.currentLocation.latitude, bus.currentLocation.longitude]}
          icon={divIcon({
            className: 'acims-bus-marker',
            html: `<div class="acims-bus-pin" style="display:flex;align-items:center;justify-content:center;background:hsl(193 62% 22%);color:hsl(67 100% 69%);width:42px;height:42px;border-radius:14px;border:2.5px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.3);font-weight:900;font-size:12px;">#${bus.busNumber}</div>`,
            iconSize: [42, 42],
            iconAnchor: [21, 21],
          })}
        >
          <Tooltip direction="top">
            Bus #{bus.busNumber} → {bus.destination} (Next: {bus.nextStop})
          </Tooltip>
        </Marker>
      ))}

      {/* User Location */}
      {userCoords && (
        <Marker
          position={userCoords}
          icon={divIcon({
            className: 'acims-user-marker',
            html: `<div style="display:flex;align-items:center;justify-content:center;background:hsl(142 71% 45%);color:white;width:34px;height:34px;border-radius:50%;border:3px solid white;box-shadow:0 0 14px rgba(34,197,94,0.7);"><span style="width:8px;height:8px;background:white;border-radius:50%;"></span></div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          })}
        >
          <Tooltip direction="top" permanent>Your Position</Tooltip>
        </Marker>
      )}
    </MapContainer>
  );
}