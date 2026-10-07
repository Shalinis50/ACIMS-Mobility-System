/**
 * MOBI AI Voice Search Agent
 * Real Google Gemini Brain with Tool / Function Calling & Session Memory
 */

import { GoogleGenAI } from "@google/genai";
import { TransitSearchService, haversineDistanceKm } from "./transitSearchService.js";

export class ApiKeyMissingError extends Error {
  constructor(message = "GEMINI_API_KEY is not configured. Please set your GEMINI_API_KEY in .env to use the real AI brain.") {
    super(message);
    this.name = "ApiKeyMissingError";
    this.code = "GEMINI_API_KEY_REQUIRED";
  }
}

/**
 * Tool / Function Declarations for Gemini Function Calling
 */
export const MOBI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "searchBuses",
        description: "Search for bus routes connecting an origin and destination, or matching a query keyword (e.g., 'buses to T Nagar', '21G', 'Anna Nagar').",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description: "General search term or route number (e.g., '21G', 'Tambaram', 'AC bus')"
            },
            origin: {
              type: "STRING",
              description: "Origin location or stop name (e.g., 'Central', 'Broadway')"
            },
            destination: {
              type: "STRING",
              description: "Destination location or stop name (e.g., 'T Nagar', 'Besant Nagar')"
            }
          }
        }
      },
      {
        name: "getNearbyBusStops",
        description: "Find bus stops near user's GPS coordinates or a specified landmark. Returns distance in meters/km and buses serving each stop.",
        parameters: {
          type: "OBJECT",
          properties: {
            latitude: {
              type: "NUMBER",
              description: "User GPS latitude (e.g., 13.0418)"
            },
            longitude: {
              type: "NUMBER",
              description: "User GPS longitude (e.g., 80.2341)"
            },
            radiusKm: {
              type: "NUMBER",
              description: "Search radius in kilometers (default 3.0)"
            },
            stopName: {
              type: "STRING",
              description: "Optional landmark or area name (e.g., 'Guindy', 'Besant Nagar')"
            }
          }
        }
      },
      {
        name: "getBusDetails",
        description: "Get real-time live status and GPS positions for a specific bus number (e.g., '21G', '29C', '570'). Returns vehicle location, speed, occupancy, and route.",
        parameters: {
          type: "OBJECT",
          properties: {
            busNumber: {
              type: "STRING",
              description: "The bus route number (e.g., '21G', '29C')"
            }
          },
          required: ["busNumber"]
        }
      },
      {
        name: "getLiveBusETA",
        description: "Get live arrival time (ETA in minutes) of a bus approaching a specific stop or user location.",
        parameters: {
          type: "OBJECT",
          properties: {
            busNumber: {
              type: "STRING",
              description: "The bus route number (e.g., '21G')"
            },
            stopName: {
              type: "STRING",
              description: "Target bus stop name to calculate arrival time for (e.g., 'Chennai Airport', 'Guindy', 'Adyar')"
            }
          },
          required: ["busNumber"]
        }
      },
      {
        name: "getRouteInformation",
        description: "Get full stop sequence, operating hours, and fare information for a bus route.",
        parameters: {
          type: "OBJECT",
          properties: {
            routeNumber: {
              type: "STRING",
              description: "The bus route number (e.g., '21G', '570')"
            }
          },
          required: ["routeNumber"]
        }
      }
    ]
  }
];

export const MOBI_SYSTEM_INSTRUCTION = `You are MOBI, the voice-first AI transit search agent for urban mobility.
Your role is to understand passenger queries through voice or text, search real transit data using tools, and respond naturally and concisely.

CRITICAL GROUNDING RULES:
1. ALWAYS use the provided tools to fetch real transit information. NEVER invent, hallucinate, or assume bus numbers, arrival times, stops, or locations.
2. Ground all answers strictly in the tool output.
3. If a tool returns no results, state honestly: "I couldn't find any matching results."
4. If a requested bus route is not found, state that the bus route is not present in the active transit database.
5. If the user asks for "buses near me", call \`getNearbyBusStops\` or \`searchBuses\`.
6. Maintain short-term conversational context. If the user asks a follow-up question like "Which one is closest?", "Where is it going?", or "What about the next one?", refer back to the buses or stops previously discussed in this conversation.
7. Keep spoken responses clear, concise, and natural (1-3 conversational sentences), highlighting crucial numbers (route, ETA in minutes, destination, occupancy).
8. If the user speaks in Tamil, Hindi, or another supported language, answer politely in that language while keeping route numbers and landmark names easily recognizable.`;

/**
 * In-memory Session Store for Conversation Memory
 */
