import { Router, type IRouter } from "express";
import type { AuthRequest } from "../../../../src/middleware/auth.ts";
import { answerMobilityQuestion, getAiContext } from "../services/ai";
import { isGeminiConfigured } from "../services/geminiNavi";
import { getStudentProfile, updateStudentProfile } from "../services/studentProfileService";
import type { MobiConfirmAction } from "../services/mobiEngine.ts";

const router: IRouter = Router();

function resolveStudentId(req: AuthRequest, bodyStudentId?: string): string {
  const uid = (req.user as { uid?: string } | undefined)?.uid;
  return uid || req.header("x-acims-user-id") || bodyStudentId || "student-20418";
}

router.get("/ai/status", (_req, res) => {
  res.json({
    assistant: "MOBI",
    geminiEnabled: isGeminiConfigured(),
    model: process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash",
  });
});

router.get("/ai/context", async (req, res) => {
  try {
    const studentId = resolveStudentId(req as AuthRequest, typeof req.query.studentId === "string" ? req.query.studentId : undefined);
    const context = await getAiContext(studentId);
    res.json(context);
  } catch {
    res.status(500).json({ error: "Failed to load AI context" });
  }
});

router.post("/ai/chat", async (req, res) => {
  try {
    const { studentId, message = "", destinationId, deviceCoords, history, confirmAction } = req.body as {
      studentId?: string;
      message?: string;
      destinationId?: string;
      deviceCoords?: {
        latitude?: number;
        longitude?: number;
        accuracy?: number;
        speed?: number;
        heading?: number;
        timestamp?: string;
      };
      history?: Array<{ role: "user" | "assistant"; text: string; intent?: string }>;
      confirmAction?: MobiConfirmAction;
    };
    const resolvedId = resolveStudentId(req as AuthRequest, studentId);
    const response = await answerMobilityQuestion(
      message,
      destinationId,
      resolvedId,
      deviceCoords,
      history,
      confirmAction,
    );
    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process mobility query";
    res.status(500).json({ error: message });
  }
});

router.get("/student/profile", (req, res) => {
  const studentId = resolveStudentId(req as AuthRequest, typeof req.query.studentId === "string" ? req.query.studentId : undefined);
  res.json(getStudentProfile(studentId));
});

router.patch("/student/profile", (req, res) => {
  const studentId = resolveStudentId(req as AuthRequest, typeof req.query.studentId === "string" ? req.query.studentId : undefined);
  const updated = updateStudentProfile(studentId, req.body);
  res.json(updated);
});

export default router;
