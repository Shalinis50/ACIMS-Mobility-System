import { useEffect, useMemo, useState } from 'react';
import { useNetworkStatus } from '@/hooks/use-network';
import { Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BusFront, Clock3, MapPin, RefreshCw, Settings2, TrainFront } from 'lucide-react';
import { PageHeading, ErrorState, selectBus } from '@/components/acims-ui';
import { useAuth } from '@/lib/auth-context';
import { studentMobilityHeaders } from '@/lib/mobilityApi';
import { Button } from '@/components/ui/button';
import { useBusRealtimeLocation } from '@/lib/realtime-location';
import { normalizeAcimsRoute } from '@/routes/routeTypes';
import { GoogleBusMap } from '@/maps/GoogleBusMap';

type MyBusPayload = {
  busId: string;
  busNumber: string;
  tripId: string | null;
  pickup: { id: string; name: string; latitude: number; longitude: number };
  routeLabel: string;
  directionLabel: string;
  status: string;
  delayMinutes: number;
  scheduledArrival: string | null;
  predictedArrival: string | null;
  arrivingInMinutes: number | null;
  arrivingInLabel: string;
  stopPassed: boolean;
  gps: {
    status: string;
    lastUpdateAt: string | null;
    secondsSinceUpdate: number;
    latitude: number | null;
    longitude: number | null;
  };
};

function statusBadge(status: string, delayMinutes: number) {
  if (status === 'ON_TIME' || delayMinutes <= 2) return { label: 'On Time', className: 'text-emerald-600' };
  if (status === 'MINOR_DELAY') return { label: `Delayed by ${delayMinutes} min`, className: 'text-amber-600' };
  return { label: `Delayed by ${delayMinutes} min`, className: 'text-orange-600' };
}

function isConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return m.includes('failed to fetch') || m.includes('network') || m.includes('connection');
}

