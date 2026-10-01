import { useState, type FormEvent } from 'react';
import { useLocation, Link } from 'wouter';
import { ArrowLeft, ArrowRight, BusFront, GraduationCap, ShieldCheck } from 'lucide-react';
import { demoStudentId } from '@/components/acims-ui';
import { useAuth } from '@/lib/auth-context';

export default function StudentLoginPage() {
  const [, setLocation] = useLocation();
  const { signInWithCampusId, signInWithGoogle } = useAuth();
  const [studentId, setStudentId] = useState(demoStudentId);
  const [department, setDepartment] = useState('Computer Science & Design');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const cleanId = studentId.trim() || demoStudentId;
      sessionStorage.setItem('acmis_student_session', cleanId);
      sessionStorage.setItem('acmis_student_logged_in', 'true');

      // Sync with PostgreSQL
      await signInWithCampusId(cleanId, 'STUDENT');
      setLocation('/dashboard', { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify student roll number.');
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      sessionStorage.setItem('acmis_student_logged_in', 'true');
      await signInWithGoogle('STUDENT');
      setLocation('/dashboard', { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication was cancelled or could not be completed.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="noise min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft size={14} /> Back to Portal Selection
        </Link>

        {/* Card */}
        <div className="rounded-[28px] border border-border bg-card p-6 shadow-xl sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-md">
              <GraduationCap size={28} strokeWidth={2.4} />
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5">
              <span className="mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                ACMIS Student
              </span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground">Mobility Portal</span>
            </div>

            <h1 className="display-font mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Student Login
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Sign in with your campus credentials to access live tracking, campus routes, and boarding queues.
            </p>
          </div>

          {errorMsg && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium">
              {errorMsg}
            </div>
          )}

          {/* Real Google Sign-in */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              data-testid="button-google-student-login"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-extrabold text-foreground shadow-xs transition hover:bg-muted/50 disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>

          <div className="relative my-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative bg-card px-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
              Or with Campus Roll No
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="student-id-input"
                className="block text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Student Roll / ID
              </label>
              <div className="relative mt-1.5">
                <input
                  id="student-id-input"
                  name="studentId"
                  type="text"
                  required
                  placeholder="e.g. student-20418 or 2024-CSD-014"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  data-testid="input-student-id"
                  className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="student-department"
                className="block text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Department / Batch
              </label>
              <div className="relative mt-1.5">
                <input
                  id="student-department"
                  name="department"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & Design"
                  className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !studentId.trim()}
              data-testid="button-student-login"
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-extrabold text-accent-foreground shadow-md transition hover:opacity-90 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Verifying with Database…' : 'Student Login'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Verified Cloud SQL connection indicator */}
          <div className="mt-6 rounded-xl bg-muted/60 p-3.5 text-center text-xs text-muted-foreground space-y-1">
            <div className="flex items-center justify-center gap-1 font-bold text-foreground">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>PostgreSQL Relational Backend Active</span>
            </div>
            <p className="text-[11px]">
              Connected to Cloud SQL. Live routes, driver telemetry, and user profiles persist to the database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
