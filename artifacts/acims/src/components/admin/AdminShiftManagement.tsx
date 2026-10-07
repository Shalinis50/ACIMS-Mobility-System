import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminBus, AdminRoute, Driver } from '@workspace/api-client-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';

type ShiftRow = {
  id: string;
  name: string;
  shiftType: 'MORNING' | 'EVENING' | string | null;
  startTime: string | null;
  endTime: string | null;
  direction: string;
  routeId: string | null;
  busId: string | null;
  driverId: string | null;
  operatingDays: string;
  active: boolean;
};

type Slot = 'MORNING' | 'EVENING';

const DAY_OPTS = [
  { key: 'MON', label: 'Mon' },
  { key: 'TUE', label: 'Tue' },
  { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' },
  { key: 'FRI', label: 'Fri' },
  { key: 'SAT', label: 'Sat' },
  { key: 'SUN', label: 'Sun' },
];

function toInputTime(hhmm: string | null | undefined): string {
  if (!hhmm) return '';
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

export function AdminShiftManagement({
  buses,
  drivers,
  routes,
}: {
  buses: AdminBus[];
  drivers: Driver[];
  routes: AdminRoute[];
}) {
  const queryClient = useQueryClient();
  const [selectedSlot, setSelectedSlot] = useState<Slot>('MORNING');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const shiftsQuery = useQuery({
    queryKey: ['admin', 'shifts'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/shifts');
      if (!res.ok) throw new Error('Failed to load shifts');
      return (await res.json()) as ShiftRow[];
    },
  });

  const activeShift = useMemo(() => {
    const rows = shiftsQuery.data ?? [];
    return rows.find((s) => s.shiftType === selectedSlot) ?? null;
  }, [shiftsQuery.data, selectedSlot]);

  const [form, setForm] = useState({
    startTime: '',
    endTime: '',
    direction: 'TO_COLLEGE',
    routeId: '',
    busId: '',
    driverId: '',
    active: false,
    days: new Set<string>(['MON', 'TUE', 'WED', 'THU', 'FRI']),
  });

  useEffect(() => {
    if (!activeShift) return;
    setForm({
      startTime: toInputTime(activeShift.startTime),
      endTime: toInputTime(activeShift.endTime),
      direction: activeShift.direction || 'TO_COLLEGE',
      routeId: activeShift.routeId ?? '',
      busId: activeShift.busId ?? '',
      driverId: activeShift.driverId ?? '',
      active: activeShift.active,
      days: new Set((activeShift.operatingDays || 'MON,TUE,WED,THU,FRI').split(',').filter(Boolean)),
    });
    setSuccess(null);
    setError(null);
  }, [activeShift?.id, activeShift?.startTime, activeShift?.endTime, activeShift?.active]);

  const toggleDay = (key: string) => {
    setForm((prev) => {
      const days = new Set(prev.days);
      if (days.has(key)) days.delete(key);
      else days.add(key);
      return { ...prev, days };
    });
  };

  const saveShift = async () => {
    if (!activeShift) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await mobilityAdminFetch(`/admin/shifts/${activeShift.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          startTime: form.startTime,
          endTime: form.endTime,
          direction: form.direction,
          routeId: form.routeId || null,
          busId: form.busId || null,
          driverId: form.driverId || null,
          operatingDays: Array.from(form.days).join(','),
          active: form.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error || 'Save failed');
        return;
      }
      setSuccess((data as { message?: string }).message || `${activeShift.name} updated successfully.`);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'shifts'] });
      void queryClient.invalidateQueries({ queryKey: ['mobility', 'daily-shifts'] });
    } catch {
      setError('Could not save shift configuration.');
    } finally {
      setSaving(false);
    }
  };

  const shiftTitle = selectedSlot === 'MORNING' ? 'Morning Shift' : 'Evening Shift';

  return (
    <section className="mt-5 space-y-5">
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Shift management</div>
        <h2 className="mt-1 text-2xl font-extrabold">Daily shift slots</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Configure morning and evening windows, assignments, and activation. Timings are stored in the database only.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="shift-slot-morning"
            onClick={() => setSelectedSlot('MORNING')}
            className={`rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
              selectedSlot === 'MORNING' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            🌅 Morning Shift
          </button>
          <button
            type="button"
            data-testid="shift-slot-evening"
            onClick={() => setSelectedSlot('EVENING')}
            className={`rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
              selectedSlot === 'EVENING' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            🌆 Evening Shift
          </button>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-extrabold">{shiftTitle}</h3>
            <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold text-muted-foreground">
              Editing: {selectedSlot}
            </span>
          </div>

          {shiftsQuery.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading shift…</p>}

          {activeShift && (
            <div className="mt-5 grid gap-4 max-w-xl">
              <label className="block text-xs font-bold text-muted-foreground">
                Shift status
                <select
                  className="mt-1.5 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold"
                  value={form.active ? 'active' : 'inactive'}
                  onChange={(e) => setForm({ ...form, active: e.target.value === 'active' })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-muted-foreground">
                  Start time
                  <input
                    type="time"
                    className="mt-1.5 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </label>
                <label className="block text-xs font-bold text-muted-foreground">
                  End time
                  <input
                    type="time"
                    className="mt-1.5 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </label>
              </div>

              <label className="block text-xs font-bold text-muted-foreground">
                Direction
                <select
                  className="mt-1.5 w-full rounded-xl border border-border px-3 py-2 text-sm"
                  value={form.direction}
                  onChange={(e) => setForm({ ...form, direction: e.target.value })}
                >
                  <option value="TO_COLLEGE">Home → College</option>
                  <option value="FROM_COLLEGE">College → Home</option>
                </select>
              </label>

              <label className="block text-xs font-bold text-muted-foreground">
                Route
                <select
                  className="mt-1.5 w-full rounded-xl border border-border px-3 py-2 text-sm"
                  value={form.routeId}
                  onChange={(e) => setForm({ ...form, routeId: e.target.value })}
                >
                  <option value="">Select route</option>
                  {routes.filter((r) => r.active).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold text-muted-foreground">
                Bus
                <select
                  className="mt-1.5 w-full rounded-xl border border-border px-3 py-2 text-sm"
                  value={form.busId}
                  onChange={(e) => setForm({ ...form, busId: e.target.value })}
                >
                  <option value="">Select bus</option>
                  {buses.filter((b) => b.active).map((b) => (
                    <option key={b.id} value={b.id}>Bus #{b.busNumber}</option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold text-muted-foreground">
                Driver
                <select
                  className="mt-1.5 w-full rounded-xl border border-border px-3 py-2 text-sm"
                  value={form.driverId}
                  onChange={(e) => setForm({ ...form, driverId: e.target.value })}
                >
                  <option value="">Select driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>

              <div>
                <div className="text-xs font-bold text-muted-foreground">Operating days</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAY_OPTS.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDay(d.key)}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold ${
                        form.days.has(d.key) ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {form.days.has(d.key) ? '☑' : '☐'} {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                  {success}
                </div>
              )}

              <button
                type="button"
                disabled={saving}
                data-testid="button-save-shift"
                onClick={() => void saveShift()}
                className="rounded-xl bg-primary px-5 py-3 text-xs font-extrabold text-primary-foreground disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
