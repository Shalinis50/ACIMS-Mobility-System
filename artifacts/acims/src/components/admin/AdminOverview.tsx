import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BusFront,
  Clock,
  Radio,
  ShieldAlert,
  UsersRound,
} from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';
import { naturalBusSort } from '@/lib/naturalSort';

export type BusOverviewItem = {
  id: string;
  busNumber: string;
  displayName: string;
  routeName: string;
  driverName?: string;
  status: 'LIVE' | 'GPS UNAVAILABLE' | 'NOT STARTED' | 'DELAYED';
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
    gpsUnavailable: number;
    delayed: number;
    notStarted: number;
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
  onNavigateToShifts,
}: {
  onNavigateToLiveBuses: () => void;
  onNavigateToShifts: () => void;
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

  const buses = liveBusesQuery.data?.buses ?? [];
  const counters = liveBusesQuery.data?.counters ?? {
    total: 0,
    live: 0,
    gpsUnavailable: 0,
    delayed: 0,
    notStarted: 0,
  };

  const shifts = shiftsQuery.data ?? [];

  // Determine current active regular shift based on current time
  const currentShift = useMemo(() => {
    if (!shifts.length) return null;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    // Check if within any active shift
    const regularShifts = shifts.filter((s) => s.active && !s.id.includes('exam'));
    if (!regularShifts.length) return shifts[0];

    // Find shift whose time is closest or upcoming
    for (const s of regularShifts) {
      const [h, m] = (s.startTime || '00:00').split(':').map(Number);
      const shiftMins = (h || 0) * 60 + (m || 0);
      if (Math.abs(currentMins - shiftMins) <= 90) {
        return s;
      }
    }
    // Default to the afternoon or morning regular shift
    return regularShifts.find((s) => s.startTime.startsWith('15')) || regularShifts[0];
  }, [shifts]);

  const assignedBusesInCurrentShift = useMemo(() => {
    if (!currentShift) return [...buses].sort((a, b) => naturalBusSort(a.busNumber, b.busNumber)).slice(0, 4);
    const assignedIds = new Set(currentShift.assignedBusIds || []);
    const matching = buses.filter((b) => assignedIds.has(b.id));
    const result = matching.length > 0 ? matching : buses.slice(0, 4);
    return [...result].sort((a, b) => naturalBusSort(a.busNumber, b.busNumber));
  }, [currentShift, buses]);

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={BusFront}
          label="Total Buses"
          value={counters.total}
          subtext="Registered in fleet"
          tone="default"
        />
        <StatCard
          icon={Activity}
          label="Currently Live"
          value={counters.live}
          subtext="Active GPS broadcast"
          tone="emerald"
        />
        <StatCard
          icon={Radio}
          label="Without GPS"
          value={counters.gpsUnavailable}
          subtext="No GPS telemetry"
          tone="red"
        />
        <StatCard
          icon={Clock}
          label="Active Shift"
          value={currentShift?.displayTime || '3:15 PM'}
          subtext={currentShift?.directionLabel || 'College → Home'}
          tone="blue"
          isText
        />
        <StatCard
          icon={AlertTriangle}
          label="Delayed Buses"
          value={counters.delayed}
          subtext="Exceeding schedule"
          tone="amber"
        />
      </section>

      {/* CURRENT SHIFT CARD */}
      <section className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
              Current Shift Focus
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <h2 className="display-font text-2xl font-extrabold sm:text-3xl text-foreground">
                {currentShift?.displayTime || '3:15 PM'}
              </h2>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-extrabold text-secondary-foreground">
                {currentShift?.directionLabel || 'College → Home'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNavigateToShifts}
              className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
            >
              Change Shift Assignments
            </button>
            <button
              type="button"
              onClick={onNavigateToLiveBuses}
              data-testid="button-view-all-live-buses"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground hover:opacity-95"
            >
              View all live buses <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between text-xs font-extrabold text-muted-foreground">
            <span>
              Assigned Buses for this Shift ({assignedBusesInCurrentShift.length})
            </span>
            <span className="mono text-[11px]">Real-Time Status</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {assignedBusesInCurrentShift.map((bus) => (
              <div
                key={bus.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-muted/20 p-4 transition hover:border-primary/40 hover:bg-muted/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="display-font text-base font-extrabold text-foreground">
                      {bus.displayName}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Driver: {bus.driverName || 'Not assigned'}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/50">
                  <StatusBadge status={bus.status} />
                  {bus.status === 'LIVE' && bus.secondsAgo != null && (
                    <span className="mono text-[10px] text-muted-foreground">
                      {bus.secondsAgo}s ago
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPACT LIST OF CURRENT BUSES */}
      <section className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Fleet Summary
            </div>
            <h3 className="text-xl font-extrabold text-foreground">
              All Registered Buses
            </h3>
          </div>
          <button
            type="button"
            onClick={onNavigateToLiveBuses}
            className="text-xs font-extrabold text-primary hover:underline"
          >
            Open Live Buses Monitoring →
          </button>
        </div>

        <div className="mt-4 divide-y divide-border">
          {buses.slice(0, 10).map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-muted font-mono font-extrabold text-xs">
                  {b.busNumber}
                </span>
                <div>
                  <div className="font-extrabold text-sm text-foreground">
                    {b.displayName}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Route: {b.routeName} · Driver: {b.driverName || 'Not assigned'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={b.status} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  tone,
  isText = false,
}: {
  icon: typeof BusFront;
  label: string;
  value: number | string;
  subtext: string;
  tone: 'default' | 'emerald' | 'red' | 'blue' | 'amber';
  isText?: boolean;
}) {
  const toneClasses = {
    default: 'border-border bg-card text-foreground',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
    red: 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300',
    blue: 'border-primary/30 bg-primary/5 text-primary',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200',
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-wide opacity-80">
          {label}
        </span>
        <Icon size={16} />
      </div>
      <div className={`mt-2 font-extrabold ${isText ? 'text-xl' : 'display-font text-3xl'}`}>
        {value}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{subtext}</div>
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
  if (status === 'DELAYED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        DELAYED
      </span>
    );
  }
  if (status === 'NOT STARTED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-extrabold text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
        NOT STARTED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-red-700 dark:text-red-300">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      GPS UNAVAILABLE
    </span>
  );
}
