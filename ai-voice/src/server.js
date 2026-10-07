/**
 * MOBI AI Voice Search Agent — Production Backend Server
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { MobiAgent, ApiKeyMissingError } from "./services/mobiAgent.js";
import { SpeechService } from "./services/speechService.js";
import { TransitSearchService } from "./services/transitSearchService.js";

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security and utility middlewares
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// In-memory rate limiting (max 60 requests per minute per IP)
const rateLimitMap = new Map();
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/")) return next();
  const ip = req.ip || req.headers["x-forwarded-for"] || "local";
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 60;

  const userStats = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > userStats.resetAt) {
    userStats.count = 1;
    userStats.resetAt = now + windowMs;
  } else {
    userStats.count++;
  }
  rateLimitMap.set(ip, userStats);

  if (userStats.count > maxRequests) {
    return res.status(429).json({
      error: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded. Please wait a moment before sending more requests."
    });
  }
  next();
});

// Audio upload middleware (memory buffer, max 10MB, auto-discarded after processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Serve frontend static assets from public/
app.use(express.static(path.join(__dirname, "../public")));

/**
 * Observability request logger
 */
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api/")) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

/**
 * GET /api/mobi/status
 * Health check & configuration status
 */
app.get("/api/mobi/status", (req, res) => {
  dotenv.config({ override: true });
  const isConfigured = MobiAgent.isConfigured();
  res.json({
    status: "ok",
    agent: "MOBI AI Voice Search Agent",
    configured: isConfigured,
    model: "gemini-3.8-flash",
    requiresCredential: !isConfigured ? "GEMINI_API_KEY" : null,
    setupGuide: !isConfigured
      ? "Create a GEMINI_API_KEY at https://aistudio.google.com/ and add it to your .env file."
      : null,
    tools: [
      { name: "searchBuses", description: "Search bus routes by keyword, origin, destination" },
      { name: "getNearbyBusStops", description: "Find stops near GPS coordinates or landmark" },
      { name: "getBusDetails", description: "Get real-time live status and GPS positions for a bus" },
      { name: "getLiveBusETA", description: "Get live arrival time (ETA in minutes) of a bus" },
      { name: "getRouteInformation", description: "Get full stop sequence and operating schedule" }
    ],
    supportedLanguages: [
      { code: "en-US", name: "English (US)" },
      { code: "en-IN", name: "English (India)" },
      { code: "ta-IN", name: "Tamil (தமிழ்)" },
      { code: "hi-IN", name: "Hindi (हिन्दी)" },
      { code: "es-ES", name: "Spanish (Español)" }
    ]
  });
});

/**
 * POST /api/mobi/chat
 * Real-time SSE streaming endpoint for voice / text interactions
 */
app.post("/api/mobi/chat", async (req, res) => {
  dotenv.config({ override: true });
  const { message, sessionId = "default", userLocation, language = "en-US" } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "INVALID_REQUEST",
      message: "A non-empty 'message' string is required."
    });
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendEvent = (eventData) => {
    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
  };

  try {
    await MobiAgent.processTurn({
      message: message.trim(),
      sessionId,
      userLocation,
      language,
      onEvent: (event) => {
        sendEvent(event);
      }
    });

    res.end();
  } catch (err) {
    console.error("MobiAgent turn error:", err);

    if (err instanceof ApiKeyMissingError || err.code === "GEMINI_API_KEY_REQUIRED") {
      sendEvent({
        type: "error",
        code: "GEMINI_API_KEY_REQUIRED",
        message: "GEMINI_API_KEY is not configured. Please add your real Gemini API key in the .env file to enable live AI reasoning."
      });
    } else {
      sendEvent({
        type: "error",
        code: "AGENT_EXECUTION_ERROR",
        message: err.message || "An unexpected error occurred while communicating with the AI service."
      });
    }
    res.end();
  }
});

/**
 * POST /api/mobi/transcribe
 * Audio speech-to-text endpoint for uploaded voice recordings / WebM audio blobs
 */
app.post("/api/mobi/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: "NO_AUDIO_FILE",
        message: "No audio file was uploaded in the request."
      });
    }

    const mimeType = req.file.mimetype || "audio/webm";
    const language = req.body.language || "en-US";

    const result = await SpeechService.transcribeAudio(req.file.buffer, mimeType, language);
    res.json(result);
  } catch (err) {
    console.error("Transcription error:", err);
    if (err instanceof ApiKeyMissingError || err.code === "GEMINI_API_KEY_REQUIRED") {
      return res.status(401).json({
        success: false,
        code: "GEMINI_API_KEY_REQUIRED",
        message: "GEMINI_API_KEY is required in .env for server-side audio transcription."
      });
    }
    res.status(500).json({
      success: false,
      error: "TRANSCRIPTION_FAILED",
      message: err.message || "Failed to transcribe audio."
    });
  }
});

/**
 * POST /api/mobi/tts
 * Text-to-speech endpoint
 */
app.post("/api/mobi/tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: "Text is required." });
    }

    const result = await SpeechService.synthesizeSpeech(text, voice);
    res.json(result);
  } catch (err) {
    console.error("TTS error:", err);
    res.json({
      success: false,
      useClientFallback: true,
      message: "Using client-side speech synthesis."
    });
  }
});

/**
 * GET /api/mobi/transit/search
 * Direct search tool query endpoint (for observability and quick testing)
 */
app.get("/api/mobi/transit/search", (req, res) => {
  const { q, origin, destination, busNumber, stopName, lat, lng } = req.query;

  if (busNumber) {
    const details = TransitSearchService.getBusDetails({ busNumber });
    return res.json(details);
  }

  if (lat && lng) {
    const nearby = TransitSearchService.getNearbyBusStops({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng)
    });
    return res.json(nearby);
  }

  const results = TransitSearchService.searchBuses({
    query: q,
    origin,
    destination
  });
  res.json(results);
});

// Fallback index.html route for client-side routing
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api/")) {
    return res.sendFile(path.join(__dirname, "../public/index.html"));
  }
  next();
});

// Start Express server if not in test mode
let server = null;
if (process.env.NODE_ENV !== "test") {
  server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  MOBI AI Voice Search Agent Server`);
    console.log(`  Port: http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`  Gemini Configured: ${MobiAgent.isConfigured() ? "YES" : "NO (Set GEMINI_API_KEY in .env)"}`);
    console.log(`====================================================`);
  });
}

export { app, server };
