import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Bell, BusFront, CircleHelp, Clock3, Map, Menu, Mic, Route, TrainFront, WifiOff } from 'lucide-react';
import type { Bus } from '@workspace/api-client-react';
import { useNetworkStatus } from '@/hooks/use-network';

export const demoStudentId = 'student-20418';

export function useSelectedBusId() {
  const [selectedBusId, setSelectedBusId] = useState(() => localStorage.getItem('acims-selected-bus') ?? '');
  useEffect(() => {
    const sync = () => setSelectedBusId(localStorage.getItem('acims-selected-bus') ?? '');
    window.addEventListener('acims-bus-changed', sync);
    return () => window.removeEventListener('acims-bus-changed', sync);
  }, []);
  return selectedBusId;
}

export function selectBus(busId: string) {
  localStorage.setItem('acims-selected-bus', busId);
  window.dispatchEvent(new Event('acims-bus-changed'));
}

export function RouteMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`flex items-center gap-2 ${small ? 'text-sm' : 'text-base'}`}>
      <span className="relative grid h-8 w-8 place-items-center rounded-[11px] bg-accent text-primary">
        <BusFront size={18} strokeWidth={2.6} />
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-primary bg-accent" />
      </span>
      <span className="display-font font-extrabold tracking-[-0.08em]">ACIMS</span>
    </span>
  );
}

/** Core student commute: track bus, customize pickup on admin routes, fallback public transit */
const navItems = [
  { href: '/dashboard', label: 'Today', icon: Clock3 },
  { href: '/my-bus', label: 'My bus', icon: BusFront },
  { href: '/mobi', label: 'MOBI', icon: Mic },
  { href: '/map', label: 'Live map', icon: Map },
  { href: '/public-transport', label: 'Public transport', icon: TrainFront },
  { href: '/alerts', label: 'Alerts', icon: Bell },
];

export function AcimsLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isOnline } = useNetworkStatus();

  return (
    <div className="noise app-shell">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[238px] flex-col border-r border-border bg-primary px-4 py-5 text-primary-foreground lg:flex">
        <div className="px-3"><RouteMark /></div>
        <div className="mt-12 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-primary-foreground/45">Your commute</div>
        <nav className="mt-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === '/dashboard' ? (location === '/dashboard' || location === '/') : location.startsWith(href);
            return <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${active ? 'bg-accent text-accent-foreground' : 'text-primary-foreground/65 hover:bg-primary-foreground/10 hover:text-primary-foreground'}`}>
              <Icon size={18} strokeWidth={active ? 2.5 : 2} /><span>{label}</span>{label === 'Alerts' && <UnreadDot />}
            </Link>;
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 text-[11px] leading-5 text-primary-foreground/55">
          <p>{isOnline ? 'Bus status uses live driver GPS and your pickup on the college route.' : 'Offline — cached schedule only.'}</p>
          <Link href="/login" data-testid="link-sidebar-student-session" className="mt-3 inline-block font-bold text-accent">
            Sign out
          </Link>
        </div>
      </aside>
      <div className="lg:pl-[238px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-md sm:px-8">
          <button type="button" onClick={() => setMobileOpen((value) => !value)} aria-label="Open navigation" data-testid="button-open-navigation" className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"><Menu size={20} /></button>
          <div className="lg:hidden"><RouteMark small /></div>
          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            {/* Online / Offline Status & Interactive Testing Toggle */}
            {!isOnline && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-200">
                <WifiOff size={13} />
                Offline
              </span>
            )}

            <Link href="/alerts" data-testid="link-header-alerts" aria-label="Open alerts" className="relative rounded-full border border-border bg-card p-2.5 text-muted-foreground transition hover:-translate-y-0.5 hover:text-foreground"><Bell size={17} /><UnreadDot /></Link>
            <div className="hidden h-9 w-9 place-items-center rounded-full bg-secondary text-xs font-extrabold text-secondary-foreground sm:grid">MP</div>
          </div>
        </header>

        {/* Global Offline Persistent Status Strip */}
        {!isOnline && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 sm:px-8">
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-100">
                <WifiOff size={14} className="text-amber-600 dark:text-amber-400" />
                <span>Offline Mode: Live updates paused. Showing saved mobility information.</span>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/offline" className="font-extrabold text-amber-800 dark:text-amber-200 underline">
                  Open Offline Desk
                </Link>
              </div>
            </div>
          </div>
        )}

        {mobileOpen && <div className="absolute left-3 right-3 top-[80px] z-40 max-h-[calc(100dvh-100px)] overflow-y-auto rounded-2xl border border-border bg-card p-2 soft-shadow lg:hidden">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold hover:bg-muted"><Icon size={17} />{label}</Link>)}</div>}
        <main className="mx-auto max-w-[1440px] px-4 py-7 pb-28 sm:px-8 sm:py-10 lg:pb-12">{children}</main>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-[72px] items-center justify-around border-t border-border bg-card/95 px-3 backdrop-blur-lg lg:hidden">
        {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const active = href === '/dashboard' ? (location === '/dashboard' || location === '/') : location.startsWith(href);
          return <Link key={href} href={href} data-testid={`link-bottom-${label.toLowerCase().replace(' ', '-')}`} className={`flex min-w-[56px] flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold transition ${active ? 'text-foreground' : 'text-muted-foreground'}`}><span className={`rounded-xl px-2.5 py-1 ${active ? 'bg-accent text-accent-foreground' : ''}`}><Icon size={16} /></span>{label}</Link>;
        })}
      </nav>
    </div>
  );
}

function UnreadDot() {
  return <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mono mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</div><h1 className="display-font text-[clamp(2rem,5vw,3.6rem)] font-extrabold leading-[0.94] text-foreground">{title}</h1>{description && <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{action}</div>;
}

export function ErrorState({ onRetry, label = 'Could not load this right now.' }: { onRetry?: () => void; label?: string }) {
  return <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm"><div className="font-extrabold">A small signal hiccup.</div><p className="mt-1 text-muted-foreground">{label}</p>{onRetry && <button type="button" onClick={onRetry} data-testid="button-retry" className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:-translate-y-0.5">Try again</button>}</div>;
}

export function LoadingRows({ count = 3 }: { count?: number }) {
  return <div className="space-y-3" aria-label="Loading"><span className="sr-only">Loading</span>{Array.from({ length: count }).map((_, index) => <div key={index} className="skeleton h-16 rounded-2xl" />)}</div>;
}

export function formatUpdatedAt(date?: string) {
  if (!date) return 'recently';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  return minutes < 1 ? 'just now' : `${minutes} min ago`;
}

export function statusLabel(status?: string) {
  const value = status?.toLowerCase() ?? '';
  if (value.includes('delay')) return 'Delayed';
  if (value.includes('boarding')) return 'Boarding';
  if (value.includes('complete') || value.includes('done')) return 'Complete';
  return 'On route';
}

export function BusMiniRoute({ bus }: { bus: Bus }) {
  return <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><span className="rounded-md bg-muted px-2 py-1 text-foreground">#{bus.busNumber}</span><Route size={13} /><span>{bus.origin}</span><span className="text-border">→</span><span>{bus.destination}</span></div>;
}

export function EmptyState({ icon: Icon = CircleHelp, title, message }: { icon?: typeof CircleHelp; title: string; message: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center"><Icon size={25} className="mx-auto text-muted-foreground" /><h3 className="mt-3 text-sm font-extrabold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{message}</p></div>;
}