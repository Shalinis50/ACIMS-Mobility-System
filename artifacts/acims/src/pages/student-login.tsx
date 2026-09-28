import { useState, type FormEvent } from 'react';
import { useLocation, Link } from 'wouter';
import { ArrowLeft, ArrowRight, BusFront, GraduationCap, Sparkles } from 'lucide-react';
import { demoStudentId } from '@/components/acims-ui';

export default function StudentLoginPage() {
  const [, setLocation] = useLocation();
  const [studentId, setStudentId] = useState(demoStudentId);
  const [department, setDepartment] = useState('Computer Science & Design');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      sessionStorage.setItem('acmis_student_session', studentId.trim() || demoStudentId);
      sessionStorage.setItem('acmis_student_logged_in', 'true');
    } catch {}

    // Navigate to student dashboard
    setTimeout(() => {
      setLocation('/dashboard', { replace: true });
    }, 150);
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
              Sign in with your student identification to access live tracking, campus routes, and boarding queues.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              <span>{isSubmitting ? 'Entering Dashboard…' : 'Student Login'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Helper demo info */}
          <div className="mt-6 rounded-xl bg-muted/60 p-3.5 text-center text-xs text-muted-foreground space-y-1">
            <div className="flex items-center justify-center gap-1 font-bold text-foreground">
              <BusFront size={13} className="text-accent-foreground" />
              <span>Campus Transit Pass Active</span>
            </div>
            <p className="text-[11px]">
              Prototype prefilled for immediate student evaluation. Press Student Login to view live telemetry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
