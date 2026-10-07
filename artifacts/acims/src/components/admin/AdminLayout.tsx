import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Bell,
  BusFront,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  Radio,
  Route as RouteIcon,
  Satellite,
  Settings,
  Timer,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type AdminSectionId =
  | 'overview'
  | 'live-buses'
  | 'schedule'
  | 'alerts'
  | 'buses-routes'
  | 'pickup-points'
  | 'shift-assignments'
  | 'drivers'
  // Legacy aliases for URL compatibility
  | 'dashboard'
  | 'map'
  | 'shifts'
  | 'buses'
  | 'routes'
  | 'pickups'
  | 'safety';

type NavItem = { id: AdminSectionId; label: string; icon: LucideIcon };
type NavGroup = { title: string; items: NavItem[] };

/** Simplified, clear Admin Navigation for College Transport Management */
export const ADMIN_NAV: NavGroup[] = [
  {
    title: 'TRANSPORT',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'live-buses', label: 'Live Buses', icon: Map },
      { id: 'schedule', label: 'Bus Schedule', icon: Timer },
      { id: 'alerts', label: 'Alerts', icon: Bell },
    ],
  },
  {
    title: 'BUS MANAGEMENT',
    items: [
      { id: 'buses-routes', label: 'Buses', icon: BusFront },
      { id: 'pickup-points', label: 'Pickup Points', icon: MapPin },
      { id: 'shift-assignments', label: 'Shift Assignments', icon: RouteIcon },
      { id: 'drivers', label: 'Drivers', icon: UserRound },
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
  return (
    <div className="page-in flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:w-56">
        <div className="rounded-[24px] border border-border bg-card p-4">
          <div className="mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            ACIMS Admin
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Transport command portal</p>
          <nav className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            {ADMIN_NAV.map((group) => (
              <div key={group.title}>
                <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{group.title}</div>
                <ul className="mt-1.5 space-y-0.5">
                  {group.items.map((item) => {
                    const active = section === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          data-testid={`nav-admin-${item.id}`}
                          onClick={() => onNavigate(item.id)}
                          className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-bold transition ${
                            active
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <item.icon size={14} />
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
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-foreground" />
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
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive"
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
  if (!slug || slug === 'dashboard' || slug === 'overview') return 'overview';
  if (slug === 'map' || slug === 'live-buses') return 'live-buses';
  if (slug === 'schedule' || slug === 'eta-delays') return 'schedule';
  if (slug === 'alerts' || slug === 'safety' || slug === 'notifications') return 'alerts';
  if (slug === 'buses-routes' || slug === 'buses' || slug === 'routes') return 'buses-routes';
  if (slug === 'pickup-points' || slug === 'pickups') return 'pickup-points';
  if (slug === 'shift-assignments' || slug === 'shifts') return 'shift-assignments';
  if (slug === 'drivers') return 'drivers';
  return 'overview';
}
