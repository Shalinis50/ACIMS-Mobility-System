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

const reports: SafetyReport[] = [];

const alerts: SafetyAlert[] = [
  {
    id: "safety-alert-east-gate",
    title: "Stay aware near the east gate",
    message: "A road-surface concern was reported near the east gate. Use the lit campus path where possible.",
    severity: "advisory",
    latitude: 12.9431,
    longitude: 80.1419,
    createdAt: new Date(Date.now() - 1000 * 60 * 38),
  },
];

const emergencyContacts = [
  { name: "Campus security desk", relationship: "Campus support", phone: "Internal extension 100" },
  { name: "Transport desk", relationship: "Transport support", phone: "Internal extension 120" },
];

export function listSafetyReports(studentId = "student-20418") {
  return reports.filter((report) => report.studentId === studentId).map((report) => ({ ...report }));
}

export function listAllSafetyReports() {
  return reports.map((report) => ({ ...report }));
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
    message: "Your emergency assistance request is recorded locally. ACIMS has not contacted police or emergency services. Use the configured campus contacts below.",
    contacts: emergencyContacts.map((contact) => ({ ...contact })),
    location: { latitude: input.latitude, longitude: input.longitude },
  };
}