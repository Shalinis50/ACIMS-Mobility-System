import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronRight, Clock, Footprints, LocateFixed, MapPin, Navigation as NavigationIcon, Route as RouteIcon, Sparkles, Timer, UsersRound } from 'lucide-react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { getListNavigationDestinationsQueryKey, useListNavigationDestinations, useCalculateNavigationRoute } from '@workspace/api-client-react';
import type { NavigationRoute } from '@workspace/api-client-react';
import { EmptyState, ErrorState, LoadingRows, PageHeading, OccupancyBar } from '@/components/acims-ui';
import 'leaflet/dist/leaflet.css';

const COLLEGE_CENTER = { latitude: 12.9407, longitude: 80.1393 };

const startPresets = [
  { label: 'Current GPS Position', coords: null },
  { label: 'College Main Entrance', coords: COLLEGE_CENTER },
  { label: 'North Residence Complex', coords: { latitude: 12.9458, longitude: 80.1352 } },
  { label: 'Hostel Village', coords: { latitude: 12.9015, longitude: 80.0984 } },
];

export default function NavigationPage() {
  const destinationsQuery = useListNavigationDestinations({ query: { queryKey: getListNavigationDestinationsQueryKey() } });
  const calculateMutation = useCalculateNavigationRoute();
  const [destinationId, setDestinationId] = useState('');
  const [mode, setMode] = useState('walk-transit');
  const [start, setStart] = useState(COLLEGE_CENTER);
  const [locationNote, setLocationNote] = useState('College Main Entrance');
  const [route, setRoute] = useState<NavigationRoute>();
  const destinations = useMemo(() => destinationsQuery.data ?? [], [destinationsQuery.data]);

  // Check if destination was passed from Campus Map or preset
  useEffect(() => {
    const savedDest = localStorage.getItem('acims-nav-destination');
    if (savedDest && destinations.some((d) => d.id === savedDest)) {
      setDestinationId(savedDest);
      localStorage.removeItem('acims-nav-destination');
    } else if (!destinationId && destinations[0]?.id) {
      setDestinationId(destinations[0].id);
    }
  }, [destinationId, destinations]);

  const selectedDestination = destinations.find((destination) => destination.id === destinationId) ?? destinations[0];

  const useLocation = () => {
    if (!navigator.geolocation) {
      setLocationNote('Browser location unavailable · using College coordinates');
      setStart(COLLEGE_CENTER);
      return;
    }
    setLocationNote('Detecting your GPS position…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStart({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationNote('My GPS Coordinates');
      },
      () => {
        setStart(COLLEGE_CENTER);
        setLocationNote('GPS permission denied · using College coordinates');
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  const calculate = (customDestId?: string) => {
    const targetDest = destinations.find((d) => d.id === (customDestId || selectedDestination?.id));
    if (!targetDest) return;
    calculateMutation.mutate(
      { data: { destinationId: targetDest.id, startLatitude: start.latitude, startLongitude: start.longitude, mode } },
      { onSuccess: setRoute }
    );
  };

  // Automatically calculate on first load when destinations are available
  useEffect(() => {
    if (destinations.length > 0 && !route && !calculateMutation.isPending) {
      const initialDestId = destinationId || destinations[0].id;
      calculateMutation.mutate(
        { data: { destinationId: initialDestId, startLatitude: start.latitude, startLongitude: start.longitude, mode } },
        { onSuccess: setRoute }
      );
    }
  }, [destinations]);

  const error = destinationsQuery.isError || calculateMutation.isError;

  if (destinationsQuery.isLoading) return <LoadingRows count={4} />;
  if (destinationsQuery.isError) return <ErrorState onRetry={() => void destinationsQuery.refetch()} label="Navigation destinations could not be loaded." />;
  if (!destinations.length) return <EmptyState icon={MapPin} title="No destinations yet" message="ACIMS has no campus destinations to navigate to right now." />;

  return (
    <div className="page-in">
      <PageHeading
        eyebrow="Adaptive campus mobility"
        title="Where are you headed?"
        description="Pick a campus landmark or bus stop. ACIMS will pair the walk with the closest stop, live moving bus, and accurate ETAs."
      />

      {/* Quick Destination Presets */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mr-1">Quick destinations:</span>
        {destinations.slice(0, 5).map((d) => (
          <button
            key={d.id}
            type="button"
            data-testid={`preset-dest-${d.id}`}
            onClick={() => {
              setDestinationId(d.id);
              calculate(d.id);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
              selectedDestination?.id === d.id
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card hover:bg-muted text-foreground'
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
          <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Plan a trip</div>

          <label className="mt-5 block text-xs font-extrabold" htmlFor="destination">Destination</label>
          <select
            id="destination"
            data-testid="select-navigation-destination"
            value={selectedDestination?.id ?? ''}
            onChange={(event) => setDestinationId(event.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-ring"
          >
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.name} · {destination.type}
              </option>
            ))}
          </select>

          {/* Mode Selector */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="button-mode-transit"
              onClick={() => setMode('walk-transit')}
              className={`rounded-xl border p-3 text-left text-xs font-extrabold transition ${mode === 'walk-transit' ? 'border-primary bg-secondary/50 shadow-sm' : 'border-border'}`}
            >
              <NavigationIcon size={15} className="mb-2 text-primary" />
              Walk + Bus (Recommended)
            </button>
            <button
              type="button"
              data-testid="button-mode-walk"
              onClick={() => setMode('walk')}
              className={`rounded-xl border p-3 text-left text-xs font-extrabold transition ${mode === 'walk' ? 'border-primary bg-secondary/50 shadow-sm' : 'border-border'}`}
            >
              <Footprints size={15} className="mb-2 text-primary" />
              Walk Only (Pedestrian)
            </button>
          </div>

          {/* Start Origin Location */}
          <div className="mt-5">
            <label className="block text-xs font-extrabold">Starting from</label>
            <div className="mt-2 space-y-2">
              <button
                type="button"
                data-testid="button-use-location"
                onClick={useLocation}
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 text-left text-xs font-bold hover:bg-muted"
              >
                <LocateFixed size={15} className="text-accent-foreground" />
                <span className="flex-1 truncate">{locationNote}</span>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-[9px] font-bold">GPS</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            data-testid="button-calculate-navigation"
            onClick={() => calculate()}
            disabled={calculateMutation.isPending || !selectedDestination}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-extrabold text-accent-foreground transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            {calculateMutation.isPending ? 'Calculating adaptive path…' : <>Calculate Route <ArrowRight size={16} /></>}
          </button>

          {error && <p className="mt-3 text-xs font-bold text-destructive">The navigation service could not complete that request. Try again.</p>}

          <div className="mt-7 rounded-2xl bg-muted p-4">
            <div className="flex items-center gap-2 text-xs font-extrabold">
              <RouteIcon size={14} /> How ACIMS decides
            </div>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              ACIMS combines your live origin, your destination building, and live campus bus GPS telemetry. If a bus arrives sooner than the walk, transit is recommended.
            </p>
          </div>
        </div>

        <div className="min-h-[560px] rounded-[28px] border border-border bg-secondary/35 p-3 sm:p-5">
          {route ? (
            <NavigationResult route={route} />
          ) : (
            <div className="grid h-full min-h-[520px] place-items-center rounded-[22px] border border-dashed border-border bg-card/40 p-8 text-center">
              <div>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-accent">
                  <NavigationIcon size={25} />
                </span>
                <h2 className="mt-4 text-xl font-extrabold">Your itinerary will appear here</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  Pick a destination and let ACIMS compare the walk with the next useful bus.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function NavigationResult({ route }: { route: NavigationRoute }) {
  const coordinates = route.routeCoordinates.map((point) => [point.latitude, point.longitude] as [number, number]);
  const center = coordinates[0] ?? [route.start.latitude, route.start.longitude] as [number, number];
  const bus = route.busOptions[0];
  const isWalkOnly = route.mode === 'walk';

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[22px]">
        <MapContainer center={center} zoom={15} scrollWheelZoom={false} className="h-[290px] w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {coordinates.length > 1 && (
            <Polyline positions={coordinates} pathOptions={{ color: 'hsl(193 62% 22%)', weight: 6, opacity: 0.85 }} />
          )}
          <CircleMarker
            center={[route.start.latitude, route.start.longitude]}
            radius={8}
            pathOptions={{ color: 'hsl(193 62% 22%)', fillColor: 'hsl(179 36% 78%)', fillOpacity: 1, weight: 3 }}
          >
            <Tooltip permanent>Start</Tooltip>
          </CircleMarker>
          {!isWalkOnly && (
            <CircleMarker
              center={[route.relevantStop.latitude, route.relevantStop.longitude]}
              radius={8}
              pathOptions={{ color: 'hsl(193 62% 22%)', fillColor: 'hsl(67 100% 69%)', fillOpacity: 1, weight: 3 }}
            >
              <Tooltip permanent>{route.relevantStop.name}</Tooltip>
            </CircleMarker>
          )}
          <Marker
            position={[route.destination.latitude, route.destination.longitude]}
            icon={divIcon({
              className: 'acims-dest-marker',
              html: '<div style="display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:hsl(8 100% 61%);color:white;font-weight:900;font-size:16px;box-shadow:0 3px 8px rgba(0,0,0,0.3)">📍</div>',
              iconSize: [34, 34],
              iconAnchor: [17, 17],
            })}
          >
            <Tooltip permanent>{route.destination.name}</Tooltip>
          </Marker>
        </MapContainer>

        <div className="relative z-[500] -mt-6 mx-3 rounded-2xl border border-border bg-card p-4 shadow-lg sm:mx-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Optimal Route</div>
              <h2 className="mt-1 text-xl font-extrabold">{route.destination.name}</h2>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-extrabold uppercase">
              {isWalkOnly ? 'Pedestrian Walk' : 'Walk + Transit'}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric icon={MapPin} label="Total Distance" value={`${route.distanceKm.toFixed(1)} km`} />
            <Metric icon={Timer} label="Est. Time" value={`${route.walkingMinutes} min`} />
            <Metric icon={RouteIcon} label="Board Stop" value={isWalkOnly ? 'Direct Walk' : route.relevantStop.name} />
          </div>
        </div>
      </div>

      {/* Step-by-Step Transit Itinerary */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Step-by-step itinerary</div>
        <div className="mt-4 space-y-3">
          {/* Step 1 */}
          <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground text-xs font-extrabold">1</span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold">Walk to {isWalkOnly ? route.destination.name : route.relevantStop.name}</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {isWalkOnly ? `Direct walk along designated lit walkways (~${route.walkingMinutes} min).` : `Walk ~${Math.max(1, Math.round(route.walkingMinutes * 0.35))} min along illuminated path to ${route.relevantStop.name}.`}
              </p>
            </div>
          </div>

          {/* Step 2 (if transit) */}
          {!isWalkOnly && bus && (
            <div className="flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground text-xs font-extrabold">2</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold">Board Bus #{bus.busNumber} ({bus.destination})</span>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-extrabold">ETA {bus.etaMinutes} min</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {bus.seatsAvailable} seats available · Status: {bus.status}
                </p>
                <div className="mt-2">
                  <OccupancyBar occupancy={bus.occupancy} capacity={bus.capacity} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-foreground text-xs font-extrabold">
              {isWalkOnly ? '2' : '3'}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold">Arrive at {route.destination.name}</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Destination landmark located in {route.destination.type} sector.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <Icon size={14} className="text-muted-foreground" />
      <div className="mono mt-2 text-[9px] uppercase tracking-[.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-xs font-extrabold">{value}</div>
    </div>
  );
}