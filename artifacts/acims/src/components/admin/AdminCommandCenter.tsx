import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Popup, CircleMarker } from 'react-leaflet';
import { Activity, AlertTriangle, BusFront, CheckCircle2, Radio } from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';
import 'leaflet/dist/leaflet.css';

type FleetRow = {
  busId: string;
  busNumber: string;
  latitude: number | null;
  longitude: number | null;
  delayStatus: string;
  delayMinutes: number;
  etaMinutes: number | null;
  isGpsIssue: boolean;
  gpsFreshness: string;
  tripStatus: string;
};

type CommandCenterPayload = {
  generatedAt: string;
  counters: {
    onTime: number;
    delayed: number;
    gpsIssues: number;
    activeBuses: number;
    activeTrips: number;
    activeDrivers?: number;
  };
  fleet: FleetRow[];
};

const CAMPUS_CENTER: [number, number] = [12.884, 80.218];

function markerColor(row: FleetRow) {
  if (row.isGpsIssue) return '#ef4444';
  if (row.delayStatus !== 'ON_TIME' && row.delayMinutes > 2) return '#f59e0b';
  return '#22c55e';
}

export function AdminCommandCenter() {
  const query = useQuery({
    queryKey: ['mobility', 'command-center'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/mobility/command-center');
      if (!res.ok) throw new Error('Command center unavailable');
      return (await res.json()) as CommandCenterPayload;
    },
    refetchInterval: 5000,
  });

  const data = query.data;
  const mapCenter = useMemo(() => {
    const withCoords = data?.fleet.find((f) => f.latitude != null && f.longitude != null);
    if (withCoords?.latitude != null && withCoords.longitude != null) {
      return [withCoords.latitude, withCoords.longitude] as [number, number];
    }
    return CAMPUS_CENTER;
  }, [data?.fleet]);

  if (query.isLoading) {
    return <div className="rounded-[28px] border border-border bg-card p-8 text-sm text-muted-foreground">Loading command center…</div>;
  }
  if (query.isError || !data) {
    return (
      <div className="rounded-[28px] border border-destructive/30 bg-destructive/5 p-8 text-sm text-destructive">
        Could not load live command center. Ensure you are signed in as admin.
      </div>
    );
  }

  const { counters, fleet } = data;

  return (
    <section className="mt-5 space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <CounterCard
          icon={CheckCircle2}
          label="On time"
          value={counters.onTime}
          tone="emerald"
          testId="counter-on-time"
        />
        <CounterCard
          icon={AlertTriangle}
          label="Delayed"
          value={counters.delayed}
          tone="amber"
          testId="counter-delayed"
        />
        <CounterCard
          icon={Radio}
          label="GPS issues"
          value={counters.gpsIssues}
          tone="red"
          testId="counter-gps-issues"
        />
      </div>

      <div className="rounded-[28px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Command center</div>
            <h2 className="text-xl font-extrabold">Live fleet map</h2>
          </div>
          <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Activity size={14} className="text-emerald-500 animate-pulse" />
            Updated {new Date(data.generatedAt).toLocaleTimeString()}
          </span>
        </div>
        <div className="h-[420px] w-full" data-testid="command-center-map">
          <MapContainer center={mapCenter} zoom={12} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {fleet.map((row) => {
              if (row.latitude == null || row.longitude == null) return null;
              const color = markerColor(row);
              return (
                <CircleMarker
                  key={row.busId}
                  center={[row.latitude, row.longitude]}
                  radius={10}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.85 }}
                >
                  <Popup>
                    <div className="text-xs font-semibold">
                      Bus #{row.busNumber}
                      <br />
                      {row.isGpsIssue ? 'GPS issue' : row.delayStatus}
                      {row.etaMinutes != null ? ` · ETA ${row.etaMinutes} min` : ''}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
        <div className="grid gap-2 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
          {fleet.map((row) => (
            <div key={row.busId} className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs">
              <BusFront size={14} />
              <span className="font-extrabold">#{row.busNumber}</span>
              <span className="text-muted-foreground">{row.tripStatus}</span>
              <span
                className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                  row.isGpsIssue ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {row.isGpsIssue ? 'GPS' : row.delayStatus.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CounterCard({
  icon: Icon,
  label,
  value,
  tone,
  testId,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  tone: 'emerald' | 'amber' | 'red';
  testId: string;
}) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : tone === 'amber'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200'
        : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300';

  return (
    <div data-testid={testId} className={`rounded-2xl border p-5 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide opacity-80">
        <Icon size={16} />
        {label}
      </div>
      <div className="display-font mt-2 text-4xl font-extrabold">{value}</div>
    </div>
  );
}
