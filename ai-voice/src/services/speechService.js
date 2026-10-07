/**
 * Production Speech Service for MOBI AI Voice Search Agent
 * Server-side audio transcription via Google Gemini Multimodal Audio
 */

import { GoogleGenAI } from "@google/genai";
import { MobiAgent, ApiKeyMissingError } from "./mobiAgent.js";

export class SpeechService {
  /**
   * Transcribe an uploaded audio buffer using Gemini Multimodal Audio API
   * @param {Buffer} audioBuffer - Raw audio data (e.g. webm, wav, mp3)
   * @param {string} mimeType - e.g. "audio/webm", "audio/wav"
   * @param {string} language - Target language code e.g. "en-US", "ta-IN"
   * @returns {Promise<{ success: boolean, transcript: string, durationMs: number }>}
   */
  static async transcribeAudio(audioBuffer, mimeType = "audio/webm", language = "en-US") {
    if (!MobiAgent.isConfigured()) {
      throw new ApiKeyMissingError();
    }

    const startTime = Date.now();
    const ai = MobiAgent.getClient();

    const base64Audio = audioBuffer.toString("base64");

    const promptText = `Listen to this audio clip and transcribe the spoken words verbatim into text.
Rules:
1. Return ONLY the exact transcribed text.
2. Do not include markdown tags, timestamps, explanations, or quotes.
3. If the audio is empty or silence, return an empty string.
Language hint: ${language}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Audio
              }
            },
            {
              text: promptText
            }
          ]
        }
      ],
      config: {
        temperature: 0.1
      }
    });

    const transcript = (response.text || "").trim();
    const durationMs = Date.now() - startTime;

    return {
      success: true,
      transcript,
      durationMs,
      language
    };
  }

  /**
   * Text-to-Speech configuration and server status
   */
  static async synthesizeSpeech(text, voice) {
    // When using client-side Web Speech API SpeechSynthesis, it provides zero-latency
    // native device voices (e.g. Samantha, Daniel, Google Indian English, Tamil).
    return {
      success: true,
      useClientSynthesis: true,
      text,
      voice
    };
  }
}
