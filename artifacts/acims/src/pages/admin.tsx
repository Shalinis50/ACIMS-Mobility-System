import { useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BusFront,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  MapPin,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Route as RouteIcon,
  ShieldAlert,
  UserCheck,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetAdminDashboardQueryKey,
  getGetAdminQueuesQueryKey,
  getGetAdminSafetyReportsQueryKey,
  getListAdminBusesQueryKey,
  getListAdminDriversQueryKey,
  getListAdminRoutesQueryKey,
  useCreateAdminBus,
  useCreateAdminDriver,
  useCreateAdminRoute,
  useDeactivateAdminBus,
  useGetAdminDashboard,
  useGetAdminQueues,
  useGetAdminSafetyReports,
  useListAdminBuses,
  useListAdminDrivers,
  useListAdminRoutes,
  useUpdateAdminBus,
} from '@workspace/api-client-react';
import type { AdminBus, AdminRoute, Driver, SafetyReport } from '@workspace/api-client-react';
import { EmptyState, ErrorState, LoadingRows, PageHeading } from '@/components/acims-ui';

type AdminTab = 'monitoring' | 'buses' | 'routes' | 'drivers' | 'queues' | 'safety';

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('monitoring');

  // Queries
  const dashboardQuery = useGetAdminDashboard({ query: { queryKey: getGetAdminDashboardQueryKey() } });
  const busesQuery = useListAdminBuses({ query: { queryKey: getListAdminBusesQueryKey() } });
  const driversQuery = useListAdminDrivers({ query: { queryKey: getListAdminDriversQueryKey() } });
  const routesQuery = useListAdminRoutes({ query: { queryKey: getListAdminRoutesQueryKey() } });
  const queuesQuery = useGetAdminQueues({ query: { queryKey: getGetAdminQueuesQueryKey() } });
  const safetyQuery = useGetAdminSafetyReports({ query: { queryKey: getGetAdminSafetyReportsQueryKey() } });

  // Mutations
  const createBus = useCreateAdminBus();
  const updateBus = useUpdateAdminBus();
  const deactivateBus = useDeactivateAdminBus();
  const createDriver = useCreateAdminDriver();
  const createRoute = useCreateAdminRoute();

  // New Bus form
  const [busNumber, setBusNumber] = useState('');
  const [busRouteId, setBusRouteId] = useState('');
  const [busDriverId, setBusDriverId] = useState('');
  const [capacity, setCapacity] = useState('40');

  // Edit Bus state
  const [editingBus, setEditingBus] = useState<AdminBus | null>(null);
  const [editBusCapacity, setEditBusCapacity] = useState('');
  const [editBusRouteId, setEditBusRouteId] = useState('');
  const [editBusDriverId, setEditBusDriverId] = useState('');

  // New Driver form
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverBusId, setDriverBusId] = useState('');
  const [driverRouteId, setDriverRouteId] = useState('');

  // New Route form
  const [routeName, setRouteName] = useState('');
  const [routeDestination, setRouteDestination] = useState('');
  const [routeStops, setRouteStops] = useState('');

  // Edit Route state
  const [editingRoute, setEditingRoute] = useState<AdminRoute | null>(null);
  const [editRouteName, setEditRouteName] = useState('');
  const [editRouteDest, setEditRouteDest] = useState('');
  const [editRouteStops, setEditRouteStops] = useState('');

  // Safety filter & status updating state
  const [safetyFilter, setSafetyFilter] = useState<'ALL' | 'OPEN' | 'UNDER REVIEW' | 'RESOLVED' | 'DISMISSED'>('ALL');
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);

  const dashboard = dashboardQuery.data;
  const buses = busesQuery.data ?? [];
  const drivers = driversQuery.data ?? [];
  const routes = routesQuery.data ?? [];
  const queues = queuesQuery.data ?? [];
  const safety = safetyQuery.data ?? [];

  const invalidate = (keys: readonly unknown[]) => void queryClient.invalidateQueries({ queryKey: keys });

  const refreshAll = () => {
    void dashboardQuery.refetch();
    void busesQuery.refetch();
    void driversQuery.refetch();
    void routesQuery.refetch();
    void queuesQuery.refetch();
    void safetyQuery.refetch();
  };

  const submitBus = () => {
    if (!busNumber.trim() || !busRouteId) return;
    createBus.mutate(
      { data: { busNumber: busNumber.trim(), routeId: busRouteId, driverId: busDriverId || undefined, capacity: Number(capacity), active: true } },
      {
        onSuccess: () => {
          setBusNumber('');
          setBusRouteId('');
          setBusDriverId('');
          invalidate(getListAdminBusesQueryKey());
          invalidate(getGetAdminDashboardQueryKey());
        },
      }
    );
  };

  const handleSaveEditBus = () => {
    if (!editingBus) return;
    updateBus.mutate(
      {
        busId: editingBus.id,
        data: {
          busNumber: editingBus.busNumber,
          routeId: editBusRouteId || editingBus.routeId,
          driverId: editBusDriverId || editingBus.driverId,
          capacity: Number(editBusCapacity) || editingBus.capacity,
          active: editingBus.active,
        },
      },
      {
        onSuccess: () => {
          setEditingBus(null);
          invalidate(getListAdminBusesQueryKey());
          invalidate(getGetAdminDashboardQueryKey());
        },
      }
    );
  };

  const toggleBusActive = (bus: AdminBus) => {
    deactivateBus.mutate(
      { busId: bus.id },
      {
        onSuccess: () => {
          invalidate(getListAdminBusesQueryKey());
          invalidate(getGetAdminDashboardQueryKey());
        },
      }
    );
  };

  const submitDriver = () => {
    if (!driverName.trim() || !driverPhone.trim()) return;
    createDriver.mutate(
      { data: { name: driverName.trim(), phone: driverPhone.trim(), active: true } },
      {
        onSuccess: () => {
          setDriverName('');
          setDriverPhone('');
          invalidate(getListAdminDriversQueryKey());
          invalidate(getGetAdminDashboardQueryKey());
        },
      }
    );
  };

  const toggleDriverActive = async (driver: Driver) => {
    try {
      await fetch(`/api/admin/drivers/${driver.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-acims-role': 'admin' },
        body: JSON.stringify({ active: !driver.active }),
      });
      invalidate(getListAdminDriversQueryKey());
    } catch {
      // ignore
    }
  };

  const submitRoute = () => {
    if (!routeName.trim() || !routeDestination.trim()) return;
    createRoute.mutate(
      {
        data: {
          name: routeName.trim(),
          destination: routeDestination.trim(),
          stopIds: routeStops.split(',').map((item) => item.trim()).filter(Boolean),
          active: true,
        },
      },
      {
        onSuccess: () => {
          setRouteName('');
          setRouteDestination('');
          setRouteStops('');
          invalidate(getListAdminRoutesQueryKey());
          invalidate(getGetAdminDashboardQueryKey());
        },
      }
    );
  };

  const handleSaveEditRoute = async () => {
    if (!editingRoute) return;
    try {
      await fetch(`/api/admin/routes/${editingRoute.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-acims-role': 'admin' },
        body: JSON.stringify({
          name: editRouteName.trim() || editingRoute.name,
          destination: editRouteDest.trim() || editingRoute.destination,
          stopIds: editRouteStops.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      setEditingRoute(null);
      invalidate(getListAdminRoutesQueryKey());
      invalidate(getGetAdminDashboardQueryKey());
    } catch {
      // ignore
    }
  };

  const toggleRouteActive = async (route: AdminRoute) => {
    try {
      await fetch(`/api/admin/routes/${route.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-acims-role': 'admin' },
        body: JSON.stringify({ active: !route.active }),
      });
      invalidate(getListAdminRoutesQueryKey());
      invalidate(getGetAdminDashboardQueryKey());
    } catch {
      // ignore
    }
  };

  const updateSafetyStatus = async (reportId: string, status: string) => {
    setUpdatingReportId(reportId);
    try {
      await fetch(`/api/admin/safety/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-acims-role': 'admin' },
        body: JSON.stringify({ status }),
      });
      invalidate(getGetAdminSafetyReportsQueryKey());
      invalidate(getGetAdminDashboardQueryKey());
    } catch {
      // ignore
    } finally {
      setUpdatingReportId(null);
    }
  };

  const isLoading =
    dashboardQuery.isLoading ||
    busesQuery.isLoading ||
    driversQuery.isLoading ||
    routesQuery.isLoading ||
    queuesQuery.isLoading ||
    safetyQuery.isLoading;

  const isError =
    dashboardQuery.isError ||
    busesQuery.isError ||
    driversQuery.isError ||
    routesQuery.isError ||
    queuesQuery.isError ||
    safetyQuery.isError;

  if (isLoading) return <LoadingRows count={6} />;
  if (isError) return <ErrorState onRetry={refreshAll} label="Operations data could not be loaded." />;

  const filteredSafety = safety.filter((r) => (safetyFilter === 'ALL' ? true : r.status === safetyFilter));

  return (
    <div className="page-in">
      <PageHeading
        eyebrow="Transport operations desk"
        title="Administer the network."
        description="Comprehensive transport management for fleet buses, active routes, certified drivers, queue pressure, and student safety concerns."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshAll}
              data-testid="button-admin-refresh"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-muted"
            >
              <RefreshCw size={13} /> Refresh state
            </button>
            <div className="rounded-full border border-border bg-card px-3 py-2 text-[11px] font-extrabold">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent-foreground" />
              {dashboard?.systemStatus ?? 'Operational'}
            </div>
          </div>
        }
      />

      {/* DASHBOARD STATS OVERVIEW */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {dashboard && (
          <>
            <AdminStat icon={BusFront} label="Active fleet buses" value={dashboard.activeBuses} />
            <AdminStat icon={RouteIcon} label="Active campus routes" value={dashboard.activeRoutes} />
            <AdminStat icon={UsersRound} label="Queue passengers" value={dashboard.queueEntries} />
            <AdminStat icon={ShieldAlert} label="Open safety tickets" value={dashboard.openSafetyReports} />
          </>
        )}
      </section>

      {/* TAB NAVIGATION */}
      <div className="mt-7 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {[
          { id: 'monitoring', label: 'Transport Monitoring', icon: Activity },
          { id: 'buses', label: `Fleet Buses (${buses.length})`, icon: BusFront },
          { id: 'routes', label: `Routes (${routes.length})`, icon: RouteIcon },
          { id: 'drivers', label: `Drivers (${drivers.length})`, icon: UserRound },
          { id: 'queues', label: 'Queue Management', icon: UsersRound },
          { id: 'safety', label: `Safety Desk (${safety.length})`, icon: ShieldAlert },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            data-testid={`tab-admin-${id}`}
            onClick={() => setActiveTab(id as AdminTab)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
              activeTab === id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: TRANSPORT MONITORING */}
      {activeTab === 'monitoring' && (
        <section className="mt-5 space-y-5">
          <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Fleet Telemetry</div>
                <h2 className="mt-1 text-2xl font-extrabold">Real-Time Operational Monitor</h2>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-accent-foreground">
                <Radio size={13} className="animate-pulse" /> Live GPS Feed
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {buses.map((bus) => (
                <div key={bus.id} data-testid={`monitor-bus-${bus.id}`} className="rounded-2xl border border-border p-4 bg-muted/40">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-extrabold">
                      <BusFront size={16} className="text-primary" /> Bus #{bus.busNumber}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                      bus.status.toLowerCase().includes('delay') ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {bus.status}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground truncate">
                    Route: {routes.find((r) => r.id === bus.routeId)?.name ?? bus.routeId}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs font-bold">
                    <span>Driver: {drivers.find((d) => d.id === bus.driverId)?.name ?? 'Assigned Pool'}</span>
                    <span>Cap: {bus.capacity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: BUS MANAGEMENT */}
      {activeTab === 'buses' && (
        <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Fleet Register</div>
            <h2 className="mt-1 text-2xl font-extrabold">Managed Vehicles</h2>

            <div className="mt-6 space-y-3">
              {buses.map((bus) => (
                <div key={bus.id} data-testid={`row-admin-bus-${bus.id}`} className="rounded-2xl border border-border p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold">Bus #{bus.busNumber}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${bus.active ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {bus.active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="rounded-full bg-card border border-border px-2 py-0.5 text-[9px] font-bold">
                        {bus.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Route: {routes.find((r) => r.id === bus.routeId)?.name ?? bus.routeId} · Driver: {drivers.find((d) => d.id === bus.driverId)?.name ?? 'None'} · Capacity: {bus.capacity}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid={`button-edit-bus-${bus.id}`}
                      onClick={() => {
                        setEditingBus(bus);
                        setEditBusCapacity(String(bus.capacity));
                        setEditBusRouteId(bus.routeId);
                        setEditBusDriverId(bus.driverId ?? '');
                      }}
                      className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      data-testid={`button-toggle-bus-${bus.id}`}
                      onClick={() => toggleBusActive(bus)}
                      className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        bus.active ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <Power size={13} /> {bus.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Edit Bus Modal / Card */}
            {editingBus && (
              <div className="mt-6 rounded-2xl border-2 border-primary bg-muted/40 p-5 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold">Edit Bus #{editingBus.busNumber}</h3>
                  <button type="button" onClick={() => setEditingBus(null)} className="text-xs text-muted-foreground hover:text-foreground">✕ Cancel</button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Route</label>
                    <select
                      value={editBusRouteId}
                      onChange={(e) => setEditBusRouteId(e.target.value)}
                      className="admin-input mt-1"
                    >
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Driver</label>
                    <select
                      value={editBusDriverId}
                      onChange={(e) => setEditBusDriverId(e.target.value)}
                      className="admin-input mt-1"
                    >
                      <option value="">No Driver</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Capacity</label>
                    <input
                      type="number"
                      value={editBusCapacity}
                      onChange={(e) => setEditBusCapacity(e.target.value)}
                      className="admin-input mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingBus(null)} className="rounded-xl px-4 py-2 text-xs font-bold">Cancel</button>
                  <button type="button" onClick={handleSaveEditBus} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Save Changes</button>
                </div>
              </div>
            )}
          </div>

          {/* Add Bus Form */}
          <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Add Vehicle</div>
            <h2 className="mt-1 text-2xl font-extrabold">Register new bus</h2>
            <div className="mt-5 space-y-3">
              <div>
                <label className="text-xs font-bold">Bus Number / Plate</label>
                <input data-testid="input-admin-bus-number" value={busNumber} onChange={(e) => setBusNumber(e.target.value)} placeholder="e.g. 33A" className="admin-input mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold">Assigned Route</label>
                <select data-testid="select-admin-bus-route" value={busRouteId} onChange={(e) => setBusRouteId(e.target.value)} className="admin-input mt-1">
                  <option value="">Select Route</option>
                  {routes.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold">Assigned Driver</label>
                <select data-testid="select-admin-bus-driver" value={busDriverId} onChange={(e) => setBusDriverId(e.target.value)} className="admin-input mt-1">
                  <option value="">Driver Optional</option>
                  {drivers.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold">Passenger Capacity</label>
                <input data-testid="input-admin-capacity" type="number" min="10" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="40" className="admin-input mt-1" />
              </div>
              <button
                type="button"
                data-testid="button-submit-new-bus"
                onClick={submitBus}
                disabled={createBus.isPending || !busNumber.trim() || !busRouteId}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-extrabold text-primary-foreground disabled:opacity-50"
              >
                <Plus size={15} /> Add Bus to Fleet
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: ROUTE MANAGEMENT */}
      {activeTab === 'routes' && (
        <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Network Routes</div>
            <h2 className="mt-1 text-2xl font-extrabold">Active Campus Lines</h2>

            <div className="mt-6 space-y-3">
              {routes.map((route) => (
                <div key={route.id} data-testid={`row-admin-route-${route.id}`} className="rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold">{route.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${route.active ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {route.active ? 'Active Line' : 'Suspended'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">Destination: {route.destination}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRoute(route);
                          setEditRouteName(route.name);
                          setEditRouteDest(route.destination);
                          setEditRouteStops(route.stopIds.join(', '));
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"
                      >
                        <Edit2 size={13} /> Edit Stops
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleRouteActive(route)}
                        className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold ${
                          route.active ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        <Power size={13} /> {route.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="font-bold">Stops ({route.stopIds.length}):</span>
                    {route.stopIds.map((s, idx) => (
                      <span key={s} className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold">
                        {idx + 1}. {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Edit Route Modal */}
            {editingRoute && (
              <div className="mt-6 rounded-2xl border-2 border-primary bg-muted/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold">Edit Route: {editingRoute.name}</h3>
                  <button type="button" onClick={() => setEditingRoute(null)} className="text-xs text-muted-foreground">✕ Cancel</button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold">Route Name</label>
                    <input value={editRouteName} onChange={(e) => setEditRouteName(e.target.value)} className="admin-input mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold">Terminal Destination</label>
                    <input value={editRouteDest} onChange={(e) => setEditRouteDest(e.target.value)} className="admin-input mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold">Stops Sequence (comma-separated IDs)</label>
                    <input value={editRouteStops} onChange={(e) => setEditRouteStops(e.target.value)} placeholder="vandalur, perungalathur, tambaram, college" className="admin-input mt-1" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingRoute(null)} className="rounded-xl px-4 py-2 text-xs font-bold">Cancel</button>
                  <button type="button" onClick={handleSaveEditRoute} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Save Route</button>
                </div>
              </div>
            )}
          </div>

          {/* Add Route Form */}
          <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Create Route</div>
            <h2 className="mt-1 text-2xl font-extrabold">Add campus route</h2>
            <div className="mt-5 space-y-3">
              <div>
                <label className="text-xs font-bold">Route Label</label>
                <input data-testid="input-admin-route-name" value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="e.g. West Campus Express" className="admin-input mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold">Destination</label>
                <input data-testid="input-admin-route-destination" value={routeDestination} onChange={(e) => setRouteDestination(e.target.value)} placeholder="e.g. Science Quad" className="admin-input mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold">Stop IDs (comma-separated)</label>
                <input data-testid="input-admin-route-stops" value={routeStops} onChange={(e) => setRouteStops(e.target.value)} placeholder="college, tambaram, library" className="admin-input mt-1" />
              </div>
              <button
                type="button"
                data-testid="button-submit-new-route"
                onClick={submitRoute}
                disabled={createRoute.isPending || !routeName.trim() || !routeDestination.trim()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-extrabold text-primary-foreground disabled:opacity-50"
              >
                <Plus size={15} /> Create Route
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: DRIVER MANAGEMENT */}
      {activeTab === 'drivers' && (
        <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Driver Directory</div>
            <h2 className="mt-1 text-2xl font-extrabold">Certified Fleet Drivers</h2>

            <div className="mt-6 space-y-3">
              {drivers.map((driver) => (
                <div key={driver.id} data-testid={`row-admin-driver-${driver.id}`} className="rounded-2xl border border-border p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-foreground">
                      <UserRound size={18} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold">{driver.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${driver.active ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {driver.active ? 'On Duty' : 'Off Duty'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">Phone: {driver.phone} · Bus: {driver.busId ?? 'Unassigned'}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleDriverActive(driver)}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold ${
                      driver.active ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    <Power size={13} /> {driver.active ? 'Set Off Duty' : 'Set Active'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Driver Form */}
          <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Register Driver</div>
            <h2 className="mt-1 text-2xl font-extrabold">Add campus driver</h2>
            <div className="mt-5 space-y-3">
              <div>
                <label className="text-xs font-bold">Full Name</label>
                <input data-testid="input-admin-driver-name" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="e.g. Ramesh Chandra" className="admin-input mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold">Phone Number</label>
                <input data-testid="input-admin-driver-phone" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="+91 9840X XXXXX" className="admin-input mt-1" />
              </div>
              <button
                type="button"
                data-testid="button-submit-new-driver"
                onClick={submitDriver}
                disabled={createDriver.isPending || !driverName.trim() || !driverPhone.trim()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-extrabold text-primary-foreground disabled:opacity-50"
              >
                <Plus size={15} /> Add Driver to Register
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 5: QUEUE MANAGEMENT */}
      {activeTab === 'queues' && (
        <section className="mt-5 space-y-5">
          <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Pressure Monitor</div>
                <h2 className="mt-1 text-2xl font-extrabold">Active Boarding Queues</h2>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
                {queues.filter((q) => q.status === 'Overloaded').length} Overloaded Buses
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {queues.map((queue) => {
                const isOverloaded = queue.occupancy >= queue.capacity;
                return (
                  <div
                    key={queue.busId}
                    data-testid={`row-admin-queue-${queue.busId}`}
                    className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-4 ${
                      isOverloaded ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`grid h-10 w-10 place-items-center rounded-xl ${isOverloaded ? 'bg-destructive/15 text-destructive' : 'bg-muted text-foreground'}`}>
                        <UsersRound size={18} />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold">Bus #{queue.busNumber}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold ${
                            isOverloaded ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground'
                          }`}>
                            {queue.status}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {queue.occupancy} / {queue.capacity} seated · {queue.queueSize} waiting in overflow queue
                        </div>
                      </div>
                    </div>

                    {isOverloaded && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-destructive">
                        <AlertTriangle size={14} /> Overflow Triggered: Dispatch Relief Bus
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* TAB 6: SAFETY MANAGEMENT */}
      {activeTab === 'safety' && (
        <section className="mt-5 space-y-5">
          <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Safety Operations</div>
                <h2 className="mt-1 text-2xl font-extrabold">Safety Report Review Queue</h2>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {(['ALL', 'OPEN', 'UNDER REVIEW', 'RESOLVED', 'DISMISSED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSafetyFilter(st)}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold transition ${
                      safetyFilter === st ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {filteredSafety.length > 0 ? (
                filteredSafety.map((report) => (
                  <div key={report.id} data-testid={`row-admin-safety-${report.id}`} className="rounded-2xl border border-border p-4 bg-card space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold">{report.reportType}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase ${
                            report.status === 'RESOLVED'
                              ? 'bg-secondary text-secondary-foreground'
                              : report.status === 'UNDER REVIEW'
                              ? 'bg-accent text-accent-foreground'
                              : report.status === 'DISMISSED'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-destructive/15 text-destructive'
                          }`}>
                            {report.status}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Student ID: {report.studentId} · Coordinates: {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)} · Time: {new Date(report.createdAt).toLocaleString()}
                        </div>
                      </div>

                      {/* Status Update Dropdown / Buttons */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground mr-1">Update Status:</span>
                        {(['OPEN', 'UNDER REVIEW', 'RESOLVED', 'DISMISSED'] as const).map((targetStatus) => (
                          <button
                            key={targetStatus}
                            type="button"
                            disabled={updatingReportId === report.id || report.status === targetStatus}
                            onClick={() => updateSafetyStatus(report.id, targetStatus)}
                            className={`rounded-lg px-2 py-1 text-[9px] font-extrabold transition ${
                              report.status === targetStatus
                                ? 'bg-primary text-primary-foreground opacity-100 cursor-default'
                                : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground'
                            }`}
                          >
                            {targetStatus}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="rounded-xl bg-muted/60 p-3 text-xs leading-5 text-foreground">{report.description}</p>
                  </div>
                ))
              ) : (
                <EmptyState icon={CheckCircle2} title="No reports in this view" message="All reports under this status filter have been handled." />
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function AdminStat({ icon: Icon, label, value }: { icon: typeof BusFront; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-foreground">
          <Icon size={15} />
        </span>
        <span className="mono text-[10px] text-muted-foreground">LIVE</span>
      </div>
      <div className="mt-4 display-font text-3xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs font-bold text-muted-foreground">{label}</div>
    </div>
  );
}