import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { RefreshCw } from 'lucide-react';
import { AdminLayout, parseAdminSection, type AdminSectionId } from '@/components/admin/AdminLayout';
import { adminLogout } from '@/lib/adminAuth';
import { PageHeading } from '@/components/acims-ui';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminLiveBuses } from '@/components/admin/AdminLiveBuses';
import { AdminAlerts } from '@/components/admin/AdminAlerts';
import { AdminBusRoutes } from '@/components/admin/AdminBusRoutes';
import { AdminPickupPoints } from '@/components/admin/AdminPickupPoints';
import { AdminShiftManagement } from '@/components/admin/AdminShiftManagement';
import { AdminBusesAndDrivers } from '@/components/admin/AdminBusesAndDrivers';

export default function AdminPage() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const activeSection = parseAdminSection(location);

  const goSection = (id: AdminSectionId) => {
    if (id === 'dashboard' || id === 'overview') {
      setLocation('/admin');
    } else {
      setLocation(`/admin/${id}`);
    }
  };

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

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
        description="Clear, reliable campus mobility administration for REC bus allotment, routes, stops, and real driver GPS tracking."
        action={
          <button
            type="button"
            onClick={refreshAll}
            data-testid="button-admin-refresh"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-muted"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        }
      />

      <div className="mt-5">
        {activeSection === 'dashboard' && (
          <AdminOverview
            onNavigateToLiveBuses={() => goSection('live-buses')}
          />
        )}

        {activeSection === 'live-buses' && <AdminLiveBuses />}

        {activeSection === 'alerts' && <AdminAlerts />}

        {activeSection === 'bus-routes' && <AdminBusRoutes />}

        {activeSection === 'pickup-points' && <AdminPickupPoints />}

        {activeSection === 'shift-management' && <AdminShiftManagement />}

        {activeSection === 'buses-drivers' && <AdminBusesAndDrivers />}
      </div>
    </AdminLayout>
  );
}
