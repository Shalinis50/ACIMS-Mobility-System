import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { RefreshCw } from 'lucide-react';
import { AdminLayout, parseAdminSection, type AdminSectionId } from '@/components/admin/AdminLayout';
import { adminLogout } from '@/lib/adminAuth';
import { mobilityAdminFetch } from '@/lib/mobilityApi';
import { LoadingRows, PageHeading } from '@/components/acims-ui';
import { naturalBusSort } from '@/lib/naturalSort';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminLiveBuses } from '@/components/admin/AdminLiveBuses';
import { AdminBusSchedule } from '@/components/admin/AdminBusSchedule';
import { AdminAlerts } from '@/components/admin/AdminAlerts';
import { AdminBusesAndRoutes } from '@/components/admin/AdminBusesAndRoutes';
import { AdminShiftAssignments } from '@/components/admin/AdminShiftAssignments';
import { AdminDrivers } from '@/components/admin/AdminDrivers';
import { AdminPickupPoints } from '@/components/admin/AdminPickupPoints';

export default function AdminPage() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const activeSection = parseAdminSection(location);

  const goSection = (id: AdminSectionId) => {
    if (id === 'overview' || id === 'dashboard') {
      setLocation('/admin');
    } else {
      setLocation(`/admin/${id}`);
    }
  };

  // Shared queries for buses, routes, and drivers
  const busesAndRoutesQuery = useQuery({
    queryKey: ['admin', 'buses-and-routes'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/buses-and-routes');
      if (!res.ok) throw new Error('Failed to load buses');
      return (await res.json()) as any[];
    },
  });

  const driversQuery = useQuery({
    queryKey: ['admin', 'drivers'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/drivers');
      if (!res.ok) throw new Error('Failed to load drivers');
      return (await res.json()) as any[];
    },
  });

  const buses = busesAndRoutesQuery.data ?? [];
  const drivers = driversQuery.data ?? [];

  const routesForSelect = useMemo(() => {
    const seen = new Set<string>();
    return buses
      .filter((b) => {
        if (!b.routeId || seen.has(b.routeId)) return false;
        seen.add(b.routeId);
        return true;
      })
      .map((b) => ({
        id: b.routeId,
        displayName: b.displayName,
      }));
  }, [buses]);

  const busesForAssignment = useMemo(() => {
    return buses
      .map((b) => ({
        id: b.id,
        busNumber: b.busNumber,
        routeName: b.routeName,
        displayName: b.displayName,
        stops: b.stops || [],
      }))
      .sort((a, b) => naturalBusSort(a.busNumber, b.busNumber));
  }, [buses]);

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const isLoading = busesAndRoutesQuery.isLoading && buses.length === 0;

  return (
    <AdminLayout
      section={activeSection}
      onNavigate={goSection}
      systemStatus="Operational"
      onRefresh={refreshAll}
      onLogout={() => {
        adminLogout();
        setLocation('/admin/login', { replace: true });
      }}
    >
      <PageHeading
        eyebrow="ACMIS Campus Transport"
        title="Admin Transport Management"
        description="Simple, clear campus mobility administration for REC bus allotment, routes, stops, and live tracking."
        action={
          <button
            type="button"
            onClick={refreshAll}
            data-testid="button-admin-refresh"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-muted"
          >
            <RefreshCw size={13} className={busesAndRoutesQuery.isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      <div className="mt-5">
        {isLoading ? (
          <LoadingRows count={6} />
        ) : (
          <>
            {activeSection === 'overview' && (
              <AdminOverview
                onNavigateToLiveBuses={() => goSection('live-buses')}
                onNavigateToShifts={() => goSection('shift-assignments')}
              />
            )}

            {activeSection === 'live-buses' && <AdminLiveBuses />}

            {activeSection === 'schedule' && (
              <AdminBusSchedule
                onNavigateToShiftAssignments={() => goSection('shift-assignments')}
              />
            )}

            {activeSection === 'alerts' && <AdminAlerts />}

            {activeSection === 'buses-routes' && (
              <AdminBusesAndRoutes drivers={drivers} />
            )}

            {activeSection === 'shift-assignments' && (
              <AdminShiftAssignments buses={busesForAssignment} />
            )}

            {activeSection === 'drivers' && (
              <AdminDrivers buses={busesForAssignment} />
            )}

            {activeSection === 'pickup-points' && (
              <AdminPickupPoints />
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
