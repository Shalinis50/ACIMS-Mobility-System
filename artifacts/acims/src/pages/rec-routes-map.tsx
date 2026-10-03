import { useState } from 'react';
import { ExternalLink, Map, Route } from 'lucide-react';
import { Link } from 'wouter';
import { PageHeading } from '@/components/acims-ui';
import { REC_OUTER_CITY_ROUTE_MAP_URL, REC_ROUTE_MAP_LINKS } from '@/lib/recRouteMaps';

export default function RecRoutesMapPage() {
  const [iframeBlocked, setIframeBlocked] = useState(false);

  return (
    <div className="page-in flex min-h-[calc(100dvh-8rem)] flex-col">
      <PageHeading
        eyebrow="Rajalakshmi transport"
        title="Outer city bus routes"
        description="Official REC route map for feeder services to and from campus (Thandalam). Use this when choosing a pickup point or planning public connections."
        action={
          <a
            href={REC_OUTER_CITY_ROUTE_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold hover:bg-muted"
          >
            <ExternalLink size={14} />
            Open full map
          </a>
        }
      />

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
          REC corridor timetables
        </Link>
        <Link
          href="/my-bus"
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          <Map size={12} />
          My bus (live GPS)
        </Link>
      </div>

      {iframeBlocked ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-muted/20 p-10 text-center">
          <Map className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-bold">Map could not be embedded in this view.</p>
          <p className="mt-2 max-w-md text-xs text-muted-foreground">
            Open the official REC outer city route map in your browser.
          </p>
          <a
            href={REC_OUTER_CITY_ROUTE_MAP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            <ExternalLink size={16} />
            Open REC route map
          </a>
        </div>
      ) : (
        <div className="relative min-h-[min(72vh,720px)] flex-1 overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
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

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Route data ©{' '}
        <a
          href="https://fit25.com/recroutes/location.php"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Rajalakshmi REC route maps
        </a>
        . Live college bus ETA is on{' '}
        <Link href="/my-bus" className="font-semibold underline">My bus</Link>.
      </p>
    </div>
  );
}
