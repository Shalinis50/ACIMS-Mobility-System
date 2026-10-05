import { GoogleGenAI } from "@google/genai";

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

const MOBI_SYSTEM_PROMPT = `You are MOBI, the mobility assistant for ACIMS.

You must only provide information supported by the data returned by ACIMS backend tools or explicitly integrated authoritative sources.

Never invent buses, drivers, routes, pickup points, timings, GPS locations, ETAs, delays, campus locations, MTC routes, or availability.

Never estimate a value when the system has not provided enough information.

If required data is unavailable, explicitly state that the information is currently unavailable.

Do not pretend that a backend action was completed unless the backend confirms success.

Do not claim that a bus is moving unless recent GPS data confirms it.

Do not claim that a bus is delayed unless the delay service calculates a delay.

Do not claim that a bus has arrived unless the arrival/geofence system confirms arrival.

Always prefer 'I don't have enough current data to answer that reliably' over guessing.`;

function getAiClient(): { ai: GoogleGenAI; modelName: string } | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const ai = new GoogleGenAI({ apiKey });
  return { ai, modelName };
}

function formatHistory(history: NaviHistoryTurn[]): string {
  if (!history.length) return "(no prior turns)";
  return history
    .slice(-8)
    .map((t) => `${t.role === "user" ? "Student" : "MOBI"}: ${t.text}`)
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
  const client = getAiClient();
  if (!client) return null;

  try {
    const prompt = `Rewrite VERIFIED_ANSWER as MOBI in short, clear spoken Indian English (one or two sentences for simple questions).

STRICT RULES:
- Use ONLY facts from VERIFIED_ANSWER. Never invent buses, routes, ETAs, delays, GPS, campus buildings, or MTC data.
- Keep all numbers, bus numbers, times, and place names exactly as in VERIFIED_ANSWER.
- If VERIFIED_ANSWER says data is unavailable, keep that honesty. Never fill gaps.
- Distinguish scheduled vs predicted vs live when both appear.
- ttsText must be the same facts, under 45 words, no extra information.
- followUps: 2-3 short commute questions only.

CHAT_HISTORY:
${formatHistory(params.history ?? [])}

USER_QUESTION: ${params.userMessage}
INTENT: ${params.intent}
DATA_SOURCES: ${params.sources.join(" | ")}

VERIFIED_ANSWER:
${params.factualAnswer}

Reply with JSON only, no markdown:
{"answer":"...","ttsText":"...","followUps":["...","..."]}`;

    const result = await client.ai.models.generateContent({
      model: client.modelName,
      contents: prompt,
      config: {
        systemInstruction: MOBI_SYSTEM_PROMPT,
        temperature: 0.2,
        maxOutputTokens: 800,
      },
    });
    const raw = result.text?.trim() || "";
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
    console.warn("[MOBI Gemini] enhancement failed:", err instanceof Error ? err.message : err);
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
  const client = getAiClient();
  if (!client) return null;

  try {
    const prompt = `Respond as MOBI. Be short, clear, and helpful.

STRICT RULES:
- Use ONLY facts in LIVE_CONTEXT for bus location, ETA, delays, or schedules.
- Never invent GPS, bus numbers, times, or MTC data not in LIVE_CONTEXT.
- If they greet you, greet back and offer 2-3 things you can help with (from context).
- If they thank you or say bye, respond briefly.
- followUps: 2-3 short suggested questions.

STUDENT_NAME: ${params.studentName}

LIVE_CONTEXT:
${params.liveContext}

CHAT_HISTORY:
${formatHistory(params.history ?? [])}

STUDENT_MESSAGE: ${params.userMessage}

JSON only:
{"answer":"...","ttsText":"...","followUps":["...","..."]}`;

    const result = await client.ai.models.generateContent({
      model: client.modelName,
      contents: prompt,
      config: {
        systemInstruction: MOBI_SYSTEM_PROMPT,
        temperature: 0.2,
        maxOutputTokens: 800,
      },
    });
    const raw = result.text?.trim() || "";
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
    console.warn("[MOBI Gemini] conversational failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
