import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  BusFront,
  CheckCircle2,
  Edit2,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';
import { naturalBusSort } from '@/lib/naturalSort';

export type BusCardItem = {
  id: string;
  busNumber: string;
  routeId: string;
  routeName: string;
  displayName: string;
  driverId?: string;
  driverName?: string | null;
  driverPhone?: string | null;
  active: boolean;
  gpsStatus?: 'LIVE' | 'STALE' | 'GPS UNAVAILABLE' | 'DELAYED' | string;
};

export type DriverOption = {
  id: string;
  name: string;
  phone?: string;
  assignedBusId?: string;
};

export function AdminBusesAndDrivers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBus, setEditingBus] = useState<BusCardItem | null>(null);

  // Add Bus Form State
  const [newBusNumber, setNewBusNumber] = useState('');
  const [newRouteName, setNewRouteName] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');

  // Edit Bus Form State
  const [editBusNumber, setEditBusNumber] = useState('');
  const [editRouteName, setEditRouteName] = useState('');
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [editActive, setEditActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Load buses
  const busesQuery = useQuery({
    queryKey: ['admin', 'buses-and-routes'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/buses-and-routes');
      if (!res.ok) throw new Error('Unable to load this information.');
      return (await res.json()) as BusCardItem[];
    },
  });

  // Load registered drivers
  const driversQuery = useQuery({
    queryKey: ['admin', 'drivers'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/drivers');
      if (!res.ok) return [];
      return (await res.json()) as DriverOption[];
    },
  });

  const isLoading = busesQuery.isLoading && !busesQuery.data;
  const isError = busesQuery.isError && !busesQuery.data;

  const rawBuses = busesQuery.data ?? [];
  const registeredDrivers = driversQuery.data ?? [];

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
        b.displayName.toLowerCase().includes(q) ||
        (b.driverName && b.driverName.toLowerCase().includes(q))
    );
  }, [buses, search]);

  // Create Bus
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
        }),
      });

      if (res.ok) {
        setToast(`BUS ${newBusNumber.trim().toUpperCase()} · ${newRouteName.trim().toUpperCase()} created successfully.`);
        setShowAddModal(false);
        setNewBusNumber('');
        setNewRouteName('');
        setNewDriverName('');
        setNewDriverPhone('');
        void queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'live-buses'] });
      }
    } catch {
      setToast('Failed to create bus.');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (bus: BusCardItem) => {
    setEditingBus(bus);
    setEditBusNumber(bus.busNumber);
    setEditRouteName(bus.routeName);
    setEditDriverName(bus.driverName || '');
    setEditDriverPhone(bus.driverPhone || '');
    setEditActive(bus.active !== false);
  };

  // Save Edit
  const handleSaveEdit = async () => {
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
          active: editActive,
        }),
      });

      if (res.ok) {
        setToast('Bus & Driver details saved.');
        setEditingBus(null);
        void queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'live-buses'] });
      }
    } catch {
      setToast('Failed to save changes.');
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
            Could not retrieve buses and drivers records from the server.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => void busesQuery.refetch()}
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
          Loading buses and drivers...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Campus Transport Register
            </div>
            <h2 className="mt-1 text-2xl font-extrabold text-foreground">
              Buses & Drivers
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage campus buses, route names, assigned drivers, and active statuses in natural ascending order.
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

      {/* Search Input */}
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

      {/* BUSES LIST (Natural Ascending Order: BUS 1, 1B, 1C, 2, 2B, 2C, 3, 3B, 3C, 4, 18 - Section 19) */}
      {filteredBuses.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-xs text-muted-foreground">
          No buses assigned yet.
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBuses.map((bus) => (
            <div
              key={bus.id}
              data-testid={`card-bus-${bus.id}`}
              className="rounded-[24px] border border-border bg-card p-5 sm:p-6 flex flex-col justify-between transition hover:border-primary/40 shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-muted font-mono text-base font-extrabold text-foreground">
                      {bus.busNumber}
                    </span>
                    <div>
                      <h3 className="display-font text-lg font-extrabold text-foreground">
                        BUS {bus.busNumber}
                      </h3>
                      <div className="mono text-xs font-extrabold uppercase text-muted-foreground">
                        {bus.routeName}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                        bus.active !== false
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {bus.active !== false ? 'Active' : 'Inactive'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                        bus.gpsStatus === 'LIVE'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : bus.gpsStatus === 'STALE'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          : 'bg-muted/80 text-muted-foreground'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          bus.gpsStatus === 'LIVE'
                            ? 'bg-emerald-500'
                            : bus.gpsStatus === 'STALE'
                            ? 'bg-amber-500'
                            : 'bg-zinc-500'
                        }`}
                      />
                      {bus.gpsStatus || 'GPS UNAVAILABLE'}
                    </span>
                  </div>
                </div>

                {/* Driver & Phone Information (Section 19) */}
                <div className="mt-4 rounded-2xl bg-muted/30 p-3.5 space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Driver
                    </span>
                    <div className="font-extrabold text-foreground mt-0.5 flex items-center gap-1.5">
                      <UserRound size={13} className="text-muted-foreground" />
                      {bus.driverName || 'Not assigned'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Phone
                    </span>
                    <div className="font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                      <Phone size={11} className="text-muted-foreground" />
                      {bus.driverPhone || 'Not available'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button: [Edit] */}
              <div className="mt-5 pt-3 border-t border-border flex justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(bus)}
                  data-testid={`button-edit-bus-${bus.id}`}
                  className="rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-bold text-foreground hover:bg-muted"
                >
                  <Edit2 size={12} className="inline mr-1" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD BUS MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
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
                <label className="font-bold text-muted-foreground">Bus Number (e.g. 18 or 1B)</label>
                <input
                  type="text"
                  placeholder="e.g. 18"
                  value={newBusNumber}
                  onChange={(e) => setNewBusNumber(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Route Name (e.g. AVADI)</label>
                <input
                  type="text"
                  placeholder="e.g. AVADI"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </div>

              {registeredDrivers.length > 0 && (
                <div>
                  <label className="font-bold text-muted-foreground">Select Registered Driver (Optional)</label>
                  <select
                    value={registeredDrivers.find((d) => d.name === newDriverName)?.id || ''}
                    onChange={(e) => {
                      const sel = registeredDrivers.find((d) => d.id === e.target.value);
                      if (sel) {
                        setNewDriverName(sel.name);
                        setNewDriverPhone(sel.phone || '');
                      }
                    }}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  >
                    <option value="">-- Choose registered driver or enter below --</option>
                    {registeredDrivers.map((d) => (
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
                    placeholder="e.g. Ramesh"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground">Driver Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98401 23450"
                    value={newDriverPhone}
                    onChange={(e) => setNewDriverPhone(e.target.value)}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="display-font text-xl font-extrabold text-foreground">
                Edit BUS {editingBus.busNumber}
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

              {registeredDrivers.length > 0 && (
                <div>
                  <label className="font-bold text-muted-foreground">Assign Registered Driver</label>
                  <select
                    value={registeredDrivers.find((d) => d.name === editDriverName)?.id || ''}
                    onChange={(e) => {
                      const sel = registeredDrivers.find((d) => d.id === e.target.value);
                      if (sel) {
                        setEditDriverName(sel.name);
                        setEditDriverPhone(sel.phone || '');
                      }
                    }}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  >
                    <option value="">-- Choose registered driver or custom --</option>
                    {registeredDrivers.map((d) => (
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
                    value={editDriverName}
                    onChange={(e) => setEditDriverName(e.target.value)}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground">Driver Phone</label>
                  <input
                    type="text"
                    value={editDriverPhone}
                    onChange={(e) => setEditDriverPhone(e.target.value)}
                    className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="h-4 w-4 rounded text-primary"
                  />
                  Bus Active in Service
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
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
                onClick={handleSaveEdit}
                data-testid="button-save-bus-edit"
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
