import { Link } from 'wouter';
import {
  ArrowRight,
  BusFront,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export default function EntryPage() {
  return (
    <div className="noise min-h-screen bg-background text-foreground flex flex-col justify-between items-center px-4 py-10 sm:px-6 lg:px-8">
      {/* Top spacer */}
      <div className="w-full max-w-lg" />

      {/* Main Container */}
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Header / Brand */}
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-accent shadow-xl ring-4 ring-primary/10">
            <BusFront size={32} strokeWidth={2.4} />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-bold text-muted-foreground shadow-xs">
              <Sparkles size={12} className="text-accent-foreground" />
              <span>Campus Transit Portal</span>
            </div>
            <h1 className="display-font mt-3 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              ACIMS
            </h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground sm:text-base">
              Adaptive Campus Mobility &amp; Information System
            </p>
          </div>
        </div>

        {/* Primary Student Entry Card */}
        <div className="rounded-[28px] border border-border bg-card p-6 shadow-xl sm:p-8 text-left transition hover:border-accent/50">
          <div className="flex items-center justify-between">
            <span className="mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
              Student Transit Portal
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent/20 text-accent-foreground">
              <GraduationCap size={18} />
            </span>
          </div>

          <h2 className="display-font mt-3 text-2xl font-extrabold text-foreground">
            Student Access
          </h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Access live bus tracking, real-time arrival estimates, boarding queue reservations, campus wayfinding, safety alerts, and offline timetables.
          </p>

          <div className="mt-6 pt-4 border-t border-border/60">
            <Link
              href="/login"
              data-testid="button-entry-student-login"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-extrabold text-accent-foreground shadow-md transition hover:opacity-90 hover:-translate-y-0.5"
            >
              <span>Student Login</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer with Unobtrusive Staff & Driver Portal Links */}
      <footer className="w-full max-w-md pt-8 text-center space-y-2">
        <div className="text-[11px] text-muted-foreground">
          Protected campus transport environment · Rajalakshmi Engineering College
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/75">
          <Link
            href="/driver"
            data-testid="link-driver-portal"
            className="hover:text-foreground transition underline underline-offset-4 decoration-border hover:decoration-foreground"
          >
            Driver GPS Console (Phone B)
          </Link>
          <span>·</span>
          <Link
            href="/admin/login"
            data-testid="link-staff-portal"
            className="hover:text-foreground transition underline underline-offset-4 decoration-border hover:decoration-foreground"
          >
            Staff Portal
          </Link>
        </div>
      </footer>
    </div>
  );
}
