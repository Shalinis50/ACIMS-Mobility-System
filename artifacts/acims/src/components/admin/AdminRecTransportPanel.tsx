import { useEffect, useState } from 'react';
import { BusFront, MapPin, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';

type RecStatus = {
  sourceLabel: string;
  defaultUrl: string;
  routesCount: number;
  stopsCount: number;
  officialPickupsCount?: number;
  status: {
    timetableUrl: string;
    connectionStatus: string;
    lastSuccessfulSync: string | null;
    routesCount: number;
    stopsCount: number;
    lastError: string | null;
  } | null;
};

type RecRoute = {
  id: string;
  routeNumber: string;
  routeName: string;
  startingTimeDisplay: string | null;
  campusArrivalDisplay: string | null;
  viaNotes: string | null;
  active: boolean;
};

type RecStop = {
  id: string;
  stopName: string;
  sequenceNumber: number;
  timeDisplay: string | null;
  time24: string | null;
  isCampus: boolean;
  latitude: number | null;
  longitude: number | null;
};

export function AdminRecTransportPanel() {
  const [status, setStatus] = useState<RecStatus | null>(null);
  const [timetableUrl, setTimetableUrl] = useState('');
  const [query, setQuery] = useState('');
  const [routes, setRoutes] = useState<RecRoute[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<(RecRoute & { stops: RecStop[] }) | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = () => {
    fetch('/api/rec-transport/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: RecStatus | null) => {
        if (!data) return;
        setStatus(data);
        setTimetableUrl((prev) => prev || data.status?.timetableUrl || data.defaultUrl);
      })
      .catch(() => {});
  };

  const loadRoutes = (q?: string) => {
    const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    fetch(`/api/rec-transport/routes${qs}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRoutes(Array.isArray(data) ? data : []))
      .catch(() => setRoutes([]));
  };

  useEffect(() => {
    loadStatus();
    loadRoutes();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    fetch(`/api/rec-transport/routes/${encodeURIComponent(selectedId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setDetail(data))
      .catch(() => setDetail(null));
  }, [selectedId]);

  const runSync = async (publishOfficialPickups = false) => {
    setSyncing(true);
    setError(null);
    try {
      const res = await mobilityAdminFetch('/rec-transport/sync', {
        method: 'POST',
        body: JSON.stringify({ timetableUrl, publishOfficialPickups }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Sync failed');
      loadStatus();
      loadRoutes(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const publishAllOfficial = async () => {
    setPublishing(true);
    setError(null);
    setPublishMessage(null);
    try {
      const res = await mobilityAdminFetch('/rec-transport/publish-pickups', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Publish failed');
      const published = (data as { published?: number }).published ?? 0;
      const routesPublished = (data as { routesPublished?: number }).routesPublished ?? 0;
      setPublishMessage(`Updated ${published} official pickup points across ${routesPublished} routes.`);
      loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const publishSelected = async () => {
    if (!selectedId) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await mobilityAdminFetch(`/rec-transport/routes/${encodeURIComponent(selectedId)}/publish-pickups`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Publish failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const connected = status?.status?.connectionStatus === 'CONNECTED';

  return (
    <section className="mt-5 space-y-4">
      <div className="rounded-[28px] border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Official college buses</div>
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <BusFront size={20} /> REC Transport routes
            </h2>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              Fetches route numbers, starting times, and boarding-point pickups from rectransport.com. Change the timetable URL when a new month file is published, then sync again.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={syncing}
              onClick={() => void runSync(false)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync official timetable'}
            </button>
            <button
              type="button"
              disabled={publishing || !status?.routesCount}
              onClick={() => void publishAllOfficial()}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-xs font-extrabold disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              {publishing ? 'Updating pickups…' : 'Update official pickup points'}
            </button>
          </div>
        </div>

        <label className="mt-4 block text-xs font-bold text-muted-foreground">
          Timetable URL
          <input
            value={timetableUrl}
            onChange={(e) => setTimetableUrl(e.target.value)}
            placeholder="https://www.rectransport.com/js/146routedec25.php"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </label>

        {error && (
          <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
            {error}
          </div>
        )}

        {publishMessage && (
          <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-800">
            {publishMessage}
          </div>
        )}

        {status && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Feed" value={connected ? 'CONNECTED' : status.status?.connectionStatus || 'PENDING'} ok={connected} />
            <Stat label="Routes" value={String(status.routesCount)} />
            <Stat label="Boarding points" value={String(status.stopsCount)} />
            <Stat label="Official pickups" value={String(status.officialPickupsCount ?? 0)} />
            <Stat
              label="Last sync"
              value={
                status.status?.lastSuccessfulSync
                  ? new Date(status.status.lastSuccessfulSync).toLocaleString()
                  : '—'
              }
            />
          </div>
        )}
        {status?.status?.lastError && (
          <p className="mt-2 text-xs text-amber-700">{status.status.lastError}</p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <div className="rounded-[28px] border border-border bg-card p-5">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              loadRoutes(e.target.value);
            }}
            placeholder="Search route number or area (e.g. 19E, Tambaram)"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto">
            {routes.map((route) => (
              <button
                key={route.id}
                type="button"
                onClick={() => setSelectedId(route.id)}
                className={`w-full rounded-2xl border px-3 py-3 text-left ${
                  selectedId === route.id ? 'border-accent bg-accent/10' : 'border-border bg-background'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold">Route {route.routeNumber}</span>
                  <span className="text-[11px] font-bold text-muted-foreground">{route.startingTimeDisplay || '—'}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{route.routeName}</div>
              </button>
            ))}
            {!routes.length && <p className="px-1 py-6 text-center text-xs text-muted-foreground">No routes yet. Run a sync.</p>}
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-card p-5">
          {!detail ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Select a route to see official pickup points and timings.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold">
                    {detail.routeNumber}. {detail.routeName}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Start {detail.startingTimeDisplay || '—'} · Campus {detail.campusArrivalDisplay || '—'}
                  </p>
                  {detail.viaNotes && <p className="mt-1 text-xs text-muted-foreground">Via: {detail.viaNotes}</p>}
                </div>
                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => void publishSelected()}
                  className="rounded-xl border border-border px-3 py-2 text-[11px] font-extrabold hover:bg-muted disabled:opacity-50"
                >
                  {publishing ? 'Publishing…' : 'Publish pickups to ACIMS'}
                </button>
              </div>
              <div className="mt-4 space-y-1.5">
                {detail.stops.map((stop) => (
                  <div key={stop.id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin size={13} className="shrink-0 text-muted-foreground" />
                      <span className="truncate text-xs font-bold">
                        {stop.sequenceNumber}. {stop.stopName}
                        {stop.isCampus ? ' (campus)' : ''}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] font-extrabold">{stop.timeDisplay || '—'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-1.5 text-sm font-extrabold">
        {ok === true && <CheckCircle2 size={14} className="text-emerald-600" />}
        {ok === false && <AlertTriangle size={14} className="text-amber-600" />}
        {value}
      </div>
    </div>
  );
}
