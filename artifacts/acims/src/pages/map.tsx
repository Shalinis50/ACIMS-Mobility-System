import { useMemo } from 'react';
import { BusFront, LocateFixed, MapPin, Navigation, Radio, Route as RouteIcon } from 'lucide-react';
import { divIcon } from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import { getGetBusLocationQueryKey, getListBusStopsQueryKey, getListBusesQueryKey, useGetBusLocation, useListBusStops, useListBuses } from '@workspace/api-client-react';
import { EmptyState, ErrorState, formatUpdatedAt, LoadingRows, PageHeading, statusLabel, useSelectedBusId } from '@/components/acims-ui';
import 'leaflet/dist/leaflet.css';

export default function LiveMap() {
  const selectedBusId = useSelectedBusId();
  const busesQuery = useListBuses({ query: { queryKey: getListBusesQueryKey() } });
  const bus = useMemo(() => busesQuery.data?.find((item) => item.id === selectedBusId) ?? busesQuery.data?.[0], [busesQuery.data, selectedBusId]);
  const busId = bus?.id ?? '';
  const locationQuery = useGetBusLocation(busId, { query: { enabled: !!busId, queryKey: getGetBusLocationQueryKey(busId), refetchInterval: 10000 } });
  const stopsQuery = useListBusStops(busId, { query: { enabled: !!busId, queryKey: getListBusStopsQueryKey(busId) } });
  if (busesQuery.isLoading) return <LoadingRows count={4} />;
  if (busesQuery.isError) return <ErrorState onRetry={() => void busesQuery.refetch()} />;
  if (!bus) return <EmptyState icon={RouteIcon} title="No route to draw" message="Choose an active campus route to see its live stop pattern." />;
  const location = locationQuery.data;
  const stops = stopsQuery.data ?? [];
  const maxSequence = Math.max(1, ...stops.map((stop) => stop.sequence));
  return <div className="page-in">
    <PageHeading eyebrow="Live operations" title="See the whole ride." description="A calm view of where your bus is, what comes next, and how much time is actually left." action={<div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[11px] font-bold"><span className="pulse-dot h-2 w-2 rounded-full bg-accent-foreground" /> {formatUpdatedAt(location?.updatedAt ?? bus.updatedAt)}</div>} />
    <section className="grid gap-5 xl:grid-cols-[1.5fr_.7fr]">
      <div className="relative min-h-[500px] overflow-hidden rounded-[28px] border border-border bg-secondary/35 p-3 sm:p-5">
        <div className="absolute left-6 top-6 z-[500] rounded-xl border border-border bg-card/90 px-3 py-2 shadow-sm backdrop-blur"><div className="mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Active vehicle</div><div className="mt-1 flex items-center gap-2 text-sm font-extrabold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-accent"><BusFront size={15} /></span> Bus {bus.busNumber}</div></div>
        <div className="absolute right-6 top-6 z-[500] grid h-10 w-10 place-items-center rounded-xl border border-border bg-card/90 text-muted-foreground shadow-sm backdrop-blur"><LocateFixed size={17} /></div>
        <RouteMap stops={stops} location={location} busNumber={bus.busNumber} />
        <div className="pointer-events-none absolute bottom-5 left-5 right-5 z-[500] flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/90 px-4 py-3 text-[11px] font-bold shadow-sm backdrop-blur"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Route</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent-foreground ring-2 ring-accent" /> Bus now</span><span className="ml-auto flex items-center gap-1 text-muted-foreground"><Radio size={13} /> {location?.source ?? 'fleet signal'}</span></div>
      </div>
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-7"><div className="flex items-start justify-between"><div><div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Route context</div><h2 className="mt-2 display-font text-2xl font-extrabold">{bus.origin} <span className="text-muted-foreground">→</span> {bus.destination}</h2></div><span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-extrabold">{statusLabel(location?.status ?? bus.status)}</span></div><div className="mt-7 space-y-0">{stops.length ? stops.sort((a, b) => a.sequence - b.sequence).map((stop, index) => { const isNext = stop.id === (location?.nextStopId ?? bus.nextStopId); return <div key={stop.id} data-testid={`row-stop-${stop.id}`} className="group relative flex gap-4 pb-6 last:pb-0"><div className="relative flex w-4 justify-center"><span className={`z-10 mt-1 h-3.5 w-3.5 rounded-full border-4 ${isNext ? 'border-accent-foreground bg-accent' : index === 0 ? 'border-secondary-foreground bg-secondary' : 'border-muted bg-card'}`} />{index < stops.length - 1 && <span className="absolute top-4 h-full w-px bg-border" />}</div><div className="flex-1"><div className={`text-sm font-extrabold ${isNext ? 'text-foreground' : 'text-muted-foreground'}`}>{stop.name}</div><div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">{isNext ? <><span className="font-bold text-accent-foreground">Next stop</span><span>·</span><span>{location?.etaMinutes ?? bus.etaMinutes} min away</span></> : <span>{stop.minutesFromPrevious ? `${stop.minutesFromPrevious} min from previous` : 'Origin stop'}</span>}</div></div></div>; }) : <LoadingRows count={4} />}</div><div className="mt-7 flex items-center gap-2 rounded-xl bg-muted px-3 py-3 text-[11px] leading-5 text-muted-foreground"><Navigation size={14} className="shrink-0 text-accent-foreground" /> Bus is moving toward {location?.nextStop ?? bus.nextStop}. Follow the highlighted stop.</div></div>
    </section>
    <div className="mt-5 grid gap-4 sm:grid-cols-3"><MapStat icon={MapPin} label="Next stop" value={location?.nextStop ?? bus.nextStop} /><MapStat icon={Navigation} label="ETA" value={`${location?.etaMinutes ?? bus.etaMinutes} min`} /><MapStat icon={Radio} label="Signal" value={`Updated ${formatUpdatedAt(location?.updatedAt ?? bus.updatedAt)}`} /></div>
  </div>;
}

function RouteMap({ stops, location, busNumber }: {
  stops: Array<{ id: string; name: string; latitude: number; longitude: number; sequence: number }>;
  location?: { latitude: number; longitude: number; nextStopId: string; nextStop: string; etaMinutes: number; source: string };
  busNumber: string;
}) {
  const sortedStops = stops.slice().sort((a, b) => a.sequence - b.sequence);
  const firstStop = sortedStops[0] ?? { latitude: 12.9055, longitude: 80.0918 };
  const route = sortedStops.map((stop) => [stop.latitude, stop.longitude] as [number, number]);
  const busIcon = useMemo(() => divIcon({
    className: 'acims-bus-marker',
    html: `<div class="acims-bus-pin"><span>${busNumber}</span></div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  }), [busNumber]);
  const busPosition: [number, number] = location
    ? [location.latitude, location.longitude]
    : [firstStop.latitude, firstStop.longitude];

  return <MapContainer center={busPosition} zoom={13} scrollWheelZoom={false} className="h-[475px] min-h-[460px] w-full rounded-[22px]">
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    <Polyline positions={route} pathOptions={{ color: 'hsl(193 62% 22%)', weight: 6, opacity: 0.8 }} />
    {sortedStops.map((stop, index) => {
      const isNext = stop.id === location?.nextStopId;
      return <CircleMarker key={stop.id} center={[stop.latitude, stop.longitude]} radius={isNext ? 9 : 7} pathOptions={{ color: isNext ? 'hsl(39 96% 58%)' : 'hsl(193 62% 22%)', fillColor: isNext ? 'hsl(39 96% 58%)' : 'white', fillOpacity: 1, weight: 3 }}>
        <Tooltip direction="top" offset={[0, -8]}>{stop.name}{isNext ? ` · ${location?.etaMinutes} min` : index === 0 ? ' · Origin' : ''}</Tooltip>
      </CircleMarker>;
    })}
    <Marker position={busPosition} icon={busIcon}><Tooltip direction="top" offset={[0, -20]}>{`Bus ${busNumber} · ${location?.nextStop ?? 'Moving'}`}</Tooltip></Marker>
  </MapContainer>;
}

function MapStat({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground"><Icon size={16} /></span><div><div className="mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div><div data-testid={`text-map-${label.toLowerCase().replace(' ', '-')}`} className="mt-1 text-sm font-extrabold">{value}</div></div></div>;
}