class SessionStore {
  constructor(maxAgeMs = 30 * 60 * 1000) {
    this.sessions = new Map();
    this.maxAgeMs = maxAgeMs;

    // Periodic cleanup of stale sessions
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  get(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.lastAccessed = Date.now();
    return session;
  }

  getOrCreate(sessionId) {
    let session = this.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        history: [],
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        context: {}
      };
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  cleanup() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastAccessed > this.maxAgeMs) {
        this.sessions.delete(id);
      }
    }
  }

  reset(sessionId) {
    this.sessions.delete(sessionId);
  }
}

export const sessionStore = new SessionStore();

export class MobiAgent {
  /**
   * Check if Gemini API key is configured
   */
  static isConfigured() {
    const key = process.env.GEMINI_API_KEY;
    return Boolean(key && key.trim().length > 0 && !key.includes("your_gemini_api_key"));
  }

  /**
   * Get an initialized GoogleGenAI instance
   */
  static getClient() {
    if (!this.isConfigured()) {
      throw new ApiKeyMissingError();
    }
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });
  }

  /**
   * Process a user query through the real AI pipeline with function calling & streaming
   * @param {Object} options
   * @param {string} options.message - User speech transcript or typed query
   * @param {string} options.sessionId - Session ID for conversation memory
   * @param {Object} [options.userLocation] - { latitude, longitude }
   * @param {string} [options.language] - e.g. "en-US", "ta-IN", "hi-IN"
   * @param {Function} [options.onEvent] - Callback for streaming events (status, tool, delta, done)
   */
  static async processTurn({ message, sessionId = "default", userLocation, language = "en-US", onEvent = () => {} }) {
    const requestStartTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    console.log(`[MobiAgent ${requestId}] Start turn for session "${sessionId}": "${message}"`);

    if (!this.isConfigured()) {
      throw new ApiKeyMissingError();
    }

    const ai = this.getClient();
    const session = sessionStore.getOrCreate(sessionId);

    // 1. Initial State: Understanding
    onEvent({
      type: "status",
      status: "processing",
      label: "Understanding...",
      requestId
    });

    // 2. Prepare user content turn
    let userTurnPrompt = message;
    if (userLocation && typeof userLocation.latitude === "number") {
      userTurnPrompt += `\n[User Coordinates: lat=${userLocation.latitude}, lng=${userLocation.longitude}]`;
    }
    if (language) {
      userTurnPrompt += `\n[Requested Language: ${language}]`;
    }

    session.history.push({
      role: "user",
      parts: [{ text: userTurnPrompt }]
    });

    // Keep history bounded to last 16 turns to avoid context overflow while keeping relevant context
    if (session.history.length > 16) {
      session.history = session.history.slice(session.history.length - 16);
    }

    const executedTools = [];
    const aiStartMs = Date.now();

    // Helper to generate content with fallback models if 3.8 encounters transient capacity/rate-limits
    async function callWithFallback(callFn) {
      const candidateModels = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
      let lastErr = null;
      for (const model of candidateModels) {
        try {
          return await callFn(model);
        } catch (err) {
          lastErr = err;
          console.warn(`[MobiAgent ${requestId}] Model ${model} returned error (${err.message}). Retrying fallback model...`);
          // If error is invalid API key, throw immediately
          if (err.message && (err.message.includes("API key not valid") || err.message.includes("API_KEY_INVALID"))) {
            throw err;
          }
        }
      }
      throw lastErr;
    }

    // 3. First call: Determine intent & tool calls
    const initialResponse = await callWithFallback((model) =>
      ai.models.generateContent({
        model,
        contents: session.history,
        config: {
          systemInstruction: MOBI_SYSTEM_INSTRUCTION,
          tools: MOBI_TOOLS,
          temperature: 0.2
        }
      })
    );

    const initialAiDurationMs = Date.now() - aiStartMs;

    // Check if tool/function calls were requested
    const functionCalls = initialResponse.functionCalls || [];

    if (functionCalls.length > 0) {
      onEvent({
        type: "status",
        status: "searching",
        label: "Searching...",
        requestId
      });

      // Preserve model turn in history directly from model candidate
      if (initialResponse.candidates && initialResponse.candidates[0]?.content) {
        session.history.push(initialResponse.candidates[0].content);
      } else {
        const modelFunctionCallParts = functionCalls.map((fc) => ({
          functionCall: {
            name: fc.name,
            args: fc.args || {}
          }
        }));
        session.history.push({
          role: "model",
          parts: modelFunctionCallParts
        });
      }

      // Execute each requested tool against real transit services
      const functionResponseParts = [];

      for (const fc of functionCalls) {
        const toolStartMs = Date.now();
        console.log(`[MobiAgent ${requestId}] Calling Tool: ${fc.name}(${JSON.stringify(fc.args)})`);

        onEvent({
          type: "tool_start",
          toolName: fc.name,
          args: fc.args,
          requestId
        });

        const toolResult = await this.executeToolCall(fc.name, fc.args, userLocation);
        const toolDurationMs = Date.now() - toolStartMs;

        executedTools.push({
          toolName: fc.name,
          args: fc.args,
          result: toolResult,
          durationMs: toolDurationMs
        });

        onEvent({
          type: "tool_result",
          toolName: fc.name,
          result: toolResult,
          durationMs: toolDurationMs,
          requestId
        });

        functionResponseParts.push({
          functionResponse: {
            name: fc.name,
            response: { result: toolResult }
          }
        });
      }

      // Append real tool results to history
      session.history.push({
        role: "user",
        parts: functionResponseParts
      });

      // Transition state: Responding
      onEvent({
        type: "status",
        status: "responding",
        label: "MOBI is responding...",
        requestId
      });

      // Stream the final grounded response based on real tool results
      const finalAiStartMs = Date.now();
      const stream = await callWithFallback((model) =>
        ai.models.generateContentStream({
          model,
          contents: session.history,
          config: {
            systemInstruction: MOBI_SYSTEM_INSTRUCTION,
            temperature: 0.3
          }
        })
      );

      let fullResponseText = "";
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          fullResponseText += text;
          onEvent({
            type: "delta",
            text,
            requestId
          });
        }
      }

      const finalAiDurationMs = Date.now() - finalAiStartMs;

      // Append model's final response to history
      session.history.push({
        role: "model",
        parts: [{ text: fullResponseText }]
      });

      const totalDurationMs = Date.now() - requestStartTime;
      console.log(`[MobiAgent ${requestId}] Finished turn in ${totalDurationMs}ms (Initial: ${initialAiDurationMs}ms, Final: ${finalAiDurationMs}ms)`);

      onEvent({
        type: "done",
        fullText: fullResponseText,
        tools: executedTools,
        metrics: {
          requestId,
          initialAiDurationMs,
          finalAiDurationMs,
          totalDurationMs
        }
      });

      return {
        text: fullResponseText,
        tools: executedTools,
        metrics: { requestId, totalDurationMs }
      };
    } else {
      // No tools were needed; direct conversational reply
      onEvent({
        type: "status",
        status: "responding",
        label: "MOBI is responding...",
        requestId
      });

      const text = initialResponse.text || "I'm here to help you find buses, stops, and schedules. How can I assist you?";

      // Emit text chunk
      onEvent({
        type: "delta",
        text,
        requestId
      });

      session.history.push({
        role: "model",
        parts: [{ text }]
      });

      const totalDurationMs = Date.now() - requestStartTime;

      onEvent({
        type: "done",
        fullText: text,
        tools: [],
        metrics: {
          requestId,
          initialAiDurationMs,
          totalDurationMs
        }
      });

      return {
        text,
        tools: [],
        metrics: { requestId, totalDurationMs }
      };
    }
  }

  /**
   * Execute real tool calls with real parameters
   */
  static async executeToolCall(toolName, args = {}, userLocation) {
    try {
      switch (toolName) {
        case "searchBuses": {
          return TransitSearchService.searchBuses({
            query: args.query,
            origin: args.origin,
            destination: args.destination
          });
        }

        case "getNearbyBusStops": {
          const lat = typeof args.latitude === "number" ? args.latitude : userLocation?.latitude;
          const lng = typeof args.longitude === "number" ? args.longitude : userLocation?.longitude;
          return TransitSearchService.getNearbyBusStops({
            latitude: lat,
            longitude: lng,
            radiusKm: args.radiusKm || 3.0,
            stopName: args.stopName
          });
        }

        case "getBusDetails": {
          return TransitSearchService.getBusDetails({
            busNumber: args.busNumber
          });
        }

        case "getLiveBusETA": {
          return TransitSearchService.getLiveBusETA({
            busNumber: args.busNumber,
            stopName: args.stopName
          });
        }

        case "getRouteInformation": {
          return TransitSearchService.getRouteInformation({
            routeNumber: args.routeNumber
          });
        }

        default:
          return {
            success: false,
            error: `Unknown tool '${toolName}'. Available tools: searchBuses, getNearbyBusStops, getBusDetails, getLiveBusETA, getRouteInformation.`
          };
      }
    } catch (err) {
      console.error(`Error executing tool ${toolName}:`, err);
      return {
        success: false,
        error: `Tool execution failed: ${err.message}`
      };
    }
  }
}
