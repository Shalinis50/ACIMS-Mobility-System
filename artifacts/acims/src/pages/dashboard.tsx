import { useEffect, useMemo } from 'react';
import {
  ArrowUpRight,
  Bell,
  BusFront,
  Clock,
  Compass,
  LocateFixed,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetBusLocationQueryKey,
  getGetBusQueryKey,
  getListBusesQueryKey,
  useGetBus,
  useGetBusLocation,
  useListBuses,
} from '@workspace/api-client-react';
import {
  BusMiniRoute,
  EmptyState,
  ErrorState,
  formatUpdatedAt,
  PageHeading,
  useSelectedBusId,
} from '@/components/acims-ui';
import { useNetworkStatus } from '@/hooks/use-network';
import {
  getOfflineRoutes,
  getLastKnownBusSnapshots,
  getLastSyncTime,
  saveLastKnownBusSnapshot,
} from '@/lib/offline-storage';
import { PersonalizedPublicTransportCard } from '@/components/PersonalizedPublicTransportCard';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const selectedBusId = useSelectedBusId();
  const { isOnline } = useNetworkStatus();

  // Polling only runs while online (every 10s to visibly reflect simulated ETA & stop progress)
  const busesQuery = useListBuses({
    query: {
      enabled: isOnline,
      queryKey: getListBusesQueryKey(),
      refetchInterval: isOnline ? 10000 : false,
    },
  });

  const offlineRoutes = useMemo(() => getOfflineRoutes(), []);
  const snapshots = useMemo(() => getLastKnownBusSnapshots(), [isOnline]);
  const lastSyncTime = useMemo(() => getLastSyncTime(), [isOnline]);

  // Determine active bus: prefer live query data when online, otherwise offline cached route + snapshot
  const activeBus = useMemo(() => {
    if (busesQuery.data && busesQuery.data.length > 0) {
      return (
        busesQuery.data.find((item) => item.id === selectedBusId) ?? busesQuery.data[0]
      );
    }
    const match = offlineRoutes.find((r) => r.id === selectedBusId) ?? offlineRoutes[0];
    const snap = match ? snapshots[match.id] : undefined;
    return {
      id: match?.id ?? 'bus-12',
      busNumber: match?.busNumber ?? '12',
      origin: match?.origin ?? 'Vandalur Transit Hub',
      destination: match?.destination ?? 'Academic Quad',
      routeLabel: match?.routeLabel ?? 'Campus Loop A',
      capacity: snap?.capacity ?? 40,
      currentLocation: { latitude: 12.9161, longitude: 80.1119 },
      nextStop: snap?.lastStop ?? match?.stops?.[2]?.name ?? 'Tambaram Terminal',
      nextStopId: 'tambaram',
      etaMinutes: snap?.etaMinutes ?? 3,
      status: snap?.status ?? 'Scheduled route',
      updatedAt: new Date(),
      active: true,
      routeId: match?.id ?? 'route-bus-12',
    };
  }, [busesQuery.data, selectedBusId, offlineRoutes, snapshots]);

  const busId = activeBus?.id ?? '';

  const busQuery = useGetBus(busId, {
    query: {
      enabled: isOnline && !!busId,
      queryKey: getGetBusQueryKey(busId),
      refetchInterval: isOnline ? 10000 : false,
    },
  });

  const locationQuery = useGetBusLocation(busId, {
    query: {
      enabled: isOnline && !!busId,
      queryKey: getGetBusLocationQueryKey(busId),
      refetchInterval: isOnline ? 10000 : false,
    },
  });

  // Automatic Reconnection: when connection returns, refresh bus data from backend & update caches
  useEffect(() => {
    if (isOnline) {
      void queryClient.invalidateQueries({ queryKey: getListBusesQueryKey() });
      if (busId) {
        void queryClient.invalidateQueries({ queryKey: getGetBusQueryKey(busId) });
        void queryClient.invalidateQueries({ queryKey: getGetBusLocationQueryKey(busId) });
      }
    }
  }, [isOnline, queryClient, busId]);

  // Keep offline cache synced whenever fresh live bus data arrives
  const currentBus = busQuery.data ?? activeBus;
  useEffect(() => {
    if (isOnline && currentBus) {
      saveLastKnownBusSnapshot({
        id: currentBus.id,
        busNumber: currentBus.busNumber,
        nextStop: currentBus.nextStop,
        status: currentBus.status,
        capacity: currentBus.capacity,
        etaMinutes: currentBus.etaMinutes,
        origin: currentBus.origin,
        destination: currentBus.destination,
        routeLabel: currentBus.routeLabel,
      });
    }
  }, [isOnline, currentBus]);

  const location = locationQuery.data;
  const activeSnapshot = snapshots[currentBus.id];

  if (isOnline && busesQuery.isLoading) return <DashboardSkeleton />;
  if (isOnline && busesQuery.isError) {
    return (
      <ErrorState
        onRetry={() => void busesQuery.refetch()}
        label="The route board is taking a moment to reconnect."
      />
    );
  }

  if (!currentBus) {
    return (
      <EmptyState
        icon={BusFront}
        title="No campus buses are moving yet"
        message="When service starts, your selected route will appear here with an arrival estimate."
      />
    );
  }

  // Display ETA: if 0, show "Arriving", else show number + min
  const rawEta = isOnline
    ? (location?.etaMinutes ?? currentBus.etaMinutes)
    : (activeSnapshot?.etaMinutes ?? currentBus.etaMinutes);
  const etaDisplay = rawEta === 0 ? 'Arriving' : `${rawEta}`;
  const isArriving = rawEta === 0;

  return (
    <div className="page-in max-w-4xl mx-auto space-y-6">
      {/* AUTOMATIC OFFLINE BANNER */}
      {!isOnline && (
        <div
          data-testid="banner-offline-mode"
          className="rounded-[24px] border border-amber-500/40 bg-amber-500/10 p-5 text-amber-950 dark:text-amber-100 sm:p-6"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-300">
                <WifiOff size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="display-font text-base font-extrabold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                    Offline Mode
                  </span>
                  <span className="rounded-full bg-amber-500/25 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950 dark:text-amber-100">
                    Cached
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80 sm:text-sm">
                  You're offline. Showing the latest saved mobility information.
                </p>
                <div className="mt-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  Last synced: <span data-testid="text-last-synced">{lastSyncTime}</span>
                </div>
              </div>
            </div>
            <Link
              href="/offline"
              data-testid="button-open-offline-mobility"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 sm:self-auto"
            >
              Open Offline Desk <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      )}

      {/* HEADER / PAGE HEADING */}
      <PageHeading
        eyebrow={
          isOnline ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-500" />
              Service Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <WifiOff size={13} />
              Offline Mode · Last synced {lastSyncTime}
            </span>
          )
        }
        title="Make the next move."
        description={
          isOnline
            ? "Your campus commute at a glance. Verified arrival estimates and route progress."
            : "Displaying cached transit details stored on this device. Live GPS updates paused."
        }
      />

      {/* MAIN SELECTED BUS CARD (Only verified information: Bus number, Route, ETA, Next stop, Service status, Live Tracking CTA) */}
      <section className="overflow-hidden rounded-[28px] bg-primary p-6 text-primary-foreground soft-shadow sm:p-8">
        {/* Header: Selected Bus & Route */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground/55">
              {isOnline ? 'Selected Bus' : 'Selected Bus (Cached)'}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <BusFront size={23} />
              </span>
              <div>
                <h2 className="display-font text-2xl font-extrabold">Bus {currentBus.busNumber}</h2>
                <BusMiniRoute bus={currentBus} />
              </div>
            </div>
          </div>

          <div>
            {isOnline ? (
              <span className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3.5 py-1.5 text-xs font-bold">
                <span className="pulse-dot h-2 w-2 rounded-full bg-accent" />
                Service Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/25 px-3.5 py-1.5 text-xs font-extrabold text-amber-200">
                <WifiOff size={12} />
                Offline · Cached
              </span>
            )}
          </div>
        </div>

        {/* Hero: ETA & Next Stop */}
        <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t border-primary-foreground/15 pt-8">
          <div>
            <div className="mono text-[11px] uppercase tracking-[0.16em] text-primary-foreground/55">
              {isOnline ? 'Estimated arrival' : 'Last known ETA'}
            </div>
            <div className="display-font mt-1 flex items-baseline gap-2 text-[5rem] font-extrabold leading-none tracking-[-0.1em] text-accent sm:text-[5.5rem]">
              <span>{etaDisplay}</span>
              {!isArriving && (
                <span className="text-2xl tracking-normal text-primary-foreground/70">min</span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-primary-foreground/60">
              {isOnline ? (
                <>
                  <Sparkles size={13} className="text-accent" />
                  <span>Simulated fleet telemetry (updates automatically)</span>
                </>
              ) : (
                <>
                  <Clock size={13} className="text-amber-300" />
                  <span>Cached snapshot saved at {activeSnapshot?.savedAt || lastSyncTime}</span>
                </>
              )}
            </div>
          </div>

          <div className="border-l border-primary-foreground/20 pl-6 pb-2">
            <div className="mono text-[10px] uppercase tracking-[0.16em] text-primary-foreground/55">
              {isOnline ? 'Next stop' : 'Last known next stop'}
            </div>
            <div className="mt-1 text-base font-extrabold text-primary-foreground sm:text-lg">
              {isOnline
                ? (location?.nextStop ?? currentBus.nextStop)
                : (activeSnapshot?.lastStop ?? currentBus.nextStop)}
            </div>
            <div className="mt-1 text-xs text-primary-foreground/60">
              Line: {currentBus.routeLabel}
            </div>
          </div>
        </div>

        {/* Live Tracking Map CTA Button */}
        <div className="mt-8 border-t border-primary-foreground/15 pt-6">
          <Link
            href={isOnline ? "/map" : "/offline"}
            data-testid="link-open-live-map"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 text-center text-sm font-extrabold text-accent-foreground shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            {isOnline ? 'Open Live Tracking Map' : 'Open Offline Route Schedules'}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>

      {/* PERSONALIZED PUBLIC TRANSPORT NEAR YOU (Sections 1-18) */}
      <PersonalizedPublicTransportCard pickupStopId={currentBus.nextStopId || 'tambaram'} />

      {/* QUICK ACTIONS */}
      <section className="space-y-3">
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Quick Actions
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/map"
            data-testid="quick-action-map"
            className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-muted/40"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <LocateFixed size={18} />
              </span>
              <ArrowUpRight size={15} className="text-muted-foreground transition group-hover:text-foreground" />
            </div>
            <div className="mt-3">
              <div className="text-xs font-extrabold text-foreground">Live Map View</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Track buses along campus routes</p>
            </div>
          </Link>

          <Link
            href="/queue"
            data-testid="quick-action-queue"
            className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-muted/40"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <ShieldCheck size={18} />
              </span>
              <ArrowUpRight size={15} className="text-muted-foreground transition group-hover:text-foreground" />
            </div>
            <div className="mt-3">
              <div className="text-xs font-extrabold text-foreground">Boarding Queue</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Hold your spot for campus bus</p>
            </div>
          </Link>

          <Link
            href="/alerts"
            data-testid="quick-action-alerts"
            className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-muted/40"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Bell size={18} />
              </span>
              <ArrowUpRight size={15} className="text-muted-foreground transition group-hover:text-foreground" />
            </div>
            <div className="mt-3">
              <div className="text-xs font-extrabold text-foreground">Service Alerts</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Notices & schedule changes</p>
            </div>
          </Link>

          <Link
            href="/offline"
            data-testid="quick-action-offline"
            className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-muted/40"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Compass size={18} />
              </span>
              <ArrowUpRight size={15} className="text-muted-foreground transition group-hover:text-foreground" />
            </div>
            <div className="mt-3">
              <div className="text-xs font-extrabold text-foreground">Offline Desk</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Timetables, stops & emergency lines</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Footer status summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Service Live · Simulated campus operations</span>
            </>
          ) : (
            <>
              <WifiOff size={13} className="text-amber-500" />
              <span>Offline Mode · Cached on device</span>
            </>
          )}
        </div>
        <div>
          Last updated: {isOnline ? formatUpdatedAt(location?.updatedAt ?? currentBus.updatedAt) : (activeSnapshot?.savedAt || lastSyncTime)}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="page-in max-w-4xl mx-auto space-y-6">
      <div className="skeleton h-20 w-2/3 rounded-2xl" />
      <div className="skeleton h-96 rounded-[28px]" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
      </div>
    </div>
  );
}
