import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  ArrowDown,
  ArrowUp,
  BusFront,
  Edit2,
  ExternalLink,
  MapPin,
  Phone,
  Plus,
  Route as RouteIcon,
  Save,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';
import { naturalBusSort } from '@/lib/naturalSort';
import { StatusBadge } from './AdminOverview';

export type BusRouteItem = {
  id: string;
  busNumber: string;
  routeId: string;
  routeName: string;
  displayName: string;
  driverId?: string;
  driverName?: string | null;
  driverPhone?: string | null;
  morningShift?: string | null;
  eveningShift?: string | null;
  stopCount: number;
  stops: Array<{
    id: string;
    name: string;
    time?: string;
    latitude?: number;
    longitude?: number;
    sequence: number;
  }>;
  gpsStatus: 'LIVE' | 'GPS UNAVAILABLE' | 'NOT STARTED' | 'DELAYED';
  active: boolean;
};

export type DriverOption = {
  id: string;
  name: string;
  phone?: string;
};

export function AdminBusesAndRoutes({
  drivers = [],
}: {
  drivers: DriverOption[];
}) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBus, setEditingBus] = useState<BusRouteItem | null>(null);
  const [managingStopsBus, setManagingStopsBus] = useState<BusRouteItem | null>(null);

  // Add Bus Form State
  const [newBusNumber, setNewBusNumber] = useState('');
  const [newRouteName, setNewRouteName] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newMorningShift, setNewMorningShift] = useState(true);
  const [newEveningShift, setNewEveningShift] = useState(true);

  // Edit Bus Form State
  const [editBusNumber, setEditBusNumber] = useState('');
  const [editRouteName, setEditRouteName] = useState('');
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');

  // Manage Stops State
  const [stopsList, setStopsList] = useState<Array<{ id: string; name: string; time: string; latitude: number; longitude: number; sequence: number }>>([]);
  const [newStopName, setNewStopName] = useState('');
  const [newStopTime, setNewStopTime] = useState('');

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'buses-and-routes'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/buses-and-routes');
      if (!res.ok) throw new Error('Failed to load buses');
      return (await res.json()) as BusRouteItem[];
    },
  });

  const rawBuses = query.data ?? [];

  // Exclude any MTC buses strictly and sort naturally by bus number
  const campusBuses = rawBuses
    .filter((b) => !b.busNumber.toUpperCase().includes('MTC') && !b.displayName.toUpperCase().includes('MTC'))
    .sort((a, b) => naturalBusSort(a.busNumber, b.busNumber));

  const filteredBuses = campusBuses.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.displayName.toLowerCase().includes(q) ||
      b.busNumber.toLowerCase().includes(q) ||
      b.routeName.toLowerCase().includes(q) ||
      (b.driverName && b.driverName.toLowerCase().includes(q))
    );
  });

  const handleCreateBus = async () => {
    if (!newBusNumber.trim() || !newRouteName.trim()) return;
    setSaving(true);
    try {
      const res = await mobilityAdminFetch('/admin/buses-and-routes', {
        method: 'POST',
        body: JSON.stringify({
          busNumber: newBusNumber.trim(),
          routeName: newRouteName.trim(),
          driverName: newDriverName.trim() || undefined,
          driverPhone: newDriverPhone.trim() || undefined,
          morningShift: newMorningShift ? '6:30 AM' : undefined,
          eveningShift: newEveningShift ? '3:15 PM' : undefined,
        }),
      });
      if (res.ok) {
        setToast(`BUS ${newBusNumber.trim().toUpperCase()} · ${newRouteName.trim().toUpperCase()} registered successfully.`);
        setShowAddModal(false);
        setNewBusNumber('');
        setNewRouteName('');
        setNewDriverName('');
        setNewDriverPhone('');
        void queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'shift-assignments'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
      }
    } catch {
      setToast('Failed to create bus');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleSaveEditBus = async () => {
    if (!editingBus) return;
    setSaving(true);
    try {
      const res = await mobilityAdminFetch(`/admin/buses-and-routes/${editingBus.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          busNumber: editBusNumber.trim() || editingBus.busNumber,
          routeName: editRouteName.trim() || editingBus.routeName,
          driverName: editDriverName.trim(),
          driverPhone: editDriverPhone.trim(),
        }),
      });
      if (res.ok) {
        setToast('Bus details updated successfully.');
        setEditingBus(null);
        void queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
      }
    } catch {
      setToast('Failed to update bus');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleOpenManageStops = (bus: BusRouteItem) => {
    setManagingStopsBus(bus);
    setStopsList(
      bus.stops.map((s, idx) => ({
        id: s.id,
        name: s.name,
        time: s.time || 'Scheduled',
        latitude: s.latitude ?? 13.0084,
        longitude: s.longitude ?? 80.0033,
        sequence: idx + 1,
      }))
    );
  };

  const handleMoveStop = (index: number, direction: 'UP' | 'DOWN') => {
    const nextList = [...stopsList];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= nextList.length) return;
    const temp = nextList[index];
    nextList[index] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    nextList.forEach((s, idx) => (s.sequence = idx + 1));
    setStopsList(nextList);
  };

  const handleRemoveStop = (index: number) => {
    const nextList = stopsList.filter((_, idx) => idx !== index);
    nextList.forEach((s, idx) => (s.sequence = idx + 1));
    setStopsList(nextList);
  };

  const handleAddStop = () => {
    if (!newStopName.trim()) return;
    setStopsList([
      ...stopsList,
      {
        id: `stop-new-${Date.now()}`,
        name: newStopName.trim(),
        time: newStopTime.trim() || 'Scheduled',
        latitude: 13.0084,
        longitude: 80.0033,
        sequence: stopsList.length + 1,
      },
    ]);
    setNewStopName('');
    setNewStopTime('');
  };

  const handleSaveStops = async () => {
    if (!managingStopsBus) return;
    setSaving(true);
    try {
      const res = await mobilityAdminFetch(`/admin/buses-and-routes/${managingStopsBus.id}/stops`, {
        method: 'PUT',
        body: JSON.stringify({
          stops: stopsList,
        }),
      });
      if (res.ok) {
        setToast(`Stops updated for ${managingStopsBus.displayName}.`);
        setManagingStopsBus(null);
        void queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
      }
    } catch {
      setToast('Failed to save stops');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Campus Fleet Register
            </div>
            <h2 className="mt-1 text-2xl font-extrabold text-foreground">
              Buses
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage campus buses, route profiles, assigned drivers, and stops in natural ascending order.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewBusNumber('');
              setNewRouteName('');
              setNewDriverName('');
              setNewDriverPhone('');
              setShowAddModal(true);
            }}
            data-testid="button-add-bus"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-sm hover:opacity-95"
          >
            <Plus size={15} /> Add Bus
          </button>
        </div>
      </div>

      {toast && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          {toast}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3.5 top-3 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search bus number, route name, or driver..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-input h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-xs font-semibold"
        />
      </div>

      {/* BUSES LIST (Clean Cards, Natural Ascending Order) */}
      <div className="space-y-3">
        {filteredBuses.map((bus) => (
          <div
            key={bus.id}
            data-testid={`row-bus-route-${bus.id}`}
            className="rounded-[24px] border border-border bg-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:border-border/90"
          >
            {/* Bus Combined Identity & Driver Details */}
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-muted font-mono text-base font-extrabold text-foreground">
                {bus.busNumber}
              </span>
              <div className="space-y-1.5">
                <div className="display-font text-lg font-extrabold text-foreground">
                  {bus.displayName}
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Driver</span>
                    <span className="font-extrabold text-foreground">
                      {bus.driverName || 'Driver not assigned'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Phone</span>
                    <span className="font-semibold text-foreground">
                      {bus.driverPhone || 'Phone not available'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Morning</span>
                    <span className="font-semibold text-foreground">{bus.morningShift || '6:30 AM'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Evening</span>
                    <span className="font-semibold text-foreground">{bus.eveningShift || '3:15 PM'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Stops</span>
                    <span className="font-semibold text-foreground">{bus.stopCount} active</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">GPS</span>
                    <div className="mt-0.5">
                      <StatusBadge status={bus.gpsStatus} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions: Edit, Manage Stops, View Live */}
            <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
              <button
                type="button"
                onClick={() => {
                  setEditingBus(bus);
                  setEditBusNumber(bus.busNumber);
                  setEditRouteName(bus.routeName);
                  setEditDriverName(bus.driverName || '');
                  setEditDriverPhone(bus.driverPhone || '');
                }}
                data-testid={`button-edit-bus-${bus.id}`}
                className="rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted"
              >
                <Edit2 size={12} className="inline mr-1" /> Edit
              </button>

              <button
                type="button"
                onClick={() => handleOpenManageStops(bus)}
                data-testid={`button-manage-stops-${bus.id}`}
                className="rounded-xl bg-primary/10 text-primary px-3.5 py-2 text-xs font-extrabold hover:bg-primary/20"
              >
                Manage Stops
              </button>

              <button
                type="button"
                onClick={() => setLocation('/admin/live-buses')}
                data-testid={`button-view-live-${bus.id}`}
                className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
                title="View on Live Map"
              >
                <ExternalLink size={12} /> View Live
              </button>
            </div>
          </div>
        ))}

        {filteredBuses.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
            No campus buses match your search.
          </div>
        )}
      </div>

      {/* ADD BUS MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="display-font text-xl font-extrabold text-foreground">
                + Add Bus
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Bus Number (e.g. 18)</label>
                <input
                  type="text"
                  placeholder="e.g. 18 or 1C"
                  value={newBusNumber}
                  onChange={(e) => setNewBusNumber(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Route Name (e.g. AVADI)</label>
                <input
                  type="text"
                  placeholder="e.g. AVADI"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold"
                />
              </div>

              {newBusNumber && newRouteName && (
                <div className="rounded-xl bg-muted/60 p-2.5 text-[11px] font-extrabold text-foreground">
                  Will appear as: <span className="text-primary font-mono">{`BUS ${newBusNumber.toUpperCase()} · ${newRouteName.toUpperCase()}`}</span>
                </div>
              )}

              {drivers.length > 0 && (
                <div>
                  <label className="font-bold text-muted-foreground">Select Registered Driver (Optional)</label>
                  <select
                    value={drivers.find((d) => d.name === newDriverName)?.id || ''}
                    onChange={(e) => {
                      const sel = drivers.find((d) => d.id === e.target.value);
                      if (sel) {
                        setNewDriverName(sel.name);
                        setNewDriverPhone(sel.phone || '');
                      }
                    }}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  >
                    <option value="">-- Choose registered driver or enter details below --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.phone ? `(${d.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="font-bold text-muted-foreground">Driver Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground">Driver Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={newDriverPhone}
                    onChange={(e) => setNewDriverPhone(e.target.value)}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <span className="font-bold text-muted-foreground">Optional Shifts</span>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={newMorningShift}
                      onChange={(e) => setNewMorningShift(e.target.checked)}
                      className="h-4 w-4 rounded text-primary"
                    />
                    Morning (6:30 AM)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={newEveningShift}
                      onChange={(e) => setNewEveningShift(e.target.checked)}
                      className="h-4 w-4 rounded text-primary"
                    />
                    Evening (3:15 PM)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !newBusNumber.trim() || !newRouteName.trim()}
                onClick={handleCreateBus}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground hover:opacity-95 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Bus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BUS MODAL */}
      {editingBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="display-font text-xl font-extrabold text-foreground">
                Edit {editingBus.displayName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingBus(null)}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Bus Number</label>
                <input
                  type="text"
                  value={editBusNumber}
                  onChange={(e) => setEditBusNumber(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Route Name</label>
                <input
                  type="text"
                  value={editRouteName}
                  onChange={(e) => setEditRouteName(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </div>

              {drivers.length > 0 && (
                <div>
                  <label className="font-bold text-muted-foreground">Select Registered Driver (Optional)</label>
                  <select
                    value={drivers.find((d) => d.name === editDriverName)?.id || ''}
                    onChange={(e) => {
                      const sel = drivers.find((d) => d.id === e.target.value);
                      if (sel) {
                        setEditDriverName(sel.name);
                        setEditDriverPhone(sel.phone || '');
                      }
                    }}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  >
                    <option value="">-- Choose registered driver or custom --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.phone ? `(${d.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="font-bold text-muted-foreground">Driver Name</label>
                  <input
                    type="text"
                    placeholder="Driver Name"
                    value={editDriverName}
                    onChange={(e) => setEditDriverName(e.target.value)}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground">Driver Phone</label>
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={editDriverPhone}
                    onChange={(e) => setEditDriverPhone(e.target.value)}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingBus(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveEditBus}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground hover:opacity-95"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE STOPS MODAL */}
      {managingStopsBus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="mono text-[10px] uppercase font-bold text-muted-foreground">
                  Route Stops Sequence
                </span>
                <h3 className="display-font text-xl font-extrabold text-foreground">
                  {managingStopsBus.displayName}
                </h3>
                <div className="text-xs text-muted-foreground">
                  Reorder, add, or edit scheduled pickup stops for this bus line.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagingStopsBus(null)}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stops list with reorder up/down */}
            <div className="flex-1 overflow-y-auto space-y-2 my-4 pr-1 divide-y divide-border/40">
              {stopsList.map((stop, idx) => (
                <div
                  key={stop.id}
                  className="flex items-center justify-between py-2.5 text-xs hover:bg-muted/10 px-2 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-muted font-mono font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-extrabold text-foreground">{stop.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Approx: {stop.time || 'Scheduled'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveStop(idx, 'UP')}
                      className="rounded-lg p-1.5 hover:bg-muted disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === stopsList.length - 1}
                      onClick={() => handleMoveStop(idx, 'DOWN')}
                      className="rounded-lg p-1.5 hover:bg-muted disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(idx)}
                      className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
                      title="Remove stop"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new stop inline form */}
            <div className="border-t border-border pt-4">
              <div className="text-[11px] font-extrabold text-muted-foreground mb-2">
                + Add Stop to Route
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Stop name (e.g. Porur Junction)"
                  value={newStopName}
                  onChange={(e) => setNewStopName(e.target.value)}
                  className="admin-input flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="Time (e.g. 6:35 AM)"
                  value={newStopTime}
                  onChange={(e) => setNewStopTime(e.target.value)}
                  className="admin-input w-28 rounded-xl border border-border bg-background px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddStop}
                  className="rounded-xl bg-secondary px-3 py-2 text-xs font-extrabold text-secondary-foreground"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setManagingStopsBus(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveStops}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground hover:opacity-95"
              >
                {saving ? 'Saving…' : 'Save Route Stops'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