export default function MyBusPage() {
  const { profile, token } = useAuth();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const headers = studentMobilityHeaders(token, profile);
  const [pickupSaving, setPickupSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  } | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const collegeRouteQuery = useQuery({
    queryKey: ['mvp', 'college-route'],
    queryFn: async () => {
      const res = await fetch('/api/mvp/college-route');
      if (!res.ok) throw new Error('College route not configured');
      return res.json() as Promise<{ routeLabel: string; busNumber: string | null; directionLabel: string }>;
    },
  });

  const myBusQuery = useQuery({
    queryKey: ['student', 'my-bus', profile?.userId],
    enabled: Boolean(profile?.userId),
    refetchInterval: 10000,
    queryFn: async () => {
      const res = await fetch('/api/student/my-bus', { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error || 'Could not load bus status';
        if (res.status === 404) {
          throw new Error(
            `${msg} Sign in as a student, pick a pickup point on Today or below, and ensure you have an assigned bus.`,
          );
        }
        throw new Error(msg);
      }
      return res.json() as Promise<MyBusPayload>;
    },
  });

  const data = myBusQuery.data;

  // Realtime SSE subscription for student's assigned bus
  const {
    location: liveBusLocation,
    routeDetails,
    freshness,
  } = useBusRealtimeLocation(data?.busId ?? '', isOnline && Boolean(data?.busId));

  // Refresh pickup ETA when new SSE GPS fix arrives
  useEffect(() => {
    if (liveBusLocation?.recordedAt && data?.busId) {
      void myBusQuery.refetch();
    }
  }, [liveBusLocation?.recordedAt]);

  const normalizedRoute = useMemo(
    () => (data?.busId ? normalizeAcimsRoute(routeDetails, data.busId) : null),
    [routeDetails, data?.busId],
  );

  const pickupOptionsQuery = useQuery({
    queryKey: ['student', 'pickup-options', profile?.userId],
    enabled: Boolean(profile?.userId),
    queryFn: async () => {
      const res = await fetch('/api/student/pickup-point/options', { headers });
      if (!res.ok) throw new Error('pickup options');
      return res.json() as Promise<Array<{ id: string; stopName: string }>>;
    },
  });

  const prefsQuery = useQuery({
    queryKey: ['student', 'notification-prefs', profile?.userId],
    enabled: Boolean(profile?.userId),
    queryFn: async () => {
      const res = await fetch('/api/student/notification-preferences', { headers });
      if (!res.ok) throw new Error('prefs');
      return res.json() as Promise<{
        arrivalReminders10Min: boolean;
        arrivalReminders5Min: boolean;
        delayAlerts: boolean;
        busArrived: boolean;
      }>;
    },
  });

  async function changePickup(nextId: string) {
    if (!profile?.userId) return;
    setPickupSaving(true);
    try {
      const res = await fetch('/api/student/pickup-point', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ pickupPointId: nextId }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Update failed');
      const name = pickupOptionsQuery.data?.find((p) => p.id === nextId)?.stopName ?? resData.pickupPointName;
      setToast(`Your pickup point has been changed to ${name}.`);
      await queryClient.invalidateQueries({ queryKey: ['student'] });
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : 'Failed to update pickup point');
    } finally {
      setPickupSaving(false);
    }
  }

  async function savePrefs(
    patch: Partial<{ delayAlerts: boolean; arrivalReminders10Min: boolean; arrivalReminders5Min: boolean }>,
  ) {
    await fetch('/api/student/notification-preferences', {
      method: 'PUT',
      headers,
      body: JSON.stringify(patch),
    });
    queryClient.invalidateQueries({ queryKey: ['student', 'notification-prefs'] });
  }

  const badge = data ? statusBadge(data.status, data.delayMinutes) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <PageHeading
        eyebrow="Transport"
        title="Your bus"
        description={
          collegeRouteQuery.data?.routeLabel
            ? `${collegeRouteQuery.data.routeLabel} · Live ETA at your pickup point`
            : 'Live ETA and delay updates for your pickup point'
        }
        action={
          <Button variant="outline" size="sm" onClick={() => myBusQuery.refetch()} disabled={myBusQuery.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${myBusQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {toast && (
        <div className="rounded-xl border border-border bg-muted px-4 py-3 text-sm" role="status">
          {toast}
        </div>
      )}

      {!isOnline && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
          You are offline. Live bus data needs the ACIMS server and network.
        </div>
      )}

      {myBusQuery.isError && (
        <ErrorState
          label={
            isConnectionError(myBusQuery.error)
              ? 'Cannot reach the server at http://localhost:3000.'
              : myBusQuery.error instanceof Error
                ? myBusQuery.error.message
                : 'Unknown error'
          }
          onRetry={() => myBusQuery.refetch()}
        />
      )}

      {!profile?.userId && (
        <div className="rounded-xl border border-border bg-muted px-4 py-3 text-sm">
          <Link href="/login" className="font-bold text-primary underline">Sign in</Link> to see your assigned bus and pickup ETA.
        </div>
      )}

      {data && (
        <section className="rounded-2xl border border-border bg-card p-5 soft-shadow space-y-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <BusFront size={28} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your bus</p>
              <h2 className="text-2xl font-bold">BUS-{data.busNumber}</h2>
              <p className="text-sm text-muted-foreground">{data.directionLabel}</p>
            </div>
            <Link
              href={`/map?busId=${encodeURIComponent(data.busId)}`}
              onClick={() => selectBus(data.busId)}
              className="rounded-xl bg-primary px-3.5 py-2 text-xs font-extrabold text-primary-foreground hover:opacity-90"
            >
              Open Full Live Map
            </Link>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Pickup point</dt>
              <dd className="mt-1 flex items-center gap-2 font-medium">
                <MapPin size={16} />
                {data.pickup.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Status</dt>
              <dd className={`mt-1 font-semibold ${badge?.className}`}>
                {data.stopPassed ? 'Pickup point passed' : badge?.label}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Estimated arrival</dt>
              <dd className="mt-1 text-lg font-bold">
                {data.predictedArrival ?? data.scheduledArrival ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Arriving in</dt>
              <dd className="mt-1 text-lg font-bold">
                {data.arrivingInMinutes != null ? `${data.arrivingInMinutes} min` : data.arrivingInLabel}
              </dd>
            </div>
          </dl>

          <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm">
            {freshness.statusBadge === 'LIVE' || data.gps.status === 'LIVE' ? (
              <span className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-500" />
                LIVE · {freshness.freshnessLabel}
              </span>
            ) : freshness.statusBadge === 'RECENT' ? (
              <span className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300">
                <Clock3 size={14} />
                RECENT · {freshness.freshnessLabel}
              </span>
            ) : freshness.statusBadge === 'STALE' ? (
              <span className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
                <Clock3 size={14} />
                STALE · {freshness.freshnessLabel}
              </span>
            ) : (
              <span>
                UNAVAILABLE · Waiting for driver GPS
              </span>
            )}
          </div>

          {/* Live Embedded Google Map */}
          {normalizedRoute && (
            <div className="overflow-hidden rounded-2xl border border-border">
              <GoogleBusMap
                busId={data.busId}
                busNumber={data.busNumber}
                stops={normalizedRoute.stops}
                traveledPath={[]}
                remainingPath={normalizedRoute.path}
                fullPath={normalizedRoute.path}
                location={liveBusLocation}
                userLocation={userLocation}
                followBus={true}
                highlightPickupStopId={data.pickup.id}
                heightClassName="h-[340px]"
              />
            </div>
          )}

          {data.stopPassed && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div className="space-y-2">
                  <p className="font-semibold text-amber-950 dark:text-amber-100">College bus may have passed your pickup</p>
                  <p className="text-sm text-amber-900/80 dark:text-amber-200/80">
                    We can show MTC, metro, and rail options near your current location.
                  </p>
                  <Link
                    href="/public-transport?missed=1"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                  >
                    <TrainFront size={14} />
                    View public transport options
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold">
          <Settings2 size={18} />
          Transport settings
        </div>
        <p className="text-sm text-muted-foreground">My pickup point</p>
        <select
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          disabled={pickupSaving || !data}
          value={data?.pickup.id ?? ''}
          onChange={(e) => changePickup(e.target.value)}
        >
          {(pickupOptionsQuery.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.stopName}</option>
          ))}
        </select>
        <p className="mt-2 text-xs text-muted-foreground">Changes apply immediately to ETA and notifications.</p>
      </section>

      {prefsQuery.data && (
        <section className="rounded-2xl border border-border bg-card p-5 text-sm">
          <p className="mb-3 font-semibold">Notification preferences</p>
          <label className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              checked={prefsQuery.data.arrivalReminders10Min}
              onChange={(e) => savePrefs({ arrivalReminders10Min: e.target.checked })}
            />
            10 minutes before arrival
          </label>
          <label className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              checked={prefsQuery.data.arrivalReminders5Min}
              onChange={(e) => savePrefs({ arrivalReminders5Min: e.target.checked })}
            />
            5 minutes before arrival
          </label>
          <label className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              checked={prefsQuery.data.delayAlerts}
              onChange={(e) => savePrefs({ delayAlerts: e.target.checked })}
            />
            Delay alerts
          </label>
        </section>
      )}
    </div>
  );
}
