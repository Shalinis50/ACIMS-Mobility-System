import { getDbBuses, getDbCampusLocations, getProfileWithDetails, getDbQueueStatus } from "../../../../src/db/services.ts";
import { listSafetyAlerts } from "./safety";
import { listProviders } from "./transport";
import { executeMobiAgent, type MobiConfirmAction, type MobiHistoryTurn } from "./mobiEngine.ts";
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
  actionPrompt?: {
    type: "CHANGE_PICKUP";
    currentName: string | null;
    options: Array<{ id: string; name: string }>;
  };
  toolsCalled?: string[];
};

function toHistoryTurns(history?: MobiHistoryTurn[]): NaviHistoryTurn[] {
  if (!history?.length) return [];
  return history
    .filter((t) => t.role === "user" || t.role === "assistant")
    .map((t) => ({ role: t.role, text: t.text }));
}

async function deliverMobiReply(
  userMessage: string,
  reply: NaviChatReply,
  history?: MobiHistoryTurn[],
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
  const [buses, locations, safetyAlerts, profile] = await Promise.all([
    getDbBuses(),
    getDbCampusLocations(),
    Promise.resolve(listSafetyAlerts()),
    getProfileWithDetails(studentId),
  ]);
  const queue = await getDbQueueStatus(profile?.assignedBusId || "bus-12", studentId);

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
  _destinationId?: string,
  studentId = "student-20418",
  deviceCoords?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp?: string;
  },
  history?: MobiHistoryTurn[],
  confirmAction?: MobiConfirmAction,
) {
  const profile = await getProfileWithDetails(studentId);
  const studentDisplayName = profile?.name?.split(" ")[0] || "Student";
  const mobi = await executeMobiAgent({
    studentId,
    message,
    deviceCoords,
    history,
    confirmAction,
  });

  return deliverMobiReply(
    message,
    {
      answer: mobi.answer,
      sources: mobi.sources,
      intent: mobi.intent,
      sourceBadge: mobi.sourceBadge,
      ttsText: mobi.ttsText,
      context: null,
      cards: mobi.cards,
      mapData: mobi.mapData,
      followUps: mobi.followUps,
      actionPrompt: mobi.actionPrompt,
      toolsCalled: mobi.toolsCalled,
    },
    history,
    studentDisplayName,
  );
}

export type { MobiHistoryTurn, MobiConfirmAction };
