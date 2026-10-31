import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BusFront,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  MapPin,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';
import { naturalBusSort } from '@/lib/naturalSort';

export type RouteStop = {
  id: string;
  name: string;
  time?: string;
  latitude?: number;
  longitude?: number;
  sequence: number;
  active?: boolean;
};

export type BusRouteRecord = {
  id: string;
  busNumber: string;
  routeId: string;
  routeName: string;
  displayName: string;
  driverName?: string | null;
  driverPhone?: string | null;
  stopCount: number;
  stops: RouteStop[];
  active: boolean;
};

export function AdminBusRoutes() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [expandedBusId, setExpandedBusId] = useState<string | null>(null);

  // Edit Stops Modal state
  const [editingBus, setEditingBus] = useState<BusRouteRecord | null>(null);
  const [editableStops, setEditableStops] = useState<Array<RouteStop & { active: boolean }>>([]);
  const [newStopName, setNewStopName] = useState('');
  const [newStopTime, setNewStopTime] = useState('');

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Add Bus Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBusNumber, setNewBusNumber] = useState('');
  const [routeMode, setRouteMode] = useState<'existing' | 'new'>('existing');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [newRouteName, setNewRouteName] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [addMorningShift, setAddMorningShift] = useState(true);
  const [addEveningShift, setAddEveningShift] = useState(true);
  const [newCustomStops, setNewCustomStops] = useState<Array<{ name: string; time: string }>>([
    { name: '', time: '6:30 AM' },
    { name: 'College Campus', time: '7:40 AM' },
  ]);
  const [addBusError, setAddBusError] = useState<string | null>(null);
  const [addingBus, setAddingBus] = useState(false);

  const query = useQuery({
    queryKey: ['admin', 'buses-and-routes'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/buses-and-routes');
      if (!res.ok) throw new Error('Unable to load this information.');
      return (await res.json()) as BusRouteRecord[];
    },
  });

  // Query existing routes for route assignment dropdown
  const routesQuery = useQuery({
    queryKey: ['admin', 'routes'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/routes');
      if (!res.ok) return [];
      return (await res.json()) as Array<{ id: string; name: string; destination: string }>;
    },
  });

  const isLoading = query.isLoading && !query.data;
  const isError = query.isError && !query.data;

  const rawBuses = query.data ?? [];

  // Exclude MTC and sort naturally by bus number
  const buses = useMemo(() => {
    return rawBuses
      .filter((b) => !b.busNumber.toUpperCase().includes('MTC') && !b.displayName.toUpperCase().includes('MTC'))
      .sort((a, b) => naturalBusSort(a.busNumber, b.busNumber));
  }, [rawBuses]);

  const filteredBuses = useMemo(() => {
    if (!search.trim()) return buses;
    const q = search.toLowerCase();
    return buses.filter(
      (b) =>
        b.busNumber.toLowerCase().includes(q) ||
        b.routeName.toLowerCase().includes(q) ||
        b.displayName.toLowerCase().includes(q)
    );
  }, [buses, search]);

  const handleOpenEditStops = (bus: BusRouteRecord) => {
    setEditingBus(bus);
    setEditableStops(
      bus.stops.map((s, idx) => ({
        id: s.id,
        name: s.name,
        time: s.time || 'Scheduled',
        latitude: s.latitude,
        longitude: s.longitude,
        sequence: idx + 1,
        active: s.active !== false,
      }))
    );
    setNewStopName('');
    setNewStopTime('');
  };

  const toggleStopActive = (idx: number) => {
    setEditableStops((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, active: !s.active } : s))
    );
  };

  const handleMoveStop = (idx: number, dir: 'UP' | 'DOWN') => {
    const nextList = [...editableStops];
    const targetIdx = dir === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= nextList.length) return;
    const temp = nextList[idx];
    nextList[idx] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    nextList.forEach((s, i) => (s.sequence = i + 1));
    setEditableStops(nextList);
  };

  const handleRemoveStop = (idx: number) => {
    const nextList = editableStops.filter((_, i) => i !== idx);
    nextList.forEach((s, i) => (s.sequence = i + 1));
    setEditableStops(nextList);
  };

  const handleAddStop = () => {
    if (!newStopName.trim()) return;
    setEditableStops((prev) => [
      ...prev,
      {
        id: `stop-${Date.now()}`,
        name: newStopName.trim(),
        time: newStopTime.trim() || 'Scheduled',
        sequence: prev.length + 1,
        active: true,
      },
    ]);
    setNewStopName('');
    setNewStopTime('');
  };

  const handleUpdateStopDetail = (idx: number, field: 'name' | 'time', val: string) => {
    setEditableStops((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s))
    );
  };

  const handleSaveStops = async () => {
    if (!editingBus) return;
    setSaving(true);
    try {
      // Save only active stops or save all with sequence
      const stopsToSave = editableStops
        .filter((s) => s.active)
        .map((s, idx) => ({
          id: s.id,
          name: s.name.trim(),
          time: s.time?.trim() || 'Scheduled',
          latitude: s.latitude,
          longitude: s.longitude,
          sequence: idx + 1,
        }));

      const res = await mobilityAdminFetch(`/admin/buses-and-routes/${editingBus.id}/stops`, {
        method: 'PUT',
        body: JSON.stringify({ stops: stopsToSave }),
      });

      if (res.ok) {
        setToast(`Stops saved for BUS ${editingBus.busNumber} · ${editingBus.routeName}.`);
        setEditingBus(null);
        void queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'live-buses'] });
      }
    } catch {
      setToast('Failed to save stops.');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleOpenAddBus = () => {
    setNewBusNumber('');
    setRouteMode('existing');
    const available = routesQuery.data ?? [];
    if (available.length > 0) {
      setSelectedRouteId(available[0].id);
    } else if (buses.length > 0) {
      setSelectedRouteId(buses[0].routeId);
    } else {
      setSelectedRouteId('');
    }
    setNewRouteName('');
    setNewDriverName('');
    setNewDriverPhone('');
    setAddMorningShift(true);
    setAddEveningShift(true);
    setNewCustomStops([
      { name: '', time: '6:30 AM' },
      { name: 'College Campus', time: '7:40 AM' },
    ]);
    setAddBusError(null);
    setShowAddModal(true);
  };

  const handleAddCustomStop = () => {
    setNewCustomStops((prev) => [...prev, { name: '', time: '7:00 AM' }]);
  };

  const handleRemoveCustomStop = (idx: number) => {
    setNewCustomStops((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateCustomStop = (idx: number, field: 'name' | 'time', value: string) => {
    setNewCustomStops((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  };

  const handleAddBus = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddBusError(null);

    const cleanBusNum = newBusNumber.trim().toUpperCase();
    if (!cleanBusNum) {
      setAddBusError('Please enter a bus number or bus ID.');
      return;
    }

    // Check duplicate bus number
    const isDuplicate = buses.some(
      (b) => b.busNumber.toUpperCase() === cleanBusNum || b.id.toLowerCase() === `bus-${cleanBusNum.toLowerCase()}`
    );
    if (isDuplicate) {
      setAddBusError(`Bus "${cleanBusNum}" already exists in the system. Please use a unique bus number.`);
      return;
    }

    if (routeMode === 'existing' && !selectedRouteId) {
      setAddBusError('Please select a route to assign this bus.');
      return;
    }

    if (routeMode === 'new' && !newRouteName.trim()) {
      setAddBusError('Please enter a route name for the new route.');
      return;
    }

    setAddingBus(true);
    try {
      const payload: Record<string, any> = {
        busNumber: cleanBusNum,
        morningShift: addMorningShift,
        eveningShift: addEveningShift,
      };

      if (routeMode === 'existing') {
        payload.routeId = selectedRouteId;
      } else {
        payload.routeName = newRouteName.trim();
        const validStops = newCustomStops
          .filter((s) => s.name.trim().length > 0)
          .map((s) => ({ name: s.name.trim(), time: s.time.trim() || 'Scheduled' }));
        if (validStops.length > 0) {
          payload.stops = validStops;
        }
      }

      if (newDriverName.trim()) {
        payload.driverName = newDriverName.trim();
        if (newDriverPhone.trim()) {
          payload.driverPhone = newDriverPhone.trim();
        }
      }

      const res = await mobilityAdminFetch('/admin/buses-and-routes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddBusError(data?.error || 'Failed to add new bus.');
        return;
      }

      setToast(`Bus ${cleanBusNum} successfully added and registered in ACMIS fleet.`);
      setShowAddModal(false);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'routes'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'shifts'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'live-buses'] });
    } catch (err: any) {
      setAddBusError(err.message || 'Error occurred while saving new bus.');
    } finally {
      setAddingBus(false);
      setTimeout(() => setToast(null), 4000);
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
            Could not retrieve bus route records from the database.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => void query.refetch()}
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
          Loading bus routes...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Transport Management
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-foreground">
            Bus Routes
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Campus routes organized by bus in natural ascending order. Inspect scheduled stops, configure stops, or add new buses to the fleet.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAddBus}
          data-testid="button-add-bus"
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-95"
        >
          <Plus size={15} />
          Add Bus
        </button>
      </div>

      {toast && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          {toast}
        </div>
      )}

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3.5 top-3 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search bus or route (e.g. 18 or Avadi)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-input h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-xs font-semibold"
        />
      </div>

      {/* Bus Routes List organized by BUS (BUS 1 · ENNORE) */}
      {filteredBuses.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-xs text-muted-foreground">
          No bus routes configured yet.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBuses.map((bus) => {
            const isExpanded = expandedBusId === bus.id;

            return (
              <div
                key={bus.id}
                data-testid={`card-bus-route-${bus.id}`}
                className="rounded-[24px] border border-border bg-card p-5 sm:p-6 transition hover:border-primary/40 shadow-xs"
              >
                {/* Header row: Primary BUS NUMBER · Secondary ROUTE NAME */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-muted font-mono text-base font-extrabold text-foreground">
                      {bus.busNumber}
                    </span>
                    <div>
                      <h3 className="display-font text-lg font-extrabold text-foreground">
                        BUS {bus.busNumber} · {bus.routeName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>Route: <strong className="text-foreground">{bus.routeName}</strong></span>
                        <span>·</span>
                        <span>{bus.stops.length} scheduled stops</span>
                        {bus.stops.length > 0 && (
                          <>
                            <span>·</span>
                            <span>Starts: <strong>{bus.stops[0].time || 'Scheduled'}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditStops(bus)}
                      data-testid={`button-edit-stops-${bus.id}`}
                      className="rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      <Edit2 size={12} className="inline mr-1" /> Edit Stops
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedBusId(isExpanded ? null : bus.id)}
                      data-testid={`button-expand-stops-${bus.id}`}
                      className="rounded-xl bg-primary/10 px-3.5 py-2 text-xs font-extrabold text-primary hover:bg-primary/20"
                    >
                      {isExpanded ? (
                        <>Hide Stops <ChevronUp size={14} className="inline ml-1" /></>
                      ) : (
                        <>View Stops ({bus.stops.length}) <ChevronDown size={14} className="inline ml-1" /></>
                      )}
                    </button>
                  </div>
                </div>

                {/* EXPANDED ROUTE DETAILS & STOPS LIST (Section 11) */}
                {isExpanded && (
                  <div className="mt-5 border-t border-border pt-4 animate-in fade-in space-y-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
                      <span>Scheduled Route Stops</span>
                      <span>Departure / Arrival Time</span>
                    </div>

                    <div className="divide-y divide-border/50 max-h-80 overflow-y-auto pr-1">
                      {bus.stops.map((stop, idx) => (
                        <div
                          key={stop.id}
                          className="flex items-center justify-between py-2 text-xs hover:bg-muted/20 px-2 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="grid h-6 w-6 place-items-center rounded-md bg-muted font-mono text-[10px] font-extrabold text-foreground">
                              {idx + 1}
                            </span>
                            <span className="font-extrabold text-foreground">
                              {stop.name}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            {stop.time || 'Scheduled'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* STOP EDITING MODAL (Section 14) */}
      {editingBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="mono text-[10px] uppercase font-bold text-muted-foreground">
                  Stop Editing
                </span>
                <h3 className="display-font text-xl font-extrabold text-foreground">
                  BUS {editingBus.busNumber} · {editingBus.routeName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Select, reorder, edit timings, or add/remove stops.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBus(null)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Editable stops list */}
            <div className="flex-1 overflow-y-auto space-y-2 my-4 pr-1 divide-y divide-border/40">
              {editableStops.map((stop, idx) => (
                <div
                  key={stop.id}
                  className={`flex items-center justify-between py-2.5 px-2 rounded-xl text-xs transition ${
                    stop.active ? 'bg-background' : 'bg-muted/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Checkbox: Select / Deselect stop */}
                    <input
                      type="checkbox"
                      checked={stop.active}
                      onChange={() => toggleStopActive(idx)}
                      className="h-4 w-4 rounded text-primary focus:ring-primary shrink-0 cursor-pointer"
                      title={stop.active ? 'Deselect stop' : 'Select stop'}
                    />

                    <span className="grid h-6 w-6 place-items-center rounded-md bg-muted font-mono font-bold text-[10px] shrink-0">
                      {idx + 1}
                    </span>

                    {/* Editable stop name */}
                    <input
                      type="text"
                      value={stop.name}
                      onChange={(e) => handleUpdateStopDetail(idx, 'name', e.target.value)}
                      className="admin-input h-7 flex-1 rounded-lg border border-border bg-background px-2 text-xs font-bold"
                    />

                    {/* Editable stop time */}
                    <input
                      type="text"
                      value={stop.time}
                      onChange={(e) => handleUpdateStopDetail(idx, 'time', e.target.value)}
                      placeholder="e.g. 6:40 AM"
                      className="admin-input h-7 w-24 rounded-lg border border-border bg-background px-2 text-xs font-mono font-semibold"
                    />
                  </div>

                  {/* Reorder and Delete Controls */}
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveStop(idx, 'UP')}
                      className="rounded-md p-1 border border-border hover:bg-muted disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === editableStops.length - 1}
                      onClick={() => handleMoveStop(idx, 'DOWN')}
                      className="rounded-md p-1 border border-border hover:bg-muted disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(idx)}
                      className="rounded-md p-1 text-destructive hover:bg-destructive/10"
                      title="Remove stop"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Inline Add Stop */}
            <div className="border-t border-border pt-3">
              <span className="text-[11px] font-extrabold text-muted-foreground block mb-1.5">
                + Add Stop to Route
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Stop name (e.g. Ponnu Supermarket)"
                  value={newStopName}
                  onChange={(e) => setNewStopName(e.target.value)}
                  className="admin-input flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="Time (e.g. 6:42 AM)"
                  value={newStopTime}
                  onChange={(e) => setNewStopTime(e.target.value)}
                  className="admin-input w-28 rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddStop}
                  className="rounded-xl bg-secondary px-3.5 py-2 text-xs font-extrabold text-secondary-foreground hover:opacity-90"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setEditingBus(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveStops}
                data-testid="button-save-route-stops"
                className="rounded-xl bg-primary px-5 py-2 text-xs font-extrabold text-primary-foreground hover:opacity-95"
              >
                {saving ? 'Saving…' : 'Save Stops'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD BUS MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="mono text-[10px] uppercase font-bold text-muted-foreground">
                  Fleet Registry
                </span>
                <h3 className="display-font text-xl font-extrabold text-foreground">
                  Add Bus Number
                </h3>
                <p className="text-xs text-muted-foreground">
                  Register a new bus into the ACMIS campus transport fleet and assign its route and stops.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBus} className="flex-1 overflow-y-auto space-y-4 my-4 pr-1">
              {addBusError && (
                <div
                  data-testid="add-bus-error"
                  className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-bold text-destructive flex items-start gap-2"
                >
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{addBusError}</span>
                </div>
              )}

              {/* Bus Number */}
              <div>
                <label className="mono block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
                  Bus Number or Unique ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5, 5B, 19, 50"
                  value={newBusNumber}
                  onChange={(e) => {
                    setNewBusNumber(e.target.value);
                    setAddBusError(null);
                  }}
                  data-testid="input-add-bus-number"
                  className="admin-input h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold uppercase"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Unique identifier used by students, dispatchers, and live GPS tracking.
                </p>
              </div>

              {/* Route Assignment Mode */}
              <div>
                <label className="mono block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">
                  Route Assignment *
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setRouteMode('existing')}
                    className={`rounded-xl border py-2 px-3 text-xs font-bold text-left transition ${
                      routeMode === 'existing'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Assign to Existing Route
                  </button>
                  <button
                    type="button"
                    onClick={() => setRouteMode('new')}
                    className={`rounded-xl border py-2 px-3 text-xs font-bold text-left transition ${
                      routeMode === 'new'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Create New Route
                  </button>
                </div>

                {routeMode === 'existing' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                      Select Existing Route
                    </label>
                    <select
                      value={selectedRouteId}
                      onChange={(e) => setSelectedRouteId(e.target.value)}
                      data-testid="select-existing-route"
                      className="admin-input h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold"
                    >
                      {routesQuery.data && routesQuery.data.length > 0 ? (
                        routesQuery.data.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} {r.destination ? `→ ${r.destination}` : ''}
                          </option>
                        ))
                      ) : (
                        buses.map((b) => (
                          <option key={b.routeId} value={b.routeId}>
                            Route {b.busNumber} · {b.routeName}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                        New Route Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. TAMBARAM EXPRESS or KOYAMBEDU LINK"
                        value={newRouteName}
                        onChange={(e) => setNewRouteName(e.target.value)}
                        data-testid="input-new-route-name"
                        className="admin-input h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold uppercase"
                      />
                    </div>

                    {/* Pickup stops list */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11px] font-bold text-muted-foreground">
                          Scheduled Pickup Stops
                        </label>
                        <button
                          type="button"
                          onClick={handleAddCustomStop}
                          className="text-[11px] font-bold text-primary hover:underline"
                        >
                          + Add Stop
                        </button>
                      </div>

                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {newCustomStops.map((stop, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="grid h-6 w-6 place-items-center rounded-md bg-muted font-mono text-[10px] font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              placeholder={idx === 0 ? "Origin Stop (e.g. Tambaram Terminal)" : "Stop Name"}
                              value={stop.name}
                              onChange={(e) => handleUpdateCustomStop(idx, 'name', e.target.value)}
                              className="admin-input h-8 flex-1 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold"
                            />
                            <input
                              type="text"
                              placeholder="6:30 AM"
                              value={stop.time}
                              onChange={(e) => handleUpdateCustomStop(idx, 'time', e.target.value)}
                              className="admin-input h-8 w-24 rounded-lg border border-border bg-background px-2 text-xs font-mono"
                            />
                            {newCustomStops.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomStop(idx)}
                                className="rounded-md p-1 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Driver Assignment (Optional) */}
              <div className="border-t border-border pt-3">
                <span className="mono text-[10px] uppercase font-bold text-muted-foreground block mb-2">
                  Driver Assignment (Optional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                      Driver Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Kumar"
                      value={newDriverName}
                      onChange={(e) => setNewDriverName(e.target.value)}
                      data-testid="input-add-bus-driver-name"
                      className="admin-input h-9 w-full rounded-xl border border-border bg-background px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                      Driver Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98401 23456"
                      value={newDriverPhone}
                      onChange={(e) => setNewDriverPhone(e.target.value)}
                      data-testid="input-add-bus-driver-phone"
                      className="admin-input h-9 w-full rounded-xl border border-border bg-background px-3 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Shift Assignment (Optional) */}
              <div className="border-t border-border pt-3">
                <span className="mono text-[10px] uppercase font-bold text-muted-foreground block mb-2">
                  Assign to Daily Shifts (Optional)
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addMorningShift}
                      onChange={(e) => setAddMorningShift(e.target.checked)}
                      className="h-4 w-4 rounded text-primary focus:ring-primary"
                    />
                    <span>Morning Shift (6:30 AM · TO COLLEGE)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addEveningShift}
                      onChange={(e) => setAddEveningShift(e.target.checked)}
                      className="h-4 w-4 rounded text-primary focus:ring-primary"
                    />
                    <span>Evening Shift (3:15 PM · FROM COLLEGE)</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingBus}
                  data-testid="button-submit-add-bus"
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-extrabold text-primary-foreground hover:opacity-95 disabled:opacity-50"
                >
                  {addingBus ? 'Adding Bus…' : 'Add Bus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
