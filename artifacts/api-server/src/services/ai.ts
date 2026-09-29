import { getBuses, type Bus } from "./busTracking";
import { getQueueStatus } from "./queueManager";
import { listCampusLocations, listCampusStops, type CampusLocation } from "./campus";
import { listSafetyAlerts, type SafetyAlert } from "./safety";
import { listProviders, type TransportProvider } from "./transport";
import { executeMobilityAgent, type ConversationTurn } from "./aiMobilityEngine";
import { getStudentProfile } from "./studentProfileService";

export type AiContext = {
  buses: Bus[];
  queue: ReturnType<typeof getQueueStatus>;
  safetyAlerts: SafetyAlert[];
  destinations: CampusLocation[];
  providers: TransportProvider[];
  studentProfile?: ReturnType<typeof getStudentProfile>;
};

export function getAiContext(studentId = "student-20418"): AiContext {
  const buses = getBuses();
  const primaryBus = buses[0] ?? {
    id: "bus-12",
    busNumber: "12",
    origin: "Vandalur Transit Hub",
    destination: "Academic Quad",
    routeLabel: "Campus Loop A",
    capacity: 40,
    currentLocation: { latitude: 12.9161, longitude: 80.1119 },
    nextStop: "Tambaram Terminal",
    nextStopId: "tambaram",
    etaMinutes: 3,
    status: "On Time",
    updatedAt: new Date(),
  };

  return {
    buses,
    queue: getQueueStatus(primaryBus),
    safetyAlerts: listSafetyAlerts(),
    destinations: listCampusLocations(),
    providers: listProviders(),
    studentProfile: getStudentProfile(studentId),
  };
}

export function answerMobilityQuestion(
  message: string,
  destinationId?: string,
  studentId = "student-20418",
  deviceCoords?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp?: string;
  },
  history?: ConversationTurn[],
) {
  const context = getAiContext(studentId);
  const agentResponse = executeMobilityAgent({
    studentId,
    message,
    destinationId,
    deviceCoords,
    history,
  });

  return {
    answer: agentResponse.answer,
    sources: agentResponse.sources,
    intent: agentResponse.intent,
    sourceBadge: agentResponse.sourceBadge,
    cards: agentResponse.cards,
    mapData: agentResponse.mapData,
    ttsText: agentResponse.ttsText,
    context,
  };
}
