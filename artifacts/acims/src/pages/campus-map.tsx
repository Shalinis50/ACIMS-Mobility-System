import { useMemo, useState } from 'react';
import { BusFront, Layers3, MapPin, Route as RouteIcon, Search } from 'lucide-react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { getListBusesQueryKey, useListBuses, useListCampusLocations, getListCampusLocationsQueryKey, useListCampusStops, getListCampusStopsQueryKey, useListCampusRoutes, getListCampusRoutesQueryKey } from '@workspace/api-client-react';
import { EmptyState, ErrorState, LoadingRows, PageHeading, statusLabel } from '@/components/acims-ui';
import 'leaflet/dist/leaflet.css';

const COLLEGE_CENTER: [number, number] = [12.9055, 80.0918];

export default function CampusMapPage() {
  const [search, setSearch] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const locationsQuery = useListCampusLocations({ query: { queryKey: getListCampusLocationsQueryKey() } });
  const stopsQuery = useListCampusStops({ query: { queryKey: getListCampusStopsQueryKey() } });
  const routesQuery = useListCampusRoutes({ query: { queryKey: getListCampusRoutesQueryKey() } });
  const busesQuery = useListBuses({ query: { queryKey: getListBusesQueryKey() } });
  const locations = locationsQuery.data ?? [];
  const stops = stopsQuery.data ?? [];
  const routes = routesQuery.data ?? [];
  const buses = busesQuery.data ?? [];
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? routes[0];
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
  const center = routeLine[0] ?? (stops[0] ? [stops[0].latitude, stops[0].longitude] as [number, number] : COLLEGE_CENTER);
  const hasError = locationsQuery.isError || stopsQuery.isError || routesQuery.isError || busesQuery.isError;

  if (locationsQuery.isLoading || stopsQuery.isLoading || routesQuery.isLoading || busesQuery.isLoading) return <LoadingRows count={5} />;
  if (hasError) return <ErrorState onRetry={() => { void locationsQuery.refetch(); void stopsQuery.refetch(); void routesQuery.refetch(); void busesQuery.refetch(); }} label="Campus map data could not be refreshed." />;
  if (!locations.length && !stops.length && !routes.length) return <EmptyState icon={MapPin} title="Campus map is quiet" message="There are no campus locations or transport stops available right now." />;

  return <div className="page-in">
    <PageHeading eyebrow="Campus orientation" title="Know the ground." description="Browse the places, stops, and routes that make the college commute legible." action={<div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[11px] font-bold"><span className="pulse-dot h-2 w-2 rounded-full bg-accent-foreground" /> {buses.length} buses in ACIMS</div>} />
    <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
      <div className="space-y-4">
        <div className="rounded-[24px] border border-border bg-card p-5 soft-shadow">
          <div className="flex items-center gap-2 text-xs font-extrabold"><Search size={15} className="text-muted-foreground" /> Find a campus place</div>
          <input data-testid="input-campus-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Library, residence, gate…" className="mt-4 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="rounded-[24px] border border-border bg-card p-5">
          <div className="flex items-center justify-between"><div><div className="mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Route layers</div><h2 className="mt-1 text-lg font-extrabold">Campus loops</h2></div><Layers3 size={17} className="text-muted-foreground" /></div>
          <div className="mt-4 space-y-2">
            {routes.length ? routes.map((route) => <button key={route.id} type="button" data-testid={`button-campus-route-${route.id}`} onClick={() => setSelectedRouteId(route.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selectedRoute?.id === route.id ? 'border-primary bg-secondary/50' : 'border-border hover:bg-muted'}`}><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-accent"><RouteIcon size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{route.name}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">Bus {route.busNumber} · {route.destination}</span></span><span className="mono text-[10px] text-muted-foreground">{route.stopIds.length} stops</span></button>) : <EmptyState icon={RouteIcon} title="No routes listed" message="ACIMS has not published a campus route yet." />}
          </div>
        </div>
        <div className="rounded-[24px] border border-border bg-card p-5">
          <div className="mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Places {filteredLocations.length}</div>
          <div className="mt-3 max-h-[290px] space-y-2 overflow-y-auto pr-1">
            {filteredLocations.length ? filteredLocations.map((location) => <div key={location.id} data-testid={`card-campus-location-${location.id}`} className="rounded-xl bg-muted/70 p-3"><div className="flex items-start justify-between gap-3"><div className="text-sm font-extrabold">{location.name}</div><span className="rounded-full bg-card px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">{location.type}</span></div><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{location.description}</p></div>) : <p className="py-5 text-center text-xs text-muted-foreground">No place matches that search.</p>}
          </div>
        </div>
      </div>
      <div className="relative min-h-[590px] overflow-hidden rounded-[28px] border border-border bg-secondary/35 p-3 sm:p-5">
        <div className="absolute left-7 top-7 z-[500] rounded-xl border border-border bg-card/90 px-3 py-2 shadow-sm backdrop-blur"><div className="mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Map view</div><div className="mt-1 text-sm font-extrabold">{selectedRoute?.name ?? 'All campus context'}</div></div>
        <CampusLeaflet center={center} stops={stops} locations={filteredLocations} routeLine={routeLine} buses={buses} />
        <div className="pointer-events-none absolute bottom-7 left-7 right-7 z-[500] flex flex-wrap gap-3 rounded-2xl border border-border bg-card/90 px-4 py-3 text-[11px] font-bold shadow-sm backdrop-blur"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Route</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-accent-foreground bg-accent" /> Stop</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Place</span></div>
      </div>
    </section>
    <section className="mt-5 grid gap-4 sm:grid-cols-3">
      {buses.slice(0, 3).map((bus) => <div key={bus.id} data-testid={`card-campus-bus-${bus.id}`} className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-muted"><BusFront size={15} /></span><span className="text-sm font-extrabold">Bus {bus.busNumber}</span><span className="ml-auto rounded-full bg-secondary px-2 py-1 text-[9px] font-extrabold">{statusLabel(bus.status)}</span></div><div className="mt-3 text-xs text-muted-foreground">{bus.origin} <span className="px-1">→</span> {bus.destination}</div><div className="mt-1 text-[11px] font-bold">{bus.nextStop} · {bus.etaMinutes} min</div></div>)}
    </section>
  </div>;
}

function CampusLeaflet({ center, stops, locations, routeLine, buses }: { center: [number, number]; stops: Array<{ id: string; name: string; latitude: number; longitude: number }>; locations: Array<{ id: string; name: string; type: string; latitude: number; longitude: number }>; routeLine: [number, number][]; buses: Array<{ id: string; busNumber: string; currentLocation: { latitude: number; longitude: number }; nextStop: string }> }) {
  return <MapContainer center={center} zoom={15} scrollWheelZoom={false} className="h-[560px] min-h-[520px] w-full rounded-[22px]">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {routeLine.length > 1 && <Polyline positions={routeLine} pathOptions={{ color: 'hsl(193 62% 22%)', weight: 6, opacity: .8 }} />}
    {stops.map((stop) => <CircleMarker key={stop.id} center={[stop.latitude, stop.longitude]} radius={8} pathOptions={{ color: 'hsl(193 62% 22%)', fillColor: 'hsl(67 100% 69%)', fillOpacity: 1, weight: 3 }}><Tooltip direction="top">{stop.name}</Tooltip></CircleMarker>)}
    {locations.map((location) => <CircleMarker key={location.id} center={[location.latitude, location.longitude]} radius={6} pathOptions={{ color: 'hsl(8 100% 61%)', fillColor: 'hsl(8 100% 71%)', fillOpacity: 1, weight: 2 }}><Tooltip direction="top">{location.name} · {location.type}</Tooltip></CircleMarker>)}
    {buses.map((bus) => <Marker key={bus.id} position={[bus.currentLocation.latitude, bus.currentLocation.longitude]} icon={divIcon({ className: 'acims-bus-marker', html: `<div class="acims-bus-pin"><span>${bus.busNumber}</span></div>`, iconSize: [48, 48], iconAnchor: [24, 24] })}><Tooltip direction="top">Bus {bus.busNumber} · {bus.nextStop}</Tooltip></Marker>)}
  </MapContainer>;
}