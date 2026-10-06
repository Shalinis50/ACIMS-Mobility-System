import { Router, type IRouter } from "express";
import { answerMobilityQuestion, getAiContext } from "../services/ai";
import { getStudentProfile, updateStudentProfile } from "../services/studentProfileService";

const router: IRouter = Router();

router.get("/ai/context", async (req, res) => {
  try {
    const studentId = typeof req.query.studentId === "string" ? req.query.studentId : "student-20418";
    const context = await getAiContext(studentId);
    res.json(context);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load AI context" });
  }
});

router.post("/ai/chat", async (req, res) => {
  try {
    const { studentId = "student-20418", message = "", destinationId, deviceCoords, history } = req.body;
    const response = await answerMobilityQuestion(
      message,
      destinationId,
      studentId,
      deviceCoords,
      history,
    );
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to process mobility query" });
  }
});

// Authenticated Student Profile
router.get("/student/profile", (req, res) => {
  const studentId = typeof req.query.studentId === "string" ? req.query.studentId : "student-20418";
  res.json(getStudentProfile(studentId));
});

router.patch("/student/profile", (req, res) => {
  const studentId = typeof req.query.studentId === "string" ? req.query.studentId : "student-20418";
  const updated = updateStudentProfile(studentId, req.body);
  res.json(updated);
});

export default router;
