import {
  getDbBuses,
  getDbBusById,
  getDbQueueStatus,
  getDbCampusLocations,
  getProfileWithDetails,
  getUserNotifications,
  calculateDbCampusWalkingRoute,
  getDbStudentActiveQueue,
  getLatestBusLocation,
  isBusTrackingActive,
} from "../../../../src/db/services.ts";
import { listSafetyAlerts } from "./safety";
import { listProviders } from "./transport";
import {
  buildConversationNaviResponse,
  buildOutOfScopeNaviResponse,
  executeMobilityAgent,
  isGreetingOrSmallTalk,
  isOutOfMobilityScope,
  type ConversationTurn,
} from "./aiMobilityEngine";
import {
  enhanceNaviAnswerWithGemini,
  generateConversationalNaviReply,
  isGeminiConfigured,
  type NaviHistoryTurn,
} from "./geminiNavi";

type NaviChatReply = {
  answer: string;
  sources: string[];
  intent: string;
  sourceBadge: {
    label: string;
    type: "scheduled" | "live GPS" | "official" | "calculated";
    timestamp: string;
  };
  ttsText: string;
  context: null;
  cards?: Array<{
    type: string;
    title: string;
    subtitle?: string;
    details: Record<string, unknown>;
  }>;
  mapData?: unknown;
  followUps?: string[];
  geminiEnhanced?: boolean;
};

function toHistoryTurns(history?: ConversationTurn[]): NaviHistoryTurn[] {
  if (!history?.length) return [];
  return history
    .filter((t) => t.role === "user" || t.role === "assistant")
    .map((t) => ({ role: t.role, text: t.text }));
}

async function deliverNaviReply(
  userMessage: string,
  reply: NaviChatReply,
  history?: ConversationTurn[],
  studentDisplayName?: string,
): Promise<NaviChatReply> {
  if (!isGeminiConfigured()) return { ...reply, geminiEnhanced: false };

  if (reply.intent === "OUT_OF_SCOPE") {
    return { ...reply, geminiEnhanced: false, followUps: undefined };
  }

  if (reply.intent === "CONVERSATION") {
    const conversational = await generateConversationalNaviReply({
      userMessage,
      history: toHistoryTurns(history),
      liveContext: reply.answer,
      studentName: studentDisplayName || "Student",
    });
    if (conversational) {
      return {
        ...reply,
        answer: conversational.answer,
        ttsText: conversational.ttsText,
        followUps: conversational.followUps,
        geminiEnhanced: true,
        sourceBadge: {
          ...reply.sourceBadge,
          label: `${reply.sourceBadge.label} · Gemini`,
        },
      };
    }
  }

  const enhanced = await enhanceNaviAnswerWithGemini({
    userMessage,
    factualAnswer: reply.answer,
    factualTts: reply.ttsText,
    sources: reply.sources,
    intent: reply.intent,
    history: toHistoryTurns(history),
  });

  if (!enhanced) return { ...reply, geminiEnhanced: false };

  return {
    ...reply,
    answer: enhanced.answer,
    ttsText: enhanced.ttsText,
    followUps: enhanced.followUps,
    geminiEnhanced: true,
    sourceBadge: {
      ...reply.sourceBadge,
      label: `${reply.sourceBadge.label} · Gemini`,
    },
  };
}

export async function getAiContext(studentId = "student-20418") {
  const [buses, locations, safetyAlerts, profile, queue] = await Promise.all([
    getDbBuses(),
    getDbCampusLocations(),
    Promise.resolve(listSafetyAlerts()),
    getProfileWithDetails(studentId),
    getDbQueueStatus(profile?.assignedBusId || "bus-12", studentId),
  ]);

  return {
    buses,
    queue,
    safetyAlerts,
    destinations: locations,
    providers: listProviders(),
    studentProfile: profile,
  };
}

