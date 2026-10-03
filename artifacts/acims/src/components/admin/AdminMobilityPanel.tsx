import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, MapPin, BarChart3, Plus } from 'lucide-react';
import type { AdminBus, Driver } from '@workspace/api-client-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';

type MobilitySubTab = 'pickups' | 'analytics';

type PickupPoint = {
  id: string;
  routeId: string;
  stopName: string;
  latitude: number | null;
  longitude: number | null;
  sequenceNumber: number;
  scheduledTimeDisplay?: string | null;
  source?: string;
};
type TripRow = {
  id: string;
  busId: string;
  status: string;
  startedAt: string;
  endedAt?: string | null;
  delayMinutes?: number | null;
};

export function AdminMobilityPanel({ buses, drivers }: { buses: AdminBus[]; drivers: Driver[] }) {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<MobilitySubTab>('pickups');
  const [error, setError] = useState<string | null>(null);

  const pickupsQuery = useQuery({
    queryKey: ['mobility', 'pickup-points'],
    queryFn: async () => {
      const res = await fetch('/api/mobility/pickup-points');
      return (await res.json()) as PickupPoint[];
    },
  });

  const analyticsQuery = useQuery({
    queryKey: ['mobility', 'analytics'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/mobility/analytics/summary');
      if (!res.ok) throw new Error('Analytics unavailable');
      return await res.json();
    },
    enabled: subTab === 'analytics',
  });

  const historyQuery = useQuery({
    queryKey: ['mobility', 'trip-history'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/mobility/trips/history?limit=30');
      if (!res.ok) throw new Error('History unavailable');
      return (await res.json()) as TripRow[];
    },
    enabled: subTab === 'analytics',
  });

  const [pickupForm, setPickupForm] = useState({
    id: '',
    routeId: 'route-bus-12',
    stopName: '',
    latitude: '12.92',
    longitude: '80.12',
    sequenceNumber: '1',
  });

  const invalidateMobility = () => {
    void queryClient.invalidateQueries({ queryKey: ['mobility'] });
  };

  const postAdmin = async (path: string, body: unknown) => {
    setError(null);
    const res = await mobilityAdminFetch(path, { method: 'POST', body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((data as { error?: string }).error || 'Request failed');
      return false;
    }
    invalidateMobility();
    return true;
  };

  const submitPickup = async () => {
    if (!pickupForm.id.trim() || !pickupForm.stopName.trim()) return;
    const ok = await postAdmin('/mobility/pickup-points', {
      ...pickupForm,
      latitude: Number(pickupForm.latitude),
      longitude: Number(pickupForm.longitude),
      sequenceNumber: Number(pickupForm.sequenceNumber),
    });
    if (ok) {
      setPickupForm({
        id: '',
        routeId: 'route-bus-12',
        stopName: '',
        latitude: '12.92',
        longitude: '80.12',
        sequenceNumber: '1',
      });
    }
  };

  const subTabs: { id: MobilitySubTab; label: string; icon: typeof CalendarClock }[] = [
    { id: 'pickups', label: 'Pickup points', icon: MapPin },
    { id: 'analytics', label: 'Trips & analytics', icon: BarChart3 },
  ];

  return (
    <section className="mt-5 space-y-4">
      <div className="flex flex-wrap gap-2">
        {subTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            data-testid={`mobility-subtab-${id}`}
            onClick={() => setSubTab(id)}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold ${
              subTab === id ? 'bg-secondary text-secondary-foreground' : 'bg-card border border-border text-muted-foreground'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive">
          {error}
        </div>
      )}

      {subTab === 'pickups' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
          <div className="rounded-[28px] border border-border bg-card p-6 max-h-[480px] overflow-y-auto">
            <h3 className="text-lg font-extrabold">Official pickup points</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Names and timings come from REC Transport. Coordinates stay empty until an admin sets them — they are not invented.
            </p>
            <ul className="mt-4 space-y-2">
              {(pickupsQuery.data ?? []).map((p) => (
                <li key={p.id} className="rounded-xl border border-border px-4 py-3 text-sm">
                  <span className="font-extrabold">{p.stopName}</span>
                  <div className="text-xs text-muted-foreground">
                    {p.routeId.replace(/^rec-route-/, '').toUpperCase()}
                    {p.scheduledTimeDisplay ? ` · ${p.scheduledTimeDisplay}` : ''}
                    {' · '}
                    {p.latitude != null && p.longitude != null
                      ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`
                      : 'Coordinates not set'}
                  </div>
                </li>
              ))}
              {!(pickupsQuery.data ?? []).length && (
                <li className="py-6 text-center text-xs text-muted-foreground">
                  Data not available yet. Sync REC Transport, then update official pickup points.
                </li>
              )}
            </ul>
          </div>
          <div className="rounded-[28px] border border-border bg-card p-6 space-y-3">
            <h3 className="text-lg font-extrabold">Upsert pickup point</h3>
            <input className="w-full rounded-xl border border-border px-3 py-2 text-sm" placeholder="Stop id" value={pickupForm.id} onChange={(e) => setPickupForm({ ...pickupForm, id: e.target.value })} />
            <input className="w-full rounded-xl border border-border px-3 py-2 text-sm" placeholder="Stop name" value={pickupForm.stopName} onChange={(e) => setPickupForm({ ...pickupForm, stopName: e.target.value })} />
            <input className="w-full rounded-xl border border-border px-3 py-2 text-sm" placeholder="Sequence" value={pickupForm.sequenceNumber} onChange={(e) => setPickupForm({ ...pickupForm, sequenceNumber: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded-xl border border-border px-3 py-2 text-sm" placeholder="Lat" value={pickupForm.latitude} onChange={(e) => setPickupForm({ ...pickupForm, latitude: e.target.value })} />
              <input className="rounded-xl border border-border px-3 py-2 text-sm" placeholder="Lng" value={pickupForm.longitude} onChange={(e) => setPickupForm({ ...pickupForm, longitude: e.target.value })} />
            </div>
            <button type="button" onClick={() => void submitPickup()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground">
              <Plus size={14} /> Save pickup point
            </button>
          </div>
        </div>
      )}

      {subTab === 'analytics' && (
        <div className="space-y-5">
          {analyticsQuery.data && (
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ['Total trips', analyticsQuery.data.totalTrips],
                ['Completed', analyticsQuery.data.completedTrips],
                ['Active', analyticsQuery.data.activeTrips],
                ['Avg delay (min)', analyticsQuery.data.averageDelayMinutes],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-border bg-card p-4">
                  <div className="text-xs font-bold text-muted-foreground">{label}</div>
                  <div className="display-font text-2xl font-extrabold">{value}</div>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-[28px] border border-border bg-card p-6">
            <h3 className="text-lg font-extrabold">Trip history</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 pr-4">Trip</th>
                    <th className="py-2 pr-4">Bus</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Started</th>
                    <th className="py-2">Delay</th>
                  </tr>
                </thead>
                <tbody>
                  {(historyQuery.data ?? []).map((t) => (
                    <tr key={t.id} className="border-b border-border/60">
                      <td className="py-2 pr-4 font-mono">{t.id.slice(0, 24)}…</td>
                      <td className="py-2 pr-4">{t.busId}</td>
                      <td className="py-2 pr-4">{t.status}</td>
                      <td className="py-2 pr-4">{new Date(t.startedAt).toLocaleString()}</td>
                      <td className="py-2">{t.delayMinutes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
