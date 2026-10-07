import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  GraduationCap,
  Power,
  Save,
  Timer,
} from 'lucide-react';
import { mobilityAdminFetch } from '@/lib/mobilityApi';

export type ShiftSchedule = {
  id: string;
  name: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  direction: string;
  operatingDays: string;
  active: boolean;
  displayTime: string;
  directionLabel: string;
  assignedBusIds: string[];
};

export function AdminBusSchedule({
  onNavigateToShiftAssignments,
}: {
  onNavigateToShiftAssignments: (shiftId?: string) => void;
}) {
  const queryClient = useQueryClient();
  const [showExamServices, setShowExamServices] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftSchedule | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const shiftsQuery = useQuery({
    queryKey: ['admin', 'shift-assignments'],
    queryFn: async () => {
      const res = await mobilityAdminFetch('/admin/shift-assignments');
      if (!res.ok) throw new Error('Failed to load shifts');
      return (await res.json()) as ShiftSchedule[];
    },
  });

  const shifts = shiftsQuery.data ?? [];
  const regularShifts = shifts.filter((s) => s.shiftType !== 'EXAM_ONLY');
  const examShifts = shifts.filter((s) => s.shiftType === 'EXAM_ONLY');

  const toggleShiftActive = async (shift: ShiftSchedule) => {
    try {
      const endpoint = shift.active
        ? `/admin/shifts/${shift.id}/deactivate`
        : `/admin/shifts/${shift.id}/activate`;
      await mobilityAdminFetch(endpoint, { method: 'POST' });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'shift-assignments'] });
    } catch {
      // ignore
    }
  };

  const handleSaveShift = async () => {
    if (!editingShift) return;
    setSaving(true);
    setSuccessMsg(null);
    try {
      await mobilityAdminFetch(`/admin/shifts/${editingShift.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          startTime: editStartTime || editingShift.startTime,
          endTime: editEndTime || editingShift.endTime,
          active: editingShift.active,
        }),
      });
      setSuccessMsg('Shift schedule updated.');
      setEditingShift(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'shift-assignments'] });
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Timetable & Shift Windows
        </div>
        <h2 className="mt-1 text-2xl font-extrabold text-foreground">
          Bus Schedule
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Daily campus transit operating windows. The four regular shifts run continuously, while Exam Services activate on demand.
        </p>
      </div>

      {successMsg && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          {successMsg}
        </div>
      )}

      {/* REGULAR SHIFTS SECTION (4 Primary Shifts) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="mono text-xs font-extrabold uppercase tracking-wide text-foreground">
              Primary Regular Shifts (4)
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToShiftAssignments()}
            className="text-xs font-extrabold text-primary hover:underline"
          >
            Manage Bus Assignments →
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {regularShifts.map((shift) => (
            <div
              key={shift.id}
              className={`rounded-[24px] border p-6 flex flex-col justify-between transition ${
                shift.active
                  ? 'border-border bg-card shadow-xs'
                  : 'border-border/60 bg-muted/20 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[9px] font-extrabold text-secondary-foreground">
                    {shift.directionLabel}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                      shift.active ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {shift.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="display-font mt-4 text-3xl font-extrabold text-foreground">
                  {shift.displayTime}
                </div>
                <div className="mt-1 text-xs font-bold text-muted-foreground">
                  {shift.name} ({shift.startTime} – {shift.endTime})
                </div>

                <div className="mt-4 border-t border-border pt-3 text-xs">
                  <span className="text-muted-foreground">Assigned Buses:</span>
                  <span className="ml-1.5 font-extrabold text-foreground">
                    {shift.assignedBusIds.length} buses
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 pt-3 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => {
                    setEditingShift(shift);
                    setEditStartTime(shift.startTime);
                    setEditEndTime(shift.endTime);
                  }}
                  className="flex-1 rounded-xl border border-border bg-muted/40 py-2 text-center text-xs font-bold text-foreground hover:bg-muted"
                >
                  <Edit2 size={12} className="inline mr-1" /> Edit Time
                </button>
                <button
                  type="button"
                  onClick={() => toggleShiftActive(shift)}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                    shift.active ? 'text-destructive hover:bg-destructive/10' : 'text-primary hover:bg-primary/10'
                  }`}
                  title={shift.active ? 'Deactivate shift' : 'Activate shift'}
                >
                  <Power size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Edit Shift Modal / Drawer Card */}
      {editingShift && (
        <div className="rounded-[24px] border-2 border-primary bg-card p-6 space-y-4 animate-in fade-in max-w-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-foreground">
              Edit Schedule: {editingShift.name}
            </h3>
            <button
              type="button"
              onClick={() => setEditingShift(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ✕ Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-bold text-muted-foreground">Start Time (24h)</label>
              <input
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className="admin-input mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-muted-foreground">End Time (24h)</label>
              <input
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                className="admin-input mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingShift(null)}
              className="rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveShift}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground hover:opacity-95"
            >
              <Save size={13} /> {saving ? 'Saving…' : 'Save Timing'}
            </button>
          </div>
        </div>
      )}

      {/* EXAM SERVICES (Collapsible / Hidden by default) */}
      <section className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowExamServices(!showExamServices)}>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <GraduationCap size={20} />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                Exam Services
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-extrabold text-amber-800 dark:text-amber-200">
                  Special Timings
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Exam-only transport shifts (11:45 AM, 12:00 PM). Activate only during university examinations.
              </p>
            </div>
          </div>

          <button type="button" className="text-muted-foreground p-1">
            {showExamServices ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {showExamServices && (
          <div className="mt-6 border-t border-border pt-6 grid gap-4 sm:grid-cols-2">
            {examShifts.map((shift) => (
              <div
                key={shift.id}
                className="rounded-2xl border border-border p-5 bg-muted/20 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                      EXAM ONLY · {shift.directionLabel}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                        shift.active ? 'bg-emerald-500/15 text-emerald-700' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {shift.active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="display-font mt-2 text-2xl font-extrabold text-foreground">
                    {shift.displayTime}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Operating window: {shift.startTime} – {shift.endTime}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs font-bold text-muted-foreground">
                    {shift.assignedBusIds.length} buses assigned
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleShiftActive(shift)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      shift.active ? 'bg-destructive/15 text-destructive' : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {shift.active ? 'Disable' : 'Enable Exam Shift'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
