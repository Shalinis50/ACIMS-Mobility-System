import { useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Copy, LocateFixed, PhoneCall, Plus, Share2, ShieldAlert, ShieldCheck, Siren, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { demoStudentId, EmptyState, ErrorState, LoadingRows, PageHeading } from '@/components/acims-ui';
import { getListSafetyAlertsQueryKey, getListSafetyReportsQueryKey, useActivateEmergency, useCreateSafetyReport, useListSafetyAlerts, useListSafetyReports } from '@workspace/api-client-react';

const COLLEGE_CENTER = { latitude: 12.9407, longitude: 80.1393 };

const REPORT_TYPES = [
  { value: 'Unsafe area', label: 'Unsafe area' },
  { value: 'Harassment/safety concern', label: 'Harassment/safety concern' },
  { value: 'Bus/driver concern', label: 'Bus/driver concern' },
  { value: 'Road hazard', label: 'Road hazard' },
  { value: 'Accident', label: 'Accident' },
  { value: 'Other', label: 'Other' },
];

export default function SafetyPage() {
  const queryClient = useQueryClient();
  const alertsQuery = useListSafetyAlerts({ query: { queryKey: getListSafetyAlertsQueryKey() } });
  const reportsQuery = useListSafetyReports({ query: { queryKey: getListSafetyReportsQueryKey() } });
  const reportMutation = useCreateSafetyReport();
  const emergencyMutation = useActivateEmergency();

  const [reportType, setReportType] = useState('Unsafe area');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(COLLEGE_CENTER);
  const [locationNote, setLocationNote] = useState('College Main coordinates (12.9407, 80.1393)');
  const [emergencyMessage, setEmergencyMessage] = useState('I need assistance on campus.');
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyResult, setEmergencyResult] = useState<{ message: string; contacts: Array<{ name: string; relationship: string; phone: string }> }>();

  // Share trip status state
  const [shareCopied, setShareCopied] = useState(false);

  // Custom emergency contacts state
  const [customContacts, setCustomContacts] = useState([
    { name: 'Campus Security Central Desk', relationship: 'Campus Safety', phone: '+91 44 2275 0100 (Ext 100)' },
    { name: 'Transport Dispatch Office', relationship: 'Operations Desk', phone: '+91 44 2275 0120 (Ext 120)' },
    { name: 'Campus First-Aid Clinic', relationship: 'Medical Center', phone: '+91 44 2275 0108 (Ext 108)' },
  ]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRel, setNewContactRel] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);

  const alerts = alertsQuery.data ?? [];
  const reports = reportsQuery.data ?? [];

  const refresh = () => {
    void alertsQuery.refetch();
    void reportsQuery.refetch();
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setLocationNote('Browser location unavailable · using College coordinates');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationNote(`My GPS (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`);
      },
      () => setLocationNote('Location permission unavailable · using College coordinates')
    );
  };

  const submitReport = () => {
    if (!description.trim()) return;
    reportMutation.mutate(
      { data: { studentId: demoStudentId, reportType, description: description.trim(), latitude: location.latitude, longitude: location.longitude } },
      {
        onSuccess: () => {
          setDescription('');
          refresh();
          void queryClient.invalidateQueries({ queryKey: getListSafetyReportsQueryKey() });
        },
      }
    );
  };

  const activateEmergency = () => {
    emergencyMutation.mutate(
      { data: { studentId: demoStudentId, latitude: location.latitude, longitude: location.longitude, message: emergencyMessage.trim() || 'I need assistance on campus.' } },
      {
        onSuccess: (response) => {
          setEmergencyResult(response);
          setEmergencyActive(true);
        },
      }
    );
  };

  const cancelEmergency = () => {
    setEmergencyActive(false);
    setEmergencyResult(undefined);
  };

  const handleShareTrip = () => {
    const tripText = `[ACIMS Safety Check-in] Student #${demoStudentId} | Status: Safe on Campus Corridor | Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)} | Time: ${new Date().toLocaleTimeString()} | Lit Pathway Awareness Active.`;
    navigator.clipboard.writeText(tripText).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    });
  };

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    setCustomContacts((prev) => [
      ...prev,
      { name: newContactName.trim(), relationship: newContactRel.trim() || 'Personal Contact', phone: newContactPhone.trim() },
    ]);
    setNewContactName('');
    setNewContactRel('');
    setNewContactPhone('');
    setShowAddContact(false);
  };

  const loading = alertsQuery.isLoading || reportsQuery.isLoading;
  const error = alertsQuery.isError || reportsQuery.isError;

  if (loading) return <LoadingRows count={5} />;
  if (error) return <ErrorState onRetry={refresh} label="Safety information could not be loaded." />;

  return (
    <div className="page-in">
      <PageHeading
        eyebrow="Smart commuter safety"
        title="Safety, without guesswork."
        description="See active campus alerts, report safety hazards, share trip status, and reach verified campus support in an emergency."
        action={
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[11px] font-bold">
            <ShieldAlert size={14} className="text-destructive" /> ACIMS Safety Desk Active
          </div>
        }
      />

      {/* EMERGENCY ACTIVE ALERT BANNER */}
      {emergencyActive && (
        <div className="mb-6 rounded-[24px] border-2 border-destructive bg-destructive/15 p-6 text-foreground shadow-lg animate-in fade-in">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-destructive text-destructive-foreground animate-pulse">
                <Siren size={26} />
              </span>
              <div>
                <span className="mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-destructive">
                  Emergency State Triggered
                </span>
                <h2 className="text-xl font-extrabold">Emergency Assistance Information Active</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={cancelEmergency}
              className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-card px-4 py-2 text-xs font-extrabold text-foreground hover:bg-muted"
            >
              <X size={14} /> Stand down emergency
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-card p-4 text-xs leading-5">
            <p className="font-extrabold text-destructive">
              Notice: ACIMS does NOT claim that police or municipal 911 emergency services have been dispatched.
            </p>
            <p className="mt-1 text-muted-foreground">
              Your emergency request was logged with coordinates ({location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}). Use the direct call links below to immediately reach the campus safety desk or health clinic.
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {customContacts.map((contact) => (
              <a
                key={contact.name}
                href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                className="flex items-center justify-between rounded-xl bg-card p-3 border border-border hover:border-primary transition"
              >
                <div>
                  <div className="text-xs font-extrabold">{contact.name}</div>
                  <div className="text-[10px] text-muted-foreground">{contact.relationship} · {contact.phone}</div>
                </div>
                <PhoneCall size={16} className="text-destructive shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* TRIP SAFETY STATUS & SHARE TRIP */}
      <section className="mb-6 rounded-[24px] border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
              <ShieldCheck size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold">Trip Safety Status</span>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[9px] font-extrabold text-accent-foreground uppercase">
                  Protected Corridor
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                High-visibility campus pathway · 24/7 security patrol active along main academic loop.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShareTrip}
            data-testid="button-share-trip"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground transition hover:-translate-y-0.5"
          >
            {shareCopied ? (
              <>
                <Check size={14} className="text-accent" /> Copied Trip Link!
              </>
            ) : (
              <>
                <Share2 size={14} /> Share Trip Status
              </>
            )}
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-5">
          {/* Active Alerts */}
          <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Active alerts</div>
                <h2 className="mt-2 text-2xl font-extrabold">What is happening nearby?</h2>
              </div>
              <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-extrabold text-destructive">
                {alerts.length} active
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {alerts.length ? (
                alerts.map((alert) => (
                  <div key={alert.id} data-testid={`card-safety-alert-${alert.id}`} className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
                        <AlertTriangle size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-extrabold">{alert.title}</h3>
                          <span className="rounded-full bg-card px-2 py-0.5 text-[9px] font-extrabold uppercase">
                            {alert.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{alert.message}</p>
                        <div className="mono mt-2 text-[9px] text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={CheckCircle2} title="No active safety alerts" message="ACIMS has no current campus safety notices to share." />
              )}
            </div>
          </div>

          {/* Student Submitted Reports History */}
          <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Your reports</div>
            <h2 className="mt-2 text-2xl font-extrabold">A record of what you raised.</h2>
            <div className="mt-5 space-y-2">
              {reports.length ? (
                reports.map((report) => (
                  <div key={report.id} data-testid={`row-safety-report-${report.id}`} className="flex items-start gap-3 rounded-xl bg-muted p-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-extrabold">{report.reportType}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                          report.status === 'RESOLVED' ? 'bg-secondary text-secondary-foreground' : 'bg-card text-muted-foreground'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{report.description}</p>
                      <div className="mono mt-1 text-[9px] text-muted-foreground">
                        {new Date(report.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={ShieldAlert} title="Nothing reported yet" message="Your submitted safety concerns will stay visible here." />
              )}
            </div>
          </div>

          {/* Emergency Contacts Directory */}
          <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Support network</div>
                <h2 className="mt-2 text-xl font-extrabold">Configured emergency contacts</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddContact((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-extrabold hover:bg-muted"
              >
                <Plus size={13} /> Add contact
              </button>
            </div>

            {showAddContact && (
              <div className="mt-4 rounded-xl border border-border bg-muted/50 p-4 space-y-3">
                <div className="text-xs font-extrabold">Add Trusted Contact</div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Contact Name"
                    className="h-10 rounded-lg border border-input bg-background px-3 text-xs"
                  />
                  <input
                    value={newContactRel}
                    onChange={(e) => setNewContactRel(e.target.value)}
                    placeholder="Relationship (e.g. Parent, Roommate)"
                    className="h-10 rounded-lg border border-input bg-background px-3 text-xs"
                  />
                  <input
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="Phone Number"
                    className="h-10 rounded-lg border border-input bg-background px-3 text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddContact(false)}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddContact}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                  >
                    Save Contact
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {customContacts.map((contact) => (
                <div key={contact.name} className="flex items-center justify-between rounded-xl bg-muted/60 p-3">
                  <div>
                    <div className="text-xs font-extrabold">{contact.name}</div>
                    <div className="text-[11px] text-muted-foreground">{contact.relationship}</div>
                  </div>
                  <a
                    href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-bold hover:bg-secondary"
                  >
                    <PhoneCall size={12} className="text-accent-foreground" />
                    <span>{contact.phone}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Create Safety Report */}
          <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8">
            <div className="mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Create a report</div>
            <h2 className="mt-2 text-2xl font-extrabold">Report a concern.</h2>

            <label className="mt-6 block text-xs font-extrabold" htmlFor="report-type">
              Report type
            </label>
            <select
              id="report-type"
              data-testid="select-report-type"
              value={reportType}
              onChange={(event) => setReportType(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {REPORT_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-xs font-extrabold" htmlFor="report-description">
              Description
            </label>
            <textarea
              id="report-description"
              data-testid="input-report-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="What should the safety desk know? (e.g. Broken streetlight, suspicious activity, bus driver concern...)"
              className="mt-2 w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <button
              type="button"
              data-testid="button-report-location"
              onClick={locate}
              className="mt-3 flex w-full items-center gap-2 rounded-xl border border-border px-3 py-3 text-left text-xs font-bold hover:bg-muted"
            >
              <LocateFixed size={15} />
              <span className="flex-1 truncate">{locationNote}</span>
            </button>

            <button
              type="button"
              data-testid="button-submit-safety-report"
              onClick={submitReport}
              disabled={reportMutation.isPending || !description.trim()}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-extrabold text-primary-foreground disabled:opacity-50"
            >
              {reportMutation.isPending ? 'Sending to the safety desk…' : 'Submit safety report'}
            </button>
            {reportMutation.isError && (
              <p className="mt-3 text-xs font-bold text-destructive">The report could not be sent. Try again.</p>
            )}
          </div>

          {/* SOS Emergency Assistance Card */}
          <div className="rounded-[28px] bg-primary p-6 text-primary-foreground sm:p-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="mono text-[10px] uppercase tracking-[.18em] text-primary-foreground/55">Need help now?</div>
                <h2 className="mt-2 text-2xl font-extrabold">Emergency SOS trigger</h2>
              </div>
              <Siren size={24} className="text-accent" />
            </div>

            <p className="mt-3 text-xs leading-5 text-primary-foreground/70">
              Activating emergency assistance logs your position and opens direct communications with campus safety personnel.
            </p>

            <textarea
              data-testid="input-emergency-message"
              value={emergencyMessage}
              onChange={(event) => setEmergencyMessage(event.target.value)}
              rows={2}
              className="mt-5 w-full resize-none rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-3 text-sm text-primary-foreground outline-none placeholder:text-primary-foreground/40"
            />

            <button
              type="button"
              data-testid="button-activate-emergency"
              onClick={activateEmergency}
              disabled={emergencyMutation.isPending}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-4 text-sm font-extrabold text-destructive-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              <PhoneCall size={18} />
              {emergencyMutation.isPending ? 'Activating emergency state…' : 'ACTIVATE EMERGENCY SOS'}
            </button>

            <p className="mt-3 text-[10px] leading-4 text-primary-foreground/55">
              Notice: ACIMS does not claim that external police or 911 services are contacted. If in immediate danger off-campus, dial local emergency services directly.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}