import { useLocation, Redirect, Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { isAdminAuthenticated } from '@/lib/adminAuth';

export default function NotFound() {
  const [location] = useLocation();

  // If unauthorized access attempted on any admin path, strictly redirect to /admin/login
  if (location.startsWith('/admin')) {
    if (!isAdminAuthenticated()) {
      return <Redirect to="/admin/login" replace />;
    }
    return <Redirect to="/admin" replace />;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <h1 className="text-xl font-extrabold text-foreground">
              404 Page Not Found
            </h1>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            The requested mobility view does not exist.
          </p>

          <div className="mt-6 flex gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
            >
              <ArrowLeft size={14} /> Back to Portal Selection
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-extrabold text-accent-foreground hover:opacity-90"
            >
              Student Dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
