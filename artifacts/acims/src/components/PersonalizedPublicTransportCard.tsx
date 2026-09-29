import { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  BusFront,
  Clock,
  Compass,
  Footprints,
  Info,
  MapPin,
  RefreshCw,
  Sparkles,
  ChevronRight,
  X,
  Calendar,
  AlertTriangle,
  LocateFixed,
  CheckCircle2,
} from 'lucide-react';
import { useNetworkStatus } from '@/hooks/use-network';

interface PersonalizedData {
  status: 'SUCCESS' | 'LOCATION_UNAVAILABLE' | 'NO_NEARBY_STOP' | 'NO_SERVICE';
  message?: string;
  studentLocation?: {
    name: string;
    source: string;
    latitude: number;
    longitude: number;
    pickupStopId?: string;
  };
  destination?: {
    name: string;
    latitude: number;
    longitude: number;
  };
  closestPublicStop?: {
    id: string;
    stopId: string;
    name: string;
    distanceMeters: number;
    walkingMinutes: number;
    latitude: number;
    longitude: number;
    agencyId: string;
    agencyName: string;
  };
  nextBus?: {
    routeNumber: string;
    routeName: string;
    origin: string;
    destination: string;
    departureTime: string;
    departureTimeFormatted: string;
    minutesUntil: number;
    fromStop: string;
    tripId: string;
    routeId: string;
    agencyId: string;
    laterDepartures: string[];
    whyRecommended: string[];
  };
  otherBuses: Array<{
    routeNumber: string;
    routeName: string;
    origin: string;
    destination: string;
    departureTime: string;
    departureTimeFormatted: string;
    minutesUntil: number;
    tripId: string;
    routeId: string;
    agencyId: string;
  }>;
  totalServingRoutes: number;
  lastSynchronized: string;
  dataQuality: string;
}

interface TripDetails {
  tripId: string;
  routeNumber: string;
  routeName: string;
  origin: string;
  destination: string;
  totalStops: number;
  stops: Array<{
    sequence: number;
    stopId: string;
    stopName: string;
    arrivalTime: string;
    departureTime: string;
    departureTimeFormatted: string;
    latitude: number;
    longitude: number;
    isStudentStop: boolean;
  }>;
}

