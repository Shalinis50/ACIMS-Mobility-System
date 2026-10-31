import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import {
  BusFront,
  Clock,
  Compass,
  GraduationCap,
  Info,
  MapPin,
  Radio,
  Star,
  Check,
  BookmarkCheck,
} from 'lucide-react';
import {
  PageHeading,
  selectBus,
  useSelectedBusId,
  selectBoardingStop,
  useSelectedBoardingStopId,
} from '@/components/acims-ui';
import {
  ALL_REC_ROUTES,
  findRouteByNumberOrId,
  getDefaultRecRoute,
  type RecRoute,
  type RecRouteStop,
} from '@/data/recRoutes';
import { MapView } from '@/components/MapView';
import { useRouteSimulation } from '@/hooks/useRouteSimulation';
import { useAuth } from '@/lib/auth-context';

export default function LiveMap() {
  const [, setLocation] = useLocation();
  const { profile, refreshProfile } = useAuth();
  const globalBusId = useSelectedBusId();
  const globalBoardingStopId = useSelectedBoardingStopId();

  // 1. Determine active route from URL query param, global state, profile, or default to Route 18
  const [selectedRouteId, setSelectedRouteId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoute = params.get('route') || params.get('busId');
      if (urlRoute) {
        const found = findRouteByNumberOrId(urlRoute);
        if (found) return found.id;
      }
    }
    if (globalBusId) {
      const found = findRouteByNumberOrId(globalBusId);
      if (found) return found.id;
    }
    if (profile?.assignedBusId) {
      const found = findRouteByNumberOrId(profile.assignedBusId);
      if (found) return found.id;
    }
    return getDefaultRecRoute().id;
  });

  // Keep state synced if URL parameter changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlRoute = params.get('route') || params.get('busId');
    if (urlRoute) {
      const found = findRouteByNumberOrId(urlRoute);
      if (found && found.id !== selectedRouteId) {
        setSelectedRouteId(found.id);
      }
    }
  }, [window.location.search]);

  // Current active route object (one of the 11 verified REC routes)
  const activeRoute: RecRoute = useMemo(() => {
    return findRouteByNumberOrId(selectedRouteId) || getDefaultRecRoute();
  }, [selectedRouteId]);

  // 2. Determine student's selected boarding stop on the active route
  const [selectedStopId, setSelectedStopId] = useState<string>(() => {
    // Check if globalBoardingStopId belongs to this route
    if (globalBoardingStopId) {
      const match = activeRoute.stops.find(
        (s) => s.id === globalBoardingStopId || s.name.toLowerCase() === globalBoardingStopId.toLowerCase()
      );
      if (match) return match.id;
    }
    // Default to first non-via boarding stop on the route
    const firstBoarding = activeRoute.stops.find((s) => !s.isVia && !s.isCollege) || activeRoute.stops[0];
    return firstBoarding?.id || '';
  });

  // When active route changes, reset selected boarding stop to first boarding stop of this route
  useEffect(() => {
    const match = activeRoute.stops.find(
      (s) => s.id === selectedStopId || s.name.toLowerCase() === selectedStopId.toLowerCase()
    );
    if (!match) {
      const firstBoarding = activeRoute.stops.find((s) => !s.isVia && !s.isCollege) || activeRoute.stops[0];
      setSelectedStopId(firstBoarding?.id || '');
    }
  }, [activeRoute]);

  const activeBoardingStop: RecRouteStop | undefined = useMemo(() => {
    return activeRoute.stops.find((s) => s.id === selectedStopId) || activeRoute.stops[0];
  }, [activeRoute, selectedStopId]);

  // 3. Route 18 Simulated Bus Engine (runs automatically for Route 18 only)
  const simulation = useRouteSimulation(activeRoute, selectedStopId);

  // 4. Handle route switching by student
  const handleRouteChange = (nextRouteId: string) => {
    setSelectedRouteId(nextRouteId);
    selectBus(nextRouteId);

    const targetRoute = findRouteByNumberOrId(nextRouteId);
    if (targetRoute) {
      const firstStop = targetRoute.stops.find((s) => !s.isVia && !s.isCollege) || targetRoute.stops[0];
      if (firstStop) {
        setSelectedStopId(firstStop.id);
        selectBoardingStop(firstStop.id);
      }
    }

    // Update browser URL query param without full reload
    if (typeof window !== 'undefined') {
      const cleanNum = nextRouteId.replace(/^(route-|bus-)/, '');
      const newUrl = `${window.location.pathname}?route=${cleanNum}`;
      window.history.replaceState(null, '', newUrl);
    }
  };

  // 5. Handle boarding stop selection
  const handleStopChange = (nextStopId: string) => {
    setSelectedStopId(nextStopId);
    selectBoardingStop(nextStopId);
  };

  // 6. Save as My Bus action
  const [saveSuccess, setSaveSuccess] = useState(false);
  const handleSaveAsMyBus = async () => {
    selectBus(activeRoute.id);
    selectBoardingStop(selectedStopId);

    try {
      await fetch('/api/student/select-bus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: profile?.userId || 'student-20418',
          busId: activeRoute.id,
          pickupStopId: selectedStopId,
        }),
      });
      await refreshProfile();
    } catch {
      // ignore
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="page-in space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            Student Live Transit
          </div>
          <h1 className="display-font text-3xl font-extrabold text-foreground sm:text-4xl">
            TRACK MY BUS
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeRoute.displayName} · {activeRoute.origin} to {activeRoute.destination}
          </p>
        </div>

        {/* Route Selector & Save Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* ALL 11 ROUTES SELECTOR */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-1.5 shadow-xs">
            <BusFront size={16} className="text-primary" />
            <select
              value={activeRoute.id}
              onChange={(e) => handleRouteChange(e.target.value)}
              data-testid="select-live-tracking-route"
              aria-label="Select bus route"
              className="bg-transparent text-xs font-black text-foreground outline-none cursor-pointer"
            >
              {ALL_REC_ROUTES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.routeNumber} — {r.routeName}
                </option>
              ))}
            </select>
          </div>

          {/* BOARDING STOP SELECTOR */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-1.5 shadow-xs">
            <MapPin size={16} className="text-sky-500" />
            <select
              value={selectedStopId}
              onChange={(e) => handleStopChange(e.target.value)}
              data-testid="select-live-tracking-stop"
              aria-label="Select boarding stop"
              className="bg-transparent text-xs font-bold text-foreground outline-none max-w-[200px] truncate cursor-pointer"
            >
              {activeRoute.stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.isCollege
                    ? `🎓 ${s.name} (${s.time})`
                    : s.isVia
                    ? `○ ${s.name} (Via/Non-stop)`
                    : `${s.sequence}. ${s.name} (${s.time})`}
                </option>
              ))}
            </select>
          </div>

          {/* SAVE AS MY BUS BUTTON */}
          <button
            type="button"
            onClick={handleSaveAsMyBus}
            data-testid="button-save-as-my-bus"
            className={`inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-extrabold transition shadow-xs ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-primary text-primary-foreground hover:opacity-90'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check size={14} /> Saved as My Bus
              </>
            ) : (
              <>
                <BookmarkCheck size={14} /> Save as My Bus
              </>
            )}
          </button>
        </div>
      </div>

      {/* MOBILE-FIRST & DESKTOP GRID LAYOUT */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px]">
        {/* LEFT COLUMN: MAIN INTERACTIVE MAP (Takes most of screen) */}
        <div className="space-y-4">
          <div className="relative">
            {/* Main Interactive Leaflet Map */}
            <MapView
              route={activeRoute}
              busPosition={simulation.busPosition}
              selectedBoardingStopId={selectedStopId}
              isSimulatedRoute={simulation.isSimulated}
              heightClassName="h-[480px] sm:h-[540px] lg:h-[600px]"
            />

            {/* Over-the-map Route Header Pill */}
            <div className="absolute top-4 left-4 z-[400] flex items-center gap-2 rounded-2xl border border-border/80 bg-card/95 px-3.5 py-2 shadow-md backdrop-blur-md">
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-primary text-xs font-black text-primary-foreground">
                {activeRoute.routeNumber}
              </span>
              <div>
                <div className="text-xs font-extrabold text-foreground">
                  {activeRoute.routeName}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Starts: {activeRoute.startTime} · Campus: {activeRoute.campusArrivalTime}
                </div>
              </div>
            </div>

            {/* Over-the-map Simulation Badge */}
            <div className="absolute top-4 right-4 z-[400]">
              {simulation.isSimulated ? (
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 shadow-md backdrop-blur-md">
                  <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-500" />
                  <span>LIVE MOVING BUS</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-card/95 px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-md backdrop-blur-md">
                  <Clock size={12} />
                  <span>SCHEDULED ROUTE</span>
                </div>
              )}
            </div>
          </div>

          {/* Under-the-map quick guidance banner for non-simulated routes */}
          {!simulation.isSimulated && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground">
              <Info size={16} className="text-primary shrink-0" />
              <span>
                <strong>Route {activeRoute.routeNumber} ({activeRoute.routeName}):</strong> Live bus movement is not simulated for this route. Showing official verified stops, route path, and approximate timetable.
              </span>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: BUS & ROUTE INFORMATION PANEL */}
        <div className="space-y-5">
          {/* SECTION: BUS STATUS / TELEMETRY CARD */}
          <div className="rounded-[24px] border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="mono text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Current Bus
              </span>
              {simulation.isSimulated ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-500" />
                  ● Moving
                </span>
              ) : (
                <span className="text-xs font-bold text-muted-foreground">
                  Scheduled
                </span>
              )}
            </div>

            {/* ROUTE 18 DYNAMIC TELEMETRY VS OTHER ROUTES SCHEDULE */}
            {simulation.isSimulated ? (
              <div className="space-y-3.5">
                <div>
                  <div className="mono text-[9px] uppercase font-bold text-muted-foreground">
                    Current / Nearest Stop
                  </div>
                  <div className="mt-0.5 text-base font-extrabold text-foreground flex items-center gap-1.5">
                    <MapPin size={15} className="text-primary shrink-0" />
                    <span>{simulation.currentNearestStop?.name || 'Avadi Ramarathinam'}</span>
                  </div>
                </div>

                <div>
                  <div className="mono text-[9px] uppercase font-bold text-muted-foreground">
                    Next Stop
                  </div>
                  <div className="mt-0.5 text-base font-extrabold text-foreground flex items-center gap-1.5">
                    <Compass size={15} className="text-accent-foreground shrink-0" />
                    <span>{simulation.nextStop?.name || 'College Campus'}</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-primary/10 p-4 border border-primary/20">
                  <div className="mono text-[10px] uppercase font-black text-primary">
                    Live ETA to {activeBoardingStop?.name || 'Your Stop'}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="display-font text-4xl font-extrabold text-primary">
                      {simulation.formattedEta}
                    </span>
                    {simulation.remainingDistanceKm != null && (
                      <span className="text-xs font-bold text-muted-foreground">
                        (~{simulation.remainingDistanceKm} km)
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Dynamically updated from simulated moving onboard bus coordinates.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div>
                  <div className="mono text-[9px] uppercase font-bold text-muted-foreground">
                    Selected Boarding Stop
                  </div>
                  <div className="mt-0.5 text-base font-extrabold text-foreground flex items-center gap-1.5">
                    <Star size={15} className="text-amber-500 shrink-0 fill-amber-500" />
                    <span>{activeBoardingStop?.name || 'Select a stop'}</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-secondary/50 p-4 border border-border">
                  <div className="mono text-[10px] uppercase font-bold text-muted-foreground">
                    Approx. Schedule
                  </div>
                  <div className="display-font mt-1 text-3xl font-extrabold text-foreground">
                    {activeBoardingStop?.time || activeRoute.startTime}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={12} />
                    <span>Campus Arrival: <strong>{activeRoute.campusArrivalTime}</strong></span>
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground">
                  <div className="font-extrabold text-foreground mb-0.5">Route Information</div>
                  <div>Starts at {activeRoute.origin} at {activeRoute.startTime}.</div>
                  {activeRoute.viaNotes && (
                    <div className="mt-1">Via: {activeRoute.viaNotes}.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION: ALL ROUTE STOPS CHECKLIST */}
          <div className="rounded-[24px] border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="mono text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Route Stops
                </span>
                <h3 className="text-sm font-extrabold text-foreground">
                  {activeRoute.stops.length} Official Stops
                </h3>
              </div>
              <span className="text-[11px] font-bold text-muted-foreground">
                Tap to pick boarding
              </span>
            </div>

            <div className="mt-3 max-h-[380px] space-y-2 overflow-y-auto pr-1">
              {activeRoute.stops.map((stop) => {
                const isSelected = stop.id === selectedStopId;
                return (
                  <button
                    key={stop.id}
                    type="button"
                    onClick={() => handleStopChange(stop.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                        : stop.isCollege
                        ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                        : stop.isVia
                        ? 'border-dashed border-border bg-muted/20 hover:bg-muted/40'
                        : 'border-border bg-muted/30 hover:border-primary/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {stop.isCollege ? (
                          <GraduationCap size={15} className="text-emerald-600 shrink-0" />
                        ) : stop.isVia ? (
                          <span className="text-xs text-muted-foreground font-black">○</span>
                        ) : isSelected ? (
                          <Star size={13} className="text-amber-500 fill-amber-500 shrink-0" />
                        ) : (
                          <span className="mono text-[10px] font-black text-muted-foreground">
                            #{stop.sequence}
                          </span>
                        )}
                        <span className="text-xs font-extrabold text-foreground truncate">
                          {stop.name}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {stop.isCollege
                          ? 'College Campus Destination'
                          : stop.isVia
                          ? 'Via / Non-Stop Location'
                          : `Scheduled Timetable: ${stop.time}`}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-foreground">
                        {stop.time}
                      </div>
                      {isSelected && (
                        <span className="mt-0.5 inline-block rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                          Boarding
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
