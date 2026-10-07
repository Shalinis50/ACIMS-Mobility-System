import { useEffect, useState } from 'react';
import { BusFront, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';

type MtcStatus = {
  connection_status: string;
  source_label: string;
  source_url: string;
  last_successful_sync: string | null;
  routes_count: number;
  stages_count: number;
  timetable_status: string;
  live_tracking_status: string;
  last_error: string | null;
  updated_at: string;
};

export function AdminMtcPanel() {
  const [status, setStatus] = useState<MtcStatus | null>(null);
  const [errors, setErrors] = useState<Array<{ occurred_at: string; operation: string; message: string }>>([]);
  const [syncing, setSyncing] = useState(false);

  const load = () => {
    fetch('/api/mtc/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.status) setStatus(data.status);
        if (data?.errors) setErrors(data.errors);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const runSync = async () => {
    setSyncing(true);
    try {
      await mobilityAdminFetch('/mtc/sync', { method: 'POST' });
      load();
    } finally {
      setSyncing(false);
    }
  };

  const connected = status?.connection_status === 'CONNECTED';

  return (
    <section className="mt-5 space-y-4">
      <div className="rounded-[28px] border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Public transport</div>
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <BusFront size={20} /> MTC integration
            </h2>
          </div>
          <button
            type="button"
            disabled={syncing}
            onClick={() => void runSync()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync from official site
          </button>
        </div>

        {status && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              label="MTC integration"
              value={connected ? 'CONNECTED' : status.connection_status}
              ok={connected}
            />
            <Stat label="Source" value="Official MTC Chennai" />
            <Stat
              label="Last successful update"
              value={status.last_successful_sync ? new Date(status.last_successful_sync).toLocaleString() : '—'}
            />
            <Stat label="Routes available" value={String(status.routes_count)} />
            <Stat label="Stages available" value={String(status.stages_count)} />
            <Stat label="Timetable data" value={status.timetable_status} />
            <Stat label="Live MTC tracking" value={status.live_tracking_status} />
          </div>
        )}

        {status?.last_error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            {status.last_error}
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div className="rounded-[28px] border border-border bg-card p-6">
          <h3 className="text-sm font-extrabold">Error log</h3>
          <ul className="mt-3 space-y-2 text-xs">
            {errors.map((e, i) => (
              <li key={i} className="rounded-lg border border-border px-3 py-2">
                <span className="font-mono text-muted-foreground">{new Date(e.occurred_at).toLocaleString()}</span>
                <span className="mx-2">·</span>
                <span className="font-bold">{e.operation}</span>
                <div className="text-muted-foreground mt-1">{e.message}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="text-[10px] font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-sm font-extrabold">
        {ok && <CheckCircle2 size={14} className="text-emerald-600" />}
        {value}
      </div>
    </div>
  );
}
