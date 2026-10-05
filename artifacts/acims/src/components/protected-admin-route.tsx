import { Redirect } from 'wouter';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import AdminPage from '@/pages/admin';

/**
 * Route guard that ensures only authenticated administrators
 * can access the Admin & Transport Management dashboard.
 * Unauthenticated requests are immediately redirected to /admin/login.
 */
export function ProtectedAdminRoute() {
  const authenticated = isAdminAuthenticated();

  if (!authenticated) {
    return <Redirect to="/admin/login" replace />;
  }

  return <AdminPage />;
}
