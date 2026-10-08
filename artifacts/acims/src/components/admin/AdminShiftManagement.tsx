import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CheckSquare,
  Clock,
  Edit2,
  RefreshCw,
  Save,
  Search,
  Square,
  Timer,
  X,
} from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';
import { naturalBusSort } from '@/lib/naturalSort';

export type BusItem = {
  id: string;
  busNumber: string;
  routeName: string;
  displayName: string;
  stops: Array<{
    id: string;
    name: string;
    time?: string;
    sequence: number;
  }>;
};

export type ShiftItem = {
  id: string;
  name: string;
  shiftType: string;
  startTime: string;
  endTime?: string;
  displayTime: string;
  direction: 'TO_COLLEGE' | 'FROM_COLLEGE' | string;
  directionLabel: string;
  active: boolean;
  assignedBusIds: string[];
  busStopsConfig?: Record<string, string[]>;
};

const CANONICAL_SHIFTS_ORDER = [
  'shift-morning-630',
  'shift-morning-830',
  'shift-evening-315',
  'shift-evening-515',
];

export function AdminShiftManagement({
  buses = [],
}: {
  buses?: BusItem[];
}) {
  const queryClient = useQueryClient();

  // Mode: All Shifts or Editing Buses for a Shift
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingShiftId, setSavingShiftId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ title: string; description: string } | null>(null);

  // Timing edit modal state
  const [editingTimingShift, setEditingTimingShift] = useState<ShiftItem | null>(null);
  const [timingStartTime, setTimingStartTime] = useState('');
  const [timingEndTime, setTimingEndTime] = useState('');
  const [timingDirection, setTimingDirection] = useState<'TO_COLLEGE' | 'FROM_COLLEGE'>('TO_COLLEGE');
  const [timingSaving, setTimingSaving] = useState(false);

  // Stop checklist drawer for bus per shift
  const [stopDrawerBus, setStopDrawerBus] = useState<BusItem | null>(null);
  const [stopDrawerShiftId, setStopDrawerShiftId] = useState<string | null>(null);
  const [stopDrawerActiveIds, setStopDrawerActiveIds] = useState<Set<string>>(new Set());
  const [stopDrawerSaving, setStopDrawerSaving] = useState(false);

  // Local selection cache for editing (shiftId -> Set of busIds)
  const [localAssignments, setLocalAssignments] = useState<Record<string, Set<string>>>({});

  // 1. Load shifts with assignments
  const shiftsQuery = useQuery({
    queryKey: ['admin', 'shift-assignments'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/shift-assignments');
      if (!res.ok) throw new Error('Unable to load this information.');
      return (await res.json()) as ShiftItem[];
    },
  });

  // 2. Load buses if not provided
  const busesQuery = useQuery({
    queryKey: ['admin', 'buses-and-routes'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/buses-and-routes');
      if (!res.ok) throw new Error('Unable to load this information.');
      return (await res.json()) as BusItem[];
    },
    enabled: buses.length === 0,
  });

  const isLoading = (shiftsQuery.isLoading && !shiftsQuery.data) || (busesQuery.isLoading && !busesQuery.data && buses.length === 0);
  const isError = shiftsQuery.isError && !shiftsQuery.data;

  const allShifts = shiftsQuery.data ?? [];
  const allBuses = (buses.length > 0 ? buses : busesQuery.data ?? []);

  // Update local assignments whenever fresh shift data arrives
  useEffect(() => {
    if (allShifts.length > 0) {
      setLocalAssignments((prev) => {
        const next = { ...prev };
        for (const s of allShifts) {
          next[s.id] = new Set(s.assignedBusIds || []);
        }
        return next;
      });
    }
  }, [allShifts]);

  // Clean, natural ascending order of campus buses
  const sortedBuses = useMemo(() => {
    return [...allBuses]
      .filter((b) => !b.busNumber.toUpperCase().includes('MTC'))
      .sort((a, b) => naturalBusSort(a.busNumber, b.busNumber));
  }, [allBuses]);

  // Four regular shifts in order:
  // SHIFT 1: 6:30 AM (HOME → COLLEGE)
  // SHIFT 2: 8:30 AM (HOME → COLLEGE)
  // SHIFT 3: 3:15 PM (COLLEGE → HOME)
  // SHIFT 4: 5:15 PM (COLLEGE → HOME)
  const regularShifts = useMemo(() => {
    const list = allShifts.filter((s) => s.shiftType !== 'EXAM_ONLY');
    return list.sort((a, b) => {
      const idxA = CANONICAL_SHIFTS_ORDER.indexOf(a.id);
      const idxB = CANONICAL_SHIFTS_ORDER.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
  }, [allShifts]);

  // Active shift in editing mode
  const activeShift = useMemo(() => {
    if (!editingShiftId) return null;
    return allShifts.find((s) => s.id === editingShiftId) ?? null;
  }, [allShifts, editingShiftId]);

  const currentAssignedSet = useMemo(() => {
    if (!activeShift) return new Set<string>();
    return localAssignments[activeShift.id] ?? new Set(activeShift.assignedBusIds || []);
  }, [activeShift, localAssignments]);

  const filteredBuses = useMemo(() => {
    if (!searchQuery.trim()) return sortedBuses;
    const q = searchQuery.toLowerCase();
    return sortedBuses.filter(
      (b) =>
        b.busNumber.toLowerCase().includes(q) ||
        b.routeName.toLowerCase().includes(q) ||
        b.displayName.toLowerCase().includes(q)
    );
  }, [sortedBuses, searchQuery]);

  // Bus selection actions
  const toggleBusSelection = (busId: string) => {
    if (!activeShift) return;
    const current = new Set(localAssignments[activeShift.id] ?? new Set(activeShift.assignedBusIds || []));
    if (current.has(busId)) {
      current.delete(busId);
    } else {
      current.add(busId);
    }
    setLocalAssignments((prev) => ({
      ...prev,
      [activeShift.id]: current,
    }));
  };

  const handleSelectAll = () => {
    if (!activeShift) return;
    setLocalAssignments((prev) => ({
      ...prev,
      [activeShift.id]: new Set(sortedBuses.map((b) => b.id)),
    }));
  };

  const handleDeselectAll = () => {
    if (!activeShift) return;
    setLocalAssignments((prev) => ({
      ...prev,
      [activeShift.id]: new Set(),
    }));
  };

  // Save Shift Assignments
  const handleSaveShiftAssignment = async (shiftId: string) => {
    setSavingShiftId(shiftId);
    setBanner(null);
    try {
      const busIds = Array.from(localAssignments[shiftId] ?? new Set());
      const res = await mobilityAdminFetch(`/admin/shift-assignments/${shiftId}`, {
        method: 'PUT',
        body: JSON.stringify({ busIds }),
      });

      if (res.ok) {
        const shiftObj = allShifts.find((s) => s.id === shiftId);
        const shiftTime = shiftObj?.displayTime || 'Selected';

        setBanner({
          title: 'Shift assignment saved',
          description: `${busIds.length} buses successfully assigned to ${shiftTime} shift.`,
        });

        await queryClient.invalidateQueries({ queryKey: ['admin', 'shift-assignments'] });
        await queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });

        // Close editing view to reveal updated shift card with saved buses visible
        setEditingShiftId(null);
      }
    } catch {
      setBanner({
        title: 'Error saving assignment',
        description: 'Failed to update shift assignments. Please try again.',
      });
    } finally {
      setSavingShiftId(null);
      setTimeout(() => setBanner(null), 5000);
    }
  };

  // Open Timing Edit Modal
  const handleOpenTimingEdit = (shift: ShiftItem) => {
    setEditingTimingShift(shift);
    setTimingStartTime(shift.startTime || '06:30');
    setTimingEndTime(shift.endTime || '08:00');
    setTimingDirection((shift.direction as any) || 'TO_COLLEGE');
  };

  const handleSaveTiming = async () => {
    if (!editingTimingShift) return;
    setTimingSaving(true);
    try {
      const res = await mobilityAdminFetch(`/admin/shifts/${editingTimingShift.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          startTime: timingStartTime,
          endTime: timingEndTime,
          direction: timingDirection,
        }),
      });

      if (res.ok) {
        setBanner({
          title: 'Shift timing updated',
          description: `Timing updated to ${timingStartTime} successfully.`,
        });
        setEditingTimingShift(null);
        await queryClient.invalidateQueries({ queryKey: ['admin', 'shift-assignments'] });
      }
    } catch {
      setBanner({
        title: 'Error updating timing',
        description: 'Failed to update shift timing in database.',
      });
    } finally {
      setTimingSaving(false);
      setTimeout(() => setBanner(null), 5000);
    }
  };

  // Stop checklist drawer per bus per shift
  const openStopChecklist = (bus: BusItem, shiftId: string) => {
    const shift = allShifts.find((s) => s.id === shiftId);
    const configuredStops = shift?.busStopsConfig?.[bus.id];

    let initialSet: Set<string>;
    if (configuredStops && configuredStops.length > 0) {
      initialSet = new Set(configuredStops);
    } else {
      initialSet = new Set(bus.stops.map((s) => s.id));
    }

    setStopDrawerBus(bus);
    setStopDrawerShiftId(shiftId);
    setStopDrawerActiveIds(initialSet);
  };

  const toggleStopInDrawer = (stopId: string) => {
    setStopDrawerActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(stopId)) next.delete(stopId);
      else next.add(stopId);
      return next;
    });
  };

  const handleDrawerSelectAllStops = () => {
    if (!stopDrawerBus) return;
    setStopDrawerActiveIds(new Set(stopDrawerBus.stops.map((s) => s.id)));
  };

  const handleDrawerDeselectAllStops = () => {
    setStopDrawerActiveIds(new Set());
  };

  const handleSaveStopChecklist = async () => {
    if (!stopDrawerBus || !stopDrawerShiftId) return;
    setStopDrawerSaving(true);
    try {
      const activeStopIds = Array.from(stopDrawerActiveIds);
      const res = await mobilityAdminFetch(
        `/admin/shift-assignments/${stopDrawerShiftId}/bus/${stopDrawerBus.id}/stops`,
        {
          method: 'PUT',
          body: JSON.stringify({ activeStopIds }),
        }
      );
      if (res.ok) {
        setBanner({
          title: 'Stop checklist saved',
          description: `Active stops saved for ${stopDrawerBus.displayName} on this shift.`,
        });
        setStopDrawerBus(null);
        await queryClient.invalidateQueries({ queryKey: ['admin', 'shift-assignments'] });
      }
    } catch {
      setBanner({
        title: 'Error saving stops',
        description: 'Failed to save stop checklist. Please try again.',
      });
    } finally {
      setStopDrawerSaving(false);
      setTimeout(() => setBanner(null), 5000);
    }
  };

  // ERROR STATE
  if (isError) {
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
            Could not retrieve shift configurations from the database.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => void shiftsQuery.refetch()}
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
          Loading shift management...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Transport Management
        </div>
        <h2 className="mt-1 text-2xl font-extrabold text-foreground">
          Shift Management
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Four regular college shifts. Assign buses, customize shift timings, and configure active stops per bus per shift.
        </p>
      </div>

      {banner && (
        <div className="rounded-2xl border-2 border-emerald-600 bg-emerald-500/15 p-4 text-emerald-950 dark:text-emerald-100 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 font-extrabold text-sm text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>✓ {banner.title}</span>
          </div>
          <p className="mt-1 text-xs font-bold leading-relaxed text-emerald-900 dark:text-emerald-200">
            {banner.description}
          </p>
        </div>
      )}

      {/* VIEW 1: FOUR REGULAR SHIFTS (Section 16) */}
      {!activeShift ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="mono text-xs font-extrabold uppercase tracking-wide text-foreground">
              4 Regular College Shifts
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {regularShifts.map((shift, idx) => {
              const assignedIds = localAssignments[shift.id] ?? new Set(shift.assignedBusIds || []);
              const assignedBusesList = sortedBuses.filter((b) => assignedIds.has(b.id));

              return (
                <div
                  key={shift.id}
                  data-testid={`card-shift-${shift.id}`}
                  className="rounded-[26px] border border-border bg-card p-5 sm:p-6 flex flex-col justify-between shadow-xs transition hover:border-primary/40"
                >
                  <div>
                    {/* Shift Number & Direction Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        SHIFT {idx + 1}
                      </span>
                      <span className="font-mono text-[10px] font-extrabold uppercase text-muted-foreground">
                        {shift.direction === 'TO_COLLEGE' ? 'HOME → COLLEGE' : 'COLLEGE → HOME'}
                      </span>
                    </div>

                    {/* Shift Time */}
                    <div className="display-font mt-3 text-3xl font-extrabold text-foreground">
                      {shift.displayTime}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                      <span className="font-bold">
                        {shift.direction === 'TO_COLLEGE' ? 'Home → College' : 'College → Home'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenTimingEdit(shift)}
                        className="text-[10px] font-extrabold text-primary hover:underline flex items-center gap-0.5"
                      >
                        <Edit2 size={10} /> Edit Timing
                      </button>
                    </div>

                    {/* Assigned Buses Section (ALWAYS VISIBLE - Section 17) */}
                    <div className="mt-4 pt-3 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-foreground">
                          ASSIGNED BUSES: <span className="text-primary font-black">{assignedBusesList.length}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingShiftId(shift.id);
                            setSearchQuery('');
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-primary hover:underline"
                        >
                          <Edit2 size={11} /> Edit Buses
                        </button>
                      </div>

                      {/* Bus List inside shift card */}
                      <div className="mt-3 max-h-56 overflow-y-auto space-y-1.5 pr-1">
                        {assignedBusesList.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                            No buses assigned yet.
                          </div>
                        ) : (
                          assignedBusesList.map((bus) => (
                            <div
                              key={bus.id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-background/60 px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <CheckSquare size={14} className="text-primary shrink-0" />
                                <span className="font-extrabold text-foreground truncate">
                                  BUS {bus.busNumber}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate">
                                  · {bus.routeName}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => openStopChecklist(bus, shift.id)}
                                className="rounded-lg border border-border bg-card px-2 py-0.5 text-[10px] font-bold text-foreground hover:bg-muted shrink-0"
                                title="Edit stops for this bus on this shift"
                              >
                                Edit stops
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <div className="mt-5 pt-3 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingShiftId(shift.id);
                        setSearchQuery('');
                      }}
                      data-testid={`button-edit-shift-${shift.id}`}
                      className="w-full rounded-xl bg-primary py-2.5 text-center text-xs font-extrabold text-primary-foreground hover:opacity-95 transition"
                    >
                      <Edit2 size={12} className="inline mr-1" /> Edit Buses
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VIEW 2: BUS SELECTION SCREEN (Section 17) */
        <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8 space-y-6 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditingShiftId(null)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <ArrowLeft size={14} /> Back to Shifts
              </button>
              <div>
                <div className="display-font text-2xl font-extrabold text-foreground">
                  {activeShift.displayTime}
                </div>
                <div className="text-xs text-muted-foreground font-bold">
                  {activeShift.direction === 'TO_COLLEGE' ? 'HOME → COLLEGE' : 'COLLEGE → HOME'} · SELECT BUSES
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                data-testid="button-select-all-buses"
                className="rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                data-testid="button-deselect-all-buses"
                className="rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted"
              >
                Deselect all
              </button>
              <button
                type="button"
                disabled={savingShiftId === activeShift.id}
                onClick={() => handleSaveShiftAssignment(activeShift.id)}
                data-testid="button-save-assignment"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-extrabold text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50"
              >
                <Save size={14} />
                {savingShiftId === activeShift.id ? 'Saving…' : 'Save Assignment'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-extrabold text-xs text-muted-foreground">
              Assigned buses: <span className="text-primary text-sm font-black">{currentAssignedSet.size}</span>
              <span className="ml-2 font-normal text-[11px]">(Checked = assigned to this shift, Unchecked = not assigned)</span>
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search bus number or route..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-input h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Bus Checkbox List in Natural Ascending Order */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBuses.map((bus) => {
              const isChecked = currentAssignedSet.has(bus.id);
              const customStops = activeShift.busStopsConfig?.[bus.id];
              const activeStopsCount = customStops ? customStops.length : bus.stops.length;

              return (
                <div
                  key={bus.id}
                  onClick={() => toggleBusSelection(bus.id)}
                  className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 transition cursor-pointer select-none ${
                    isChecked
                      ? 'border-primary/60 bg-primary/5 shadow-xs'
                      : 'border-border bg-background hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="h-4 w-4 rounded text-primary focus:ring-primary shrink-0 pointer-events-none"
                    />
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-foreground truncate">
                        BUS {bus.busNumber} · {bus.routeName}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {bus.stops.length} route stops
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openStopChecklist(bus, activeShift.id);
                    }}
                    className="rounded-lg border border-border bg-card px-2.5 py-1 text-[10px] font-bold text-foreground hover:bg-muted shrink-0"
                    title="Select which stops are active for this shift"
                  >
                    Edit stops ({activeStopsCount})
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SHIFT TIMING EDIT MODAL */}
      {editingTimingShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="display-font text-xl font-extrabold text-foreground">
                  Edit Shift Timing
                </h3>
                <span className="text-xs text-muted-foreground">{editingTimingShift.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingTimingShift(null)}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Start Time (24h or display)</label>
                <input
                  type="text"
                  placeholder="e.g. 06:30 or 6:30 AM"
                  value={timingStartTime}
                  onChange={(e) => setTimingStartTime(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground">End Time</label>
                <input
                  type="text"
                  placeholder="e.g. 08:00 or 8:00 AM"
                  value={timingEndTime}
                  onChange={(e) => setTimingEndTime(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Direction</label>
                <select
                  value={timingDirection}
                  onChange={(e) => setTimingDirection(e.target.value as any)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                >
                  <option value="TO_COLLEGE">Home → College</option>
                  <option value="FROM_COLLEGE">College → Home</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingTimingShift(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={timingSaving || !timingStartTime.trim()}
                onClick={handleSaveTiming}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground hover:opacity-95 disabled:opacity-50"
              >
                {timingSaving ? 'Saving…' : 'Save Timing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHIFT + STOP CHECKLIST MODAL (Section 18) */}
      {stopDrawerBus && stopDrawerShiftId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="mono text-[10px] uppercase font-bold text-muted-foreground">
                  Shift Stop Checklist
                </span>
                <h3 className="display-font text-xl font-extrabold text-foreground">
                  BUS {stopDrawerBus.busNumber} · {stopDrawerBus.routeName}
                </h3>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Shift: {allShifts.find((s) => s.id === stopDrawerShiftId)?.displayTime} · CONFIGURABLE PER SHIFT
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStopDrawerBus(null)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-4 flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-foreground">
                Active Stops: {stopDrawerActiveIds.size} of {stopDrawerBus.stops.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDrawerSelectAllStops}
                  className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold hover:bg-muted"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={handleDrawerDeselectAllStops}
                  className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold hover:bg-muted"
                >
                  Deselect all
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/40">
              {stopDrawerBus.stops.map((stop, idx) => {
                const isActive = stopDrawerActiveIds.has(stop.id);
                return (
                  <div
                    key={stop.id}
                    className="flex items-center justify-between py-2.5 px-2 rounded-xl cursor-pointer select-none hover:bg-muted/20 text-xs"
                    onClick={() => toggleStopInDrawer(stop.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => {}}
                        className="h-4 w-4 rounded text-primary focus:ring-primary pointer-events-none"
                      />
                      <div>
                        <div className="font-extrabold text-foreground">
                          {stop.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Stop #{idx + 1}
                        </div>
                      </div>
                    </div>

                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {stop.time || 'Scheduled'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setStopDrawerBus(null)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={stopDrawerSaving}
                onClick={handleSaveStopChecklist}
                data-testid="button-save-stops-checklist"
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground hover:opacity-95"
              >
                {stopDrawerSaving ? 'Saving…' : 'Save Stops'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
