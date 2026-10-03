import { GoogleGenerativeAI } from "@google/generative-ai";

export type NaviHistoryTurn = { role: "user" | "assistant"; text: string };

export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  return key || undefined;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

let lastGeminiSuccessAt: string | null = null;

export function getGeminiAdminTelemetry() {
  return { lastSuccessAt: lastGeminiSuccessAt };
}

function markGeminiSuccess() {
  lastGeminiSuccessAt = new Date().toISOString();
}

function getModel() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.55,
      maxOutputTokens: 1200,
    },
  });
}

function formatHistory(history: NaviHistoryTurn[]): string {
  if (!history.length) return "(no prior turns)";
  return history
    .slice(-8)
    .map((t) => `${t.role === "user" ? "Student" : "NAVI"}: ${t.text}`)
    .join("\n");
}

/**
 * Rewrites a verified NAVI answer in natural Indian English without changing facts.
 */
export async function enhanceNaviAnswerWithGemini(params: {
  userMessage: string;
  factualAnswer: string;
  factualTts: string;
  sources: string[];
  intent: string;
  history?: NaviHistoryTurn[];
}): Promise<{ answer: string; ttsText: string; followUps?: string[] } | null> {
  const model = getModel();
  if (!model) return null;

  try {
    const prompt = `You are NAVI, the ACIMS mobility assistant for Rajalakshmi Engineering College (REC), Chennai.

Rewrite VERIFIED_ANSWER for the student in clear, friendly Indian English. Use short paragraphs or bullet lines when helpful. Match the tone of the conversation when CHAT_HISTORY is relevant.

STRICT RULES:
- If the user question is not about transport, commute, campus travel, or ACIMS mobility, respond with exactly: {"answer":"Please ask something related to your transport or daily commute — I can only help with buses, pickup, and campus mobility.","ttsText":"Please ask about your commute or bus.","followUps":[]}
- Use ONLY facts from VERIFIED_ANSWER. Never invent buses, routes, ETAs, delays, or stop names.
- Keep all numbers, bus numbers, times, and place names exactly as in VERIFIED_ANSWER.
- If data is unavailable in VERIFIED_ANSWER, say so plainly.
- ttsText must be one concise sentence for voice readout (under 45 words), same facts only.
- followUps: 2-3 short suggested next questions the student might ask (strings only), commute-related.

CHAT_HISTORY:
${formatHistory(params.history ?? [])}

USER_QUESTION: ${params.userMessage}
INTENT: ${params.intent}
DATA_SOURCES: ${params.sources.join(" | ")}

VERIFIED_ANSWER:
${params.factualAnswer}

Reply with JSON only, no markdown:
{"answer":"...","ttsText":"...","followUps":["...","..."]}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const jsonSlice = raw.match(/\{[\s\S]*\}/);
    if (!jsonSlice) return null;

    const parsed = JSON.parse(jsonSlice[0]) as {
      answer?: string;
      ttsText?: string;
      followUps?: string[];
    };
    if (!parsed.answer?.trim()) return null;

    markGeminiSuccess();
    return {
      answer: parsed.answer.trim(),
      ttsText: (parsed.ttsText?.trim() || params.factualTts).slice(0, 500),
      followUps: Array.isArray(parsed.followUps)
        ? parsed.followUps.filter((s) => typeof s === "string" && s.trim()).slice(0, 4)
        : undefined,
    };
  } catch (err) {
    console.warn("[NAVI Gemini] enhancement failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Dynamic conversational turn when the student is greeting, asking for help, or chatting.
 * Grounded in LIVE_CONTEXT only — no invented telemetry.
 */
export async function generateConversationalNaviReply(params: {
  userMessage: string;
  history?: NaviHistoryTurn[];
  liveContext: string;
  studentName: string;
}): Promise<{ answer: string; ttsText: string; followUps?: string[] } | null> {
  const model = getModel();
  if (!model) return null;

  try {
    const prompt = `You are NAVI, ACIMS mobility assistant for REC Chennai students.

Respond naturally to the student's message. Be warm, concise, and practical (Indian English).

STRICT RULES:
- If STUDENT_MESSAGE is not about transport, commute, greetings, thanks, or campus mobility, respond with exactly: {"answer":"Please ask something related to your transport or daily commute — I can only help with buses, pickup, and campus mobility.","ttsText":"Please ask about your commute or bus.","followUps":[]}
- Use ONLY facts in LIVE_CONTEXT for bus location, ETA, delays, or schedules.
- Never invent GPS, bus numbers, or times not in LIVE_CONTEXT.
- If they greet you, greet back and offer 2-3 things you can help with (from context).
- If they thank you or say bye, respond briefly and kindly.
- followUps: 2-3 short suggested questions they can tap next.

STUDENT_NAME: ${params.studentName}

LIVE_CONTEXT:
${params.liveContext}

CHAT_HISTORY:
${formatHistory(params.history ?? [])}

STUDENT_MESSAGE: ${params.userMessage}

JSON only:
{"answer":"...","ttsText":"...","followUps":["...","..."]}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const jsonSlice = raw.match(/\{[\s\S]*\}/);
    if (!jsonSlice) return null;

    const parsed = JSON.parse(jsonSlice[0]) as {
      answer?: string;
      ttsText?: string;
      followUps?: string[];
    };
    if (!parsed.answer?.trim()) return null;

    markGeminiSuccess();
    return {
      answer: parsed.answer.trim(),
      ttsText: (parsed.ttsText?.trim() || parsed.answer).slice(0, 500),
      followUps: Array.isArray(parsed.followUps)
        ? parsed.followUps.filter((s) => typeof s === "string" && s.trim()).slice(0, 4)
        : undefined,
    };
  } catch (err) {
    console.warn("[NAVI Gemini] conversational failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
