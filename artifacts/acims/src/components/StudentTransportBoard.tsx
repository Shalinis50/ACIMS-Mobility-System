import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bus,
  Clock,
  Phone,
  User,
  MapPin,
  Calendar,
  AlertCircle,
  Search,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sunrise,
  Sun,
  Sunset,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useTransportSync } from '@/hooks/use-transport-sync';

export type AssignedBusDetail = {
  busId: string;
  busNumber: string;
  busName: string;
  routeId: string;
  routeName: string;
  startingPoint: string;
  destination: string;
  driverName: string | null;
  driverPhone: string | null;
  departureTime: string;
  departureTimeDisplay: string;
  arrivalTime: string;
  arrivalTimeDisplay: string;
  active: boolean;
  status: 'Available' | 'Unavailable';
  availabilityStatus: 'Available' | 'Unavailable';
};

export type ShiftItem = {
  id: string;
  name: string;
  shiftType: string;
  category?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'EXAM';
  startTime: string;
  endTime: string;
  startTimeDisplay: string;
  endTimeDisplay: string;
  direction: string;
  directionLabel: string;
  operatingDays: string;
  active: boolean;
  status?: string;
  instructions?: string;
  assignedBuses: AssignedBusDetail[];
  assignedBusIds: string[];
};

export type FleetBus = {
  id: string;
  busNumber: string;
  routeId: string;
  routeName: string;
  origin: string;
  destination: string;
  stopCount: number;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  morningDeparture: string | null;
  eveningDeparture: string | null;
  active: boolean;
  status: 'Available' | 'Unavailable';
};

export type TransportScheduleResponse = {
  shifts: ShiftItem[];
  fleet: FleetBus[];
  publishedAt: string;
  syncStatus: string;
};

type ShiftCategory = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'EXAM';

const SHIFT_CARD_META: Record<
  ShiftCategory,
  {
    title: string;
    subtitle: string;
    icon: typeof Sunrise;
    iconColor: string;
    bgHover: string;
    borderActive: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  MORNING: {
    title: 'Morning Shift',
    subtitle: 'Campus Arrival Services',
    icon: Sunrise,
    iconColor: 'text-sky-500',
    bgHover: 'hover:border-sky-500/50 hover:bg-sky-500/[0.02]',
    borderActive: 'border-sky-500 ring-2 ring-sky-500/20',
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-600 dark:text-sky-400',
  },
  AFTERNOON: {
    title: 'Afternoon Shift',
    subtitle: 'Post-Class College Departures',
    icon: Sun,
    iconColor: 'text-amber-500',
    bgHover: 'hover:border-amber-500/50 hover:bg-amber-500/[0.02]',
    borderActive: 'border-amber-500 ring-2 ring-amber-500/20',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-600 dark:text-amber-400',
  },
  EVENING: {
    title: 'Evening Shift',
    subtitle: 'Late Lab & Library Services',
    icon: Sunset,
    iconColor: 'text-indigo-500',
    bgHover: 'hover:border-indigo-500/50 hover:bg-indigo-500/[0.02]',
    borderActive: 'border-indigo-500 ring-2 ring-indigo-500/20',
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-600 dark:text-indigo-400',
  },
  EXAM: {
    title: 'Exam Shift',
    subtitle: 'Special Exam Schedule Transport',
    icon: GraduationCap,
    iconColor: 'text-purple-500',
    bgHover: 'hover:border-purple-500/50 hover:bg-purple-500/[0.02]',
    borderActive: 'border-purple-500 ring-2 ring-purple-500/20',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-600 dark:text-purple-400',
  },
};

