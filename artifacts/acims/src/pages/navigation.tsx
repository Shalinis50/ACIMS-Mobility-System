import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, LocateFixed, MapPin, Navigation as NavigationIcon, Route as RouteIcon, Timer, UsersRound } from 'lucide-react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { getListNavigationDestinationsQueryKey, useListNavigationDestinations, useCalculateNavigationRoute } from '@workspace/api-client-react';
import type { NavigationRoute } from '@workspace/api-client-react';
import { EmptyState, ErrorState, LoadingRows, PageHeading, OccupancyBar } from '@/components/acims-ui';
import 'leaflet/dist/leaflet.css';

const COLLEGE_CENTER = { latitude: 12.9055, longitude: 80.0918 };

export default function NavigationPage() {
  const destinationsQuery = useListNavigationDestinations({ query: { queryKey: getListNavigationDestinationsQueryKey() } });
  const calculateMutation = useCalculateNavigationRoute();
  const [destinationId, setDestinationId] = useState('');
  const [mode, setMode] = useState('walk-transit');
  const [start, setStart] = useState(COLLEGE_CENTER);
  const [locationNote, setLocationNote] = useState('Using College coordinates');
  const [route, setRoute] = useState<NavigationRoute>();
  const destinations = useMemo(() => destinationsQuery.data ?? [], [destinationsQuery.data]);
  const selectedDestination = destinations.find((destination) => destination.id === destinationId) ?? destinations[0];

  useEffect(() => {
    if (!destinationId && destinations[0]?.id) setDestinationId(destinations[0].id);
  }, [destinationId, destinations]);

  const useLocation = () => {
    if (!navigator.geolocation) {
      setLocationNote('Browser location unavailable · using College coordinates');
      setStart(COLLEGE_CENTER);
      return;
    }
    setLocationNote('Finding your position…');
    navigator.geolocation.getCurrentPosition((position) => {
      setStart({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLocationNote('Using your browser location');
    }, () => {
      setStart(COLLEGE_CENTER);
      setLocationNote('Location permission unavailable · using College coordinates');
    }, { enableHighAccuracy: true, timeout: 7000 });
  };
  const calculate = () => {
    if (!selectedDestination) return;
    calculateMutation.mutate({ data: { destinationId: selectedDestination.id, startLatitude: start.latitude, startLongitude: start.longitude, mode } }, { onSuccess: setRoute });
  };
  const error = destinationsQuery.isError || calculateMutation.isError;

  if (destinationsQuery.isLoading) return <LoadingRows count={4} />;
  if (destinationsQuery.isError) return <ErrorState onRetry={() => void destinationsQuery.refetch()} label="Navigation destinations could not be loaded." />;
  if (!destinations.length) return <EmptyState icon={MapPin} title="No destinations yet" message="ACIMS has no campus destinations to navigate to right now." />;

  return <div className="page-in">
    <PageHeading eyebrow="Decision support" title="Where are you headed?" description="Start with the place you need. ACIMS will pair the walk with a stop, a moving bus, and the honest time in between." />
    <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Plan a trip</div>
        <label className="mt-6 block text-xs font-extrabold" htmlFor="destination">Destination</label>
        <select id="destination" data-testid="select-navigation-destination" value={selectedDestination?.id ?? ''} onChange={(event) => setDestinationId(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-ring">{destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name} · {destination.type}</option>)}</select>
        <div className="mt-6 grid grid-cols-2 gap-2"><button type="button" data-testid="button-mode-transit" onClick={() => setMode('walk-transit')} className={`rounded-xl border p-3 text-left text-xs font-extrabold ${mode === 'walk-transit' ? 'border-primary bg-secondary/50' : 'border-border'}`}><NavigationIcon size={15} className="mb-2" />Walk + bus</button><button type="button" data-testid="button-mode-walk" onClick={() => setMode('walk')} className={`rounded-xl border p-3 text-left text-xs font-extrabold ${mode === 'walk' ? 'border-primary bg-secondary/50' : 'border-border'}`}><MapPin size={15} className="mb-2" />Walk only</button></div>
        <button type="button" data-testid="button-use-location" onClick={useLocation} className="mt-5 flex w-full items-center gap-2 rounded-xl border border-border px-3 py-3 text-left text-xs font-bold hover:bg-muted"><LocateFixed size={15} className="text-muted-foreground" /><span className="flex-1">{locationNote}</span></button>
        <button type="button" data-testid="button-calculate-navigation" onClick={calculate} disabled={calculateMutation.isPending || !selectedDestination} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-extrabold text-accent-foreground transition hover:-translate-y-0.5 disabled:opacity-50">{calculateMutation.isPending ? 'Finding the clearest trip…' : <>Show my route <ArrowRight size={16} /></>}</button>
        {error && <p className="mt-3 text-xs font-bold text-destructive">The navigation service could not complete that request. Try again.</p>}
        <div className="mt-7 rounded-2xl bg-muted p-4"><div className="flex items-center gap-2 text-xs font-extrabold"><RouteIcon size={14} /> How ACIMS decides</div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">The result combines your start point, the selected campus destination, and the current bus context. Times are not estimates from a static timetable.</p></div>
      </div>
      <div className="min-h-[560px] rounded-[28px] border border-border bg-secondary/35 p-3 sm:p-5">
        {route ? <NavigationResult route={route} /> : <div className="grid h-full min-h-[520px] place-items-center rounded-[22px] border border-dashed border-border bg-card/40 p-8 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-accent"><NavigationIcon size={25} /></span><h2 className="mt-4 text-xl font-extrabold">Your route will appear here</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Pick a destination and let ACIMS compare the walk with the next useful bus.</p></div></div>}
      </div>
    </section>
  </div>;
}

function NavigationResult({ route }: { route: NavigationRoute }) {
  const coordinates = route.routeCoordinates.map((point) => [point.latitude, point.longitude] as [number, number]);
  const center = coordinates[0] ?? [route.start.latitude, route.start.longitude] as [number, number];
  const bus = route.busOptions[0];
  return <div className="relative overflow-hidden rounded-[22px]">
    <MapContainer center={center} zoom={15} scrollWheelZoom={false} className="h-[310px] w-full">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {coordinates.length > 1 && <Polyline positions={coordinates} pathOptions={{ color: 'hsl(193 62% 22%)', weight: 6, opacity: .85 }} />}
      <CircleMarker center={[route.start.latitude, route.start.longitude]} radius={8} pathOptions={{ color: 'hsl(193 62% 22%)', fillColor: 'hsl(179 36% 78%)', fillOpacity: 1, weight: 3 }}><Tooltip>Start</Tooltip></CircleMarker>
      <CircleMarker center={[route.relevantStop.latitude, route.relevantStop.longitude]} radius={8} pathOptions={{ color: 'hsl(193 62% 22%)', fillColor: 'hsl(67 100% 69%)', fillOpacity: 1, weight: 3 }}><Tooltip>{route.relevantStop.name}</Tooltip></CircleMarker>
      <Marker position={[route.destination.latitude, route.destination.longitude]} icon={divIcon({ className: 'acims-bus-marker', html: '<div style="display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:hsl(193 62% 22%);color:hsl(67 100% 69%);font-size:16px">•</div>', iconSize: [34, 34], iconAnchor: [17, 17] })}><Tooltip>{route.destination.name}</Tooltip></Marker>
    </MapContainer>
    <div className="relative z-[500] -mt-7 mx-3 rounded-2xl border border-border bg-card p-4 shadow-lg sm:mx-5"><div className="flex items-start justify-between gap-3"><div><div className="mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Recommended arrival</div><h2 className="mt-1 text-xl font-extrabold">{route.destination.name}</h2></div><span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-extrabold">{route.mode}</span></div><div className="mt-4 grid grid-cols-3 gap-2"><Metric icon={MapPin} label="Distance" value={`${route.distanceKm.toFixed(1)} km`} /><Metric icon={Timer} label="Walk" value={`${route.walkingMinutes} min`} /><Metric icon={RouteIcon} label="Board at" value={route.relevantStop.name} /></div></div>
    <div className="mt-4 rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><div className="mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Bus context</div><h3 className="mt-1 text-lg font-extrabold">{bus ? `Bus ${bus.busNumber} · ${bus.destination}` : 'No bus option in this route'}</h3></div>{bus && <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-extrabold">{bus.etaMinutes} min</span>}</div>{bus ? <div className="mt-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><UsersRound size={14} /> {bus.seatsAvailable} seats available · {bus.status}</div><div className="mt-3"><OccupancyBar occupancy={bus.occupancy} capacity={bus.capacity} /></div></div> : <p className="mt-3 text-xs leading-5 text-muted-foreground">ACIMS has no relevant moving bus for this destination right now. The walking leg is still available.</p>}</div>
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return <div className="rounded-xl bg-muted p-3"><Icon size={14} className="text-muted-foreground" /><div className="mono mt-2 text-[9px] uppercase tracking-[.12em] text-muted-foreground">{label}</div><div className="mt-1 truncate text-xs font-extrabold">{value}</div></div>;
}