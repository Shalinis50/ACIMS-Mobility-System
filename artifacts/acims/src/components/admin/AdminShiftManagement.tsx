import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Bus,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  Edit2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';
import { naturalBusSort } from '@/lib/naturalSort';

export type BusItem = {
  id: string;
  busNumber: string;
  routeId?: string;
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
  operatingDays?: string;
  active: boolean;
  assignedBusIds: string[];
  busDepartureTimes?: Record<string, string>;
  busStopsConfig?: Record<string, string[]>;
};

export type RouteItem = {
  id: string;
  name: string;
  destination?: string;
  active?: boolean;
};

function formatDisplayTime(hhmm?: string | null): string {
  if (!hhmm) return '—';
  const trimmed = hhmm.trim();
  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampm) return trimmed.toUpperCase();
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match24) return trimmed;
  const h = Number(match24[1]);
  const m = Number(match24[2]);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function AdminShiftManagement({
  buses = [],
}: {
  buses?: BusItem[];
}) {
  const queryClient = useQueryClient();

  // Mode: All Shifts or Editing Buses for a Shift
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'ACTIVE' | 'MORNING' | 'EVENING' | 'EXAM'>('ALL');
  const [savingShiftId, setSavingShiftId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ title: string; description: string; type?: 'success' | 'error' } | null>(null);

  // --- Modal 1: Edit Shift Details Form ---
  const [editingShiftData, setEditingShiftData] = useState<ShiftItem | null>(null);
  const [editShiftName, setEditShiftName] = useState('');
  const [editShiftType, setEditShiftType] = useState('REGULAR');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editDirection, setEditDirection] = useState<'TO_COLLEGE' | 'FROM_COLLEGE'>('TO_COLLEGE');
  const [editOperatingDays, setEditOperatingDays] = useState('MON,TUE,WED,THU,FRI');
  const [editActive, setEditActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // --- Modal 2: Add New Shift Form ---
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [addShiftName, setAddShiftName] = useState('');
  const [addShiftType, setAddShiftType] = useState('REGULAR');
  const [addStartTime, setAddStartTime] = useState('');
  const [addEndTime, setAddEndTime] = useState('');
  const [addDirection, setAddDirection] = useState<'TO_COLLEGE' | 'FROM_COLLEGE'>('TO_COLLEGE');
  const [addOperatingDays, setAddOperatingDays] = useState('MON,TUE,WED,THU,FRI');
  const [addActive, setAddActive] = useState(true);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // --- Modal 3: Add New Bus Form ---
  const [isAddBusOpen, setIsAddBusOpen] = useState(false);
  const [addBusNumber, setAddBusNumber] = useState('');
  const [addBusRouteId, setAddBusRouteId] = useState('');
  const [addBusCapacity, setAddBusCapacity] = useState(45);
  const [addBusShiftIds, setAddBusShiftIds] = useState<Set<string>>(new Set());
  const [addBusSaving, setAddBusSaving] = useState(false);
  const [addBusError, setAddBusError] = useState<string | null>(null);

  // --- Modal 4: Individual Bus Departure Timing Edit ---
  const [timingBusItem, setTimingBusItem] = useState<{ bus: BusItem; shift: ShiftItem } | null>(null);
  const [busTimingValue, setBusTimingValue] = useState('');
  const [busTimingSaving, setBusTimingSaving] = useState(false);
  const [busTimingError, setBusTimingError] = useState<string | null>(null);

  // --- Stop checklist drawer for bus per shift ---
  const [stopDrawerBus, setStopDrawerBus] = useState<BusItem | null>(null);
  const [stopDrawerShiftId, setStopDrawerShiftId] = useState<string | null>(null);
  const [stopDrawerActiveIds, setStopDrawerActiveIds] = useState<Set<string>>(new Set());
  const [stopDrawerSaving, setStopDrawerSaving] = useState(false);

  // Local selection cache for bulk assigning buses (shiftId -> Set of busIds)
  const [localAssignments, setLocalAssignments] = useState<Record<string, Set<string>>>({});

  // 1. Load shifts with assignments
  const shiftsQuery = useQuery({
    queryKey: ['admin', 'shift-assignments'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/shift-assignments');
      if (!res.ok) throw new Error('Unable to load shift information.');
      return (await res.json()) as ShiftItem[];
    },
  });

  // 2. Load buses if not provided
  const busesQuery = useQuery({
    queryKey: ['admin', 'buses-and-routes'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/buses-and-routes');
      if (!res.ok) throw new Error('Unable to load bus fleet.');
      return (await res.json()) as BusItem[];
    },
    enabled: buses.length === 0,
  });

  // 3. Load routes for bus creation dropdown
  const routesQuery = useQuery({
    queryKey: ['admin', 'routes'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/routes');
      if (!res.ok) return [];
      return (await res.json()) as RouteItem[];
    },
  });

  const isLoading =
    (shiftsQuery.isLoading && !shiftsQuery.data) ||
    (busesQuery.isLoading && !busesQuery.data && buses.length === 0);
  const isError = shiftsQuery.isError && !shiftsQuery.data;

  const allShifts = useMemo(() => shiftsQuery.data ?? [], [shiftsQuery.data]);
  const allBuses = useMemo(() => (buses.length > 0 ? buses : busesQuery.data ?? []), [buses, busesQuery.data]);
  const allRoutes = useMemo(() => routesQuery.data ?? [], [routesQuery.data]);

  // Fallback route list derived from buses if routes API returned empty
  const availableRoutes = useMemo(() => {
    if (allRoutes.length > 0) return allRoutes;
    const seen = new Set<string>();
    const list: RouteItem[] = [];
    for (const b of allBuses) {
      const rid = b.routeId || `route-${b.busNumber.toLowerCase()}`;
      if (!seen.has(rid)) {
        seen.add(rid);
        list.push({ id: rid, name: `${b.routeName} (BUS ${b.busNumber})` });
      }
    }
    return list;
  }, [allRoutes, allBuses]);

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

  // Dynamically sorted shifts list
  const displayShifts = useMemo(() => {
    let list = [...allShifts];

    // Filter tabs
    if (shiftFilter === 'ACTIVE') {
      list = list.filter((s) => s.active);
    } else if (shiftFilter === 'MORNING') {
      list = list.filter((s) => s.direction === 'TO_COLLEGE');
    } else if (shiftFilter === 'EVENING') {
      list = list.filter((s) => s.direction === 'FROM_COLLEGE');
    } else if (shiftFilter === 'EXAM') {
      list = list.filter((s) => s.shiftType === 'EXAM_ONLY');
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.displayTime.toLowerCase().includes(q) ||
          s.startTime.toLowerCase().includes(q) ||
          s.directionLabel.toLowerCase().includes(q) ||
          (s.shiftType && s.shiftType.toLowerCase().includes(q))
      );
    }

    // Sort order: by start time
    return list.sort((a, b) => {
      const timeA = a.startTime || '99:99';
      const timeB = b.startTime || '99:99';
      return timeA.localeCompare(timeB);
    });
  }, [allShifts, shiftFilter, searchQuery]);

  // Active shift when in bulk bus assignment mode
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

  // -------------------------------------------------------------
  // ACTION 1: Open Edit Shift Form
  // -------------------------------------------------------------
  const handleOpenEditShift = (shift: ShiftItem) => {
    setEditingShiftData(shift);
    setEditShiftName(shift.name);
    setEditShiftType(shift.shiftType || 'REGULAR');
    setEditStartTime(shift.startTime || '');
    setEditEndTime(shift.endTime || '');
    setEditDirection((shift.direction as any) || 'TO_COLLEGE');
    setEditOperatingDays(shift.operatingDays || 'MON,TUE,WED,THU,FRI');
    setEditActive(shift.active);
    setEditError(null);
  };

  const handleSaveEditShift = async () => {
    if (!editingShiftData) return;
    setEditError(null);

    if (!editShiftName.trim()) {
      setEditError('Shift name is required.');
      return;
    }
    if (!editStartTime.trim()) {
      setEditError('Departure time is required.');
      return;
    }
    if (!editEndTime.trim()) {
      setEditError('Return time is required.');
      return;
    }

    setEditSaving(true);
    try {
      const res = await mobilityAdminFetch(`/admin/shifts/${editingShiftData.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editShiftName.trim(),
          shiftType: editShiftType,
          startTime: editStartTime.trim(),
          endTime: editEndTime.trim(),
          direction: editDirection,
          operatingDays: editOperatingDays.trim(),
          active: editActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update shift');
      }

      setBanner({
        title: 'Shift updated successfully',
        description: `${editShiftName} timings and details saved to database.`,
        type: 'success',
      });
      setEditingShiftData(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'shift-assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
    } catch (err: any) {
      setEditError(err.message || 'Failed to update shift.');
    } finally {
      setEditSaving(false);
      setTimeout(() => setBanner(null), 6000);
    }
  };

  // -------------------------------------------------------------
  // ACTION 2: Open & Save Add Shift Form
  // -------------------------------------------------------------
  const handleOpenAddShift = () => {
    setAddShiftName('');
    setAddShiftType('REGULAR');
    setAddStartTime('');
    setAddEndTime('');
    setAddDirection('TO_COLLEGE');
    setAddOperatingDays('MON,TUE,WED,THU,FRI');
    setAddActive(true);
    setAddError(null);
    setIsAddShiftOpen(true);
  };

  const handleSaveAddShift = async () => {
    setAddError(null);
    if (!addShiftName.trim()) {
      setAddError('Shift name is required.');
      return;
    }
    if (!addStartTime.trim()) {
      setAddError('Departure time (start time) is required.');
      return;
    }
    if (!addEndTime.trim()) {
      setAddError('Return time (end time) is required.');
      return;
    }

    setAddSaving(true);
    try {
      const res = await mobilityAdminFetch('/admin/shifts', {
        method: 'POST',
        body: JSON.stringify({
          name: addShiftName.trim(),
          shiftType: addShiftType,
          startTime: addStartTime.trim(),
          endTime: addEndTime.trim(),
          direction: addDirection,
          operatingDays: addOperatingDays.trim(),
          active: addActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create shift');
      }

      setBanner({
        title: 'New shift created',
        description: `${addShiftName} has been created and saved to the database.`,
        type: 'success',
      });
      setIsAddShiftOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'shift-assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
    } catch (err: any) {
      setAddError(err.message || 'Failed to create new shift.');
    } finally {
      setAddSaving(false);
      setTimeout(() => setBanner(null), 6000);
    }
  };

  // -------------------------------------------------------------
  // ACTION 3: Open & Save Add Bus Form
  // -------------------------------------------------------------
  const handleOpenAddBus = () => {
    setAddBusNumber('');
    setAddBusRouteId(availableRoutes[0]?.id || '');
    setAddBusCapacity(45);
    setAddBusShiftIds(new Set());
    setAddBusError(null);
    setIsAddBusOpen(true);
  };

  const handleSaveAddBus = async () => {
    setAddBusError(null);
    const busNum = addBusNumber.trim().toUpperCase();
    if (!busNum) {
      setAddBusError('Bus number is required (e.g. 25, 3B).');
      return;
    }
    if (!addBusRouteId) {
      setAddBusError('Please select a route for this bus.');
      return;
    }

    setAddBusSaving(true);
    try {
      const res = await mobilityAdminFetch('/admin/buses', {
        method: 'POST',
        body: JSON.stringify({
          busNumber: busNum,
          routeId: addBusRouteId,
          capacity: Number(addBusCapacity) || 45,
          active: true,
          shiftIds: Array.from(addBusShiftIds),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create bus');
      }

      setBanner({
        title: 'New bus added to fleet',
        description: `BUS ${busNum} has been added and assigned to ${addBusShiftIds.size} shift(s).`,
        type: 'success',
      });
      setIsAddBusOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'shift-assignments'] });
    } catch (err: any) {
      setAddBusError(err.message || 'Failed to add bus.');
    } finally {
      setAddBusSaving(false);
      setTimeout(() => setBanner(null), 6000);
    }
  };

  // -------------------------------------------------------------
  // ACTION 4: Individual Bus Trip Timing
  // -------------------------------------------------------------
  const handleOpenBusTiming = (bus: BusItem, shift: ShiftItem) => {
    const currentTiming = shift.busDepartureTimes?.[bus.id] || shift.startTime || '';
    setTimingBusItem({ bus, shift });
    setBusTimingValue(currentTiming);
    setBusTimingError(null);
  };

  const handleSaveBusTiming = async () => {
    if (!timingBusItem) return;
    setBusTimingError(null);
    setBusTimingSaving(true);
    try {
      const res = await mobilityAdminFetch(
        `/admin/shift-assignments/${timingBusItem.shift.id}/bus/${timingBusItem.bus.id}/timing`,
        {
          method: 'PUT',
          body: JSON.stringify({ departureTime: busTimingValue.trim() || null }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update bus timing');

      setBanner({
        title: 'Bus trip timing updated',
        description: `Individual departure timing for BUS ${timingBusItem.bus.busNumber} updated to ${busTimingValue || 'shift default'}.`,
        type: 'success',
      });
      setTimingBusItem(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'shift-assignments'] });
    } catch (err: any) {
      setBusTimingError(err.message || 'Failed to save timing.');
    } finally {
      setBusTimingSaving(false);
      setTimeout(() => setBanner(null), 6000);
    }
  };

  // -------------------------------------------------------------
  // ACTION 5: Quick Remove Bus from Shift (without deleting bus)
  // -------------------------------------------------------------
  const handleRemoveBusFromShift = async (shiftId: string, busId: string, busNumber: string) => {
    try {
      const res = await mobilityAdminFetch(`/admin/shift-assignments/${shiftId}/bus/${busId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setBanner({
          title: 'Bus unassigned from shift',
          description: `BUS ${busNumber} removed from shift. (Bus remains in fleet)`,
          type: 'success',
        });
        // Update local assignment state immediately
        setLocalAssignments((prev) => {
          const current = new Set(prev[shiftId] || []);
          current.delete(busId);
          return { ...prev, [shiftId]: current };
        });
        await queryClient.invalidateQueries({ queryKey: ['admin', 'shift-assignments'] });
      }
    } catch {
      setBanner({
        title: 'Error removing bus',
        description: 'Failed to unassign bus from shift.',
        type: 'error',
      });
    } finally {
      setTimeout(() => setBanner(null), 5000);
    }
  };

  // -------------------------------------------------------------
  // ACTION 6: Bulk Bus Assignment Toggle & Save
  // -------------------------------------------------------------
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
          type: 'success',
        });

        await queryClient.invalidateQueries({ queryKey: ['admin', 'shift-assignments'] });
        await queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });

        setEditingShiftId(null);
      }
    } catch {
      setBanner({
        title: 'Error saving assignment',
        description: 'Failed to update shift assignments. Please try again.',
        type: 'error',
      });
    } finally {
      setSavingShiftId(null);
      setTimeout(() => setBanner(null), 5000);
    }
  };

  // -------------------------------------------------------------
  // ACTION 7: Stop checklist drawer per bus per shift
  // -------------------------------------------------------------
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
          type: 'success',
        });
        setStopDrawerBus(null);
        await queryClient.invalidateQueries({ queryKey: ['admin', 'shift-assignments'] });
      }
    } catch {
      setBanner({
        title: 'Error saving stops',
        description: 'Failed to save stop checklist. Please try again.',
        type: 'error',
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
            Unable to load shift management information.
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Could not retrieve shift configurations or assignments from the database.
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
      {/* Top Banner & Control Bar */}
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Campus Transport Operations
            </div>
            <h2 className="mt-1 text-2xl font-extrabold text-foreground">
              Shift Management
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage operating shifts, customize bus departure timings, add buses, and configure stop assignments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenAddShift}
              data-testid="button-add-shift"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-sm hover:opacity-95 transition"
            >
              <Plus size={14} /> Add Shift
            </button>

            <button
              type="button"
              onClick={handleOpenAddBus}
              data-testid="button-add-bus"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted shadow-xs transition"
            >
              <Bus size={14} className="text-primary" /> Add Bus
            </button>

            <button
              type="button"
              onClick={() => {
                void shiftsQuery.refetch();
                void busesQuery.refetch();
              }}
              title="Refresh shifts"
              className="rounded-xl border border-border bg-background p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <RefreshCw size={14} className={shiftsQuery.isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            {(
              [
                { id: 'ALL', label: `All (${allShifts.length})` },
                { id: 'ACTIVE', label: `Active (${allShifts.filter((s) => s.active).length})` },
                { id: 'MORNING', label: 'Home → College' },
                { id: 'EVENING', label: 'College → Home' },
                { id: 'EXAM', label: 'Exam / Special' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setShiftFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs transition ${
                  shiftFilter === tab.id
                    ? 'bg-primary text-primary-foreground font-extrabold shadow-xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={13} className="absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search shifts by name or time..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-xl border border-border bg-background pl-8 pr-3 text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Global Status Banner */}
      {banner && (
        <div
          className={`rounded-2xl border-2 p-4 text-xs font-bold shadow-sm animate-in fade-in ${
            banner.type === 'error'
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-emerald-600 bg-emerald-500/15 text-emerald-950 dark:text-emerald-100'
          }`}
        >
          <div className="flex items-center gap-2 font-extrabold text-sm">
            {banner.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{banner.title}</span>
          </div>
          <p className="mt-1 leading-relaxed opacity-90">{banner.description}</p>
        </div>
      )}

      {/* VIEW 1: SHIFTS OVERVIEW CARDS */}
      {!activeShift ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="mono text-xs font-extrabold uppercase tracking-wide text-foreground">
              Configured Shifts ({displayShifts.length})
            </span>
            <span className="text-xs text-muted-foreground">
              Total campus fleet: <strong className="text-foreground">{sortedBuses.length} buses</strong>
            </span>
          </div>

          {displayShifts.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-border bg-card/60 p-12 text-center space-y-3">
              <Clock size={28} className="mx-auto text-muted-foreground opacity-60" />
              <h3 className="font-extrabold text-sm text-foreground">No shifts match criteria</h3>
              <p className="text-xs text-muted-foreground">Try adjusting your search or add a new shift.</p>
              <button
                type="button"
                onClick={handleOpenAddShift}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground"
              >
                <Plus size={13} /> Add Shift
              </button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {displayShifts.map((shift, idx) => {
                const assignedIds = localAssignments[shift.id] ?? new Set(shift.assignedBusIds || []);
                const assignedBusesList = sortedBuses.filter((b) => assignedIds.has(b.id));

                return (
                  <div
                    key={shift.id}
                    data-testid={`card-shift-${shift.id}`}
                    className={`rounded-[26px] border bg-card p-5 sm:p-6 flex flex-col justify-between shadow-xs transition hover:border-primary/50 ${
                      shift.active ? 'border-border' : 'border-border/60 opacity-80 bg-card/70'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            SHIFT {idx + 1}
                          </span>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
                              shift.active
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {shift.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <span className="font-mono text-[10px] font-extrabold uppercase text-muted-foreground">
                          {shift.direction === 'TO_COLLEGE' ? 'HOME → COLLEGE' : 'COLLEGE → HOME'}
                        </span>
                      </div>

                      {/* Shift Name */}
                      <h3 className="mt-3 text-base font-extrabold text-foreground truncate">
                        {shift.name}
                      </h3>

                      {/* Shift Timing Display */}
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="display-font text-3xl font-extrabold text-foreground">
                          {shift.displayTime || formatDisplayTime(shift.startTime)}
                        </span>
                        {shift.endTime && (
                          <span className="text-xs font-semibold text-muted-foreground">
                            until {formatDisplayTime(shift.endTime)}
                          </span>
                        )}
                      </div>

                      {/* Direction and Operating Days */}
                      <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-bold flex items-center gap-1">
                          {shift.directionLabel || (shift.direction === 'TO_COLLEGE' ? 'Home → College' : 'College → Home')}
                        </span>
                        {shift.operatingDays && (
                          <span className="font-mono text-[10px] uppercase text-muted-foreground/80">
                            {shift.operatingDays}
                          </span>
                        )}
                      </div>

                      {/* ASSIGNED BUSES SECTION */}
                      <div className="mt-4 pt-3.5 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                            <Bus size={13} className="text-primary" />
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
                            <Edit2 size={11} /> Manage Fleet
                          </button>
                        </div>

                        {/* Bus List inside shift card */}
                        <div className="mt-3 max-h-56 overflow-y-auto space-y-1.5 pr-1">
                          {assignedBusesList.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                              No buses assigned to this shift yet.
                            </div>
                          ) : (
                            assignedBusesList.map((bus) => {
                              const customTripTime = shift.busDepartureTimes?.[bus.id];
                              const displayTripTime = customTripTime
                                ? formatDisplayTime(customTripTime)
                                : formatDisplayTime(shift.startTime);

                              return (
                                <div
                                  key={bus.id}
                                  className="flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-background/70 px-3 py-2 text-xs shadow-2xs hover:border-primary/40 transition"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <CheckSquare size={13} className="text-primary shrink-0" />
                                      <span className="font-extrabold text-foreground truncate">
                                        BUS {bus.busNumber}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground truncate">
                                        · {bus.routeName}
                                      </span>
                                    </div>

                                    {/* Departure Timing for this bus */}
                                    <div className="mt-0.5 pl-4 flex items-center gap-2 text-[10px]">
                                      <span
                                        className={
                                          customTripTime
                                            ? 'font-bold text-primary'
                                            : 'text-muted-foreground'
                                        }
                                      >
                                        Departs: <strong>{displayTripTime}</strong>
                                      </span>
                                      {customTripTime && (
                                        <span className="rounded bg-primary/10 px-1 text-[8px] font-extrabold text-primary uppercase">
                                          Custom
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Actions for this individual bus on this shift */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenBusTiming(bus, shift)}
                                      className="rounded-lg border border-border bg-card p-1 text-[10px] font-bold text-foreground hover:bg-muted"
                                      title="Edit individual departure timing for this bus"
                                    >
                                      <Clock size={11} className="text-primary" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => openStopChecklist(bus, shift.id)}
                                      className="rounded-lg border border-border bg-card px-1.5 py-0.5 text-[9px] font-bold text-foreground hover:bg-muted"
                                      title="Edit active stops for this bus on this shift"
                                    >
                                      Stops
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBusFromShift(shift.id, bus.id, bus.busNumber)}
                                      className="rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                      title="Remove bus from this shift"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Primary Actions */}
                    <div className="mt-5 pt-3.5 border-t border-border/70 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditShift(shift)}
                        data-testid={`button-edit-shift-${shift.id}`}
                        className="flex-1 rounded-xl bg-primary py-2 text-center text-xs font-extrabold text-primary-foreground hover:opacity-95 shadow-2xs transition"
                      >
                        <Edit2 size={12} className="inline mr-1" /> Edit Shift
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingShiftId(shift.id);
                          setSearchQuery('');
                        }}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-muted transition"
                        title="Assign or unassign buses for this shift"
                      >
                        Assign Buses
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: BULK BUS ASSIGNMENT SCREEN */
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
                  {activeShift.name} ({activeShift.displayTime})
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

          {/* Bus Checkbox Grid */}
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

      {/* ========================================================= */}
      {/* MODAL 1: EDIT SHIFT FORM MODAL */}
      {/* ========================================================= */}
      {editingShiftData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="display-font text-xl font-extrabold text-foreground">
                  Edit Shift Details
                </h3>
                <span className="text-xs text-muted-foreground">{editingShiftData.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingShiftData(null)}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-bold text-destructive flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Shift Name</label>
                <input
                  type="text"
                  placeholder="e.g. 6:30 AM Shift, Morning Service"
                  value={editShiftName}
                  onChange={(e) => setEditShiftName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-muted-foreground">Departure Time (Start)</label>
                  <input
                    type="text"
                    placeholder="e.g. 06:30 or 6:30 AM"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-[10px] text-muted-foreground">24h (06:30) or 12h (6:30 AM)</span>
                </div>

                <div>
                  <label className="font-bold text-muted-foreground">Return Time (End)</label>
                  <input
                    type="text"
                    placeholder="e.g. 08:00 or 8:00 AM"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-[10px] text-muted-foreground">Campus arrival / return time</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-muted-foreground">Shift Type</label>
                  <select
                    value={editShiftType}
                    onChange={(e) => setEditShiftType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="REGULAR">Regular Service</option>
                    <option value="MORNING">Morning Peak</option>
                    <option value="EVENING">Evening Return</option>
                    <option value="EXAM_ONLY">Exam Only</option>
                    <option value="SPECIAL">Special / Custom</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-muted-foreground">Direction</label>
                  <select
                    value={editDirection}
                    onChange={(e) => setEditDirection(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="TO_COLLEGE">Home → College</option>
                    <option value="FROM_COLLEGE">College → Home</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Operating Days</label>
                <input
                  type="text"
                  placeholder="e.g. MON,TUE,WED,THU,FRI"
                  value={editOperatingDays}
                  onChange={(e) => setEditOperatingDays(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-shift-active"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="h-4 w-4 rounded text-primary focus:ring-primary"
                />
                <label htmlFor="edit-shift-active" className="text-xs font-bold text-foreground cursor-pointer">
                  Shift is Active (available for campus transport schedules)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingShiftData(null)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editSaving}
                onClick={handleSaveEditShift}
                data-testid="button-save-edit-shift"
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground hover:opacity-95 disabled:opacity-50 shadow-sm"
              >
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADD NEW SHIFT FORM MODAL */}
      {/* ========================================================= */}
      {isAddShiftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="display-font text-xl font-extrabold text-foreground">
                  Create New Shift
                </h3>
                <span className="text-xs text-muted-foreground">Add an additional shift to the transport schedule</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddShiftOpen(false)}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            {addError && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-bold text-destructive flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Shift Name *</label>
                <input
                  type="text"
                  placeholder="e.g. 7:15 AM Express, Mid-Day Return, Weekend Special"
                  value={addShiftName}
                  onChange={(e) => setAddShiftName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-muted-foreground">Departure Time (Start) *</label>
                  <input
                    type="text"
                    placeholder="e.g. 07:15 or 7:15 AM"
                    value={addStartTime}
                    onChange={(e) => setAddStartTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-[10px] text-muted-foreground">24h (07:15) or 12h (7:15 AM)</span>
                </div>

                <div>
                  <label className="font-bold text-muted-foreground">Return Time (End) *</label>
                  <input
                    type="text"
                    placeholder="e.g. 09:00 or 9:00 AM"
                    value={addEndTime}
                    onChange={(e) => setAddEndTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-[10px] text-muted-foreground">Arrival / return window</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-muted-foreground">Shift Type</label>
                  <select
                    value={addShiftType}
                    onChange={(e) => setAddShiftType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="REGULAR">Regular Service</option>
                    <option value="MORNING">Morning Service</option>
                    <option value="EVENING">Evening Service</option>
                    <option value="EXAM_ONLY">Exam Only</option>
                    <option value="SPECIAL">Special Event / Club</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-muted-foreground">Direction</label>
                  <select
                    value={addDirection}
                    onChange={(e) => setAddDirection(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="TO_COLLEGE">Home → College</option>
                    <option value="FROM_COLLEGE">College → Home</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Operating Days</label>
                <input
                  type="text"
                  placeholder="e.g. MON,TUE,WED,THU,FRI or SAT,SUN"
                  value={addOperatingDays}
                  onChange={(e) => setAddOperatingDays(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="add-shift-active"
                  checked={addActive}
                  onChange={(e) => setAddActive(e.target.checked)}
                  className="h-4 w-4 rounded text-primary focus:ring-primary"
                />
                <label htmlFor="add-shift-active" className="text-xs font-bold text-foreground cursor-pointer">
                  Activate this shift immediately upon creation
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsAddShiftOpen(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={addSaving}
                onClick={handleSaveAddShift}
                data-testid="button-save-new-shift"
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground hover:opacity-95 disabled:opacity-50 shadow-sm"
              >
                {addSaving ? 'Creating…' : 'Create Shift'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADD NEW BUS FORM MODAL */}
      {/* ========================================================= */}
      {isAddBusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="display-font text-xl font-extrabold text-foreground">
                  Add New Bus
                </h3>
                <span className="text-xs text-muted-foreground">Register a new bus and assign it to shifts</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBusOpen(false)}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            {addBusError && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-bold text-destructive flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{addBusError}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-muted-foreground">Bus Number / ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. 25, 3B, 50"
                    value={addBusNumber}
                    onChange={(e) => setAddBusNumber(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-[10px] text-muted-foreground">Must be unique</span>
                </div>

                <div>
                  <label className="font-bold text-muted-foreground">Passenger Capacity</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={addBusCapacity}
                    onChange={(e) => setAddBusCapacity(Number(e.target.value) || 45)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Assigned Route *</label>
                <select
                  value={addBusRouteId}
                  onChange={(e) => setAddBusRouteId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Select Route --</option>
                  {availableRoutes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.destination ? `→ ${r.destination}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assign to Shifts (Checkboxes) */}
              <div>
                <label className="font-bold text-muted-foreground">
                  Assign to Shifts (Optional)
                </label>
                <div className="mt-1.5 max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-border bg-background/50 p-2.5">
                  {allShifts.map((s) => {
                    const isChecked = addBusShiftIds.has(s.id);
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-muted/40 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setAddBusShiftIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(s.id)) next.delete(s.id);
                              else next.add(s.id);
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded text-primary focus:ring-primary"
                        />
                        <div className="text-xs">
                          <span className="font-extrabold text-foreground">{s.name}</span>
                          <span className="text-muted-foreground ml-1.5 font-mono text-[10px]">
                            ({s.displayTime || s.startTime} · {s.direction === 'TO_COLLEGE' ? 'Home → College' : 'College → Home'})
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Selected shifts will immediately include this bus once created.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsAddBusOpen(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={addBusSaving}
                onClick={handleSaveAddBus}
                data-testid="button-save-new-bus"
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground hover:opacity-95 disabled:opacity-50 shadow-sm"
              >
                {addBusSaving ? 'Adding…' : 'Add Bus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: INDIVIDUAL BUS TRIP TIMING MODAL */}
      {/* ========================================================= */}
      {timingBusItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="display-font text-xl font-extrabold text-foreground">
                  Bus Trip Departure Timing
                </h3>
                <span className="text-xs text-muted-foreground">
                  BUS {timingBusItem.bus.busNumber} · {timingBusItem.shift.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTimingBusItem(null)}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            {busTimingError && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-bold text-destructive flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{busTimingError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
                <div className="text-[10px] font-bold text-muted-foreground uppercase">Shift Standard Timing</div>
                <div className="mt-0.5 text-sm font-extrabold text-foreground">
                  {timingBusItem.shift.displayTime || formatDisplayTime(timingBusItem.shift.startTime)}
                </div>
              </div>

              <div>
                <label className="font-bold text-muted-foreground">
                  Individual Bus Departure Time
                </label>
                <input
                  type="text"
                  placeholder="e.g. 06:35 or 6:35 AM"
                  value={busTimingValue}
                  onChange={(e) => setBusTimingValue(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[10px] text-muted-foreground">
                  Set a specific departure time for this bus on this shift without affecting other buses.
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setBusTimingValue(timingBusItem.shift.startTime || '')}
                className="rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                Reset to shift time
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTimingBusItem(null)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busTimingSaving}
                  onClick={handleSaveBusTiming}
                  data-testid="button-save-bus-timing"
                  className="rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground hover:opacity-95 disabled:opacity-50 shadow-sm"
                >
                  {busTimingSaving ? 'Saving…' : 'Save Timing'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SHIFT + STOP CHECKLIST MODAL (Section 18) */}
      {/* ========================================================= */}
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
                  Shift: {allShifts.find((s) => s.id === stopDrawerShiftId)?.name || 'Selected'} · CONFIGURABLE PER SHIFT
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
