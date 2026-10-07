import { useState, useEffect } from 'react';
import {
  BusFront,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  LocateFixed,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export type NearestBusOption = {
  busId: string;
  busNumber: string;
  routeName: string;
  displayName: string;
  pickupStopName: string;
  pickupStopId: string;
  scheduledTime: string;
  distanceKm: number | null;
  latitude: number | null;
  longitude: number | null;
};

const POPULAR_AREAS = [
  { label: 'Avadi / Ambattur', stopName: 'Avadi Ramarathinam', lat: 13.118, lng: 80.103 },
  { label: 'Ennore / Thiruvottiyur', stopName: 'Ennore Bus Stand', lat: 13.2185, lng: 80.3235 },
  { label: 'Tondiarpet / Kasimedu', stopName: 'Tondiarpet Depot', lat: 13.1285, lng: 80.2885 },
  { label: 'Kilpauk / Anna Nagar', stopName: 'Kilpauk Kallarai', lat: 13.0825, lng: 80.2395 },
  { label: 'Choolai / Veperi', stopName: 'Choolai Post Office', lat: 13.0912, lng: 80.2655 },
  { label: 'Chintadripet / Egmore', stopName: 'Chintadripet Fish Market', lat: 13.0792, lng: 80.2745 },
  { label: 'Poonamallee Bypass', stopName: 'Poonamallee Bypass', lat: 13.0489, lng: 80.0934 },
];

export function StudentLocationRouteSelector({
  onBusSelected,
}: {
  onBusSelected?: (busId: string) => void;
}) {
  const { profile, refreshProfile } = useAuth();
  const [locating, setLocating] = useState(false);
  const [nearestOptions, setNearestOptions] = useState<NearestBusOption[]>([]);
  const [allOptions, setAllOptions] = useState<NearestBusOption[]>([]);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [selectedPickupArea, setSelectedPickupArea] = useState<string>('');
  const [savedBusId, setSavedBusId] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<'GPS' | 'AREA' | null>(null);
  const [savingBusId, setSavingBusId] = useState<string | null>(null);

  const fetchRankedBuses = async (params: { latitude?: number; longitude?: number; pickupStopId?: string }) => {
    try {
      const res = await fetch('/api/student/nearest-buses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const data = (await res.json()) as { nearest: NearestBusOption[]; all: NearestBusOption[] };
        setNearestOptions(data.nearest || []);
        setAllOptions(data.all || []);
      }
    } catch {
      // ignore
    }
  };

  // Request browser GPS
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        setLocationSource('GPS');
        await fetchRankedBuses({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        setLocating(false);
        console.warn('Geolocation denied or failed:', err);
      },
      { timeout: 8000 }
    );
  };

  const handleSelectArea = async (areaStopName: string) => {
    setSelectedPickupArea(areaStopName);
    const match = POPULAR_AREAS.find((a) => a.stopName === areaStopName);
    setLocationSource('AREA');
    if (match) {
      await fetchRankedBuses({
        latitude: match.lat,
        longitude: match.lng,
        pickupStopId: match.stopName,
      });
    }
  };

  // Select Bus & Save to Student Session
  const handleChooseBus = async (bus: NearestBusOption) => {
    setSavingBusId(bus.busId);
    try {
      const res = await fetch('/api/student/select-bus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: profile?.userId || 'student-20418',
          busId: bus.busId,
          pickupStopId: bus.pickupStopId,
        }),
      });
      if (res.ok) {
        setSavedBusId(bus.busId);
        sessionStorage.setItem('acmis_selected_bus_id', bus.busId);
        await refreshProfile();
        if (onBusSelected) {
          onBusSelected(bus.busId);
        }
      }
    } catch {
      // ignore
    } finally {
      setSavingBusId(null);
    }
  };

  return (
    <section className="rounded-[28px] border border-border bg-card p-6 sm:p-8 space-y-6">
      <div>
        <div className="flex items-center gap-1.5 mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
          <Compass size={13} className="text-primary" />
          Location-Based Personalization
        </div>
        <h2 className="display-font mt-1 text-2xl font-extrabold text-foreground sm:text-3xl">
          Where are you starting from?
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Find the nearest campus bus routes and scheduled pickup timings based on your live location or residential area.
        </p>
      </div>

      {/* Starting Location Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          data-testid="button-use-current-location"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-extrabold text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50"
        >
          <LocateFixed size={16} className={locating ? 'animate-spin' : ''} />
          {locating ? 'Detecting Location…' : 'Use my current location'}
        </button>

        <span className="text-xs font-bold text-muted-foreground">or</span>

        <select
          value={selectedPickupArea}
          onChange={(e) => handleSelectArea(e.target.value)}
          data-testid="select-pickup-area"
          className="rounded-2xl border border-border bg-background px-4 py-3 text-xs font-extrabold text-foreground shadow-xs outline-none focus:border-primary"
        >
          <option value="">Choose my pickup area ▼</option>
          {POPULAR_AREAS.map((a) => (
            <option key={a.stopName} value={a.stopName}>
              {a.label} ({a.stopName})
            </option>
          ))}
        </select>
      </div>

      {/* NEAREST BUS OPTIONS RESULTS */}
      {nearestOptions.length > 0 && (
        <div className="space-y-4 border-t border-border pt-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="mono text-xs font-extrabold uppercase tracking-wide text-foreground">
                Your Nearest Bus Options
              </span>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[9px] font-extrabold text-secondary-foreground">
                Ranked by proximity
              </span>
            </div>
            {locationSource && (
              <span className="text-[11px] text-muted-foreground">
                Matched via {locationSource === 'GPS' ? 'Device GPS' : 'Pickup Area'}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {nearestOptions.map((opt) => {
              const isCurrent = savedBusId === opt.busId || profile?.assignedBusId === opt.busId;
              return (
                <div
                  key={opt.busId}
                  className={`rounded-[24px] border p-5 flex flex-col justify-between transition ${
                    isCurrent
                      ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-sm'
                      : 'border-border bg-muted/20 hover:border-primary/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="display-font text-base font-extrabold text-foreground">
                        {opt.displayName}
                      </span>
                      {opt.distanceKm != null && (
                        <span className="mono text-[10px] font-bold text-muted-foreground">
                          {opt.distanceKm} km away
                        </span>
                      )}
                    </div>

                    <div className="mt-3 text-xs">
                      <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                        Pickup Point:
                      </span>
                      <span className="font-extrabold text-foreground flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-sky-500" />
                        {opt.pickupStopName}
                      </span>
                    </div>

                    <div className="mt-2 text-xs flex items-center gap-1.5 text-muted-foreground font-semibold">
                      <Clock size={12} />
                      Approx. {opt.scheduledTime}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/50">
                    <button
                      type="button"
                      disabled={savingBusId === opt.busId}
                      onClick={() => handleChooseBus(opt)}
                      className={`w-full rounded-xl py-2 text-xs font-extrabold transition ${
                        isCurrent
                          ? 'bg-emerald-500 text-white cursor-default'
                          : 'bg-primary text-primary-foreground hover:opacity-95'
                      }`}
                    >
                      {savingBusId === opt.busId ? (
                        'Selecting…'
                      ) : isCurrent ? (
                        <span className="inline-flex items-center gap-1">
                          <Check size={13} /> Selected Bus
                        </span>
                      ) : (
                        'Select this bus'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* View Other Bus Routes button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAllRoutes(!showAllRoutes)}
              data-testid="button-view-other-routes"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-primary hover:underline"
            >
              {showAllRoutes ? (
                <>
                  Hide other bus routes <ChevronUp size={14} />
                </>
              ) : (
                <>
                  View other bus routes ({allOptions.length}) <ChevronDown size={14} />
                </>
              )}
            </button>
          </div>

          {/* Expanded All Other Routes Grid */}
          {showAllRoutes && (
            <div className="grid gap-3 sm:grid-cols-3 pt-3 animate-in fade-in">
              {allOptions.map((opt) => (
                <div
                  key={opt.busId}
                  className="rounded-2xl border border-border p-4 bg-card flex flex-col justify-between"
                >
                  <div>
                    <div className="font-extrabold text-sm text-foreground">
                      {opt.displayName}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Stop: {opt.pickupStopName} ({opt.scheduledTime})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChooseBus(opt)}
                    className="mt-3 rounded-lg border border-border bg-muted/40 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                  >
                    Select this route
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
