import { useEffect, useState, useMemo } from 'react';
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
  LocateFixed,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Database,
  Building2,
  CheckCircle2,
  Calendar,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { PageHeading } from '@/components/acims-ui';
import { useNetworkStatus } from '@/hooks/use-network';

interface TransitJourneyOption {
  agency: string;
  agencyId: string;
  routeNumber: string;
  routeName: string;
  routeType: string;
  origin: string;
  destination: string;
  boardingStop: string;
  boardingTime: string;
  alightingStop: string;
  alightingTime: string;
  durationMinutes: number;
  stopsCount: number;
  status: 'Scheduled';
  dataSource: string;
}

interface TransitStop {
  id: string;
  agency_id: string;
  stop_id: string;
  stop_name: string;
  latitude: number;
  longitude: number;
  agency_name?: string;
  distanceMeters?: number;
}

interface TransitRoute {
  id: string;
  agency_id: string;
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color: string;
  origin: string;
  destination: string;
  source: string;
  agency_name?: string;
}

interface MissedBusAlternative {
  category: 'MTC Bus' | 'Chennai Metro' | 'Suburban Rail';
  stopName: string;
  distanceMeters: number;
  walkingMinutes: number;
  agency: string;
  routes: string[];
  scheduledNextDeparture: string;
  status: 'Scheduled';
  source: string;
}

const PRESETS = [
  { start: 'Tambaram', destination: 'Chennai Beach', label: 'Tambaram ↔ Chennai Beach (Suburban EMU)' },
  { start: 'Airport', destination: 'Wimco Nagar', label: 'Airport ↔ Wimco Nagar (CMRL Blue Line)' },
  { start: 'Tambaram', destination: 'Broadway', label: 'Tambaram ↔ Broadway (MTC 500 / 29A)' },
  { start: 'Thandalam', destination: 'Poonamallee', label: 'Thandalam (REC) ↔ Poonamallee (MTC Bus)' },
];

