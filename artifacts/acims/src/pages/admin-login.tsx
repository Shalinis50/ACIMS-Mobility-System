import { useState, type FormEvent, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { ArrowLeft, BusFront, Eye, EyeOff, Lock, LogIn, ShieldAlert, ShieldCheck } from 'lucide-react';
import { adminLogin, isAdminAuthenticated } from '@/lib/adminAuth';

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect immediately to /admin
  useEffect(() => {
    if (isAdminAuthenticated()) {
      setLocation('/admin', { replace: true });
    }
  }, [setLocation]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = adminLogin(username.trim(), password);

    if (result.success) {
      setLocation('/admin', { replace: true });
    } else {
      setError(result.error ?? 'Invalid staff credentials. Access denied.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="noise min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft size={14} /> Back to Campus Portal
        </Link>

        {/* Card Container */}
        <div className="relative overflow-hidden rounded-[28px] border border-border bg-card p-6 shadow-xl sm:p-8">
          {/* Header Branding */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-accent shadow-md">
              <BusFront size={28} strokeWidth={2.4} />
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5">
              <span className="mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                ACMIS STAFF PORTAL
              </span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground">Restricted</span>
            </div>

            <h1 className="display-font mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Staff Portal Login
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Authorized personnel only. Enter your administrative credentials to manage campus mobility operations.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              data-testid="text-admin-login-error"
              className="mt-6 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in duration-200"
            >
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <div className="font-semibold leading-5">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Staff Username
              </label>
              <div className="relative mt-1.5">
                <input
                  id="admin-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="Enter staff username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  data-testid="input-admin-username"
                  className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </label>
              </div>
              <div className="relative mt-1.5">
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Enter staff password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  data-testid="input-admin-password"
                  className="h-11 w-full rounded-xl border border-input bg-background pl-3.5 pr-10 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-3 text-muted-foreground transition hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !username.trim() || !password}
              data-testid="button-admin-submit-login"
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow transition hover:opacity-90 disabled:opacity-50"
            >
              <LogIn size={16} />
              <span>{isSubmitting ? 'Authenticating…' : 'Sign in to Staff Portal'}</span>
            </button>
          </form>

          {/* Secure Restricted Access Notice */}
          <div className="mt-6 border-t border-border pt-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Lock size={12} className="text-muted-foreground" />
              <span>Authorized personnel only</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Transit operations and management access is monitored and restricted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
