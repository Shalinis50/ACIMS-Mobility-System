import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Edit2,
  Phone,
  Plus,
  Power,
  Trash2,
  UserCheck,
  UserRound,
  X,
} from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';

export type DriverItem = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  busId?: string;
  assignedBusName?: string;
  gpsStatus?: string;
};

export type BusOption = {
  id: string;
  busNumber: string;
  displayName: string;
};

export function AdminDrivers({
  buses = [],
}: {
  buses: BusOption[];
}) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverItem | null>(null);

  // Add Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedBusId, setAssignedBusId] = useState('');

  // Edit Form
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBusId, setEditBusId] = useState('');

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const driversQuery = useQuery({
    queryKey: ['admin', 'drivers'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/drivers');
      if (!res.ok) throw new Error('Failed to load drivers');
      return (await res.json()) as DriverItem[];
    },
  });

  const drivers = driversQuery.data ?? [];

  const handleCreateDriver = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await mobilityAdminFetch('/admin/drivers', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || '+91 98401 23450',
          busId: assignedBusId || undefined,
        }),
      });
      if (res.ok) {
        setToast(`Driver ${name.trim()} registered successfully.`);
        setShowAddModal(false);
        setName('');
        setPhone('');
        setAssignedBusId('');
        void queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
      }
    } catch {
      setToast('Failed to create driver');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleSaveEditDriver = async () => {
    if (!editingDriver) return;
    setSaving(true);
    try {
      const res = await mobilityAdminFetch(`/admin/drivers/${editingDriver.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName.trim() || editingDriver.name,
          phone: editPhone.trim() || editingDriver.phone,
          busId: editBusId || null,
        }),
      });
      if (res.ok) {
        setToast('Driver updated.');
        setEditingDriver(null);
        void queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'buses-and-routes'] });
      }
    } catch {
      setToast('Failed to update driver');
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
              Personnel Register
            </div>
            <h2 className="mt-1 text-2xl font-extrabold text-foreground">
              Drivers
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Assign certified drivers to buses, update contact information, and manage bus allocations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            data-testid="button-add-driver"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-sm hover:opacity-95"
          >
            <Plus size={15} /> Add Driver
          </button>
        </div>
      </div>

      {toast && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          {toast}
        </div>
      )}

      {/* Drivers List */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {drivers.map((driver) => {
          const matchingBus = buses.find((b) => b.id === driver.busId);
          return (
            <div
              key={driver.id}
              className="rounded-[24px] border border-border bg-card p-5 space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-muted text-foreground">
                      <UserRound size={18} />
                    </span>
                    <div>
                      <div className="display-font text-base font-extrabold text-foreground">
                        {driver.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone size={11} /> {driver.phone}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                      driver.active ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {driver.active ? 'On Duty' : 'Off Duty'}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-muted/40 p-3 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Assigned Bus
                  </span>
                  <div className="font-extrabold text-foreground mt-0.5">
                    {matchingBus ? matchingBus.displayName : (driver.busId ? `BUS ${driver.busId}` : 'Not assigned')}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDriver(driver);
                    setEditName(driver.name);
                    setEditPhone(driver.phone);
                    setEditBusId(driver.busId || '');
                  }}
                  className="rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                >
                  <Edit2 size={12} className="inline mr-1" /> Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD DRIVER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="display-font text-xl font-extrabold text-foreground">
                + Add Driver
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
                <label className="font-bold text-muted-foreground">Driver Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Chandra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98401 XXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Assigned Bus</label>
                <select
                  value={assignedBusId}
                  onChange={(e) => setAssignedBusId(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                >
                  <option value="">Not assigned</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.displayName}
                    </option>
                  ))}
                </select>
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
                disabled={saving || !name.trim()}
                onClick={handleCreateDriver}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground hover:opacity-95"
              >
                {saving ? 'Saving…' : 'Add Driver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT DRIVER MODAL */}
      {editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="display-font text-xl font-extrabold text-foreground">
                Edit Driver: {editingDriver.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
                className="rounded-xl p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground">Assigned Bus</label>
                <select
                  value={editBusId}
                  onChange={(e) => setEditBusId(e.target.value)}
                  className="admin-input mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
                >
                  <option value="">Not assigned</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveEditDriver}
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
