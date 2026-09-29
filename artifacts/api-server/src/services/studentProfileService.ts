import { getAllRoutes } from "./routesData";
import { REC_CAMPUS_CENTER } from "./campusData";

export interface StudentProfile {
  studentId: string;
  name: string;
  department: string;
  email: string;
  phone: string;
  homeLocation?: {
    name: string;
    latitude: number;
    longitude: number;
  };
  pickupStopId: string;
  pickupStopName: string;
  pickupStopCoordinates: {
    latitude: number;
    longitude: number;
  };
  assignedBusId: string;
  assignedRouteId: string;
  collegeDestination: {
    name: string;
    latitude: number;
    longitude: number;
  };
  preferredDepartureTime: string; // "07:20:00"
  frequentDestinations: Array<{ id: string; name: string }>;
  preferredTransport: "acims_bus" | "public_bus" | "metro" | "fastest";
  walkingPreference: "minimal" | "moderate" | "comfortable"; // max walking minutes e.g. 5, 10, 15
  notificationPreferences: {
    busArrivalMinutes: number;
    delays: boolean;
    safetyAlerts: boolean;
  };
}

const studentProfiles: Record<string, StudentProfile> = {
  "student-20418": {
    studentId: "student-20418",
    name: "Ananya Raman",
    department: "Computer Science & Design",
    email: "ananya.raman@rec.ac.in",
    phone: "+91 98401 23456",
    homeLocation: {
      name: "Tambaram West, Chennai",
      latitude: 12.9230,
      longitude: 80.1250,
    },
    pickupStopId: "tambaram",
    pickupStopName: "Tambaram Terminal",
    pickupStopCoordinates: {
      latitude: 12.9249,
      longitude: 80.1275,
    },
    assignedBusId: "bus-12",
    assignedRouteId: "route-bus-12",
    collegeDestination: {
      name: "Rajalakshmi Engineering College (REC)",
      latitude: REC_CAMPUS_CENTER.latitude,
      longitude: REC_CAMPUS_CENTER.longitude,
    },
    preferredDepartureTime: "07:20:00",
    frequentDestinations: [
      { id: "rec-main-block", name: "Main Block" },
      { id: "rec-cad-lab", name: "Central Computing Lab" },
      { id: "library", name: "Central Library" },
    ],
    preferredTransport: "acims_bus",
    walkingPreference: "moderate",
    notificationPreferences: {
      busArrivalMinutes: 10,
      delays: true,
      safetyAlerts: true,
    },
  },
  "student-20419": {
    studentId: "student-20419",
    name: "Karthik Sundaram",
    department: "Mechanical Engineering",
    email: "karthik.s@rec.ac.in",
    phone: "+91 98402 34567",
    homeLocation: {
      name: "Perungalathur East, Chennai",
      latitude: 12.9030,
      longitude: 80.0900,
    },
    pickupStopId: "perungalathur",
    pickupStopName: "Perungalathur Junction",
    pickupStopCoordinates: {
      latitude: 12.9055,
      longitude: 80.0918,
    },
    assignedBusId: "bus-12",
    assignedRouteId: "route-bus-12",
    collegeDestination: {
      name: "Rajalakshmi Engineering College (REC)",
      latitude: REC_CAMPUS_CENTER.latitude,
      longitude: REC_CAMPUS_CENTER.longitude,
    },
    preferredDepartureTime: "07:10:00",
    frequentDestinations: [
      { id: "rec-workshop-block", name: "Mechanical Workshop Block" },
      { id: "rec-fluid-mech-lab", name: "Fluid Mechanics Lab" },
    ],
    preferredTransport: "acims_bus",
    walkingPreference: "comfortable",
    notificationPreferences: {
      busArrivalMinutes: 15,
      delays: true,
      safetyAlerts: true,
    },
  },
  "student-20420": {
    studentId: "student-20420",
    name: "Pooja Mohan",
    department: "Artificial Intelligence & Data Science",
    email: "pooja.m@rec.ac.in",
    phone: "+91 98403 45678",
    homeLocation: {
      name: "Guindy, Chennai",
      latitude: 13.0050,
      longitude: 80.2000,
    },
    pickupStopId: "guindy",
    pickupStopName: "Guindy Industrial Estate",
    pickupStopCoordinates: {
      latitude: 13.0067,
      longitude: 80.2012,
    },
    assignedBusId: "bus-18",
    assignedRouteId: "route-bus-18",
    collegeDestination: {
      name: "Rajalakshmi Engineering College (REC)",
      latitude: REC_CAMPUS_CENTER.latitude,
      longitude: REC_CAMPUS_CENTER.longitude,
    },
    preferredDepartureTime: "07:00:00",
    frequentDestinations: [
      { id: "rec-cad-lab", name: "AI & Innovation Wing" },
      { id: "rec-academic-block", name: "Central Academic Block" },
    ],
    preferredTransport: "fastest",
    walkingPreference: "minimal",
    notificationPreferences: {
      busArrivalMinutes: 10,
      delays: true,
      safetyAlerts: true,
    },
  },
};

export function getStudentProfile(studentId: string): StudentProfile {
  const normalizedId = studentId?.trim().toLowerCase() || "student-20418";
  if (studentProfiles[normalizedId]) {
    return studentProfiles[normalizedId];
  }

  // Fallback to default student profile template customized with studentId
  return {
    studentId,
    name: `Student (${studentId})`,
    department: "Engineering & Technology",
    email: `${studentId}@rec.ac.in`,
    phone: "+91 98400 00000",
    homeLocation: {
      name: "Tambaram, Chennai",
      latitude: 12.9249,
      longitude: 80.1275,
    },
    pickupStopId: "tambaram",
    pickupStopName: "Tambaram Terminal",
    pickupStopCoordinates: {
      latitude: 12.9249,
      longitude: 80.1275,
    },
    assignedBusId: "bus-12",
    assignedRouteId: "route-bus-12",
    collegeDestination: {
      name: "Rajalakshmi Engineering College (REC)",
      latitude: REC_CAMPUS_CENTER.latitude,
      longitude: REC_CAMPUS_CENTER.longitude,
    },
    preferredDepartureTime: "07:20:00",
    frequentDestinations: [
      { id: "rec-main-block", name: "Main Block" },
      { id: "library", name: "Central Library" },
    ],
    preferredTransport: "acims_bus",
    walkingPreference: "moderate",
    notificationPreferences: {
      busArrivalMinutes: 10,
      delays: true,
      safetyAlerts: true,
    },
  };
}

export function updateStudentProfile(
  studentId: string,
  updates: Partial<StudentProfile>,
): StudentProfile {
  const current = getStudentProfile(studentId);
  const updated = {
    ...current,
    ...updates,
    studentId: current.studentId, // ID remains immutable
  };
  studentProfiles[current.studentId] = updated;
  return updated;
}
