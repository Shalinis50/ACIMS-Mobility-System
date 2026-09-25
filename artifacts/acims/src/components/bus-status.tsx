import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { 
  BusFront, 
  Clock3, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Search, 
  RotateCw, 
  MapPin, 
  ChevronRight, 
  ArrowRight,
  Sparkles,
  Gauge
} from 'lucide-react';
import type { Bus } from '@workspace/api-client-react';
import { 
  useListBuses, 
  getListBusesQueryKey 
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { selectBus, useSelectedBusId, formatUpdatedAt } from '@/components/acims-ui';

export type DelaySeverity = 'on_time' | 'minor_delay' | 'major_delay' | 'boarding' | 'unknown';

export function getDelayDetails(statusString?: string): {
  severity: DelaySeverity;
  label: string;
  isDelayed: boolean;
  delayMinutes?: number;
} {
  const text = (statusString || '').toLowerCase().trim();

  if (text.includes('board')) {
    return { severity: 'boarding', label: 'Boarding now', isDelayed: false };
  }

  const delayMatch = text.match(/(\d+)\s*(?:min|m)?/);
  const minutes = delayMatch ? parseInt(delayMatch[1], 10) : undefined;

  if (text.includes('delay') || (minutes !== undefined && minutes > 5 && !text.includes('on time'))) {
    const delayMins = minutes ?? 5;
    if (delayMins >= 8) {
      return {
        severity: 'major_delay',
        label: `Delayed · +${delayMins} min`,
        isDelayed: true,
        delayMinutes: delayMins,
      };
    }
    return {
      severity: 'minor_delay',
      label: `Delayed · +${delayMins} min`,
      isDelayed: true,
      delayMinutes: delayMins,
    };
  }

  if (text.includes('time') || text.includes('moving') || text.includes('normal') || text.includes('active')) {
    return { severity: 'on_time', label: 'On Schedule', isDelayed: false };
  }

  return { severity: 'on_time', label: 'On Schedule', isDelayed: false };
}

export function getOccupancyLevel(occupancy: number, capacity: number): {
  percentage: number;
  label: string;
  colorClass: string;
  barColorClass: string;
  status: 'light' | 'moderate' | 'heavy' | 'full';
} {
  const safeCapacity = capacity > 0 ? capacity : 40;
  const percentage = Math.min(100, Math.round((occupancy / safeCapacity) * 100));
  const seatsLeft = Math.max(0, safeCapacity - occupancy);

  if (percentage >= 95) {
    return {
      percentage,
      label: 'At Capacity · Standing only',
      colorClass: 'text-rose-600 dark:text-rose-400',
      barColorClass: 'bg-rose-500',
      status: 'full',
    };
  }

  if (percentage >= 75) {
    return {
      percentage,
      label: `${seatsLeft} seats left · Crowded`,
      colorClass: 'text-amber-600 dark:text-amber-400',
      barColorClass: 'bg-amber-500',
      status: 'heavy',
    };
  }

  if (percentage >= 40) {
    return {
      percentage,
      label: `${seatsLeft} seats left · Moderate`,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      barColorClass: 'bg-emerald-500',
      status: 'moderate',
    };
  }

  return {
    percentage,
    label: `${seatsLeft} seats left · Plenty of space`,
    colorClass: 'text-teal-600 dark:text-teal-400',
    barColorClass: 'bg-teal-500',
    status: 'light',
  };
}

interface BusStatusProps {
  className?: string;
  onSelectBus?: (busId: string) => void;
}

export function BusStatus({ className = '', onSelectBus }: BusStatusProps) {
  const queryClient = useQueryClient();
  const selectedBusId = useSelectedBusId();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'on_time' | 'delayed' | 'crowded'>('all');

  const { data: buses = [], isLoading, isError, refetch, isRefetching } = useListBuses({
    query: {
      queryKey: getListBusesQueryKey(),
      refetchInterval: 15000,
    },
  });

  const handleSelect = (busId: string) => {
    selectBus(busId);
    if (onSelectBus) onSelectBus(busId);
  };

  const filteredBuses = useMemo(() => {
    return buses.filter((bus) => {
      const delayInfo = getDelayDetails(bus.status);
      const occupancyPct = bus.capacity ? (bus.currentOccupancy / bus.capacity) * 100 : 0;

      if (filterType === 'on_time' && delayInfo.isDelayed) return false;
      if (filterType === 'delayed' && !delayInfo.isDelayed) return false;
      if (filterType === 'crowded' && occupancyPct < 75) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNumber = bus.busNumber.toLowerCase().includes(query);
        const matchesRoute = bus.routeLabel?.toLowerCase().includes(query);
        const matchesDest = bus.destination?.toLowerCase().includes(query);
        const matchesOrigin = bus.origin?.toLowerCase().includes(query);
        const matchesStop = bus.nextStop?.toLowerCase().includes(query);
        return matchesNumber || matchesRoute || matchesDest || matchesOrigin || matchesStop;
      }

      return true;
    });
  }, [buses, filterType, searchQuery]);

  const counts = useMemo(() => {
    let onTimeCount = 0;
    let delayedCount = 0;
    let crowdedCount = 0;

    buses.forEach((b) => {
      const delay = getDelayDetails(b.status);
      if (delay.isDelayed) delayedCount++;
      else onTimeCount++;

      const pct = b.capacity ? (b.currentOccupancy / b.capacity) * 100 : 0;
      if (pct >= 75) crowdedCount++;
    });

    return { total: buses.length, onTimeCount, delayedCount, crowdedCount };
  }, [buses]);

  return (
    <section 
      aria-label="Bus Status Section"
      className={`rounded-[28px] border border-border bg-card p-6 soft-shadow sm:p-8 ${className}`}
      data-testid="bus-status-section"
    >
      {/* Header with Title and Actions */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Live Fleet Monitor
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="display-font text-2xl font-extrabold text-foreground sm:text-3xl">
              Bus Status & Route Health
            </h2>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {counts.total} Active Routes
            </span>
          </div>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
            Real-time headway, current delay status, and passenger load across campus lines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isRefetching}
            aria-label="Refresh route status"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50"
          >
            <RotateCw size={13} className={isRefetching ? 'animate-spin' : ''} />
            <span>{isRefetching ? 'Updating…' : 'Refresh'}</span>
          </button>

          <Link
            href="/map"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground transition hover:opacity-90"
          >
            <span>Live Map View</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Interactive Segmented Filter Controls */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filterType === 'all'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Routes ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('on_time')}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filterType === 'on_time'
                ? 'bg-card text-emerald-600 shadow-sm dark:text-emerald-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            On Schedule ({counts.onTimeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('delayed')}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filterType === 'delayed'
                ? 'bg-card text-amber-600 shadow-sm dark:text-amber-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Delays ({counts.delayedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('crowded')}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filterType === 'crowded'
                ? 'bg-card text-rose-600 shadow-sm dark:text-rose-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Crowded ≥75% ({counts.crowdedCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search route or destination…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Content States */}
      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((key) => (
            <div key={key} className="skeleton h-56 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-6 rounded-2xl border border-destructive/25 bg-destructive/10 p-6 text-center">
          <AlertTriangle size={24} className="mx-auto text-destructive" />
          <div className="mt-2 text-sm font-extrabold text-foreground">
            Failed to connect to fleet tracking
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Live route signals could not be fetched right now.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredBuses.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
          <BusFront size={28} className="mx-auto text-muted-foreground" />
          <div className="mt-3 text-sm font-bold text-foreground">No matching bus routes found</div>
          <p className="mt-1 text-xs text-muted-foreground">
            No active lines match the filter &ldquo;{searchQuery || filterType}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterType('all');
              setSearchQuery('');
            }}
            className="mt-4 rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Cards Grid */
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredBuses.map((bus) => (
            <BusStatusCard
              key={bus.id}
              bus={bus}
              isSelected={bus.id === selectedBusId}
              onSelect={() => handleSelect(bus.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface BusStatusCardProps {
  bus: Bus;
  isSelected: boolean;
  onSelect: () => void;
}

function BusStatusCard({ bus, isSelected, onSelect }: BusStatusCardProps) {
  const delay = getDelayDetails(bus.status);
  const occupancy = getOccupancyLevel(bus.currentOccupancy, bus.capacity);

  return (
    <article
      data-testid={`bus-card-${bus.id}`}
      className={`group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        isSelected
          ? 'border-primary bg-primary/[0.03] ring-2 ring-primary/20'
          : 'border-border bg-card hover:border-foreground/20'
      }`}
    >
      {/* Top Banner: Bus Number & Delay Indicator */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-extrabold text-foreground ${
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground group-hover:bg-accent group-hover:text-accent-foreground'
              }`}
            >
              <BusFront size={20} />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-foreground">
                  Bus #{bus.busNumber}
                </span>
                {isSelected && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-primary">
                    <Sparkles size={11} /> Current
                  </span>
                )}
              </div>
              <div className="text-xs font-semibold text-muted-foreground truncate max-w-[150px]">
                {bus.routeLabel || 'Campus Line'}
              </div>
            </div>
          </div>

          {/* Delay Status Indicator */}
          <div className="text-right">
            <div
              className={`inline-flex items-center gap-1.5 text-xs font-extrabold ${
                delay.severity === 'major_delay'
                  ? 'text-rose-600 dark:text-rose-400'
                  : delay.severity === 'minor_delay'
                  ? 'text-amber-600 dark:text-amber-400'
                  : delay.severity === 'boarding'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {delay.isDelayed ? (
                <AlertTriangle size={13} className="shrink-0" />
              ) : delay.severity === 'boarding' ? (
                <Clock3 size={13} className="shrink-0" />
              ) : (
                <CheckCircle2 size={13} className="shrink-0" />
              )}
              <span>{delay.label}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              ETA: <span className="font-mono font-bold tabular-nums text-foreground">{bus.etaMinutes} min</span>
            </div>
          </div>
        </div>

        {/* Route Path (Origin to Destination) */}
        <div className="mt-4 rounded-xl bg-muted/40 p-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <span className="truncate">{bus.origin}</span>
            <span className="text-muted-foreground shrink-0">→</span>
            <span className="truncate">{bus.destination}</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin size={11} className="text-accent-foreground shrink-0" />
            <span className="truncate">
              Next Stop: <strong className="font-bold text-foreground">{bus.nextStop}</strong>
            </span>
          </div>
        </div>

        {/* Occupancy Level Section */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-muted-foreground">
              <Users size={13} />
              <span>Occupancy</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-extrabold tabular-nums text-foreground">
                {bus.currentOccupancy} / {bus.capacity}
              </span>
              <span className="text-[11px] font-bold text-muted-foreground">
                ({occupancy.percentage}%)
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted/80">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${occupancy.barColorClass}`}
              style={{ width: `${occupancy.percentage}%` }}
              role="progressbar"
              aria-valuenow={occupancy.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className={`font-semibold ${occupancy.colorClass}`}>
              {occupancy.label}
            </span>
            <span className="text-muted-foreground text-[10px]">
              {formatUpdatedAt(typeof bus.updatedAt === 'string' ? bus.updatedAt : undefined)}
            </span>
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="mt-5 flex items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={onSelect}
          className={`flex-1 rounded-xl py-2 px-3 text-xs font-extrabold transition ${
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'border border-border bg-card text-foreground hover:bg-muted'
          }`}
        >
          {isSelected ? 'Focused Route' : 'Focus Ride'}
        </button>

        <Link
          href="/queue"
          onClick={onSelect}
          className="rounded-xl border border-border bg-card p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title="Boarding queue for this bus"
          aria-label={`Queue for bus ${bus.busNumber}`}
        >
          <Users size={15} />
        </Link>

        <Link
          href="/map"
          onClick={onSelect}
          className="rounded-xl border border-border bg-card p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title="Track bus on live map"
          aria-label={`Track bus ${bus.busNumber}`}
        >
          <ChevronRight size={15} />
        </Link>
      </div>
    </article>
  );
}
