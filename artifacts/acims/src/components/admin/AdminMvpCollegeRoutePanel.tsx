import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BusFront, Pencil, Plus, RefreshCw, Save, X } from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';

type CollegeRoute = {
  id: string;
  routeNumber: string;
  routeName: string;
  startingTimeDisplay: string | null;
  startingTime24: string | null;
  campusArrivalDisplay: string | null;
  campusArrival24: string | null;
  busId: string | null;
  busNumber: string | null;
  active: boolean;
  source: string;
  manuallyEdited: boolean;
};

export function AdminMvpCollegeRoutePanel() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    routeNumber: '',
    routeName: '',
    startingTime24: '',
    campusArrival24: '',
    busNumber: '',
    active: true,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);

  const routesQuery = useQuery({
    queryKey: ['admin', 'college-routes', query],
    queryFn: async () => {
      const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
      const res = await mobilityAdminFetch(`/college-routes${qs}`);
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to load routes');
      return (Array.isArray(data) ? data : []) as CollegeRoute[];
    },
  });

  useEffect(() => {
    if (!editingId) return;
    const row = (routesQuery.data ?? []).find((r) => r.id === editingId);
    if (!row) return;
    setForm({
      routeNumber: row.routeNumber,
      routeName: row.routeName,
      startingTime24: row.startingTime24 ?? '',
      campusArrival24: row.campusArrival24 ?? '',
      busNumber: row.busNumber ?? row.routeNumber,
      active: row.active,
    });
  }, [editingId, routesQuery.data]);

  const activateOfficial = async () => {
    setActivating(true);
    setError(null);
    setMessage(null);
    try {
      const res = await mobilityAdminFetch('/college-routes/activate-official', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Activate failed');
      setMessage(`Loaded ${(data as { routesCount?: number }).routesCount ?? 0} official REC routes and bus numbers.`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'college-routes'] });
      await queryClient.invalidateQueries({ queryKey: ['getAdminRoutes'] });
      await queryClient.invalidateQueries({ queryKey: ['getAdminBuses'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activate failed');
    } finally {
      setActivating(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body = {
        routeNumber: form.routeNumber.trim(),
        routeName: form.routeName.trim(),
        startingTime24: form.startingTime24 || null,
        campusArrival24: form.campusArrival24 || null,
        busNumber: form.busNumber.trim(),
        active: form.active,
      };
      const res = adding
        ? await mobilityAdminFetch('/college-routes', { method: 'POST', body: JSON.stringify(body) })
        : await mobilityAdminFetch(`/college-routes/${encodeURIComponent(editingId!)}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Save failed');
      setMessage(adding ? 'Route added.' : 'Route updated. Official re-sync will keep this edit.');
      setAdding(false);
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'college-routes'] });
      await queryClient.invalidateQueries({ queryKey: ['getAdminRoutes'] });
      await queryClient.invalidateQueries({ queryKey: ['getAdminBuses'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const routes = routesQuery.data ?? [];

  return (
    <section className="mt-5 space-y-4">
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <BusFront size={22} />
            </span>
            <div>
              <h2 className="text-xl font-extrabold">Active college routes</h2>
              <p className="text-sm text-muted-foreground">
                Official REC Transport route numbers, names, start times, and bus numbers. Edit any row if the college changes it locally.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={activating}
              onClick={() => void activateOfficial()}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-extrabold disabled:opacity-50"
            >
              <RefreshCw size={14} className={activating ? 'animate-spin' : ''} />
              {activating ? 'Loading…' : 'Load official REC routes'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setEditingId(null);
                setForm({
                  routeNumber: '',
                  routeName: '',
                  startingTime24: '',
                  campusArrival24: '',
                  busNumber: '',
                  active: true,
                });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
            >
              <Plus size={14} /> Add route
            </button>
          </div>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search route number, area, or bus no (19E, Tambaram)"
          className="admin-input mt-4 w-full"
        />

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}

        {(adding || editingId) && (
          <div className="mt-4 space-y-3 rounded-2xl border border-primary/30 bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold">{adding ? 'Add college route' : 'Edit college route'}</h3>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setEditingId(null);
                }}
                className="text-xs text-muted-foreground"
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold">
                Route no
                <input className="admin-input mt-1 w-full" value={form.routeNumber} onChange={(e) => setForm({ ...form, routeNumber: e.target.value })} placeholder="19E" />
              </label>
              <label className="text-xs font-bold">
                Bus no
                <input className="admin-input mt-1 w-full" value={form.busNumber} onChange={(e) => setForm({ ...form, busNumber: e.target.value })} placeholder="19E" />
              </label>
              <label className="text-xs font-bold sm:col-span-2">
                Route name
                <input className="admin-input mt-1 w-full" value={form.routeName} onChange={(e) => setForm({ ...form, routeName: e.target.value })} placeholder="Tambaram (MCC)" />
              </label>
              <label className="text-xs font-bold">
                Start time
                <input type="time" className="admin-input mt-1 w-full" value={form.startingTime24} onChange={(e) => setForm({ ...form, startingTime24: e.target.value })} />
              </label>
              <label className="text-xs font-bold">
                Campus arrival
                <input type="time" className="admin-input mt-1 w-full" value={form.campusArrival24} onChange={(e) => setForm({ ...form, campusArrival24: e.target.value })} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active
            </label>
            <button
              type="button"
              disabled={saving || !form.routeNumber.trim() || !form.routeName.trim()}
              onClick={() => void save()}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground disabled:opacity-50"
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-[28px] border border-border bg-card p-4 sm:p-6">
        {routesQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading official routes…</p>
        ) : !routes.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Data not available yet. Sync REC Transport, then tap Load official REC routes.
          </p>
        ) : (
          <div className="max-h-[640px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-3">Route</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Start</th>
                  <th className="py-2 pr-3">Campus</th>
                  <th className="py-2 pr-3">Bus no</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2"> </th>
                </tr>
              </thead>
              <tbody>
                {routes.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-extrabold">{r.routeNumber}</td>
                    <td className="py-2 pr-3">{r.routeName}</td>
                    <td className="py-2 pr-3">{r.startingTimeDisplay || r.startingTime24 || '—'}</td>
                    <td className="py-2 pr-3">{r.campusArrivalDisplay || r.campusArrival24 || '—'}</td>
                    <td className="py-2 pr-3 font-bold">{r.busNumber || '—'}</td>
                    <td className="py-2 pr-3">
                      {r.active ? 'Active' : 'Inactive'}
                      {r.manuallyEdited ? ' · edited' : ''}
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAdding(false);
                          setEditingId(r.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 font-bold hover:bg-muted"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
