import { Router, type IRouter } from "express";
import { answerMobilityQuestion, getAiContext } from "../services/ai";
import { getStudentProfile, updateStudentProfile } from "../services/studentProfileService";

const router: IRouter = Router();

router.get("/ai/context", (req, res) => {
  const studentId = typeof req.query.studentId === "string" ? req.query.studentId : "student-20418";
  res.json(getAiContext(studentId));
});

router.post("/ai/chat", (req, res) => {
  try {
    const { studentId = "student-20418", message = "", destinationId, deviceCoords, history } = req.body;
    const response = answerMobilityQuestion(
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
