import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("GEMINI_API_KEY is not set in .env");
  process.exit(1);
}

const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: modelName });

try {
  const result = await model.generateContent("Reply with the single word OK.");
  console.log("Gemini response:", result.response.text().trim());
} catch (err) {
  console.error("Gemini test failed:", err?.message || err);
  process.exit(1);
}
