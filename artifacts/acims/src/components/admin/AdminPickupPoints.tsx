import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BusFront,
  Clock,
  Compass,
  Edit2,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';
import { naturalBusSort } from '@/lib/naturalSort';

export type BusStopItem = {
  id: string;
  name: string;
  time?: string;
  latitude?: number | null;
  longitude?: number | null;
  sequence: number;
};

export type BusWithStops = {
  id: string;
  busNumber: string;
  routeId: string;
  routeName: string;
  displayName: string;
  driverName?: string | null;
  driverPhone?: string | null;
  stopCount: number;
  stops: BusStopItem[];
};

export function AdminPickupPoints() {
  const queryClient = useQueryClient();
  const [busSearch, setBusSearch] = useState('');
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [stopSearch, setStopSearch] = useState('');

  // Modals
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [editingStop, setEditingStop] = useState<BusStopItem | null>(null);

  // Form fields for Add / Edit Stop
  const [stopName, setStopName] = useState('');
  const [stopTime, setStopTime] = useState('');
  const [stopLat, setStopLat] = useState('');
  const [stopLng, setStopLng] = useState('');

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Load all campus buses with their stops
  const busesQuery = useQuery({
    queryKey: ['admin', 'buses-and-routes'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/buses-and-routes');
      if (!res.ok) throw new Error('Failed to load buses');
      return (await res.json()) as BusWithStops[];
    },
  });

  const rawBuses = busesQuery.data ?? [];

  // Exclude MTC and sort naturally by bus number (1, 1B, 1C, 2, 2B, 2C, 3, 3B, 3C, 4, 18...)
  const buses = useMemo(() => {
    return rawBuses
      .filter((b) => !b.busNumber.toUpperCase().includes('MTC') && !b.displayName.toUpperCase().includes('MTC'))
      .sort((a, b) => naturalBusSort(a.busNumber, b.busNumber));
  }, [rawBuses]);

  // Selected bus
  const selectedBus = useMemo(() => {
    if (!selectedBusId) return null;
    return buses.find((b) => b.id === selectedBusId) ?? null;
  }, [buses, selectedBusId]);

  // Filtered bus list
  const filteredBuses = useMemo(() => {
    if (!busSearch.trim()) return buses;
    const q = busSearch.toLowerCase();
    return buses.filter(
      (b) =>
        b.displayName.toLowerCase().includes(q) ||
        b.busNumber.toLowerCase().includes(q) ||
        b.routeName.toLowerCase().includes(q)
    );
  }, [buses, busSearch]);

  // Filtered stops inside the selected bus
  const filteredStops = useMemo(() => {
    if (!selectedBus) return [];
    if (!stopSearch.trim()) return selectedBus.stops;
    const q = stopSearch.toLowerCase();
    return selectedBus.stops.filter((s) => s.name.toLowerCase().includes(q));
  }, [selectedBus, stopSearch]);

  // Save full stops array to backend for current bus
  const saveStopsForBus = async (busId: string, updatedStops: BusStopItem[]) => {
    setSaving(true);
    try {
      const res = await mobilityAdminFetch(`/admin/buses-and-routes/${busId}/stops`, {
        method: 'PUT',
        body: JSON.stringify({
          stops: updatedStops.map((s, idx) => ({
            id: s.id,
            name: s.name,
            time: s.time || 'Scheduled',
            latitude: s.latitude,
            longitude: s.longitude,
            sequence: idx + 1,
          })),
        }),
      });
      if (res.ok) {
        setToast('Stops updated successfully.');
        void queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'live-buses'] });
      }
    } catch {
      setToast('Failed to save stops');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Reorder Stop Up / Down
  const handleMoveStop = async (index: number, direction: 'UP' | 'DOWN') => {
    if (!selectedBus) return;
    const currentList = [...selectedBus.stops];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;

    const temp = currentList[index];
    currentList[index] = currentList[targetIdx];
    currentList[targetIdx] = temp;

    currentList.forEach((s, idx) => (s.sequence = idx + 1));
    await saveStopsForBus(selectedBus.id, currentList);
  };

  // Remove Stop
  const handleRemoveStop = async (stopId: string) => {
    if (!selectedBus) return;
    if (!confirm('Are you sure you want to remove this stop from the bus?')) return;
    const currentList = selectedBus.stops.filter((s) => s.id !== stopId);
    currentList.forEach((s, idx) => (s.sequence = idx + 1));
    await saveStopsForBus(selectedBus.id, currentList);
  };

  // Add Stop
  const handleAddStop = async () => {
    if (!selectedBus || !stopName.trim()) return;
    const newStop: BusStopItem = {
      id: `${selectedBus.routeId}-stop-${Date.now()}`,
      name: stopName.trim(),
      time: stopTime.trim() || 'Scheduled',
      latitude: stopLat ? parseFloat(stopLat) : 13.0084,
      longitude: stopLng ? parseFloat(stopLng) : 80.0033,
      sequence: selectedBus.stops.length + 1,
    };
    const nextList = [...selectedBus.stops, newStop];
    await saveStopsForBus(selectedBus.id, nextList);
    setShowAddStopModal(false);
    setStopName('');
    setStopTime('');
    setStopLat('');
    setStopLng('');
  };

  // Edit Stop
  const handleSaveEditStop = async () => {
    if (!selectedBus || !editingStop || !stopName.trim()) return;
    const nextList = selectedBus.stops.map((s) => {
      if (s.id === editingStop.id) {
        return {
          ...s,
          name: stopName.trim(),
          time: stopTime.trim() || s.time || 'Scheduled',
          latitude: stopLat ? parseFloat(stopLat) : s.latitude,
          longitude: stopLng ? parseFloat(stopLng) : s.longitude,
        };
      }
      return s;
    });
    await saveStopsForBus(selectedBus.id, nextList);
    setEditingStop(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Official Boarding Stations
            </div>
            <h2 className="mt-1 text-2xl font-extrabold text-foreground">
              Pickup Points
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Boarding points grouped naturally by campus bus. Click any bus to inspect and manage its scheduled stops.
            </p>
          </div>

          {selectedBus && (
            <button
              type="button"
              onClick={() => {
                setStopName('');
                setStopTime('');
                setStopLat('');
                setStopLng('');
                setShowAddStopModal(true);
              }}
              data-testid="button-add-stop"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-sm hover:opacity-95"
            >
              <Plus size={15} /> Add Stop
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          {toast}
        </div>
      )}

      {/* VIEW 1: BUS LIST (DEFAULT VIEW) */}
      {!selectedBus ? (
        <div className="space-y-4">
          {/* Search Buses */}
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3.5 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search bus number or route (e.g. 18 or Avadi)..."
              value={busSearch}
              onChange={(e) => setBusSearch(e.target.value)}
              className="admin-input h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-xs font-semibold"
            />
          </div>

          {/* BUS LIST sorted naturally by bus number */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBuses.map((bus) => (
              <div
                key={bus.id}
                data-testid={`card-pickup-bus-${bus.id}`}
                className="rounded-[24px] border border-border bg-card p-5 flex flex-col justify-between transition hover:border-primary/40 hover:shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted font-mono font-extrabold text-sm text-foreground">
                      {bus.busNumber}
                    </span>
                    <div>
                      <div className="display-font text-base font-extrabold text-foreground">
                        {bus.displayName}
                      </div>
                      <div className="text-xs font-bold text-muted-foreground mt-0.5">
                        {bus.stopCount} stops
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border/50 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBusId(bus.id);
                      setStopSearch('');
                    }}
                    data-testid={`button-view-stops-${bus.id}`}
                    className="w-full rounded-xl bg-primary/10 py-2.5 text-center text-xs font-extrabold text-primary hover:bg-primary/20 transition"
                  >
                    View Stops ({bus.stopCount})
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredBuses.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
              No campus buses found.
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: SELECTED BUS STOPS VIEW */
        <div className="space-y-5 animate-in fade-in">
          {/* Back button and Bus Title */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedBusId(null)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <ArrowLeft size={14} /> Back to All Buses
              </button>
              <div>
                <h3 className="display-font text-xl font-extrabold text-foreground">
                  {selectedBus.displayName}
                </h3>
                <span className="text-xs text-muted-foreground">
                  Pickup Points & Stops ({selectedBus.stops.length})
                </span>
              </div>
            </div>

            {/* Search this bus's stops */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search this bus's stops..."
                value={stopSearch}
                onChange={(e) => setStopSearch(e.target.value)}
                className="admin-input h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Stops List */}
          <div className="space-y-3">
            {filteredStops.map((stop, idx) => {
              const hasCoords = stop.latitude != null && stop.longitude != null && (stop.latitude !== 0 || stop.longitude !== 0);

              return (
                <div
                  key={stop.id}
                  data-testid={`row-stop-${stop.id}`}
                  className="rounded-[22px] border border-border bg-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 transition hover:border-border/80"
                >
                  <div className="flex items-center gap-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted font-mono font-extrabold text-xs text-foreground">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="display-font text-base font-extrabold text-foreground">
                        {stop.name}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          <Clock size={12} className="text-muted-foreground" />
                          {stop.time || 'Scheduled'}
                        </span>

                        <span>·</span>

                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${hasCoords ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          <MapPin size={12} />
                          {hasCoords ? 'Coordinates configured' : 'Location not configured'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Reorder, Edit, Remove */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={idx === 0 || saving}
                      onClick={() => handleMoveStop(idx, 'UP')}
                      className="rounded-lg p-1.5 border border-border hover:bg-muted disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === filteredStops.length - 1 || saving}
                      onClick={() => handleMoveStop(idx, 'DOWN')}
                      className="rounded-lg p-1.5 border border-border hover:bg-muted disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingStop(stop);
                        setStopName(stop.name);
                        setStopTime(stop.time || '');
                        setStopLat(stop.latitude != null ? String(stop.latitude) : '');
                        setStopLng(stop.longitude != null ? String(stop.longitude) : '');
                      }}
                      className="rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                    >
                      <Edit2 size={12} className="inline mr-1" /> Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveStop(stop.id)}
                      className="rounded-xl p-1.5 text-destructive hover:bg-destructive/10"
                      title="Remove stop"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredStops.length === 0 && (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
                No stops configured for this bus yet. Click <b>+ Add Stop</b> above to add one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD STOP MODAL */}
      {showAddStopModal && selectedBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="display-font text-xl font-extrabold text-foreground">
                  + Add Stop
                </h3>
                <span className="text-xs text-muted-foreground">{selectedBus.displayName}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStopModal(false)}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Stop Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ponnu Supermarket"
                  value={stopName}
                  onChange={(e) => setStopName(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Approximate Time</label>
                <input
                  type="text"
                  placeholder="e.g. 6:42 AM"
                  value={stopTime}
                  onChange={(e) => setStopTime(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="font-bold text-muted-foreground">Latitude (Optional)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="13.0827"
                    value={stopLat}
                    onChange={(e) => setStopLat(e.target.value)}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground">Longitude (Optional)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="80.2707"
                    value={stopLng}
                    onChange={(e) => setStopLng(e.target.value)}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAddStopModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !stopName.trim()}
                onClick={handleAddStop}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground hover:opacity-95 disabled:opacity-50"
              >
                {saving ? 'Adding…' : 'Save Stop'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STOP MODAL */}
      {editingStop && selectedBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="display-font text-xl font-extrabold text-foreground">
                  Edit Stop
                </h3>
                <span className="text-xs text-muted-foreground">{selectedBus.displayName}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingStop(null)}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Stop Name</label>
                <input
                  type="text"
                  value={stopName}
                  onChange={(e) => setStopName(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Approximate Time</label>
                <input
                  type="text"
                  value={stopTime}
                  onChange={(e) => setStopTime(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="font-bold text-muted-foreground">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={stopLat}
                    onChange={(e) => setStopLat(e.target.value)}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={stopLng}
                    onChange={(e) => setStopLng(e.target.value)}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingStop(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !stopName.trim()}
                onClick={handleSaveEditStop}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground hover:opacity-95"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