export default function PublicTransportPage() {
  const { isOnline } = useNetworkStatus();

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'search' | 'nearby' | 'routes' | 'missed_bus' | 'provenance'>('search');

  // Journey Search State
  const [start, setStart] = useState('Tambaram');
  const [destination, setDestination] = useState('Chennai Beach');
  const [agencyFilter, setAgencyFilter] = useState('ALL');
  const [journeys, setJourneys] = useState<TransitJourneyOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Nearby Stops State
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [nearbyStops, setNearbyStops] = useState<TransitStop[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [locatingError, setLocatingError] = useState<string | null>(null);

  // Route Directory State
  const [routeSearchQuery, setRouteSearchQuery] = useState('29A');
  const [matchingRoutes, setMatchingRoutes] = useState<TransitRoute[]>([]);
  const [isRouteSearching, setIsRouteSearching] = useState(false);

  // Missed Bus Assistant State
  const [missedBusAlternatives, setMissedBusAlternatives] = useState<MissedBusAlternative[]>([]);
  const [isCheckingMissedBus, setIsCheckingMissedBus] = useState(false);

  // Dataset Provenance
  const [syncStatus, setSyncStatus] = useState<any>(null);

  // Load sync status on mount
  useEffect(() => {
    fetch('/api/transit/sync-status')
      .then((r) => r.json())
      .then((data) => setSyncStatus(data))
      .catch(() => {});
  }, []);

  // Perform Journey Search
  const handleJourneySearch = async (fromText = start, toText = destination) => {
    if (!fromText.trim() || !toText.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const url = `/api/transit/search?from=${encodeURIComponent(fromText.trim())}&to=${encodeURIComponent(toText.trim())}&agencyId=${agencyFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setJourneys(data);
      } else {
        setSearchError('No direct public transit options found for this corridor.');
      }
    } catch {
      setSearchError('Unable to connect to transit database.');
    } finally {
      setIsSearching(false);
    }
  };

  // Perform Route Search in Directory
  const handleRouteSearch = async (query = routeSearchQuery) => {
    if (!query.trim()) return;
    setIsRouteSearching(true);
    try {
      const res = await fetch(`/api/transit/routes?query=${encodeURIComponent(query.trim())}&limit=25`);
      if (res.ok) {
        const data = await res.json();
        setMatchingRoutes(data);
      }
    } finally {
      setIsRouteSearching(false);
    }
  };

  // Trigger Nearby Search based on Coordinates
  const fetchNearby = async (lat: number, lon: number) => {
    setIsLocating(true);
    setLocatingError(null);
    try {
      const res = await fetch(`/api/transit/nearby?lat=${lat}&lon=${lon}&radiusKm=3.5`);
      if (res.ok) {
        const data = await res.json();
        setNearbyStops(data);
      }
    } catch {
      setLocatingError('Failed to fetch nearby transit stops.');
    } finally {
      setIsLocating(false);
    }
  };

  // Acquire Browser GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocatingError('Browser does not support geolocation.');
      return;
    }
    setIsLocating(true);
    setLocatingError('Acquiring real device GPS…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserCoords(coords);
        setLocatingError(null);
        void fetchNearby(coords.lat, coords.lon);
      },
      (err) => {
        // Fallback to REC campus coordinates
        const fallback = { lat: 13.0084, lon: 80.0033 };
        setUserCoords(fallback);
        setLocatingError(`Device GPS unavailable (${err.message}). Using REC Thandalam campus coordinates.`);
        void fetchNearby(fallback.lat, fallback.lon);
      },
      { timeout: 7000 }
    );
  };

  // Trigger Missed Bus Assistant
  const handleMissedBusCheck = async () => {
    setIsCheckingMissedBus(true);
    const lat = userCoords?.lat || 13.0084; // REC Thandalam
    const lon = userCoords?.lon || 80.0033;
    try {
      const res = await fetch(`/api/transit/missed-bus-alternatives?lat=${lat}&lon=${lon}`);
      if (res.ok) {
        const data = await res.json();
        setMissedBusAlternatives(data);
      }
    } finally {
      setIsCheckingMissedBus(false);
    }
  };

  // Run initial searches on mount
  useEffect(() => {
    handleJourneySearch('Tambaram', 'Chennai Beach');
    handleRouteSearch('29A');
    handleLocateMe();
  }, []);

  return (
    <div className="page-in space-y-6">
      <PageHeading
        eyebrow="Chennai Public Transport Layer"
        title="Real Chennai Public Transit"
        description="Authoritative schedules and network data for Metropolitan Transport Corporation (MTC) buses, Chennai Metro (CMRL), and Southern Railway suburban rail."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
              <Database size={13} />
              <span>4,627 Real Routes Loaded</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={13} />
              <span>CUMTA / MTC GTFS Verified</span>
            </span>
          </div>
        }
      />

      {/* Navigation Mode Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {[
          { id: 'search', label: 'Journey Search & Timetables', icon: Search },
          { id: 'nearby', label: 'Nearby Real Stops & Stations', icon: LocateFixed },
          { id: 'routes', label: 'MTC & Metro Route Directory', icon: RouteIcon },
          { id: 'missed_bus', label: 'Missed Bus Assistant', icon: AlertTriangle },
          { id: 'provenance', label: 'Data Provenance & Source', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'missed_bus' && missedBusAlternatives.length === 0) {
                  handleMissedBusCheck();
                }
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* TAB 1: JOURNEY SEARCH & REAL SCHEDULES */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4">
            <span className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mr-1">
              Common Corridors:
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setStart(p.start);
                  setDestination(p.destination);
                  handleJourneySearch(p.start, p.destination);
                }}
                className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search Inputs */}
          <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mono block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  From (Origin)
                </label>
                <input
                  type="text"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  placeholder="e.g. Tambaram, Broadway, Thandalam"
                  className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mono block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  To (Destination)
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Chennai Beach, Poonamallee, Central"
                  className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mono block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Agency Filter
                </label>
                <select
                  value={agencyFilter}
                  onChange={(e) => setAgencyFilter(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ALL">All Chennai Public Transit</option>
                  <option value="MTC">MTC Buses Only</option>
                  <option value="CMRL">Chennai Metro (CMRL)</option>
                  <option value="CSR">Southern Railway Suburban & MRTS</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-[11px] text-muted-foreground">
                Retrieving real scheduled timings from the CUMTA GTFS database.
              </span>
              <button
                type="button"
                onClick={() => handleJourneySearch(start, destination)}
                disabled={isSearching}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
              >
                <Search size={14} />
                <span>{isSearching ? 'Searching Database…' : 'Find Real Public Transit'}</span>
              </button>
            </div>
          </section>

          {/* Results Display */}
          {isSearching ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm font-bold text-muted-foreground">
              Querying Chennai transit schedule database…
            </div>
          ) : journeys.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
              <BusFront size={28} className="mx-auto text-muted-foreground" />
              <div className="mt-2 text-sm font-bold text-foreground">No direct schedule found for this corridor</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Try searching for main hubs such as &ldquo;Tambaram&rdquo;, &ldquo;Beach&rdquo;, &ldquo;Broadway&rdquo;, or &ldquo;Poonamallee&rdquo;.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {journeys.map((option, idx) => (
                <article
                  key={`${option.routeNumber}-${idx}`}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-black text-white ${
                          option.routeType === 'Metro'
                            ? 'bg-emerald-600'
                            : option.routeType === 'Suburban Rail'
                            ? 'bg-rose-600'
                            : 'bg-primary'
                        }`}>
                          {option.routeType === 'Metro' || option.routeType === 'Suburban Rail' ? (
                            <TrainFront size={20} />
                          ) : (
                            <BusFront size={20} />
                          )}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-foreground">
                              {option.routeNumber}
                            </span>
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-extrabold text-secondary-foreground">
                              {option.routeType}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-muted-foreground truncate max-w-[220px]">
                            {option.agency}
                          </div>
                        </div>
                      </div>

                      {/* Explicit Scheduled Badge (Rule 8: Never fake live data) */}
                      <span className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[10px] font-black text-blue-700 dark:text-blue-300">
                        <Calendar size={11} />
                        <span>Scheduled Timetable</span>
                      </span>
                    </div>

                    {/* Route Corridor */}
                    <div className="mt-4 rounded-xl bg-muted/40 p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span className="truncate">{option.boardingStop}</span>
                        <ArrowRight size={13} className="text-muted-foreground shrink-0 mx-2" />
                        <span className="truncate">{option.alightingStop}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Dep: <strong className="text-foreground">{option.boardingTime}</strong></span>
                        <span>Arr: <strong className="text-foreground">{option.alightingTime}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
                    <span>{option.stopsCount} intermediate stops · ~{option.durationMinutes} min trip</span>
                    <span className="mono text-[10px] text-slate-500 font-semibold">{option.dataSource}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: NEARBY REAL STOPS & STATIONS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'nearby' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
            <div>
              <div className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Geographic Proximity Engine
              </div>
              <h3 className="mt-0.5 text-lg font-black text-foreground">
                Real Stops Near You ({nearbyStops.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Calculated using true spherical haversine distance from your GPS coordinates to actual public transit nodes.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <LocateFixed size={14} className={isLocating ? 'animate-pulse' : ''} />
              <span>{isLocating ? 'Acquiring GPS…' : 'Update My Location'}</span>
            </button>
          </div>

          {locatingError && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
              {locatingError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nearbyStops.map((stop) => {
              const isMetro = stop.agency_id === 'CMRL';
              const isRail = stop.agency_id === 'CSR';
              const walkingMins = Math.max(1, Math.round((stop.distanceMeters || 100) / 80));

              return (
                <div key={stop.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black text-white ${
                        isMetro ? 'bg-emerald-600' : isRail ? 'bg-rose-600' : 'bg-primary'
                      }`}>
                        {isMetro ? 'Metro Station' : isRail ? 'Suburban Station' : 'MTC Bus Stop'}
                      </span>
                      <span className="mono text-xs font-black text-primary dark:text-accent">
                        {stop.distanceMeters}m
                      </span>
                    </div>

                    <h4 className="mt-2 text-sm font-black text-foreground">
                      {stop.stop_name}
                    </h4>
                    <div className="text-[11px] text-muted-foreground">
                      {stop.agency_name}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/80 pt-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Footprints size={12} className="text-primary" />
                      <span>~{walkingMins} min walk</span>
                    </span>
                    <span className="mono text-[10px]">
                      {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 3: MTC & METRO ROUTE DIRECTORY */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'routes' && (
        <div className="space-y-5">
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Official Transit Feed Explorer
                </div>
                <h3 className="mt-0.5 text-lg font-black text-foreground">
                  Browse 4,627 Real Routes
                </h3>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={routeSearchQuery}
                onChange={(e) => setRouteSearchQuery(e.target.value)}
                placeholder="Search route number: 29A, 500, 55K, Blue Line, MSB-TBM…"
                className="h-11 flex-1 rounded-xl border border-input bg-background px-3.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => handleRouteSearch(routeSearchQuery)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground hover:opacity-90"
              >
                <Search size={14} /> Search
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {matchingRoutes.map((route) => (
              <div key={route.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-foreground">
                      {route.route_short_name}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-black text-secondary-foreground">
                      {route.agency_id}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-bold text-muted-foreground">
                    {route.route_long_name}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
                  <span>From: {route.origin || 'Terminal'}</span>
                  <span>To: {route.destination || 'Destination'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 4: MISSED BUS ASSISTANT (Rule 11) */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'missed_bus' && (
        <div className="space-y-5">
          <div className="rounded-[28px] border-2 border-amber-500/30 bg-amber-500/5 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-white shrink-0">
                <AlertTriangle size={22} />
              </span>
              <div>
                <div className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">
                  ACIMS Missed Bus Assistant
                </div>
                <h3 className="mt-0.5 text-xl font-black text-foreground">
                  Your ACIMS College Bus Has Departed
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  If you missed your assigned college bus, ACIMS automatically identifies real nearby public transport alternatives (MTC buses, CMRL metro stations, or suburban EMU trains) based on your live GPS location.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleMissedBusCheck}
                disabled={isCheckingMissedBus}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <RefreshCw size={13} className={isCheckingMissedBus ? 'animate-spin' : ''} />
                <span>{isCheckingMissedBus ? 'Scanning Nearby Transit…' : 'Scan Real Alternatives Near Me'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="mono text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Nearby Public Transport Alternatives ({missedBusAlternatives.length})
            </h4>

            {missedBusAlternatives.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-xs font-semibold text-muted-foreground">
                No public-transport alternative found in the available data.
              </div>
            ) : (
              missedBusAlternatives.map((alt, idx) => (
                <div
                  key={`${alt.stopName}-${idx}`}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-black text-white ${
                      alt.category === 'Chennai Metro'
                        ? 'bg-emerald-600'
                        : alt.category === 'Suburban Rail'
                        ? 'bg-rose-600'
                        : 'bg-primary'
                    }`}>
                      {alt.category === 'Chennai Metro' || alt.category === 'Suburban Rail' ? (
                        <TrainFront size={20} />
                      ) : (
                        <BusFront size={20} />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-foreground">
                          {alt.category}: {alt.stopName}
                        </span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-extrabold">
                          {alt.distanceMeters}m (~{alt.walkingMinutes} min walk)
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="text-[11px] text-muted-foreground mr-1">Routes:</span>
                        {alt.routes.map((r) => (
                          <span key={r} className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-black text-foreground">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-right sm:border-l sm:border-border sm:pl-5">
                    <div className="mono text-[10px] uppercase text-muted-foreground">Frequency</div>
                    <div className="text-xs font-black text-primary dark:text-accent">
                      {alt.scheduledNextDeparture}
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold">{alt.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 5: DATA PROVENANCE & SOURCE AUDIT (Rule 16) */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'provenance' && (
        <div className="space-y-5">
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary font-black text-base">
              <Database size={20} />
              <span>Authoritative Data Provenance Log</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Every public transport schedule in ACIMS is traceable to official state and municipal open data feeds.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="mono text-[10px] uppercase font-bold text-muted-foreground">MTC Buses</div>
                <div className="mt-1 text-base font-black text-foreground">Metropolitan Transport Corp</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  4,611 routes and 5,580 real stops with verified geographic coordinates across Chennai & Thandalam.
                </div>
                <a
                  href="https://mtcbus.tn.gov.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-primary hover:underline"
                >
                  mtcbus.tn.gov.in <ExternalLink size={11} />
                </a>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="mono text-[10px] uppercase font-bold text-muted-foreground">Chennai Metro</div>
                <div className="mt-1 text-base font-black text-foreground">CMRL Official GTFS</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Blue & Green Lines (44 stations, timetable frequencies, first/last train service).
                </div>
                <a
                  href="https://chennaimetrorail.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-primary hover:underline"
                >
                  chennaimetrorail.org <ExternalLink size={11} />
                </a>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="mono text-[10px] uppercase font-bold text-muted-foreground">Suburban & MRTS</div>
                <div className="mt-1 text-base font-black text-foreground">Southern Railway (CSR)</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  13 lines connecting Chennai Beach, Tambaram, Chengalpattu, Central, and Velachery.
                </div>
                <a
                  href="http://www.sr.indianrailways.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-primary hover:underline"
                >
                  sr.indianrailways.gov.in <ExternalLink size={11} />
                </a>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-secondary/30 p-4 text-xs space-y-2">
              <div className="font-extrabold text-foreground flex items-center gap-2">
                <Info size={14} className="text-primary" />
                <span>Scheduled Timetables vs. Live Vehicle Telemetry</span>
              </div>
              <p className="text-[11px] leading-5 text-muted-foreground">
                All external transit schedules from CUMTA GTFS are displayed strictly as <strong>Scheduled</strong>. ACIMS does not fabricate live GPS vehicle positions for public MTC buses. In contrast, ACIMS College Buses feature continuous real-time telemetry powered by the driver&apos;s physical device GPS.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}