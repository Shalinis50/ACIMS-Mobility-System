import { useEffect, useState } from 'react';
import { ExternalLink, Map, Route, Search } from 'lucide-react';
import { Link } from 'wouter';
import { PageHeading } from '@/components/acims-ui';
import { REC_OUTER_CITY_ROUTE_MAP_URL, REC_ROUTE_MAP_LINKS, REC_TRANSPORT_TIMETABLE_URL } from '@/lib/recRouteMaps';

type RecRoute = {
  id: string;
  routeNumber: string;
  routeName: string;
  startingTimeDisplay: string | null;
  campusArrivalDisplay: string | null;
  viaNotes: string | null;
};

type RecStop = {
  id: string;
  stopName: string;
  sequenceNumber: number;
  timeDisplay: string | null;
  isCampus: boolean;
};

export default function RecRoutesMapPage() {
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [query, setQuery] = useState('');
  const [routes, setRoutes] = useState<RecRoute[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<(RecRoute & { stops: RecStop[] }) | null>(null);

  useEffect(() => {
    const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
    fetch(`/api/rec-transport/routes${qs}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRoutes(Array.isArray(data) ? data : []))
      .catch(() => setRoutes([]));
  }, [query]);

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

  return (
    <div className="page-in flex min-h-[calc(100dvh-8rem)] flex-col">
      <PageHeading
        eyebrow="Rajalakshmi transport"
        title="College bus routes"
        description="Official REC Transport routes, boarding points, and start times from rectransport.com. Re-sync when the college publishes a new timetable file."
        action={
          <a
            href={REC_TRANSPORT_TIMETABLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold hover:bg-muted"
          >
            <ExternalLink size={14} />
            Official timetable
          </a>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        <div className="rounded-[28px] border border-border bg-card p-5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search route no or pickup (Tambaram, 19E, Avadi)"
              className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm"
            />
          </div>
          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
            {routes.map((route) => (
              <button
                key={route.id}
                type="button"
                onClick={() => setSelectedId(route.id)}
                className={`w-full rounded-2xl border px-3 py-2.5 text-left ${
                  selectedId === route.id ? 'border-accent bg-accent/10' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold">Route {route.routeNumber}</span>
                  <span className="text-[11px] font-bold text-muted-foreground">{route.startingTimeDisplay || '—'}</span>
                </div>
                <div className="text-xs text-muted-foreground">{route.routeName}</div>
              </button>
            ))}
            {!routes.length && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Official routes are not loaded yet. Ask admin to sync from rectransport.com.
              </p>
            )}
          </div>
          {detail && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="text-sm font-extrabold">
                {detail.routeNumber}. {detail.routeName}
              </div>
              <p className="text-xs text-muted-foreground">
                Starts {detail.startingTimeDisplay || '—'} · Campus {detail.campusArrivalDisplay || '—'}
              </p>
              {detail.viaNotes && <p className="mt-1 text-[11px] text-muted-foreground">Via: {detail.viaNotes}</p>}
              <div className="mt-3 space-y-1">
                {detail.stops.map((stop) => (
                  <div key={stop.id} className="flex justify-between gap-2 text-xs">
                    <span>
                      {stop.sequenceNumber}. {stop.stopName}
                    </span>
                    <span className="font-bold">{stop.timeDisplay || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            {REC_ROUTE_MAP_LINKS.map((item) => (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  item.href === REC_OUTER_CITY_ROUTE_MAP_URL
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/40 text-foreground hover:bg-muted'
                }`}
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/public-transport"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            >
              <Route size={12} />
              Public transport
            </Link>
          </div>
          {iframeBlocked ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-muted/20 p-10 text-center">
              <Map className="mb-3 h-10 w-10 text-muted-foreground" />
              <a
                href={REC_OUTER_CITY_ROUTE_MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
              >
                <ExternalLink size={16} />
                Open REC route map
              </a>
            </div>
          ) : (
            <div className="relative min-h-[min(56vh,560px)] overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
              <iframe
                title="REC outer city bus routes"
                src={REC_OUTER_CITY_ROUTE_MAP_URL}
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                onError={() => setIframeBlocked(true)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
