import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  BusFront,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  Radio,
  Route as RouteIcon,
  Satellite,
  Settings,
  ShieldAlert,
  Timer,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type AdminSectionId =
  | 'dashboard'
  | 'map'
  | 'college-route'
  | 'buses'
  | 'drivers'
  | 'routes'
  | 'shifts'
  | 'pickups'
  | 'trips'
  | 'gps'
  | 'eta-delays'
  | 'notifications'
  | 'students'
  | 'campus'
  | 'mtc'
  | 'navi'
  | 'analytics'
  | 'trip-history'
  | 'audit'
  | 'queues'
  | 'safety'
  | 'settings';

type NavItem = { id: AdminSectionId; label: string; icon: LucideIcon };
type NavGroup = { title: string; items: NavItem[] };

export const ADMIN_NAV: NavGroup[] = [
  {
    title: 'Command',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'map', label: 'Live Map', icon: Map },
    ],
  },
  {
    title: 'Transport',
    items: [
      { id: 'college-route', label: 'College route', icon: RouteIcon },
      { id: 'buses', label: 'Buses', icon: BusFront },
      { id: 'drivers', label: 'Drivers', icon: UserRound },
      { id: 'routes', label: 'Routes', icon: RouteIcon },
      { id: 'shifts', label: 'Shift Management', icon: MapPin },
      { id: 'pickups', label: 'Pickup Points', icon: MapPin },
      { id: 'trips', label: 'Trips', icon: Activity },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { id: 'gps', label: 'GPS Monitor', icon: Satellite },
      { id: 'eta-delays', label: 'ETA & Delays', icon: Timer },
      { id: 'notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    title: 'People & Campus',
    items: [
      { id: 'students', label: 'Students', icon: UsersRound },
      { id: 'campus', label: 'Campus', icon: MapPin },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { id: 'mtc', label: 'Public Transport', icon: Radio },
      { id: 'navi', label: 'NAVI AI', icon: Bot },
    ],
  },
  {
    title: 'Insights',
    items: [
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'trip-history', label: 'Trip History', icon: History },
      { id: 'audit', label: 'Admin Activity', icon: ClipboardList },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'queues', label: 'Queues', icon: UsersRound },
      { id: 'safety', label: 'Safety', icon: ShieldAlert },
      { id: 'settings', label: 'Settings', icon: Settings },
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
  const all = ADMIN_NAV.flatMap((g) => g.items.map((i) => i.id));
  if (!slug) return 'dashboard';
  return (all.includes(slug as AdminSectionId) ? slug : 'dashboard') as AdminSectionId;
}
