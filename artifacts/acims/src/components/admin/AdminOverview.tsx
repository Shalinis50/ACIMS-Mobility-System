import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BusFront,
  Clock,
  Radio,
  RefreshCw,
  Signal,
  WifiOff,
} from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';
import { naturalBusSort } from '@/lib/naturalSort';

export type BusOverviewItem = {
  id: string;
  busNumber: string;
  displayName: string;
  routeName: string;
  driverName?: string;
  status: 'LIVE' | 'STALE' | 'GPS UNAVAILABLE' | 'DELAYED';
  nextStop?: string;
  etaMinutes?: number | null;
  secondsAgo?: number | null;
  active: boolean;
};

type LiveBusesPayload = {
  buses: BusOverviewItem[];
  counters: {
    total: number;
    live: number;
    stale: number;
    gpsUnavailable: number;
    delayed?: number;
  };
};

type ShiftAssignmentItem = {
  id: string;
  name: string;
  startTime: string;
  displayTime: string;
  direction: string;
  directionLabel: string;
  active: boolean;
  assignedBusIds: string[];
};

export function AdminOverview({
  onNavigateToLiveBuses,
}: {
  onNavigateToLiveBuses: () => void;
  onNavigateToShifts?: () => void;
}) {
  const liveBusesQuery = useQuery({
    queryKey: ['admin', 'live-buses'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/live-buses');
      if (!res.ok) throw new Error('Failed to load live buses');
      return (await res.json()) as LiveBusesPayload;
    },
    refetchInterval: 5000,
  });

  const shiftsQuery = useQuery({
    queryKey: ['admin', 'shift-assignments'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/shift-assignments');
      if (!res.ok) throw new Error('Failed to load shifts');
      return (await res.json()) as ShiftAssignmentItem[];
    },
  });

  const isLoading = (liveBusesQuery.isLoading && !liveBusesQuery.data) || (shiftsQuery.isLoading && !shiftsQuery.data);
  const isError = liveBusesQuery.isError || shiftsQuery.isError;

  const buses = liveBusesQuery.data?.buses ?? [];
  const rawCounters = liveBusesQuery.data?.counters;
  const shifts = shiftsQuery.data ?? [];

  // Computed counters from actual database buses
  const counters = useMemo(() => {
    if (rawCounters) {
      return {
        total: rawCounters.total ?? buses.length,
        live: rawCounters.live ?? buses.filter((b) => b.status === 'LIVE').length,
        stale: rawCounters.stale ?? buses.filter((b) => b.status === 'STALE').length,
        gpsUnavailable: rawCounters.gpsUnavailable ?? buses.filter((b) => b.status === 'GPS UNAVAILABLE').length,
      };
    }
    return {
      total: buses.length,
      live: buses.filter((b) => b.status === 'LIVE').length,
      stale: buses.filter((b) => b.status === 'STALE').length,
      gpsUnavailable: buses.filter((b) => b.status === 'GPS UNAVAILABLE').length,
    };
  }, [rawCounters, buses]);

  // Determine current active regular shift based on current time
  const currentShift = useMemo(() => {
    if (!shifts.length) return null;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const regularShifts = shifts.filter((s) => s.active && !s.id.includes('exam'));
    if (!regularShifts.length) return shifts[0];

    for (const s of regularShifts) {
      const [h, m] = (s.startTime || '00:00').split(':').map(Number);
      const shiftMins = (h || 0) * 60 + (m || 0);
      if (Math.abs(currentMins - shiftMins) <= 90) {
        return s;
      }
    }
    return regularShifts.find((s) => s.startTime.startsWith('15')) || regularShifts[0];
  }, [shifts]);

  // Recent Transport Updates
  const recentUpdates = useMemo(() => {
    const updates: Array<{ id: string; title: string; subtitle: string; type: 'live' | 'stale' | 'unavailable' | 'shift' }> = [];

    // 1. Shift assignment updates
    for (const s of shifts.filter((sh) => !sh.id.includes('exam'))) {
      const count = s.assignedBusIds?.length || 0;
      updates.push({
        id: `shift-${s.id}`,
        title: `${s.displayTime} shift`,
        subtitle: `${count} ${count === 1 ? 'bus' : 'buses'} assigned`,
        type: 'shift',
      });
    }

    // 2. Bus GPS updates
    const sorted = [...buses].sort((a, b) => naturalBusSort(a.busNumber, b.busNumber));
    for (const b of sorted) {
      if (b.status === 'LIVE') {
        updates.push({
          id: `bus-${b.id}-live`,
          title: `BUS ${b.busNumber}`,
          subtitle: 'GPS started',
          type: 'live',
        });
      } else if (b.status === 'STALE') {
        updates.push({
          id: `bus-${b.id}-stale`,
          title: `BUS ${b.busNumber}`,
          subtitle: 'GPS stale',
          type: 'stale',
        });
      } else {
        updates.push({
          id: `bus-${b.id}-unavail`,
          title: `BUS ${b.busNumber}`,
          subtitle: 'GPS unavailable',
          type: 'unavailable',
        });
      }
    }

    return updates;
  }, [shifts, buses]);

  // ERROR STATE
  if (isError && !liveBusesQuery.data && !shiftsQuery.data) {
    return (
      <div className="rounded-[28px] border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle size={24} />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-foreground">
            Unable to load this information.
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            The admin dashboard could not connect to the campus transport database.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => {
              void liveBusesQuery.refetch();
              void shiftsQuery.refetch();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-95"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="rounded-[28px] border border-border bg-card p-12 text-center space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <RefreshCw size={16} className="animate-spin text-primary" />
          Loading transport summary...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 5 Clear Summary Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          icon={BusFront}
          label="TOTAL BUSES"
          value={counters.total}
          tone="default"
        />
        <SummaryCard
          icon={Activity}
          label="LIVE"
          value={counters.live}
          tone="emerald"
        />
        <SummaryCard
          icon={Signal}
          label="STALE"
          value={counters.stale}
          tone="amber"
        />
        <SummaryCard
          icon={Radio}
          label="GPS UNAVAILABLE"
          value={counters.gpsUnavailable}
          tone="red"
        />
        <SummaryCard
          icon={Clock}
          label="CURRENT SHIFT"
          value={currentShift?.displayTime || '3:15 PM'}
          subValue={currentShift?.directionLabel || 'College → Home'}
          tone="blue"
          isText
        />
      </section>

      {/* Button: [View Live Buses] */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <div>
          <div className="text-sm font-extrabold text-foreground">
            Live Bus Tracking Map
          </div>
          <div className="text-xs text-muted-foreground">
            Monitor real-time GPS locations of all active REC campus buses.
          </div>
        </div>
        <button
          type="button"
          onClick={onNavigateToLiveBuses}
          data-testid="button-view-live-buses"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground shadow-xs hover:opacity-95"
        >
          View Live Buses <ArrowRight size={14} />
        </button>
      </div>

      {/* RECENT TRANSPORT UPDATES */}
      <section className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="border-b border-border pb-4">
          <div className="mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
            Activity Feed
          </div>
          <h3 className="mt-1 text-xl font-extrabold text-foreground">
            Recent Transport Updates
          </h3>
        </div>

        {recentUpdates.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No buses assigned yet.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {recentUpdates.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-bold ${
                      item.type === 'live'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : item.type === 'stale'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        : item.type === 'unavailable'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {item.type === 'shift' ? (
                      <Clock size={15} />
                    ) : item.type === 'live' ? (
                      <Activity size={15} />
                    ) : item.type === 'stale' ? (
                      <Signal size={15} />
                    ) : (
                      <WifiOff size={15} />
                    )}
                  </span>
                  <div>
                    <div className="font-extrabold text-sm text-foreground">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                <div>
                  {item.type === 'live' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE
                    </span>
                  )}
                  {item.type === 'stale' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      STALE
                    </span>
                  )}
                  {item.type === 'unavailable' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-extrabold text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                      UNAVAILABLE
                    </span>
                  )}
                  {item.type === 'shift' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold text-primary">
                      SHIFT
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  subValue,
  tone,
  isText = false,
}: {
  icon: typeof BusFront;
  label: string;
  value: number | string;
  subValue?: string;
  tone: 'default' | 'emerald' | 'amber' | 'red' | 'blue';
  isText?: boolean;
}) {
  const toneClasses = {
    default: 'border-border bg-card text-foreground',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200',
    red: 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300',
    blue: 'border-primary/30 bg-primary/5 text-primary',
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">
          {label}
        </span>
        <Icon size={16} />
      </div>
      <div className={`mt-2 font-extrabold ${isText ? 'text-xl' : 'display-font text-3xl'}`}>
        {value}
      </div>
      {subValue && (
        <div className="mt-0.5 text-[11px] font-bold text-muted-foreground">
          {subValue}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (status === 'LIVE') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        LIVE
      </span>
    );
  }
  if (status === 'STALE') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        STALE
      </span>
    );
  }
  if (status === 'DELAYED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        DELAYED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-extrabold text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
      GPS UNAVAILABLE
    </span>
  );
}
