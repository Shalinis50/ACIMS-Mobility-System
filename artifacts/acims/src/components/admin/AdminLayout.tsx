import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BusFront,
  Clock,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  Route as RouteIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type AdminSectionId =
  | 'dashboard'
  | 'live-buses'
  | 'alerts'
  | 'bus-routes'
  | 'pickup-points'
  | 'shift-management'
  | 'buses-drivers'
  // Legacy aliases for backward URL compatibility
  | 'overview'
  | 'schedule'
  | 'buses-routes'
  | 'shift-assignments'
  | 'drivers'
  | 'map'
  | 'shifts'
  | 'buses'
  | 'routes'
  | 'pickups'
  | 'safety';

type NavItem = { id: AdminSectionId; label: string; icon: LucideIcon };
type NavGroup = { title: string; items: NavItem[] };

/**
 * Clean Admin Navigation for ACMIS Campus Transport:
 * 1. LIVE OPERATIONS: Dashboard, Live Buses, Alerts
 * 2. TRANSPORT MANAGEMENT: Bus Routes, Pickup Points, Shift Management
 * 3. BUSES & DRIVERS: Buses & Drivers
 */
export const ADMIN_NAV: NavGroup[] = [
  {
    title: 'LIVE OPERATIONS',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'live-buses', label: 'Live Buses', icon: Map },
      { id: 'alerts', label: 'Alerts', icon: Bell },
    ],
  },
  {
    title: 'TRANSPORT MANAGEMENT',
    items: [
      { id: 'bus-routes', label: 'Bus Routes', icon: RouteIcon },
      { id: 'pickup-points', label: 'Pickup Points', icon: MapPin },
      { id: 'shift-management', label: 'Shift Management', icon: Clock },
    ],
  },
  {
    title: 'BUSES & DRIVERS',
    items: [
      { id: 'buses-drivers', label: 'Buses & Drivers', icon: BusFront },
    ],
  },
];

type Props = {
  section: AdminSectionId;
  onNavigate: (id: AdminSectionId) => void;
  onLogout: () => void;
  onRefresh?: () => void;
  systemStatus?: string;
  children: ReactNode;
};

export function AdminLayout({ section, onNavigate, onLogout, onRefresh, systemStatus, children }: Props) {
  // Normalize alias to primary section id
  const canonicalSection = parseAdminSection(section);

  return (
    <div className="page-in flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:w-60">
        <div className="rounded-[24px] border border-border bg-card p-4">
          <div className="mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            ACMIS Admin
          </div>
          <p className="mt-1 text-xs text-muted-foreground font-semibold">Campus Transport Portal</p>
          <nav className="mt-4 space-y-4 pr-1">
            {ADMIN_NAV.map((group) => (
              <div key={group.title}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </div>
                <ul className="mt-1.5 space-y-1">
                  {group.items.map((item) => {
                    const active = canonicalSection === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          data-testid={`nav-admin-${item.id}`}
                          onClick={() => onNavigate(item.id)}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                            active
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <item.icon size={15} />
                          {item.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {systemStatus && (
              <div className="rounded-xl bg-muted/60 px-3 py-2 text-[10px] font-bold text-muted-foreground">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {systemStatus}
              </div>
            )}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="w-full rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-muted"
              >
                Refresh data
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              data-testid="button-admin-logout"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/15"
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function parseAdminSection(path: string): AdminSectionId {
  const slug = path.replace(/^\/admin\/?/, '').split('/')[0];
  if (!slug || slug === 'dashboard' || slug === 'overview') return 'dashboard';
  if (slug === 'map' || slug === 'live-buses') return 'live-buses';
  if (slug === 'alerts' || slug === 'safety') return 'alerts';
  if (slug === 'bus-routes' || slug === 'routes' || slug === 'buses-routes' || slug === 'schedule') return 'bus-routes';
  if (slug === 'pickup-points' || slug === 'pickups') return 'pickup-points';
  if (slug === 'shift-management' || slug === 'shift-assignments' || slug === 'shifts') return 'shift-management';
  if (slug === 'buses-drivers' || slug === 'drivers' || slug === 'buses' || slug === 'fleet') return 'buses-drivers';
  return 'dashboard';
}
