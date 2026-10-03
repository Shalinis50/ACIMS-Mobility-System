import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BusFront, Save } from 'lucide-react';
import { ADMIN_MOBILITY_HEADERS } from '@/lib/mobilityApi';

type RouteRow = { id: string; routeName: string; routeCode: string; active: boolean };
type BusRow = { id: string; busNumber: string; routeId: string | null; active: boolean };
type MvpConfig = {
  enabled: boolean;
  routeId: string;
  busId: string;
  routeLabel: string;
  morningShiftStart: string;
  morningShiftEnd: string;
};

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { ...ADMIN_MOBILITY_HEADERS, ...(init?.headers as Record<string, string>) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

export function AdminMvpCollegeRoutePanel() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'mvp-college-route'],
    queryFn: () =>
      adminFetch<{ config: MvpConfig; routes: RouteRow[]; buses: BusRow[] }>('/admin/mvp/college-route'),
  });

  const [routeId, setRouteId] = useState('');
  const [busId, setBusId] = useState('');
  const [routeLabel, setRouteLabel] = useState('');
  const [morningStart, setMorningStart] = useState('07:30');
  const [morningEnd, setMorningEnd] = useState('09:30');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const c = query.data?.config;
    if (!c) return;
    setRouteId(c.routeId);
    setBusId(c.busId);
    setRouteLabel(c.routeLabel);
    setMorningStart(c.morningShiftStart);
    setMorningEnd(c.morningShiftEnd);
  }, [query.data?.config]);

  const busesForRoute = useMemo(() => {
    const buses = query.data?.buses ?? [];
    if (!routeId) return buses.filter((b) => b.active);
    return buses.filter((b) => b.active && (b.routeId === routeId || !b.routeId));
  }, [query.data?.buses, routeId]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await adminFetch<{ message: string }>('/admin/mvp/college-route', {
        method: 'PUT',
        body: JSON.stringify({
          routeId,
          busId,
          routeLabel,
          morningShiftStart: morningStart,
          morningShiftEnd: morningEnd,
        }),
      });
      setMessage(result.message);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'mvp-college-route'] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading college route…</p>;

  return (
    <section className="mt-5 max-w-2xl rounded-[28px] border border-border bg-card p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <BusFront size={22} />
        </span>
        <div>
          <h2 className="text-xl font-extrabold">College bus route (MVP)</h2>
          <p className="text-sm text-muted-foreground">
            One route for the whole college. Students only see ETA and delay for this bus.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="font-bold">Route</span>
          <select
            className="admin-input mt-1 w-full"
            value={routeId}
            onChange={(e) => {
              setRouteId(e.target.value);
              setBusId('');
            }}
          >
            <option value="">Select route</option>
            {(query.data?.routes ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.routeName} ({r.routeCode})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-bold">Bus for this route</span>
          <select className="admin-input mt-1 w-full" value={busId} onChange={(e) => setBusId(e.target.value)}>
            <option value="">Select bus</option>
            {busesForRoute.map((b) => (
              <option key={b.id} value={b.id}>BUS-{b.busNumber}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-bold">Display name</span>
          <input
            className="admin-input mt-1 w-full"
            value={routeLabel}
            onChange={(e) => setRouteLabel(e.target.value)}
            placeholder="e.g. Main campus morning service"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-bold">Morning start (HH:MM)</span>
            <input
              type="time"
              className="admin-input mt-1 w-full"
              value={morningStart}
              onChange={(e) => setMorningStart(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-bold">Morning end (HH:MM)</span>
            <input
              type="time"
              className="admin-input mt-1 w-full"
              value={morningEnd}
              onChange={(e) => setMorningEnd(e.target.value)}
            />
          </label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-emerald-700">{message}</p>}

        <button
          type="button"
          disabled={saving || !routeId || !busId}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <Save size={16} />
          Save college route
        </button>
      </div>
    </section>
  );
}
