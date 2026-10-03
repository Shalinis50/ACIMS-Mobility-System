import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mobilityAdminFetch } from '@/lib/mobilityApi';
import { EmptyState, LoadingRows } from '@/components/acims-ui';
import { BusFront, History, MapPin, Satellite, Timer } from 'lucide-react';

async function adminGet<T>(path: string): Promise<T> {
  const res = await mobilityAdminFetch(path);
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json() as Promise<T>;
}

async function adminPost<T>(path: string, body: unknown): Promise<T> {
  const res = await mobilityAdminFetch(path, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json() as Promise<T>;
}

function PanelShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
      <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">{subtitle}</div>
      <h2 className="mt-1 text-2xl font-extrabold">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function AdminGpsMonitor() {
  const query = useQuery({
    queryKey: ['admin', 'gps-health'],
    queryFn: () => adminGet<Array<Record<string, unknown>>>('/admin/gps-health'),
    refetchInterval: 5000,
  });
  if (query.isLoading) return <LoadingRows count={4} />;
  if (query.isError) return <EmptyState icon={Satellite} title="GPS monitor unavailable" message="Check admin session." />;

  return (
    <PanelShell title="GPS health" subtitle="Driver phone telemetry">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-4">Bus</th>
              <th className="py-2 pr-4">State</th>
              <th className="py-2 pr-4">Last update</th>
              <th className="py-2 pr-4">Speed</th>
              <th className="py-2">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((row) => (
              <tr key={String(row.busId)} className="border-b border-border/60">
                <td className="py-3 font-extrabold">Bus {String(row.busNumber)}</td>
                <td className="py-3">
                  <GpsDot state={String(row.gpsState)} />
                </td>
                <td className="py-3 text-muted-foreground">{formatAgo(Number(row.secondsSinceUpdate))}</td>
                <td className="py-3">{row.speed != null ? `${Number(row.speed).toFixed(1)} m/s` : '—'}</td>
                <td className="py-3">{row.accuracy != null ? `${Number(row.accuracy).toFixed(0)} m` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelShell>
  );
}

function GpsDot({ state }: { state: string }) {
  const color =
    state === 'CONNECTED' ? 'bg-emerald-500' : state === 'WEAK_GPS' ? 'bg-amber-500' : 'bg-red-500';
  return (
    <span className="inline-flex items-center gap-2 font-bold">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {state.replace('_', ' ')}
    </span>
  );
}

function formatAgo(sec: number) {
  if (sec < 60) return `${sec} sec ago`;
  return `${Math.round(sec / 60)} min ago`;
}

export function AdminEtaDelays() {
  const query = useQuery({
    queryKey: ['admin', 'eta-delays'],
    queryFn: () => adminGet<Array<Record<string, unknown>>>('/admin/eta-delays'),
    refetchInterval: 8000,
  });
  if (query.isLoading) return <LoadingRows count={4} />;
  if (query.isError) return <EmptyState icon={Timer} title="ETA view unavailable" message="Could not load delay board." />;

  return (
    <PanelShell title="ETA & delay prediction" subtitle="Live schedule intelligence">
      <div className="space-y-3">
        {(query.data ?? []).map((row) => {
          const pred = row.prediction as Record<string, unknown> | undefined;
          return (
            <div key={String(row.busId)} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-extrabold">Bus {String(row.busNumber)}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{String(row.delayStatus)}</span>
              </div>
              <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                <div>ETA: {row.etaMinutes != null ? `${row.etaMinutes} min` : '—'}</div>
                <div>Delay: +{Number(row.delayMinutes ?? 0)} min</div>
                <div>Prediction: {String(pred?.prediction ?? '—')}</div>
                <div>
                  Expected slip: {pred ? `${pred.expectedDelayMinutesMin}–${pred.expectedDelayMinutesMax} min` : '—'}
                </div>
              </div>
              {pred?.rationale && <p className="mt-2 text-[11px] text-foreground">{String(pred.rationale)}</p>}
            </div>
          );
        })}
      </div>
    </PanelShell>
  );
}

export function AdminAnalyticsPanel() {
  const query = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => adminGet<Record<string, unknown>>('/admin/analytics/transport'),
  });
  if (query.isLoading) return <LoadingRows count={4} />;
  const d = query.data;
  if (!d) return null;

  return (
    <PanelShell title="Transport performance" subtitle="Analytics dashboard">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Total trips" value={Number(d.totalTrips ?? 0)} />
        <Stat label="Completed" value={Number(d.completedTrips ?? 0)} />
        <Stat label="Cancelled" value={Number(d.cancelledTrips ?? 0)} />
        <Stat label="Avg delay (min)" value={Number(d.averageDelayMinutes ?? 0)} />
        <Stat label="GPS reliability" value={`${Number(d.gpsReliabilityPercent ?? 0)}%`} />
        <Stat label="Fleet on time" value={Number(d.fleetOnTime ?? 0)} />
      </div>
    </PanelShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="text-[10px] font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 display-font text-2xl font-extrabold">{value}</div>
    </div>
  );
}

export function AdminTripPanels({ mode }: { mode: 'trips' | 'history' }) {
  const [status, setStatus] = useState<string>('');
  const query = useQuery({
    queryKey: ['admin', 'trips', status, mode],
    queryFn: () => {
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      return adminGet<Array<Record<string, unknown>>>(`/admin/trips${q}`);
    },
  });

  const statuses = ['', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

  return (
    <PanelShell
      title={mode === 'history' ? 'Trip history' : 'Trip management'}
      subtitle={mode === 'history' ? 'Historical execution' : 'Lifecycle control'}
    >
      {mode === 'trips' && (
        <div className="mb-4 flex flex-wrap gap-2">
          {statuses.map((st) => (
            <button
              key={st || 'all'}
              type="button"
              onClick={() => setStatus(st)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold ${
                status === st ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {st || 'ALL'}
            </button>
          ))}
        </div>
      )}
      {query.isLoading ? (
        <LoadingRows count={3} />
      ) : (
        <div className="space-y-2">
          {(query.data ?? []).map((t) => (
            <div key={String(t.id)} className="rounded-xl border border-border p-3 text-xs">
              <div className="font-extrabold">Trip {String(t.id)} · {String(t.status)}</div>
              <div className="mt-1 text-muted-foreground">
                Bus {String(t.busId)} · Driver {String(t.driverId)} · Delay {Number(t.delayMinutes ?? 0)} min
              </div>
              <div className="text-muted-foreground">
                Started: {t.startedAt ? new Date(String(t.startedAt)).toLocaleString() : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

export function AdminNaviPanel() {
  const query = useQuery({
    queryKey: ['admin', 'navi'],
    queryFn: () => adminGet<Record<string, unknown>>('/admin/navi'),
    refetchInterval: 30000,
  });
  if (query.isLoading) return <LoadingRows count={2} />;
  const d = query.data;
  const tools = (d?.tools as string[]) ?? [];

  return (
    <PanelShell title="NAVI mobility intelligence" subtitle="AI administration">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${d?.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <span className="text-sm font-extrabold">Status: {String(d?.status)}</span>
        <span className="text-xs text-muted-foreground">Provider: {String(d?.provider)}</span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        API connected: {d?.apiConnected ? 'Yes' : 'No'}
        {d?.lastSuccessfulRequestAt
          ? ` · Last success: ${new Date(String(d.lastSuccessfulRequestAt)).toLocaleString()}`
          : ' · No successful Gemini calls yet this session'}
      </p>
      <div className="mt-4">
        <div className="text-[10px] font-bold uppercase text-muted-foreground">ACIMS tools</div>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {tools.map((tool) => (
            <li key={tool} className="mono rounded-lg bg-muted/50 px-2 py-1 text-[10px]">{tool}()</li>
          ))}
        </ul>
      </div>
    </PanelShell>
  );
}

export function AdminNotificationsPanel() {
  const query = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: () => adminGet<Array<Record<string, unknown>>>('/admin/notifications/recent'),
    refetchInterval: 15000,
  });

  const events = useMemo(
    () => [
      { type: 'TRIP_STARTED', example: 'Your Bus 12 has started its trip.' },
      { type: 'PROXIMITY_10', example: 'Your bus is approximately 10 minutes away.' },
      { type: 'DELAY', example: 'Bus 12 is running approximately 8 minutes late.' },
      { type: 'GPS_UNAVAILABLE', example: 'Live location is temporarily unavailable.' },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <PanelShell title="Notification engine" subtitle="Operational events">
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.type} className="flex flex-wrap justify-between gap-2 rounded-xl border border-border p-3 text-xs">
              <span className="font-extrabold">{e.type}</span>
              <span className="text-muted-foreground">{e.example}</span>
            </div>
          ))}
        </div>
      </PanelShell>
      <PanelShell title="Recent mobility events" subtitle="Live feed">
        {query.isLoading ? (
          <LoadingRows count={3} />
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {(query.data ?? []).map((ev) => (
              <div key={String(ev.id)} className="rounded-lg bg-muted/40 px-3 py-2 text-[11px]">
                <span className="font-bold">{String(ev.eventType)}</span>
                <span className="text-muted-foreground"> · Bus {String(ev.busId)} · {new Date(String(ev.createdAt)).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </PanelShell>
      <AdminBroadcastPanel />
    </div>
  );
}

function AdminBroadcastPanel() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('Transport Update');
  const [message, setMessage] = useState('');
  const [busId, setBusId] = useState('bus-12');
  const [scope, setScope] = useState<'ALL' | 'BUS'>('ALL');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setResult(null);
    try {
      const target = scope === 'ALL' ? { scope: 'ALL' } : { scope: 'BUS', busId };
      const res = await adminPost<{ recipientCount: number }>('/admin/broadcast', { title, message, target });
      setResult(`Sent to ${res.recipientCount} students.`);
      void qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    } catch {
      setResult('Broadcast failed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <PanelShell title="Emergency & broadcast" subtitle="Targeted announcements">
      <div className="space-y-3 max-w-lg">
        <input
          className="w-full rounded-xl border border-border px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
        <textarea
          className="w-full rounded-xl border border-border px-3 py-2 text-sm min-h-[80px]"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
        />
        <select
          className="w-full rounded-xl border border-border px-3 py-2 text-sm"
          value={scope}
          onChange={(e) => setScope(e.target.value as 'ALL' | 'BUS')}
        >
          <option value="ALL">All students</option>
          <option value="BUS">Specific bus</option>
        </select>
        {scope === 'BUS' && (
          <input
            className="w-full rounded-xl border border-border px-3 py-2 text-sm"
            value={busId}
            onChange={(e) => setBusId(e.target.value)}
            placeholder="bus-12"
          />
        )}
        <button
          type="button"
          disabled={sending || !message.trim()}
          onClick={send}
          className="rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground disabled:opacity-50"
        >
          Send broadcast
        </button>
        {result && <p className="text-xs text-muted-foreground">{result}</p>}
      </div>
    </PanelShell>
  );
}

export function AdminStudentsPanel() {
  const query = useQuery({
    queryKey: ['admin', 'students'],
    queryFn: () => adminGet<Array<Record<string, unknown>>>('/admin/students'),
  });
  if (query.isLoading) return <LoadingRows count={4} />;

  return (
    <PanelShell title="Student transport profiles" subtitle="Student management">
      <div className="space-y-2">
        {(query.data ?? []).map((s) => (
          <div key={String(s.userId)} className="rounded-xl border border-border p-3 text-xs">
            <div className="font-extrabold">{String(s.name)}</div>
            <div className="mt-1 text-muted-foreground">
              ID: {String(s.userId)} · Pickup: {String(s.pickupStopId ?? '—')} · Bus: {String(s.assignedBusId ?? '—')}
            </div>
          </div>
        ))}
        {!query.data?.length && (
          <EmptyState icon={BusFront} title="No students in database" message="Students appear when they register via auth." />
        )}
      </div>
    </PanelShell>
  );
}

export function AdminCampusPanel() {
  const query = useQuery({
    queryKey: ['admin', 'campus'],
    queryFn: () => adminGet<Array<Record<string, unknown>>>('/admin/campus/locations'),
  });
  if (query.isLoading) return <LoadingRows count={4} />;

  return (
    <PanelShell title="Campus mobility" subtitle="Locations & zones">
      <div className="grid gap-2 sm:grid-cols-2">
        {(query.data ?? []).map((loc) => (
          <div key={String(loc.id)} className="rounded-xl border border-border p-3 text-xs">
            <div className="font-extrabold">{String(loc.name)}</div>
            <div className="text-muted-foreground">{String(loc.category)}</div>
            <div className="mono text-[10px] text-muted-foreground">
              {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)}
            </div>
          </div>
        ))}
        {!query.data?.length && (
          <EmptyState icon={MapPin} title="No campus rows" message="Seed campus locations in the database or use campus map static data." />
        )}
      </div>
    </PanelShell>
  );
}

export function AdminAuditPanel() {
  const query = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => adminGet<Array<Record<string, unknown>>>('/admin/audit-logs'),
  });
  if (query.isLoading) return <LoadingRows count={4} />;

  return (
    <PanelShell title="Admin activity" subtitle="Audit trail">
      <div className="space-y-2">
        {(query.data ?? []).map((row) => (
          <div key={String(row.id)} className="rounded-xl border border-border px-3 py-2 text-xs">
            <span className="font-bold">{new Date(String(row.createdAt)).toLocaleTimeString()}</span>
            <span className="text-muted-foreground"> — {String(row.action)}</span>
            {row.detail && <span className="text-muted-foreground"> · {String(row.detail)}</span>}
          </div>
        ))}
        {!query.data?.length && (
          <EmptyState icon={History} title="No audit entries yet" message="Configuration changes will be logged here." />
        )}
      </div>
    </PanelShell>
  );
}

export function AdminSettingsPanel() {
  return (
    <PanelShell title="Admin settings" subtitle="Security">
      <ul className="list-disc space-y-2 pl-5 text-xs text-muted-foreground">
        <li>Admin APIs require authenticated session and ADMIN role on the server.</li>
        <li>API keys (Gemini, MTC) are stored only in backend environment variables.</li>
        <li>Use Logout to end the admin browser session.</li>
        <li>Demo login: configure production admin accounts via your identity provider.</li>
      </ul>
    </PanelShell>
  );
}
