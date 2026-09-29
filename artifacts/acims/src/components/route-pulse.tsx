import { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { 
  Navigation, 
  MapPin, 
  BusFront, 
  Clock3, 
  Radio, 
  ArrowRight, 
  LocateFixed, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  WifiOff, 
  Edit3, 
  X,
  Search
} from 'lucide-react';
import { 
  useRoutePulse, 
  useRegisteredStops, 
  useUpdatePickupStop,
  fetchNearestStop,
  type RoutePulseData,
  type RegisteredStop
} from '@workspace/api-client-react';
import { useStudentGps } from '@/hooks/use-student-gps';
import { formatUpdatedAt } from '@/components/acims-ui';

const OFFLINE_CACHE_KEY = 'acims_offline_route_pulse_cache';

export function RoutePulseCard({ className = '' }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const studentGps = useStudentGps('student-20418', false);

  // Real API query
  const { data: liveData, isLoading, isError, refetch, isRefetching } = useRoutePulse({
    refetchInterval: isOnline ? 5000 : undefined,
  });

  // Offline caching mechanism
  useEffect(() => {
    if (liveData && isOnline) {
      try {
        localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify({
          data: liveData,
          cachedAt: new Date().toISOString(),
        }));
      } catch (err) {
        // storage quota fallback
      }
    }
  }, [liveData, isOnline]);

  // Network status listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void refetch();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refetch]);

  // Determine active data (live or offline cache)
  const activeData: RoutePulseData | null = useMemo(() => {
    if (liveData) return liveData;
    if (!isOnline || isError) {
      try {
        const cached = localStorage.getItem(OFFLINE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          return parsed.data as RoutePulseData;
        }
      } catch {
        return null;
      }
    }
    return null;
  }, [liveData, isOnline, isError]);

  const cachedTimestamp = useMemo(() => {
    if (!isOnline || isError) {
      try {
        const cached = localStorage.getItem(OFFLINE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          return parsed.cachedAt ? new Date(parsed.cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
        }
      } catch {
        return null;
      }
    }
    return null;
  }, [isOnline, isError]);

  if (isLoading && !activeData) {
    return (
      <div className={`rounded-[28px] border border-border bg-card p-6 soft-shadow sm:p-8 ${className}`}>
        <div className="skeleton mb-4 h-4 w-28 rounded" />
        <div className="skeleton mb-6 h-8 w-64 rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  // State 1: No pickup point configured
  if (!activeData?.hasPickupStop || !activeData?.pickupStop) {
    return (
      <>
        <div className={`rounded-[28px] border border-border bg-card p-6 soft-shadow sm:p-8 ${className}`}>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent-foreground">
                Personalized Commute
              </div>
              <h2 className="display-font mt-1 text-2xl font-extrabold text-foreground sm:text-3xl">
                Route Pulse
              </h2>
            </div>
            {!isOnline && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                <WifiOff size={13} /> Offline
              </span>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <MapPin size={32} className="mx-auto text-primary" />
            <h3 className="mt-3 text-base font-extrabold text-foreground">No pickup point configured</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
              Set your home pickup point to see real-time route progress, assigned vehicle, and calculated arrival time.
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              <LocateFixed size={14} />
              <span>Set Pickup Point</span>
            </button>
          </div>
        </div>

        {isModalOpen && (
          <PickupStopModal 
            onClose={() => setIsModalOpen(false)} 
            currentStopId={null} 
            onSuccess={() => void refetch()} 
          />
        )}
      </>
    );
  }

  // State 2: No serving route for this stop
  if (!activeData.hasActiveRoute || !activeData.route) {
    return (
      <>
        <div className={`rounded-[28px] border border-border bg-card p-6 soft-shadow sm:p-8 ${className}`}>
          <div className="flex items-center justify-between">
            <div className="mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              ROUTE PULSE
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-accent-foreground hover:underline"
            >
              <Edit3 size={13} /> Change pickup stop
            </button>
          </div>
          <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center">
            <AlertCircle size={28} className="mx-auto text-muted-foreground" />
            <h3 className="mt-3 text-sm font-extrabold text-foreground">
              No active route currently serves your pickup point
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Registered stop: <strong className="text-foreground">{activeData.pickupStop.name}</strong>
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-4 rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
            >
              Choose another stop
            </button>
          </div>
        </div>
        {isModalOpen && (
          <PickupStopModal 
            onClose={() => setIsModalOpen(false)} 
            currentStopId={activeData.pickupStop.id} 
            onSuccess={() => void refetch()} 
          />
        )}
      </>
    );
  }

  // State 3: Active route exists, render Personalized Route Pulse
  const { pickupStop, route, bus, liveLocation, etaMinutes, status, lastUpdated, routeProgressPercentage } = activeData;

  return (
    <>
      <section 
        aria-label="Personalized Route Pulse"
        className={`rounded-[28px] border border-border bg-card p-6 soft-shadow sm:p-8 ${className}`}
        data-testid="route-pulse-card"
      >
        {/* Top Header */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Navigation size={16} />
            </span>
            <div>
              <div className="mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                ROUTE PULSE
              </div>
              <h2 className="text-lg font-extrabold text-foreground">
                Personalized Commute Radar
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!studentGps.isWatching ? (
              <button
                type="button"
                onClick={studentGps.startWatching}
                data-testid="button-routepulse-student-gps"
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 transition hover:bg-blue-500/20"
              >
                <LocateFixed size={12} />
                <span>My Phone GPS</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={studentGps.stopWatching}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/15 px-2.5 text-xs font-bold text-blue-600 dark:text-blue-400"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                </span>
                <span>My GPS ±{Math.round(studentGps.coords?.accuracy ?? 10)}m</span>
              </button>
            )}

            {!isOnline && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                <WifiOff size={12} />
                <span>Offline · Last: {cachedTimestamp ?? 'Earlier'}</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isRefetching}
              aria-label="Refresh route pulse"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-2.5 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              <RotateCw size={12} className={isRefetching ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{isRefetching ? 'Updating…' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex h-8 items-center gap-1 rounded-xl border border-border bg-card px-2.5 text-xs font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Edit3 size={12} />
              <span>Change Stop</span>
            </button>
          </div>
        </div>

        {/* Student Phone GPS walk info if active */}
        {(studentGps.coords || activeData.studentToPickupKm) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-2 text-xs font-bold text-blue-600 dark:text-blue-400">
            <div className="flex items-center gap-2">
              <Footprints size={15} />
              <span>
                Your distance to {pickupStop.name}:{' '}
                {activeData.studentToPickupKm
                  ? `${Math.round(activeData.studentToPickupKm * 1000)} m (${activeData.studentWalkingMinutes ?? 5} min walk)`
                  : 'Locating pickup stop…'}
              </span>
            </div>
            <span className="mono text-[10px] text-blue-500">
              Student GPS: ±{Math.round(studentGps.coords?.accuracy ?? 10)}m
            </span>
          </div>
        )}

        {/* Main Details Grid */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Pickup Point */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Your Pickup Point
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <MapPin size={15} className="shrink-0 text-accent-foreground" />
              <span className="text-sm font-extrabold text-foreground truncate" title={pickupStop.name}>
                {pickupStop.name}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Registered stop · {pickupStop.code}
            </div>
          </div>

          {/* Assigned Route */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Active Route
            </div>
            <div className="mt-1 text-sm font-extrabold text-foreground truncate" title={route.name}>
              {route.name}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Destination: {route.destination}
            </div>
          </div>

          {/* Bus & Live Status */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Assigned Bus
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm font-extrabold text-foreground">
                {bus ? `Bus #${bus.busNumber}` : 'No active bus'}
              </span>
              {bus?.plateNumber && (
                <span className="mono rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {bus.plateNumber}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold">
              {activeData.trackingStatus === 'TRACKING_ACTIVE' ? (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Live GPS · ±{Math.round(activeData.busAccuracy ?? 10)}m
                  </span>
                </>
              ) : activeData.trackingStatus === 'TRACKING_STALE' ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400">Signal stale</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  <span className="text-muted-foreground">Driver offline</span>
                </>
              )}
            </div>
          </div>

          {/* Calculated ETA */}
          <div className="rounded-2xl border border-border bg-primary/5 p-4">
            <div className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              Arrival Estimate
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              {liveLocation && etaMinutes !== null && activeData.trackingStatus !== 'OFFLINE' ? (
                <>
                  <span className="display-font text-3xl font-extrabold text-primary">
                    {etaMinutes}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">min</span>
                </>
              ) : (
                <span className="text-xs font-extrabold text-muted-foreground">
                  Bus offline
                </span>
              )}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {activeData.trackingStatus === 'TRACKING_ACTIVE' && liveLocation
                ? `Real phone GPS (${liveLocation.speed} km/h)`
                : activeData.trackingStatus === 'TRACKING_STALE'
                  ? 'Last known GPS position'
                  : 'Driver standing by on Phone 2'}
            </div>
          </div>
        </div>

        {/* Route Progress Visualizer */}
        <div className="mt-6 rounded-2xl bg-muted/40 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground">Route Progress to Your Stop</span>
            <span className="mono font-bold text-muted-foreground">
              {routeProgressPercentage ? `${routeProgressPercentage}% completed` : 'En route'}
            </span>
          </div>

          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div 
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${routeProgressPercentage ?? 35}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{route.origin}</span>
            <span className="font-bold text-foreground">Your Stop: {pickupStop.name}</span>
            <span>{route.destination}</span>
          </div>
        </div>

        {/* Footer Actions & Timestamp */}
        <div className="mt-5 flex flex-col justify-between gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Radio size={13} className="text-accent-foreground" />
            <span>
              {liveLocation 
                ? `Last updated ${formatUpdatedAt(lastUpdated ?? undefined)} via ${liveLocation.source}`
                : 'Live location unavailable · Waiting for signal'}
            </span>
          </div>

          <Link
            href="/map"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <span>View Live Route</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Pickup Stop Configuration Modal */}
      {isModalOpen && (
        <PickupStopModal 
          onClose={() => setIsModalOpen(false)} 
          currentStopId={pickupStop.id} 
          onSuccess={() => void refetch()} 
        />
      )}
    </>
  );
}

interface PickupStopModalProps {
  onClose: () => void;
  currentStopId: string | null;
  onSuccess: () => void;
}

function PickupStopModal({ onClose, currentStopId, onSuccess }: PickupStopModalProps) {
  const [search, setSearch] = useState('');
  const [selectedStopId, setSelectedStopId] = useState<string | null>(currentStopId);
  const [locating, setLocating] = useState(false);
  const [nearestResult, setNearestResult] = useState<{ stop: RegisteredStop; distanceKm: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: stops = [], isLoading } = useRegisteredStops();
  const updateMutation = useUpdatePickupStop();

  const filteredStops = useMemo(() => {
    if (!search.trim()) return stops;
    const q = search.toLowerCase();
    return stops.filter((s) => (s.name || '').toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q) || (s.address || '').toLowerCase().includes(q));
  }, [stops, search]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const nearest = await fetchNearestStop(pos.coords.latitude, pos.coords.longitude);
          setNearestResult(nearest);
          setSelectedStopId(nearest.stop.id);
        } catch (err) {
          setErrorMsg('Could not find nearest registered stop. Please select manually.');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setErrorMsg('Location permission denied or unavailable. Please choose from registered stops.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSave = () => {
    updateMutation.mutate(
      { stopId: selectedStopId },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
        },
        onError: () => {
          setErrorMsg('Failed to update pickup stop. Please try again.');
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-[28px] border border-border bg-card p-6 soft-shadow sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
              <MapPin size={16} />
            </span>
            <h3 className="text-lg font-extrabold text-foreground">Set Your Pickup Point</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Route Pulse personalizes your daily college transit according to your registered boarding stop.
        </p>

        {/* GPS Nearest Stop Button */}
        <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold text-foreground">Near My Home / Live Location</div>
              <div className="text-[11px] text-muted-foreground">Automatically find the nearest registered REC bus stop</div>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-extrabold text-secondary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              <LocateFixed size={13} className={locating ? 'animate-spin' : ''} />
              <span>{locating ? 'Locating…' : 'Find Nearest'}</span>
            </button>
          </div>

          {nearestResult && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-accent/20 p-2.5 text-xs">
              <span className="font-bold text-accent-foreground">
                Nearest stop: {nearestResult.stop.name} ({nearestResult.distanceKm} km away)
              </span>
              <CheckCircle2 size={15} className="text-primary" />
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-xl border border-destructive/25 bg-destructive/10 p-2.5 text-xs text-destructive">
            {errorMsg}
          </div>
        )}

        {/* Manual Search & Select */}
        <div className="mt-5">
          <div className="text-xs font-bold text-foreground">Or Select Registered Bus Stop</div>
          <div className="relative mt-2">
            <Search size={14} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by stop name or area…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="mt-3 max-h-52 space-y-1.5 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Loading registered stops…</div>
            ) : filteredStops.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">No matching stops found</div>
            ) : (
              filteredStops.map((stop) => {
                const isSelected = selectedStopId === stop.id;
                return (
                  <button
                    key={stop.id}
                    type="button"
                    onClick={() => setSelectedStopId(stop.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left text-xs transition ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border bg-card hover:bg-muted'
                    }`}
                  >
                    <div>
                      <div className="font-extrabold text-foreground">{stop.name}</div>
                      {stop.address && <div className="text-[11px] text-muted-foreground truncate max-w-xs">{stop.address}</div>}
                    </div>
                    {isSelected && <CheckCircle2 size={16} className="text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setSelectedStopId(null)}
            className="text-xs font-bold text-muted-foreground hover:text-destructive"
          >
            Clear pickup stop
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save Pickup Point'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