export async function answerMobilityQuestion(
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
  const textLower = message.toLowerCase().trim();

  if (isOutOfMobilityScope(message, history ?? [])) {
    const scoped = buildOutOfScopeNaviResponse();
    return {
      answer: scoped.answer,
      sources: scoped.sources,
      intent: scoped.intent,
      sourceBadge: scoped.sourceBadge,
      ttsText: scoped.ttsText,
      context: null,
      geminiEnhanced: false,
    };
  }

  if (isGreetingOrSmallTalk(message)) {
    const conv = await buildConversationNaviResponse(studentId, deviceCoords);
    const profile = await getProfileWithDetails(studentId);
    const studentDisplayName = profile?.name?.split(" ")[0] || "Student";
    return deliverNaviReply(
      message,
      {
        answer: conv.answer,
        sources: conv.sources,
        intent: conv.intent,
        sourceBadge: conv.sourceBadge,
        ttsText: conv.ttsText,
        context: null,
      },
      history,
      studentDisplayName,
    );
  }

  // 1. Safeguard against impossible questions / non-existent buses / hallucinated queries
  if (
    textLower.includes("random bus") ||
    textLower.includes("doesn't exist") ||
    textLower.includes("does not exist") ||
    textLower.includes("fake bus") ||
    textLower.includes("ghost bus") ||
    textLower.includes("bus 999") ||
    textLower.includes("alien") ||
    textLower.includes("spaceship")
  ) {
    return {
      answer: "I don't have verified data for that right now.",
      sources: ["ACIMS Verified Data Boundary"],
      intent: "GENERAL_TRANSPORT",
      sourceBadge: {
        label: "Data Unavailable",
        type: "official",
        timestamp: new Date().toISOString(),
      },
      ttsText: "I don't have verified data for that right now.",
      context: null,
    };
  }

  // 2. Queue position questions
  if (
    textLower.includes("queue position") ||
    textLower.includes("my place in line") ||
    textLower.includes("am i in queue") ||
    textLower.includes("queue status")
  ) {
    const studentQueue = await getDbStudentActiveQueue(studentId);
    if (studentQueue) {
      const answer = `You are currently holding position #${studentQueue.queuePosition} in the boarding queue for Bus ${studentQueue.busId.replace('bus-', '')} at stop ${studentQueue.boardingStop}. There are ${studentQueue.totalInQueue} student(s) currently waiting in line.`;
      return {
        answer,
        sources: ["Cloud SQL boarding_queue table"],
        intent: "QUEUE_STATUS",
        sourceBadge: {
          label: `Queue Position #${studentQueue.queuePosition}`,
          type: "live GPS",
          timestamp: new Date().toISOString(),
        },
        ttsText: `You are at position ${studentQueue.queuePosition} in the boarding queue.`,
        context: null,
      };
    } else {
      const answer = "You are not currently waiting in any boarding queue. The line is open—you can select your boarding stop on the Queue page to hold your place.";
      return {
        answer,
        sources: ["Cloud SQL boarding_queue table"],
        intent: "QUEUE_STATUS",
        sourceBadge: {
          label: "Queue Open",
          type: "official",
          timestamp: new Date().toISOString(),
        },
        ttsText: "You are not currently in any boarding queue.",
        context: null,
      };
    }
  }

  // 3. Notifications questions
  if (
    textLower.includes("notification") ||
    textLower.includes("my alerts") ||
    textLower.includes("what updates")
  ) {
    const notifs = await getUserNotifications(studentId);
    if (notifs.length > 0) {
      const summary = notifs.slice(0, 3).map((n) => `• [${n.type.toUpperCase()}] ${n.title}: ${n.message}`).join("\n");
      const answer = `Here are your latest verified notifications:\n\n${summary}`;
      return {
        answer,
        sources: ["Cloud SQL notifications table"],
        intent: "NOTIFICATIONS",
        sourceBadge: {
          label: `${notifs.length} Verified Notifications`,
          type: "official",
          timestamp: new Date().toISOString(),
        },
        ttsText: `You have ${notifs.length} verified notifications. Latest: ${notifs[0].title}.`,
        context: null,
      };
    } else {
      const answer = "You currently have no unread transit or safety notifications.";
      return {
        answer,
        sources: ["Cloud SQL notifications table"],
        intent: "NOTIFICATIONS",
        sourceBadge: {
          label: "No Alerts",
          type: "official",
          timestamp: new Date().toISOString(),
        },
        ttsText: "You currently have no unread notifications.",
        context: null,
      };
    }
  }

  // 4. Campus Location & Navigation Questions
  if (
    textLower.includes("d block") ||
    textLower.includes("main block") ||
    textLower.includes("library") ||
    textLower.includes("auditorium") ||
    textLower.includes("where is") ||
    textLower.includes("how do i reach") ||
    textLower.includes("take me to") ||
    textLower.includes("walk to")
  ) {
    const locations = await getDbCampusLocations();
    let matchedLocation = null;

    if (textLower.includes("d block") || textLower.includes("d-block")) {
      matchedLocation = locations.find((l) => l.name.toLowerCase().includes("d block") || l.id.includes("d-block"));
    } else if (textLower.includes("main block") || textLower.includes("academic quad")) {
      matchedLocation = locations.find((l) => l.name.toLowerCase().includes("main") || l.name.toLowerCase().includes("academic"));
    } else if (textLower.includes("library")) {
      matchedLocation = locations.find((l) => l.name.toLowerCase().includes("library"));
    } else if (textLower.includes("auditorium")) {
      matchedLocation = locations.find((l) => l.name.toLowerCase().includes("auditorium"));
    }

    if (matchedLocation) {
      const isDirectionsQuery =
        textLower.includes("how do i reach") ||
        textLower.includes("take me to") ||
        textLower.includes("walk to") ||
        textLower.includes("route to") ||
        textLower.includes("directions");

      if (isDirectionsQuery) {
        const startPoint = deviceCoords?.latitude && deviceCoords?.longitude
          ? { latitude: deviceCoords.latitude, longitude: deviceCoords.longitude }
          : "REC Main Gate";

        const route = await calculateDbCampusWalkingRoute(startPoint, matchedLocation.id);
        if (route) {
          const stepsText = route.steps.map((s, idx) => `${idx + 1}. ${s}`).join("\n");
          const answer = `Verified walking route to ${matchedLocation.name} (${matchedLocation.category}):\n\n• Estimated Distance: ~${route.distanceMeters} meters\n• Walking Time: ~${route.walkingMinutes} minutes\n\nStep-by-step path:\n${stepsText}\n\nNavigation calculated from Cloud SQL verified campus paths.`;
          return {
            answer,
            sources: ["Cloud SQL campus_locations", "Cloud SQL campus_paths"],
            intent: "CAMPUS_NAVIGATION",
            sourceBadge: {
              label: `Walking Path · ~${route.walkingMinutes} min`,
              type: "calculated",
              timestamp: new Date().toISOString(),
            },
            cards: [
              {
                type: "route",
                title: matchedLocation.name,
                subtitle: `${route.distanceMeters}m · ~${route.walkingMinutes} min walking`,
                details: {
                  category: matchedLocation.category,
                  description: matchedLocation.description,
                  distance: `${route.distanceMeters}m`,
                  time: `${route.walkingMinutes} min`,
                },
              },
            ],
            ttsText: `To reach ${matchedLocation.name}, follow the campus pedestrian walkway. It is approximately ${route.distanceMeters} meters, or about ${route.walkingMinutes} minutes walk.`,
            context: null,
          };
        }
      }

      // Location query ("Where is D Block?")
      const answer = `${matchedLocation.name} is located in the ${matchedLocation.category} zone of Rajalakshmi Engineering College campus.\n\nDescription: ${matchedLocation.description || "Campus building facility."}\nCoordinates: [${matchedLocation.latitude}, ${matchedLocation.longitude}]\n\nYou can ask "Take me to ${matchedLocation.name}" to view the verified walking route along campus paths.`;
      return {
        answer,
        sources: ["Cloud SQL campus_locations table"],
        intent: "CAMPUS_LOCATION",
        sourceBadge: {
          label: "Verified Campus Location",
          type: "official",
          timestamp: new Date().toISOString(),
        },
        cards: [
          {
            type: "route",
            title: matchedLocation.name,
            subtitle: matchedLocation.category.toUpperCase(),
            details: {
              description: matchedLocation.description,
              latitude: matchedLocation.latitude,
              longitude: matchedLocation.longitude,
            },
          },
        ],
        ttsText: `${matchedLocation.name} is in the ${matchedLocation.category} zone of campus.`,
        context: null,
      };
    }
  }

  // 5. Default to the rule-based GTFS + Live GPS reasoning engine (+ optional Gemini phrasing)
  const profile = await getProfileWithDetails(studentId);
  const studentDisplayName = profile?.name?.split(" ")[0] || "Student";

  const agentResponse = await executeMobilityAgent({
    studentId,
    message,
    destinationId,
    deviceCoords,
    history,
  });

  return deliverNaviReply(
    message,
    {
      answer: agentResponse.answer,
      sources: agentResponse.sources,
      intent: agentResponse.intent,
      sourceBadge: agentResponse.sourceBadge,
      cards: agentResponse.cards,
      mapData: agentResponse.mapData,
      ttsText: agentResponse.ttsText,
      context: null,
    },
    history,
    studentDisplayName,
  );
}
