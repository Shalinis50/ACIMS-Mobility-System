import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bell,
  RefreshCw,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';

export type SafetyReport = {
  id: string;
  studentId: string;
  reportType: string;
  description: string;
  latitude: number;
  longitude: number;
  status: 'OPEN' | 'UNDER REVIEW' | 'RESOLVED' | 'DISMISSED' | string;
  createdAt: string;
};

export function AdminAlerts() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'UNDER REVIEW' | 'RESOLVED'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Broadcast modal state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'safety'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/safety');
      if (!res.ok) throw new Error('Unable to load this information.');
      return (await res.json()) as SafetyReport[];
    },
    refetchInterval: 10000,
  });

  const isLoading = query.isLoading && !query.data;
  const isError = query.isError && !query.data;

  const reports = query.data ?? [];
  const filteredReports = reports.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  const updateStatus = async (reportId: string, status: string) => {
    setUpdatingId(reportId);
    try {
      await mobilityAdminFetch(`/admin/safety/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'safety'] });
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setBroadcasting(true);
    try {
      const res = await mobilityAdminFetch('/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          target: { scope: 'all' },
        }),
      });
      if (res.ok) {
        setToast('Campus alert broadcast sent to all students.');
        setBroadcastTitle('');
        setBroadcastMessage('');
      }
    } catch {
      setToast('Broadcast could not be sent.');
    } finally {
      setBroadcasting(false);
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
            Could not retrieve safety alerts from the server.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => void query.refetch()}
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
          Loading alerts...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Live Operations
        </div>
        <h2 className="mt-1 text-2xl font-extrabold text-foreground">
          Alerts
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Real-time incident reports submitted by students and operational broadcast transmission.
        </p>
      </div>

      {toast && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          {toast}
        </div>
      )}

      {/* Broadcast Alert Section */}
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-primary" />
          <h3 className="font-extrabold text-base text-foreground">
            Send Urgent Service Broadcast
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Alert title (e.g. Route 18 Diverted via Poonamallee Bypass)"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
            className="admin-input rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
          />
          <input
            type="text"
            placeholder="Broadcast message details..."
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            className="admin-input rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            disabled={broadcasting || !broadcastTitle.trim() || !broadcastMessage.trim()}
            onClick={handleSendBroadcast}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground hover:opacity-95 disabled:opacity-50"
          >
            <Send size={13} /> {broadcasting ? 'Sending…' : 'Broadcast to All Students'}
          </button>
        </div>
      </div>

      {/* Safety Reports List */}
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-foreground">
              Student Incident Reports
            </h3>
            <span className="text-xs text-muted-foreground">
              {filteredReports.length} reports in view
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(['ALL', 'OPEN', 'UNDER REVIEW', 'RESOLVED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilter(st)}
                className={`rounded-lg px-3 py-1 text-xs font-extrabold transition ${
                  filter === st ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredReports.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No safety alerts recorded.
            </div>
          ) : (
            filteredReports.map((report) => (
              <div
                key={report.id}
                className="rounded-2xl border border-border p-4 bg-muted/15 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-foreground">
                        {report.reportType}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                          report.status === 'RESOLVED'
                            ? 'bg-emerald-500/15 text-emerald-700'
                            : report.status === 'UNDER REVIEW'
                            ? 'bg-amber-500/15 text-amber-700'
                            : 'bg-red-500/15 text-red-700'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Student: {report.studentId} · Coordinates: {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground mr-1">
                      Set Status:
                    </span>
                    {(['OPEN', 'UNDER REVIEW', 'RESOLVED'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={updatingId === report.id || report.status === st}
                        onClick={() => updateStatus(report.id, st)}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold transition ${
                          report.status === st
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="rounded-xl bg-background p-3 text-xs leading-5 text-foreground">
                  {report.description}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
