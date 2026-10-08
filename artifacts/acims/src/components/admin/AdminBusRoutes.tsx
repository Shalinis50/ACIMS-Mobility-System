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

  const query = useQuery({
    queryKey: ['admin', 'buses-and-routes'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/buses-and-routes');
      if (!res.ok) throw new Error('Unable to load this information.');
      return (await res.json()) as BusRouteRecord[];
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
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Transport Management
        </div>
        <h2 className="mt-1 text-2xl font-extrabold text-foreground">
          Bus Routes
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Campus routes organized by bus in natural ascending order. Inspect scheduled stops and configure stops per bus.
        </p>
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
    </div>
  );
}
