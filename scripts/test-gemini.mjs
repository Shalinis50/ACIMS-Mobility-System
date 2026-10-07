import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("GEMINI_API_KEY is not set in .env");
  process.exit(1);
}

const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const ai = new GoogleGenAI({
  apiKey: key,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

try {
  const result = await ai.models.generateContent({
    model: modelName,
    contents: "Reply with the single word OK.",
  });
  console.log("Gemini response:", (result.text ?? "").trim());
} catch (err) {
  console.error("Gemini test failed:", err?.message || err);
  process.exit(1);
}

