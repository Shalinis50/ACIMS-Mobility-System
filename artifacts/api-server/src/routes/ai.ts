import { Router, type IRouter } from "express";
import { SendAiChatBody } from "@workspace/api-zod";
import { answerMobilityQuestion, getAiContext } from "../services/ai";

const router: IRouter = Router();

router.get("/ai/context", (_req, res) => {
  res.json(getAiContext());
});

router.post("/ai/chat", (req, res) => {
  const input = SendAiChatBody.parse(req.body);
  res.json(answerMobilityQuestion(input.message, input.destinationId));
});

export default router;