import { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  BusFront,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Footprints,
  Info,
  MapPin,
  PhoneCall,
  RefreshCw,
  Route as RouteIcon,
  ShieldAlert,
  TrainFront,
  WifiOff,
} from 'lucide-react';
import {
  getOfflineRoutes,
  getOfflineLocations,
  getOfflineContacts,
  getOfflinePublicTransit,
  getLastKnownBusSnapshots,
  getLastSyncTime,
} from '@/lib/offline-storage';
import { useNetworkStatus } from '@/hooks/use-network';

interface OfflineMobilityViewProps {
  initialTab?: 'routes' | 'locations' | 'contacts' | 'public-transit';
  selectedBusId?: string;
}

export function OfflineMobilityView({
  initialTab = 'routes',
  selectedBusId,
}: OfflineMobilityViewProps) {
  const { toggleSimulatedOffline, isSimulatedOffline, browserOnline } = useNetworkStatus();
  const [activeTab, setActiveTab] = useState<'routes' | 'locations' | 'contacts' | 'public-transit'>(initialTab);
  const [expandedRouteId, setExpandedRouteId] = useState<string>(selectedBusId || 'bus-12');
  const [locationSearch, setLocationSearch] = useState('');

  const routes = getOfflineRoutes();
  const locations = getOfflineLocations();
  const contacts = getOfflineContacts();
  const publicTransit = getOfflinePublicTransit();
  const snapshots = getLastKnownBusSnapshots();
  const lastSync = getLastSyncTime();

  const filteredLocations = locations.filter((loc) =>
    `${loc.name} ${loc.type} ${loc.description} ${loc.nearestStop}`
      .toLowerCase()
      .includes(locationSearch.toLowerCase())
  );

  return (
    <div className="page-in space-y-6" data-testid="offline-mobility-view">
      {/* Offline Alert Hero Card */}
      <div className="relative overflow-hidden rounded-[28px] border-2 border-amber-500/30 bg-amber-500/10 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500 text-primary-foreground shadow-md">
              <WifiOff size={24} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                  ACMIS · Offline Mode Active
                </span>
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800 dark:text-amber-200">
                  Live tracking paused
                </span>
              </div>
              <h1 className="display-font mt-1 text-2xl font-extrabold text-foreground sm:text-3xl">
                Offline Mobility Information Desk
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm">
                No internet connection detected. The interactive GPS map is safely paused to prevent broken tiles.
                All campus mobility routes, timetables, walking directions, and emergency safety contacts are loaded locally from device storage.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSimulatedOffline ? (
              <button
                type="button"
                onClick={toggleSimulatedOffline}
                data-testid="button-restore-online"
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3.5 text-xs font-extrabold text-primary-foreground transition hover:opacity-90"
              >
                <RefreshCw size={13} />
                <span>Restore Online Mode</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground transition hover:bg-muted"
              >
                <RefreshCw size={13} />
                <span>Retry Connection</span>
              </button>
            )}
          </div>
        </div>

        {/* Offline Available Features Checklist */}
        <div className="mt-6 border-t border-amber-500/20 pt-4">
          <div className="text-[11px] font-bold text-muted-foreground">
            Available locally on your device without internet:
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs font-bold text-foreground sm:grid-cols-3 lg:grid-cols-6">
            <span className="flex items-center gap-1.5 rounded-lg bg-card/70 px-2.5 py-1.5 backdrop-blur-sm border border-border">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>Campus Locations</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-card/70 px-2.5 py-1.5 backdrop-blur-sm border border-border">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>Bus Routes</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-card/70 px-2.5 py-1.5 backdrop-blur-sm border border-border">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>Bus Stops</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-card/70 px-2.5 py-1.5 backdrop-blur-sm border border-border">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>Bus Schedules</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-card/70 px-2.5 py-1.5 backdrop-blur-sm border border-border">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>Public Transit Guide</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-card/70 px-2.5 py-1.5 backdrop-blur-sm border border-border">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>Emergency Contacts</span>
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Offline Sections */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('routes')}
          data-testid="tab-offline-routes"
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
            activeTab === 'routes'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <BusFront size={14} />
          <span>Bus Routes & Schedules ({routes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('locations')}
          data-testid="tab-offline-locations"
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
            activeTab === 'locations'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Building2 size={14} />
          <span>Campus Buildings ({locations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('contacts')}
          data-testid="tab-offline-contacts"
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
            activeTab === 'contacts'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <ShieldAlert size={14} />
          <span>Emergency Assistance ({contacts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('public-transit')}
          data-testid="tab-offline-transit"
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
            activeTab === 'public-transit'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <TrainFront size={14} />
          <span>Public Transit Connections ({publicTransit.length})</span>
        </button>
      </div>

      {/* TAB 1: BUS ROUTES & SCHEDULES */}
      {activeTab === 'routes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing verified timetable schedules and stop sequences.</span>
            <span className="mono text-[10px]">Saved on device</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {routes.map((route) => {
              const snapshot = snapshots[route.id];
              const isExpanded = expandedRouteId === route.id;

              return (
                <div
                  key={route.id}
                  className={`rounded-[24px] border p-5 transition-all ${
                    isExpanded
                      ? 'border-primary/40 bg-card ring-2 ring-primary/10 shadow-sm'
                      : 'border-border bg-card hover:border-foreground/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground font-extrabold">
                        #{route.busNumber}
                      </span>
                      <div>
                        <h2 className="text-base font-extrabold text-foreground">{route.routeLabel}</h2>
                        <div className="text-xs font-bold text-muted-foreground">
                          {route.origin} → {route.destination}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedRouteId(isExpanded ? '' : route.id)}
                      className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:bg-muted"
                    >
                      {isExpanded ? 'Hide stops' : 'View stops'}
                    </button>
                  </div>

                  {/* Schedule & Headway Details */}
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Operating Hours</span>
                      <span className="font-extrabold text-foreground">{route.operatingHours}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Frequency</span>
                      <span className="font-extrabold text-foreground">{route.frequency}</span>
                    </div>
                  </div>

                  {/* Last Known State Label */}
                  {snapshot && (
                    <div className="mt-3 rounded-xl border border-border/80 bg-muted/20 px-3 py-2 text-[11px]">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-bold flex items-center gap-1">
                          <Clock3 size={11} className="text-amber-500" />
                          Last recorded position:
                        </span>
                        <span className="mono text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          Last updated at {snapshot.savedAt}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-foreground">
                        Near <strong>{snapshot.lastStop}</strong> · {snapshot.status}
                      </div>
                    </div>
                  )}

                  {/* Intermediate Stops Sequence */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-border pt-4">
                      <div className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Stops & Landmarks ({route.stops.length})
                      </div>
                      <div className="space-y-2.5">
                        {route.stops.map((stop, idx) => (
                          <div key={stop.sequence} className="flex items-start gap-2.5 text-xs">
                            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-extrabold text-foreground">{stop.name}</div>
                              {stop.landmark && (
                                <div className="text-[10px] text-muted-foreground">{stop.landmark}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CAMPUS BUILDINGS & LOCATIONS */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="text"
              placeholder="Search campus buildings, departments, or blocks…"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="h-10 w-full max-w-md rounded-xl border border-input bg-card px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground font-semibold">
              Showing {filteredLocations.length} locations
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLocations.map((loc) => (
              <div
                key={loc.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-foreground/20"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-extrabold text-secondary-foreground">
                      {loc.type}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                      <Footprints size={12} className="text-accent-foreground" />
                      {loc.walkingFromMain}
                    </span>
                  </div>

                  <h2 className="mt-2 text-base font-extrabold text-foreground">{loc.name}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{loc.description}</p>
                </div>

                <div className="mt-4 rounded-xl bg-muted/40 p-2.5 text-[11px]">
                  <span className="font-bold text-muted-foreground">Nearest Bus Stop: </span>
                  <strong className="text-foreground">{loc.nearestStop}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: EMERGENCY ASSISTANCE & SAFETY */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs">
            <div className="flex items-center gap-2 font-extrabold text-rose-600 dark:text-rose-400">
              <ShieldAlert size={16} />
              <span>Campus Offline Emergency Assistance Protocol</span>
            </div>
            <p className="mt-1 text-muted-foreground">
              These official campus emergency numbers are stored directly on your phone. Even without internet,
              you can dial these numbers via standard cellular connection.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div>
                  <div className="mono text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    {contact.department}
                  </div>
                  <h2 className="mt-1 text-base font-extrabold text-foreground">{contact.name}</h2>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin size={12} className="shrink-0 text-accent-foreground" />
                    <span>{contact.location}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <div className="text-xs font-extrabold text-foreground">{contact.phone}</div>
                    <div className="text-[10px] text-muted-foreground font-semibold">{contact.ext}</div>
                  </div>

                  <a
                    href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-extrabold text-white transition hover:bg-rose-700 shadow-sm"
                  >
                    <PhoneCall size={13} />
                    <span>Call Now</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PUBLIC TRANSIT CONNECTIONS */}
      {activeTab === 'public-transit' && (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground">
            Saved connecting options for public transit services connecting Rajalakshmi / Tambaram corridor.
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {publicTransit.map((guide, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                      {guide.category.includes('Bus') ? (
                        <BusFront size={16} />
                      ) : (
                        <TrainFront size={16} />
                      )}
                    </span>
                    <div>
                      <span className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {guide.category}
                      </span>
                      <h2 className="text-sm font-extrabold text-foreground">{guide.name}</h2>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div>
                      <span className="font-bold text-muted-foreground block text-[10px] uppercase">Route Details</span>
                      <p className="mt-0.5 leading-5 text-foreground">{guide.routeDetails}</p>
                    </div>
                    <div>
                      <span className="font-bold text-muted-foreground block text-[10px] uppercase">Frequency</span>
                      <p className="mt-0.5 leading-5 text-foreground">{guide.frequency}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-muted/50 p-2.5 text-[11px]">
                  <strong className="text-foreground">How to Connect: </strong>
                  <span className="text-muted-foreground">{guide.campusConnection}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
