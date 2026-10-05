import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BusFront, RefreshCw, Radio, MapPin, User, CheckCircle2 } from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';

type MonitorBus = {
  busId: string;
  busNumber: string;
  routeName: string;
  driverName: string;
  status: 'LIVE' | 'OFFLINE';
  lastUpdate: string;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
};

export function AdminLiveMonitoring() {
  const { data: buses = [], isLoading, refetch, isFetching } = useQuery<MonitorBus[]>({
    queryKey: ['admin', 'live-monitoring'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/live-monitoring');
      if (!res.ok) throw new Error('Failed to fetch live monitoring data');
      return res.json();
    },
    refetchInterval: 10000,
  });

  const [search, setSearch] = useState('');

  const filtered = buses.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.busNumber.toLowerCase().includes(q) ||
      b.routeName.toLowerCase().includes(q) ||
      b.driverName.toLowerCase().includes(q)
    );
  });

  const liveCount = buses.filter((b) => b.status === 'LIVE').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            Telemetry Feed
          </div>
          <h2 className="display-font mt-1 text-2xl font-extrabold text-foreground sm:text-3xl">
            Live Fleet Monitoring
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Real-time GPS status and last telemetry updates across all registered campus buses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {liveCount} Live Transmitting
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold shadow-xs hover:bg-muted"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <input
            type="text"
            placeholder="Search by bus number, route, or driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <span className="text-xs text-muted-foreground">
            Total {filtered.length} Buses
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/80 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">Bus</th>
                <th className="pb-3 px-4">Route</th>
                <th className="pb-3 px-4">Driver</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 pl-4">Last Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Loading live telemetry data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No matching buses found.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.busId} className="hover:bg-muted/40 transition">
                    <td className="py-3.5 pr-4 font-extrabold text-foreground flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                        <BusFront size={16} />
                      </span>
                      <span>Bus {b.busNumber}</span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground font-medium">
                      {b.routeName}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {b.driverName === 'Not assigned' ? (
                        <span className="text-muted-foreground italic">Not assigned</span>
                      ) : (
                        <span className="text-foreground font-bold">{b.driverName}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {b.status === 'LIVE' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                          LIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                          OFFLINE
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pl-4 text-muted-foreground font-mono text-[11px]">
                      {b.lastUpdate}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
