import type { Coordinate } from "./busTracking";

export type SafetyReport = Coordinate & {
  id: string;
  studentId: string;
  reportType: string;
  description: string;
  createdAt: Date;
  status: string;
};

export type SafetyAlert = Coordinate & {
  id: string;
  title: string;
  message: string;
  severity: string;
  createdAt: Date;
};

const reports: SafetyReport[] = [
  {
    id: "safety-report-101",
    studentId: "student-20418",
    reportType: "Road hazard",
    description: "Pothole developing near Science Quad pedestrian crosswalk causing buses to swerve.",
    latitude: 12.9431,
    longitude: 80.1419,
    status: "UNDER REVIEW",
    createdAt: new Date(Date.now() - 1000 * 60 * 120),
  },
  {
    id: "safety-report-102",
    studentId: "student-99411",
    reportType: "Unsafe area",
    description: "Low-lighting along the path between North Residence and Athletic Pavilion after 7 PM.",
    latitude: 12.9458,
    longitude: 80.1352,
    status: "OPEN",
    createdAt: new Date(Date.now() - 1000 * 60 * 300),
  },
  {
    id: "safety-report-103",
    studentId: "student-38291",
    reportType: "Bus/driver concern",
    description: "Bus #18 rear door sensor was slow to release during the 8:00 AM rush at Tambaram stop.",
    latitude: 12.9249,
    longitude: 80.1275,
    status: "RESOLVED",
    createdAt: new Date(Date.now() - 1000 * 60 * 1440),
  },
];

const alerts: SafetyAlert[] = [
  {
    id: "safety-alert-east-gate",
    title: "Stay aware near the East Gate pathway",
    message: "A road-surface and lighting concern was reported near the East Gate. Use the lit main campus avenue where possible.",
    severity: "advisory",
    latitude: 12.9431,
    longitude: 80.1419,
    createdAt: new Date(Date.now() - 1000 * 60 * 38),
  },
  {
    id: "safety-alert-tambaram-crowd",
    title: "Peak corridor alert at Tambaram Terminal",
    message: "High commuter pedestrian volume around the Tambaram bus interchange. Stay on marked zebra crossings and queue lines.",
    severity: "warning",
    latitude: 12.9249,
    longitude: 80.1275,
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
  },
];

const emergencyContacts = [
  { id: "contact-sec", name: "Campus Security Central Desk", relationship: "Campus Safety Team", phone: "+91 44 2275 0100 (Internal: 100)" },
  { id: "contact-trans", name: "ACIMS Transport Operations Office", relationship: "Fleet Dispatch", phone: "+91 44 2275 0120 (Internal: 120)" },
  { id: "contact-med", name: "Campus Health Clinic & First Aid", relationship: "Medical Center", phone: "+91 44 2275 0108 (Internal: 108)" },
];

export function listSafetyReports(studentId = "student-20418") {
  return reports.filter((report) => report.studentId === studentId || studentId === "all").map((report) => ({ ...report }));
}

export function listAllSafetyReports() {
  return reports.map((report) => ({ ...report }));
}

export function updateSafetyReportStatus(id: string, status: string) {
  const report = reports.find((r) => r.id === id);
  if (!report) return undefined;
  report.status = status;
  return { ...report };
}

export function listEmergencyContacts() {
  return emergencyContacts.map((contact) => ({ ...contact }));
}

export function addEmergencyContact(contact: { name: string; relationship: string; phone: string }) {
  const newContact = {
    id: `contact-${Date.now()}`,
    ...contact,
  };
  emergencyContacts.push(newContact);
  return { ...newContact };
}

export function createSafetyReport(input: Omit<SafetyReport, "id" | "createdAt" | "status">) {
  const report: SafetyReport = {
    ...input,
    id: `safety-${Date.now()}`,
    createdAt: new Date(),
    status: "OPEN",
  };
  reports.unshift(report);
  return { ...report };
}

export function listSafetyAlerts() {
  return alerts.map((alert) => ({ ...alert }));
}

export function activateEmergency(input: Coordinate & { studentId: string; message: string }) {
  return {
    status: "ASSISTANCE_REQUESTED",
    createdAt: new Date(),
    message: "EMERGENCY STATE ACTIVE: Your emergency assistance request has been recorded locally with your precise coordinates. ACIMS does not falsely claim police or 911 services are contacted. Please use the direct campus contacts below or call local emergency dispatch.",
    contacts: emergencyContacts.map((contact) => ({ ...contact })),
    location: { latitude: input.latitude, longitude: input.longitude },
  };
}