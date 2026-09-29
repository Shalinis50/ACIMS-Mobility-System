import { useMemo } from 'react';
import { ArrowUpRight, BusFront, Check, CircleAlert, LocateFixed, Radio, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { 
  getGetBusLocationQueryKey, 
  getGetBusQueryKey, 
  getListBusesQueryKey, 
  getListNotificationsQueryKey, 
  useGetBus, 
  useGetBusLocation, 
  useListBuses, 
  useListNotifications 
} from '@workspace/api-client-react';
import { 
  BusMiniRoute, 
  EmptyState, 
  ErrorState, 
  formatUpdatedAt, 
  LoadingRows, 
  PageHeading, 
  statusLabel, 
  useSelectedBusId 
} from '@/components/acims-ui';
import { BusStatus } from '@/components/bus-status';
import { RoutePulseCard } from '@/components/route-pulse';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const selectedBusId = useSelectedBusId();
  const busesQuery = useListBuses({ query: { queryKey: getListBusesQueryKey(), refetchInterval: 30000 } });
  const buses = Array.isArray(busesQuery.data) ? busesQuery.data : [];
  const bus = useMemo(() => buses.find((item) => item.id === selectedBusId) ?? buses[0], [buses, selectedBusId]);
  const busId = bus?.id ?? '';
  const busQuery = useGetBus(busId, { query: { enabled: !!busId, queryKey: getGetBusQueryKey(busId), refetchInterval: 30000 } });
  const locationQuery = useGetBusLocation(busId, { query: { enabled: !!busId, queryKey: getGetBusLocationQueryKey(busId), refetchInterval: 30000 } });
  const notificationsQuery = useListNotifications({ query: { queryKey: getListNotificationsQueryKey() } });
  
  const activeBus = busQuery.data ?? bus;
  const latestAlert = notificationsQuery.data?.[0];
  const location = locationQuery.data;

  if (busesQuery.isLoading) return <DashboardSkeleton />;
  if (busesQuery.isError) return <ErrorState onRetry={() => void busesQuery.refetch()} label="The route board is taking a moment to reconnect." />;
  if (!activeBus) return <EmptyState icon={BusFront} title="No campus buses are moving yet" message="When service starts, your selected route will appear here with a live arrival estimate." />;

  return (
    <div className="page-in space-y-6">
      <PageHeading 
        eyebrow="College Commute Intelligence" 
        title="Make the next move." 
        description="Your personalized transit radar, verified driver GPS locations, and active route operations." 
        action={
          <Link href="/map" data-testid="link-open-live-map" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground transition hover:-translate-y-0.5 hover:shadow-lg">
            <span>Open live map</span>
            <ArrowUpRight size={15} />
          </Link>
        } 
      />

      {/* 1. Personalized Route Pulse Card (Strictly Real Data & Pickup Point) */}
      <RoutePulseCard />

      {/* 2. Focused Ride & Active Operations */}
      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="overflow-hidden rounded-[28px] bg-primary p-6 text-primary-foreground soft-shadow sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground/55">
                Focused Vehicle
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                  <BusFront size={23} />
                </span>
                <div>
                  <h2 className="display-font text-2xl font-extrabold">Bus #{activeBus.busNumber}</h2>
                  <BusMiniRoute bus={activeBus} />
                </div>
              </div>
            </div>
            <span className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1.5 text-[11px] font-bold">
              <span className="pulse-dot h-2 w-2 rounded-full bg-accent" />
              {statusLabel(location?.status ?? activeBus.status)}
            </span>
          </div>

          <div className="mt-10 flex items-end gap-5">
            <div>
              <div className="mono text-[11px] uppercase tracking-[0.16em] text-primary-foreground/55">
                Next stop in
              </div>
              <div className="display-font mt-1 text-[5.5rem] font-extrabold leading-none tracking-[-0.11em] text-accent">
                {location?.etaMinutes ?? activeBus.etaMinutes}
                <span className="ml-2 text-2xl tracking-normal text-primary-foreground/70">min</span>
              </div>
            </div>
            <div className="mb-2 border-l border-primary-foreground/15 pl-5">
              <div className="text-sm font-extrabold">{location?.nextStop ?? activeBus.nextStop}</div>
              <div className="mt-1 text-xs text-primary-foreground/55">approaching stop</div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-primary-foreground/15 pt-5 text-xs text-primary-foreground/70">
            <div className="flex items-center gap-2">
              <LocateFixed size={15} className="text-accent" />
              <span>Signal updated {formatUpdatedAt(location?.updatedAt ?? activeBus.updatedAt)}</span>
            </div>
            <span className="mono text-[10px] uppercase tracking-wider text-primary-foreground/50">
              Verified Driver GPS · {location?.source ?? 'fleet telemetry'}
            </span>
          </div>
        </div>

        {/* Real Service Notes / Live Operations Status */}
        <div className={`rounded-[28px] border p-6 sm:p-8 ${latestAlert ? 'border-destructive/25 bg-destructive/10' : 'border-border bg-card'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-extrabold">
              <CircleAlert size={17} className={latestAlert ? 'text-destructive' : 'text-primary'} />
              <span>Live Operations Note</span>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-extrabold text-secondary-foreground">
              Fleet Notice
            </span>
          </div>

          {notificationsQuery.isLoading ? (
            <div className="mt-4 skeleton h-20 rounded-xl" />
          ) : latestAlert ? (
            <>
              <h3 className="mt-5 text-base font-extrabold text-foreground">{latestAlert.title}</h3>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">{latestAlert.message}</p>
              <div className="mt-6 flex items-center justify-between border-t border-border/80 pt-4">
                <span className="text-[11px] text-muted-foreground">
                  {formatUpdatedAt(typeof latestAlert.createdAt === 'string' ? latestAlert.createdAt : undefined)}
                </span>
                <Link href="/alerts" data-testid="link-latest-alert" className="inline-flex items-center gap-1 text-xs font-extrabold text-primary">
                  <span>View all alerts</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-6">
              <h3 className="text-sm font-extrabold text-foreground">Normal operations on all routes</h3>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                All morning buses to REC Campus are moving on scheduled transit corridors with live GPS signals enabled.
              </p>
              <Link href="/alerts" className="mt-6 inline-flex items-center gap-1 text-xs font-extrabold text-primary">
                <span>View bulletin</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 3. Bus Status & Route Health (Cleaned of Occupancy) */}
      <BusStatus
        onSelectBus={(busId) => {
          void queryClient.invalidateQueries({ queryKey: getGetBusQueryKey(busId) });
          void queryClient.invalidateQueries({ queryKey: getGetBusLocationQueryKey(busId) });
        }}
      />

      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
        <RefreshCw size={13} /> 
        <span>Live operations auto-refreshes periodically</span>
        <span className="text-border">·</span> 
        <Radio size={13} className="text-emerald-500" />
        <span>Grounded in actual driver locations</span>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="page-in">
      <div className="skeleton mb-8 h-24 w-3/4 rounded-2xl" />
      <div className="skeleton mb-6 h-48 rounded-[28px]" />
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="skeleton h-[320px] rounded-[28px]" />
        <div className="skeleton h-[320px] rounded-[28px]" />
      </div>
      <div className="mt-5">
        <LoadingRows count={2} />
      </div>
    </div>
  );
}