export function PersonalizedPublicTransportCard({
  pickupStopId,
  studentGps,
  onOpenPublicTransport,
}: {
  pickupStopId?: string;
  studentGps?: { latitude: number; longitude: number };
  onOpenPublicTransport?: () => void;
}) {
  const { isOnline } = useNetworkStatus();
  const [data, setData] = useState<PersonalizedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected bus modal
  const [selectedBus, setSelectedBus] = useState<{
    routeNumber: string;
    routeName: string;
    origin: string;
    destination: string;
    departureTimeFormatted: string;
    tripId: string;
  } | null>(null);

  const [tripDetails, setTripDetails] = useState<TripDetails | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(false);

  // Fetch personalized transit
  const fetchPersonalized = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (pickupStopId) params.set('pickupStopId', pickupStopId);
      if (studentGps) {
        params.set('latitude', studentGps.latitude.toString());
        params.set('longitude', studentGps.longitude.toString());
      }

      const res = await fetch(`/api/public-transport/personalized?${params.toString()}`);
      if (res.ok) {
        const json: PersonalizedData = await res.json();
        setData(json);
        // Cache for offline resilience
        try {
          localStorage.setItem('acims_cached_personalized_transit', JSON.stringify(json));
          localStorage.setItem('acims_cached_transit_timestamp', new Date().toISOString());
        } catch {}
      } else {
        setError('Public transport schedule service temporarily unavailable.');
      }
    } catch {
      // Offline fallback: try reading cached schedule
      try {
        const cached = localStorage.getItem('acims_cached_personalized_transit');
        if (cached) {
          setData(JSON.parse(cached));
        } else {
          setError('Offline. Connect to network to synchronize public transport schedules.');
        }
      } catch {
        setError('Network unavailable.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPersonalized();
  }, [pickupStopId, studentGps?.latitude, studentGps?.longitude]);

  // Load detailed stop sequence when a bus is tapped
  const handleOpenBusDetails = async (bus: {
    routeNumber: string;
    routeName: string;
    origin: string;
    destination: string;
    departureTimeFormatted: string;
    tripId: string;
  }) => {
    setSelectedBus(bus);
    setLoadingTrip(true);
    try {
      const studentStopId = data?.closestPublicStop?.id || '';
      const res = await fetch(
        `/api/public-transport/trip-stops?tripId=${encodeURIComponent(bus.tripId)}&studentStopId=${encodeURIComponent(studentStopId)}`
      );
      if (res.ok) {
        const details: TripDetails = await res.json();
        setTripDetails(details);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingTrip(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-44 rounded bg-muted"></div>
          <div className="h-20 rounded-2xl bg-muted/60"></div>
          <div className="h-16 rounded-xl bg-muted/40"></div>
        </div>
      </div>
    );
  }

  if (data?.status === 'LOCATION_UNAVAILABLE') {
    return (
      <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <MapPin size={20} />
          </span>
          <div>
            <h3 className="text-sm font-black text-foreground">Location Unavailable</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Enable device location or set an approved pickup stop in your student profile to find public transport near you.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (data?.status === 'NO_NEARBY_STOP') {
    return (
      <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <BusFront size={20} />
          </span>
          <div>
            <h3 className="text-sm font-black text-foreground">No Nearby Public Bus Stop</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              No real MTC bus stop found within walking distance of your current location.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { studentLocation, closestPublicStop, nextBus, otherBuses } = data || {};

  return (
    <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mono flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <Sparkles size={12} className="text-primary" />
            <span>Public Transport Near You</span>
          </div>
          <h3 className="mt-0.5 text-lg font-black text-foreground">
            Buses from Your Pickup Stop
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="mono rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-800 dark:text-amber-200">
              Offline Cache
            </span>
          )}
          <span className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:text-blue-300">
            <Calendar size={11} />
            <span>Scheduled MTC Timetable</span>
          </span>
          <button
            type="button"
            onClick={fetchPersonalized}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Refresh public bus timetable"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Geolocation & Closest Stop Context Bar */}
      {studentLocation && closestPublicStop && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-secondary/35 px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-primary shrink-0" />
            <span>
              Your pickup:{' '}
              <strong className="font-extrabold text-foreground">{studentLocation.name}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Closest public bus stop:</span>
            <strong className="text-foreground">{closestPublicStop.name}</strong>
            <span className="mono rounded bg-primary/10 px-2 py-0.5 font-bold text-primary dark:text-accent">
              📍 {closestPublicStop.distanceMeters}m away • ~{closestPublicStop.walkingMinutes} min walk
            </span>
          </div>
        </div>
      )}

      {/* NEXT BUS HERO CARD (Rule 8) */}
      {nextBus ? (
        <div className="mt-4 rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mono text-[10px] font-black uppercase tracking-[0.16em] text-primary dark:text-accent">
                Next Bus
              </div>
              <div className="mt-1 flex items-baseline gap-2.5">
                <span className="text-2xl font-black text-foreground">
                  🚌 {nextBus.routeNumber}
                </span>
                <ArrowRight size={16} className="text-muted-foreground" />
                <span className="text-base font-extrabold text-foreground">
                  {nextBus.destination}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Originating from {nextBus.origin}
              </div>
            </div>

            <div className="text-right">
              <div className="mono text-[10px] uppercase text-muted-foreground font-bold">
                Departure from {nextBus.fromStop}
              </div>
              <div className="mt-0.5 text-xl font-black text-primary dark:text-accent">
                {nextBus.departureTimeFormatted}
              </div>
              <div className="text-xs font-extrabold text-foreground">
                in ~{nextBus.minutesUntil} min
              </div>
            </div>
          </div>

          {/* Subsequent scheduled buses */}
          {nextBus.laterDepartures && nextBus.laterDepartures.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5 text-[11px]">
              <span className="text-muted-foreground font-semibold">Later buses:</span>
              {nextBus.laterDepartures.map((time) => (
                <span
                  key={time}
                  className="rounded-md border border-border bg-card px-2 py-0.5 font-bold text-foreground"
                >
                  {time}
                </span>
              ))}
            </div>
          )}

          {/* "Why This Bus?" derived from actual data */}
          {nextBus.whyRecommended && nextBus.whyRecommended.length > 0 && (
            <div className="mt-3 rounded-xl bg-card/80 p-3 text-[11px] text-muted-foreground space-y-1 border border-border/50">
              <div className="font-extrabold text-foreground text-[10px] uppercase tracking-wider">
                Why this bus?
              </div>
              {nextBus.whyRecommended.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-foreground/90">
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => handleOpenBusDetails(nextBus)}
              className="inline-flex items-center gap-1 text-xs font-black text-primary dark:text-accent hover:underline"
            >
              <span>View Route & All Stops</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No scheduled MTC departures remaining for today at this stop.
        </div>
      )}

      {/* OTHER BUSES SECTION */}
      {otherBuses && otherBuses.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mono flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-3">
            <span>Other Buses Serving {closestPublicStop?.name}</span>
            <span>{otherBuses.length} routes</span>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {otherBuses.map((bus, idx) => (
              <button
                key={`${bus.routeNumber}-${idx}`}
                type="button"
                onClick={() => handleOpenBusDetails(bus)}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3 text-left transition hover:border-primary/50 hover:bg-muted/40"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-foreground">
                      🚌 {bus.routeNumber}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                      → {bus.destination}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    From {bus.origin}
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <div className="mono text-xs font-black text-primary dark:text-accent">
                    {bus.departureTimeFormatted}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    in ~{bus.minutesUntil}m
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: BUS DETAILS & ORDERED STOP SEQUENCE (Rules 9 & 10) */}
      {selectedBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border-2 border-border bg-card p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  MTC Bus Route Details
                </div>
                <h3 className="text-xl font-black text-foreground">
                  🚌 {selectedBus.routeNumber}
                </h3>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{selectedBus.origin}</span>
                  <ArrowRight size={13} />
                  <span>{selectedBus.destination}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedBus(null);
                  setTripDetails(null);
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Student Stop Focus Box */}
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="mono text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                    Your Boarding Stop
                  </div>
                  <div className="text-sm font-black text-foreground">
                    📍 {closestPublicStop?.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="mono text-[9px] uppercase text-muted-foreground font-bold">
                    Departure Time
                  </div>
                  <div className="text-sm font-black text-primary dark:text-accent">
                    {selectedBus.departureTimeFormatted}
                  </div>
                </div>
              </div>
            </div>

            {/* Route Stop Sequence (Section 10) */}
            <div className="mt-5">
              <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-bold mb-3">
                Complete Route Sequence ({tripDetails?.totalStops || '...'} Stops)
              </div>

              {loadingTrip ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Loading stop sequence from CUMTA GTFS database…
                </div>
              ) : tripDetails?.stops ? (
                <div className="max-h-[340px] space-y-0 overflow-y-auto pr-2">
                  {tripDetails.stops.map((stop, idx) => (
                    <div
                      key={`${stop.stopId}-${idx}`}
                      className={`relative flex items-center gap-3 py-2 text-xs ${
                        stop.isStudentStop
                          ? 'rounded-xl border-2 border-primary bg-primary/15 px-3 py-2.5 font-bold shadow-sm'
                          : ''
                      }`}
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${
                          stop.isStudentStop
                            ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {stop.sequence}
                      </span>
                      <div className="flex-1 truncate">
                        <span
                          className={`block truncate ${
                            stop.isStudentStop
                              ? 'text-foreground font-black'
                              : 'text-foreground/90 font-medium'
                          }`}
                        >
                          {stop.stopName}
                        </span>
                        {stop.isStudentStop && (
                          <span className="inline-block text-[10px] font-black text-primary dark:text-accent">
                            📍 YOU BOARD HERE ({stop.departureTimeFormatted})
                          </span>
                        )}
                      </div>
                      <span className="mono text-[10px] text-muted-foreground shrink-0">
                        {stop.departureTimeFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-xs text-muted-foreground text-center">
                  Stop list unavailable for this service.
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-border pt-4 text-right">
              <button
                type="button"
                onClick={() => {
                  setSelectedBus(null);
                  setTripDetails(null);
                }}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
