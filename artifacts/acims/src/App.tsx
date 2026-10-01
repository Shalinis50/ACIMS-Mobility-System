import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import EntryPage from '@/pages/entry';
import StudentLoginPage from '@/pages/student-login';
import Dashboard from '@/pages/dashboard';
import LiveMap from '@/pages/map';
import QueuePage from '@/pages/queue';
import AlertsPage from '@/pages/alerts';
import CampusMapPage from '@/pages/campus-map';
import NavigationPage from '@/pages/navigation';
import SafetyPage from '@/pages/safety';
import AdminLoginPage from '@/pages/admin-login';
import { ProtectedAdminRoute } from '@/components/protected-admin-route';
import AiAgentPage from '@/pages/ai-agent';
import PublicTransportPage from '@/pages/public-transport';
import OfflinePage from '@/pages/offline';
import DriverTrackingPage from '@/pages/driver';
import { AcimsLayout } from '@/components/acims-ui';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import {
  Route,
  Switch,
  Redirect,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import { AuthProvider } from '@/lib/auth-context';

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();

  // Security gate: Ensure unauthenticated users attempting /admin or /admin/* are redirected to /admin/login
  if (location.startsWith('/admin') && location !== '/admin/login' && !isAdminAuthenticated()) {
    return <Redirect to="/admin/login" replace />;
  }

  return (
    <RoutedErrorBoundary>
      <Switch>
        {/* Entry & Authentication Pages (Clean standalone views) */}
        <Route path="/" component={EntryPage} />
        <Route path="/login" component={StudentLoginPage} />
        <Route path="/driver" component={DriverTrackingPage} />
        <Route path="/admin/login" component={AdminLoginPage} />
        <Route path="/admin" component={ProtectedAdminRoute} />
        <Route path="/admin/*" component={ProtectedAdminRoute} />
        <Route path="/admin/:sub*" component={ProtectedAdminRoute} />

        {/* Student Application (Inside AcimsLayout with student navigation) */}
        <Route path="/dashboard">
          <AcimsLayout>
            <Dashboard />
          </AcimsLayout>
        </Route>
        <Route path="/map">
          <AcimsLayout>
            <LiveMap />
          </AcimsLayout>
        </Route>
        <Route path="/queue">
          <AcimsLayout>
            <QueuePage />
          </AcimsLayout>
        </Route>
        <Route path="/alerts">
          <AcimsLayout>
            <AlertsPage />
          </AcimsLayout>
        </Route>
        <Route path="/campus-map">
          <AcimsLayout>
            <CampusMapPage />
          </AcimsLayout>
        </Route>
        <Route path="/navigation">
          <AcimsLayout>
            <NavigationPage />
          </AcimsLayout>
        </Route>
        <Route path="/safety">
          <AcimsLayout>
            <SafetyPage />
          </AcimsLayout>
        </Route>
        <Route path="/ai-agent">
          <AcimsLayout>
            <AiAgentPage />
          </AcimsLayout>
        </Route>
        <Route path="/public-transport">
          <AcimsLayout>
            <PublicTransportPage />
          </AcimsLayout>
        </Route>
        <Route path="/offline">
          <AcimsLayout>
            <OfflinePage />
          </AcimsLayout>
        </Route>

        {/* Fallback Catch-all */}
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