export function StudentTransportBoard() {
  const [selectedCategory, setSelectedCategory] = useState<ShiftCategory | null>(null);
  const [viewMode, setViewMode] = useState<'shifts' | 'fleet'>('shifts');
  const [fleetSearchQuery, setFleetSearchQuery] = useState('');
  const [shiftBusSearchQuery, setShiftBusSearchQuery] = useState('');
  const [lastSyncNotice, setLastSyncNotice] = useState<string | null>(null);

  // Real-time synchronization subscription
  useTransportSync((event) => {
    const actionLabel = event?.action?.replace(/_/g, ' ') || 'Transport Update';
    setLastSyncNotice(`Admin published ${actionLabel.toLowerCase()} just now`);
    const timer = setTimeout(() => setLastSyncNotice(null), 6000);
    return () => clearTimeout(timer);
  });

  const { data, isLoading, isError, refetch } = useQuery<TransportScheduleResponse>({
    queryKey: ['student', 'transport-schedule'],
    queryFn: async () => {
      const res = await fetch('/api/student/transport-schedule');
      if (!res.ok) throw new Error('Failed to load published transport schedule');
      return res.json();
    },
    refetchInterval: 15000,
  });

  // Categorize shifts into the 4 canonical groups
  const categorizedShifts = useMemo(() => {
    const shiftsList = data?.shifts || [];

    const getCategory = (s: ShiftItem): ShiftCategory => {
      if (s.category) return s.category;
      if (s.shiftType === 'EXAM_ONLY' || s.id.includes('exam') || s.name.toLowerCase().includes('exam')) {
        return 'EXAM';
      }
      const match = s.startTime?.match(/^(\d{1,2}):(\d{2})/);
      const mins = match ? parseInt(match[1], 10) * 60 + parseInt(match[2], 10) : null;
      if (mins != null && mins >= 720 && mins < 960) return 'AFTERNOON';
      if (mins != null && mins >= 960) return 'EVENING';
      return 'MORNING';
    };

    const grouped: Record<ShiftCategory, ShiftItem[]> = {
      MORNING: [],
      AFTERNOON: [],
      EVENING: [],
      EXAM: [],
    };

    shiftsList.forEach((s) => {
      const cat = getCategory(s);
      grouped[cat].push(s);
    });

    return grouped;
  }, [data?.shifts]);

  // Aggregate stats for each of the 4 shift cards
  const shiftCardsData = useMemo(() => {
    const categories: ShiftCategory[] = ['MORNING', 'AFTERNOON', 'EVENING', 'EXAM'];

    return categories.map((cat) => {
      const shiftsInCat = categorizedShifts[cat];
      const primaryShift = shiftsInCat[0];

      // Collect all buses assigned by admin strictly to shifts in this category
      const assignedBusesMap = new Map<string, AssignedBusDetail>();
      shiftsInCat.forEach((s) => {
        (s.assignedBuses || []).forEach((b) => {
          if (!assignedBusesMap.has(b.busId)) {
            assignedBusesMap.set(b.busId, b);
          }
        });
      });

      const assignedBuses = Array.from(assignedBusesMap.values());
      const isActive = shiftsInCat.some((s) => s.active);

      // Timings display
      let timingDisplay = 'Scheduled';
      if (primaryShift) {
        timingDisplay = `${primaryShift.startTimeDisplay} – ${primaryShift.endTimeDisplay}`;
      } else if (cat === 'MORNING') {
        timingDisplay = '06:30 AM – 08:00 AM';
      } else if (cat === 'AFTERNOON') {
        timingDisplay = '03:15 PM – 05:00 PM';
      } else if (cat === 'EVENING') {
        timingDisplay = '05:15 PM – 07:00 PM';
      } else if (cat === 'EXAM') {
        timingDisplay = '11:45 AM – 01:30 PM';
      }

      const operatingDays =
        primaryShift?.operatingDays ||
        (cat === 'EXAM' ? 'Exam Schedule Only' : 'Mon–Fri');

      return {
        category: cat,
        meta: SHIFT_CARD_META[cat],
        shiftName: primaryShift?.name || SHIFT_CARD_META[cat].title,
        timingDisplay,
        operatingDays,
        assignedBuses,
        assignedCount: assignedBuses.length,
        isActive,
        statusLabel: isActive ? 'Active' : 'Standby',
        directionLabel: primaryShift?.directionLabel || (cat === 'MORNING' ? 'Home → College' : 'College → Home'),
        instructions:
          cat === 'EXAM'
            ? 'Official Exam Transit: Students must report to boarding points 15 minutes before departure. Student ID card and Exam Hall Ticket are required at boarding.'
            : 'Live synchronized with the College Transport Office.',
      };
    });
  }, [categorizedShifts]);

  // Currently selected shift data for the detailed view
  const currentSelectedShift = useMemo(() => {
    if (!selectedCategory) return null;
    return shiftCardsData.find((sc) => sc.category === selectedCategory) || null;
  }, [selectedCategory, shiftCardsData]);

  // Filtered buses within the active detailed view
  const filteredShiftBuses = useMemo(() => {
    if (!currentSelectedShift) return [];
    const query = shiftBusSearchQuery.trim().toLowerCase();
    if (!query) return currentSelectedShift.assignedBuses;
    return currentSelectedShift.assignedBuses.filter(
      (b) =>
        b.busNumber.toLowerCase().includes(query) ||
        b.routeName.toLowerCase().includes(query) ||
        b.startingPoint.toLowerCase().includes(query) ||
        b.destination.toLowerCase().includes(query) ||
        (b.driverName && b.driverName.toLowerCase().includes(query))
    );
  }, [currentSelectedShift, shiftBusSearchQuery]);

  // Filtered fleet for directory tab
  const filteredFleet = useMemo(() => {
    if (!data?.fleet) return [];
    const query = fleetSearchQuery.trim().toLowerCase();
    if (!query) return data.fleet;
    return data.fleet.filter(
      (bus) =>
        bus.busNumber.toLowerCase().includes(query) ||
        bus.routeName.toLowerCase().includes(query) ||
        bus.origin.toLowerCase().includes(query) ||
        bus.destination.toLowerCase().includes(query) ||
        (bus.driverName && bus.driverName.toLowerCase().includes(query))
    );
  }, [data?.fleet, fleetSearchQuery]);

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8 space-y-6">
      {/* Realtime Synchronization Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="mono text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Live Synchronized with Admin Transport Office
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Shift-Wise Bus Details & Fleet
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Official shift timings, bus allocations, and driver assignments published directly from the Transport Office.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex rounded-xl bg-muted/60 p-1 self-start sm:self-center">
          <button
            type="button"
            onClick={() => {
              setViewMode('shifts');
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              viewMode === 'shifts'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock size={14} />
            Shift Schedules
          </button>
          <button
            type="button"
            onClick={() => setViewMode('fleet')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              viewMode === 'fleet'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bus size={14} />
            Campus Fleet ({data?.fleet?.filter((b) => b.active).length ?? '—'})
          </button>
        </div>
      </div>

      {/* Real-time Notice Banner when admin makes a change */}
      {lastSyncNotice && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2">
          <Sparkles size={16} className="text-emerald-500 shrink-0" />
          <span>{lastSyncNotice}. The shift view updated automatically.</span>
        </div>
      )}

      {/* Loading & Error States */}
      {isLoading && (
        <div className="space-y-4 py-8">
          <div className="skeleton h-12 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="skeleton h-44 rounded-2xl" />
            <div className="skeleton h-44 rounded-2xl" />
            <div className="skeleton h-44 rounded-2xl" />
            <div className="skeleton h-44 rounded-2xl" />
          </div>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm font-bold text-destructive">Failed to synchronize transport schedules.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* VIEW MODE 1: SHIFTS VIEW */}
      {!isLoading && !isError && viewMode === 'shifts' && (
        <div className="space-y-6">
          {/* STATE A: ALL 4 SHIFT CARDS (No shift clicked yet) */}
          {!selectedCategory ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Select a Shift to View Assigned Buses</h3>
                  <p className="text-xs text-muted-foreground">Click any shift card below to see all buses, routes, departure times, and drivers.</p>
                </div>
                <span className="mono text-[11px] text-muted-foreground uppercase tracking-wider">
                  4 Shift Categories
                </span>
              </div>

              {/* Four Clean Shift Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {shiftCardsData.map((sc) => {
                  const Icon = sc.meta.icon;
                  return (
                    <button
                      key={sc.category}
                      type="button"
                      data-testid={`shift-card-${sc.category.toLowerCase()}`}
                      onClick={() => {
                        setSelectedCategory(sc.category);
                        setShiftBusSearchQuery('');
                      }}
                      className={`group flex flex-col justify-between rounded-2xl border border-border/90 bg-card p-5 text-left transition shadow-sm ${sc.meta.bgHover} hover:-translate-y-0.5 hover:shadow-md cursor-pointer`}
                    >
                      <div className="space-y-3 w-full">
                        {/* Top row: Icon & Status */}
                        <div className="flex items-center justify-between">
                          <span className={`grid h-10 w-10 place-items-center rounded-xl ${sc.meta.badgeBg}`}>
                            <Icon size={20} className={sc.meta.iconColor} />
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                              sc.isActive
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {sc.statusLabel}
                          </span>
                        </div>

                        {/* Title and Direction */}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-base font-black text-foreground group-hover:text-primary transition">
                              {sc.meta.title}
                            </h4>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{sc.meta.subtitle}</p>
                        </div>

                        {/* Shift Timing Details */}
                        <div className="space-y-1.5 rounded-xl bg-muted/40 p-2.5 text-xs">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock size={12} className="text-primary" />
                              Timing:
                            </span>
                            <strong className="text-foreground">{sc.timingDisplay}</strong>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                            <span className="flex items-center gap-1">
                              <Calendar size={11} />
                              Days:
                            </span>
                            <span className="text-foreground">{sc.operatingDays}</span>
                          </div>
                        </div>

                        {/* Buses Assigned Count */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                            <Bus size={13} className="text-primary" />
                            <span>Assigned Fleet:</span>
                          </span>
                          <strong
                            className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                              sc.assignedCount > 0
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {sc.assignedCount} {sc.assignedCount === 1 ? 'Bus' : 'Buses'}
                          </strong>
                        </div>
                      </div>

                      {/* Card Footer Action */}
                      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs font-bold text-primary group-hover:underline">
                        <span>View Shift Buses</span>
                        <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* STATE B: SHIFT-WISE DETAILED BUSES VIEW (When a shift card is clicked) */
            <div className="space-y-6 animate-in fade-in">
              {/* Back button and Header */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-muted/30 p-4 rounded-2xl border border-border/80">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    data-testid="button-back-to-shifts"
                    onClick={() => {
                      setSelectedCategory(null);
                      setShiftBusSearchQuery('');
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-sm hover:bg-muted transition cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to All Shifts</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className={`grid h-8 w-8 place-items-center rounded-lg ${currentSelectedShift?.meta.badgeBg}`}>
                      {currentSelectedShift?.meta.icon && (
                        <currentSelectedShift.meta.icon size={16} className={currentSelectedShift.meta.iconColor} />
                      )}
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-foreground">
                        {currentSelectedShift?.meta.title} · Assigned Buses
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {currentSelectedShift?.timingDisplay} · {currentSelectedShift?.operatingDays} · {currentSelectedShift?.directionLabel}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Direct Switcher for the 4 Shifts */}
                <div className="flex items-center gap-1.5 self-start sm:self-center overflow-x-auto">
                  {(['MORNING', 'AFTERNOON', 'EVENING', 'EXAM'] as ShiftCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setShiftBusSearchQuery('');
                      }}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special Exam Transport Banner for Exam Shift */}
              {selectedCategory === 'EXAM' && (
                <div className="flex items-start gap-3 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4 text-purple-900 dark:text-purple-200">
                  <ShieldCheck size={18} className="text-purple-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Exam Transport Policy & Instructions
                    </div>
                    <p className="text-xs leading-relaxed">
                      {currentSelectedShift?.instructions ||
                        'Official Exam Transit Service: Please report to your assigned boarding point 15 minutes before departure. Student ID card and Exam Hall Ticket are required at boarding.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Search filter within this shift */}
              {currentSelectedShift && currentSelectedShift.assignedBuses.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                  <input
                    type="text"
                    value={shiftBusSearchQuery}
                    onChange={(e) => setShiftBusSearchQuery(e.target.value)}
                    placeholder={`Search within ${currentSelectedShift.meta.title} by bus number, route or driver...`}
                    className="w-full rounded-2xl border border-border bg-background py-2 pl-9 pr-4 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              )}

              {/* Assigned Buses List */}
              {currentSelectedShift && currentSelectedShift.assignedBuses.length === 0 ? (
                /* Friendly message if no buses assigned to this shift */
                <div className="rounded-2xl border border-dashed border-border/90 bg-muted/20 p-10 text-center space-y-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted mx-auto text-muted-foreground">
                    <Bus size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-foreground">No buses assigned to this shift yet</h4>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      The College Transport Office has not yet published bus assignments for{' '}
                      <strong>{currentSelectedShift.meta.title}</strong>. When assignments are published in the Admin
                      Portal, they will automatically appear here in real time.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredShiftBuses.map((bus) => (
                    <div
                      key={bus.busId}
                      className={`flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition ${
                        bus.active
                          ? 'border-border/90 bg-card hover:border-primary/50'
                          : 'border-border/40 bg-muted/20 opacity-60'
                      }`}
                    >
                      <div className="space-y-3.5">
                        {/* Bus Header: Number & Status */}
                        <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-black text-primary">
                                BUS {bus.busNumber}
                              </span>
                              <span className="text-xs font-extrabold text-foreground truncate max-w-[220px]">
                                {bus.busName}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin size={11} className="text-primary shrink-0" />
                              <span className="font-semibold">{bus.routeName}</span>
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                              bus.active
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {bus.status}
                          </span>
                        </div>

                        {/* Starting Point & Destination */}
                        <div className="rounded-xl bg-muted/40 p-3 space-y-1.5 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-muted-foreground shrink-0">Starting Point:</span>
                            <strong className="text-foreground text-right">{bus.startingPoint}</strong>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-muted-foreground shrink-0">Destination:</span>
                            <strong className="text-foreground text-right">{bus.destination}</strong>
                          </div>
                        </div>

                        {/* Departure & Arrival Timings */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-primary/5 border border-primary/10 p-2.5 space-y-0.5">
                            <div className="mono text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                              <Clock size={10} className="text-primary" />
                              Departure
                            </div>
                            <div className="text-sm font-black text-foreground">
                              {bus.departureTimeDisplay}
                            </div>
                          </div>

                          <div className="rounded-xl bg-muted/40 border border-border/60 p-2.5 space-y-0.5">
                            <div className="mono text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                              <Clock size={10} />
                              Est. Arrival
                            </div>
                            <div className="text-sm font-black text-foreground">
                              {bus.arrivalTimeDisplay}
                            </div>
                          </div>
                        </div>

                        {/* Assigned Driver (Approved Contact Only) */}
                        <div className="border-t border-border/50 pt-3">
                          <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                            Assigned Driver
                          </div>
                          {bus.driverName ? (
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-foreground truncate">
                                <User size={13} className="text-primary shrink-0" />
                                <span className="truncate">{bus.driverName}</span>
                              </div>
                              {bus.driverPhone ? (
                                <a
                                  href={`tel:${bus.driverPhone}`}
                                  className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                                >
                                  <Phone size={11} />
                                  <span>{bus.driverPhone}</span>
                                </a>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">Phone on file</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Driver assignment in progress
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredShiftBuses.length === 0 && currentSelectedShift && currentSelectedShift.assignedBuses.length > 0 && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No buses match your filter within this shift.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: CAMPUS FLEET DIRECTORY */}
      {!isLoading && !isError && viewMode === 'fleet' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              value={fleetSearchQuery}
              onChange={(e) => setFleetSearchQuery(e.target.value)}
              placeholder="Search by bus number, route name, origin or driver..."
              className="w-full rounded-2xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFleet.map((bus) => (
              <div
                key={bus.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                  bus.active
                    ? 'border-border/80 bg-card hover:border-primary/50'
                    : 'border-border/40 bg-muted/20 opacity-70'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-black text-primary">
                      BUS {bus.busNumber}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                        bus.active
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {bus.active ? 'Available' : 'Unavailable'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-foreground truncate">{bus.routeName}</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin size={11} className="shrink-0 text-primary" />
                      <span className="truncate">{bus.origin} → {bus.destination}</span>
                    </p>
                  </div>

                  {/* Scheduled Departures */}
                  <div className="rounded-xl bg-muted/50 p-2.5 space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Morning Shift:</span>
                      <strong className="text-foreground">{bus.morningDeparture || '06:30 AM'}</strong>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Evening Shift:</span>
                      <strong className="text-foreground">{bus.eveningDeparture || '03:15 PM'}</strong>
                    </div>
                  </div>

                  {/* Approved Driver Contact Details */}
                  <div className="border-t border-border/50 pt-2.5">
                    <div className="mono text-[10px] uppercase text-muted-foreground tracking-wider mb-1">
                      Assigned Driver
                    </div>
                    {bus.driverName ? (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-foreground truncate">
                          <User size={13} className="text-primary shrink-0" />
                          <span className="truncate">{bus.driverName}</span>
                        </div>
                        {bus.driverPhone ? (
                          <a
                            href={`tel:${bus.driverPhone}`}
                            className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                          >
                            <Phone size={11} />
                            <span>{bus.driverPhone}</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">No phone</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No driver assigned</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredFleet.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No buses found matching your search.
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Real-time DB synchronization · Verified Admin published transport records</span>
        </div>
        <div className="mono text-[11px]">
          Published at: {data?.publishedAt ? new Date(data.publishedAt).toLocaleTimeString() : 'Live'}
        </div>
      </div>
    </div>
  );
}
