import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BusFront,
  Clock3,
  ExternalLink,
  Footprints,
  Info,
  Radio,
  Route as RouteIcon,
  Search,
  TrainFront,
  Zap,
} from 'lucide-react';
import {
  getListBusesQueryKey,
  getListTransportProvidersQueryKey,
  useListBuses,
  useListTransportProviders,
  useSearchTransport,
} from '@workspace/api-client-react';
import type { PublicTransportJourney } from '@workspace/api-client-react';
import { EmptyState, ErrorState, LoadingRows, PageHeading } from '@/components/acims-ui';

const PRESETS = [
  { start: 'College', destination: 'Tambaram', label: 'College → Tambaram' },
  { start: 'College', destination: 'Chennai Central', label: 'College → Chennai Central' },
  { start: 'College', destination: 'Airport Metro', label: 'College → Airport Metro' },
  { start: 'Student Center', destination: 'Perungalathur', label: 'Student Center → Perungalathur' },
];

export default function PublicTransportPage() {
  const providersQuery = useListTransportProviders({ query: { queryKey: getListTransportProvidersQueryKey() } });
  const busesQuery = useListBuses({ query: { queryKey: getListBusesQueryKey(), refetchInterval: 15000 } });
  const searchMutation = useSearchTransport();

  const [start, setStart] = useState('College');
  const [destination, setDestination] = useState('Tambaram');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const providers = providersQuery.data ?? [];
  const journeys = searchMutation.data ?? [];

  const handleSearch = (customStart?: string, customDest?: string) => {
    const s = (customStart ?? start).trim();
    const d = (customDest ?? destination).trim();
    if (s && d) {
      searchMutation.mutate({ data: { start: s, destination: d } });
    }
  };

  // Run initial search for College -> Tambaram on mount
  useEffect(() => {
    if (!searchMutation.data && !searchMutation.isPending) {
      handleSearch('College', 'Tambaram');
    }
  }, []);

  const selectPreset = (preset: typeof PRESETS[0]) => {
    setStart(preset.start);
    setDestination(preset.destination);
    handleSearch(preset.start, preset.destination);
  };

  const filteredJourneys = journeys.filter((journey) => {
    if (categoryFilter === 'ALL') return true;
    return journey.transportType.toLowerCase() === categoryFilter.toLowerCase();
  });

  const getTransportIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'college bus':
      case 'public bus':
        return BusFront;
      case 'train':
      case 'metro':
        return TrainFront;
      case 'walking':
        return Footprints;
      default:
        return RouteIcon;
    }
  };

  const loading = providersQuery.isLoading || busesQuery.isLoading;

  if (loading) return <LoadingRows count={5} />;
  if (providersQuery.isError || busesQuery.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void providersQuery.refetch();
          void busesQuery.refetch();
        }}
        label="Transport provider feeds could not be loaded."
      />
    );
  }

  return (
    <div className="page-in">
      <PageHeading
        eyebrow="Multi-modal public transit integration"
        title="Compare the complete journey."
        description="Connect ACIMS college buses with municipal buses, suburban rail, metro lines, and walking corridors across the regional network."
        action={
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[11px] font-bold">
            <Radio size={13} className="text-accent-foreground" />
            <span>5 Transit Adapters Active</span>
          </div>
        }
      />

      {/* SEARCH / TRIP INPUT SECTION */}
      <section className="rounded-[28px] border border-border bg-card p-5 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mr-1">
            Quick Scenarios:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              data-testid={`preset-transit-${p.destination.toLowerCase()}`}
              onClick={() => selectPreset(p)}
              className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
                start === p.start && destination === p.destination
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background hover:bg-muted text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="text-xs font-extrabold">
            Origin / Starting Point
            <input
              data-testid="input-transport-start"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              placeholder="e.g. College Main Entrance"
              className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="text-xs font-extrabold">
            Target Destination
            <input
              data-testid="input-transport-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Tambaram Bus Stop"
              className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <button
            type="button"
            data-testid="button-search-transport"
            onClick={() => handleSearch()}
            disabled={searchMutation.isPending || !start.trim() || !destination.trim()}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-extrabold text-accent-foreground transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            {searchMutation.isPending ? 'Searching transit adapters…' : (
              <>
                <Search size={16} /> Find Travel Options
              </>
            )}
          </button>
        </div>

        {searchMutation.isError && (
          <p className="mt-3 text-xs font-bold text-destructive">
            The external transport provider search failed. Active college buses are still available below.
          </p>
        )}
      </section>

      {/* CATEGORY FILTER BAR */}
      {journeys.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mr-1">Filter mode:</span>
          {['ALL', 'College bus', 'Public bus', 'Train', 'Metro', 'Walking'].map((cat) => (
            <button
              key={cat}
              type="button"
              data-testid={`filter-mode-${cat.toLowerCase().replaceAll(' ', '-')}`}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                categoryFilter === cat
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {cat === 'ALL' ? 'All Modes (Combined)' : cat}
            </button>
          ))}
        </div>
      )}

      {/* CONTENT GRID */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
        {/* Left: Providers Status & Architecture */}
        <div className="space-y-5">
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Provider Architecture</div>
                <h2 className="mt-1 text-xl font-extrabold">Transit Adapters</h2>
              </div>
              <Radio size={18} className="text-accent-foreground" />
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Modular adapter pipeline (<span className="font-mono text-[11px]">IPublicTransportProvider</span>) allows adding external transit APIs without altering frontend logic.
            </p>

            <div className="mt-4 space-y-2.5">
              {providers.length ? (
                providers.map((provider) => (
                  <div key={provider.id} data-testid={`row-provider-${provider.id}`} className="rounded-xl border border-border bg-muted/40 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-extrabold">{provider.name}</div>
                        <div className="mono text-[10px] text-muted-foreground mt-0.5">{provider.category}</div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                          provider.status === 'live'
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-card border border-border text-muted-foreground'
                        }`}
                      >
                        {provider.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-2 text-[10px] font-bold">
                      <span
                        className={`rounded px-1.5 py-0.5 ${
                          provider.dataLabel.includes('REAL')
                            ? 'bg-accent/20 text-accent-foreground'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {provider.dataLabel}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={Radio} title="No providers registered" message="No transport providers are reporting." />
              )}
            </div>
          </div>

          <div className="rounded-[28px] bg-secondary/50 border border-border p-5 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-1.5 font-extrabold text-foreground">
              <Info size={14} className="text-primary" /> Notice on External Data
            </div>
            <p className="leading-5">
              In accordance with ACIMS guidelines, external metropolitan bus, suburban train, and metro data are clearly marked as <strong>DEVELOPMENT / MOCK EXTERNAL DATA</strong> and are not represented as live GPS feeds until city transit agency APIs are authenticated.
            </p>
          </div>
        </div>

        {/* Right: Journey Options Comparison */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Options Found</div>
              <h2 className="mt-1 text-2xl font-extrabold">Available Mobility Routes</h2>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-extrabold">
              {filteredJourneys.length} option{filteredJourneys.length === 1 ? '' : 's'}
            </span>
          </div>

          {filteredJourneys.length > 0 ? (
            <div className="space-y-3">
              {filteredJourneys.map((journey) => {
                const Icon = getTransportIcon(journey.transportType);
                const isReal = journey.dataLabel.includes('REAL');

                return (
                  <div
                    key={journey.id}
                    data-testid={`card-external-journey-${journey.id}`}
                    className={`rounded-[24px] border p-5 transition shadow-sm ${
                      isReal ? 'border-primary/50 bg-card hover:border-primary' : 'border-border bg-card hover:border-muted-foreground/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid h-11 w-11 place-items-center rounded-2xl ${
                            isReal ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                          }`}
                        >
                          <Icon size={20} />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold uppercase tracking-wide text-primary">
                              {journey.transportType}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                                isReal
                                  ? 'bg-secondary text-secondary-foreground'
                                  : 'bg-destructive/15 text-destructive'
                              }`}
                            >
                              {journey.dataLabel}
                            </span>
                          </div>
                          <h3 className="mt-1 text-sm font-extrabold">{journey.route}</h3>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-extrabold text-foreground">{journey.durationMinutes} min</div>
                        <div className="text-[10px] text-muted-foreground">{journey.transfers} transfer{journey.transfers === 1 ? '' : 's'}</div>
                      </div>
                    </div>

                    {/* Departure & Arrival details */}
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 rounded-xl bg-muted/50 p-3 text-xs">
                      <div>
                        <span className="mono text-[9px] uppercase tracking-wider text-muted-foreground block">Departure</span>
                        <span className="font-extrabold">{journey.departure}</span>
                      </div>
                      <div>
                        <span className="mono text-[9px] uppercase tracking-wider text-muted-foreground block">Arrival / Destination</span>
                        <span className="font-extrabold">{journey.arrival}</span>
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-muted-foreground pt-2 border-t border-border/40">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <Footprints size={13} /> {journey.walkingDistanceKm.toFixed(1)} km walk
                        </span>
                        <span>·</span>
                        <span>{journey.availability}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-border bg-card p-8 text-center">
              <RouteIcon size={28} className="mx-auto text-muted-foreground" />
              <p className="mt-3 text-base font-extrabold">No transit options for this category</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try switching the mode filter above to &quot;All Modes&quot; or enter another origin/destination.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}