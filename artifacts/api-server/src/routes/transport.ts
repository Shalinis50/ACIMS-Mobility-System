import { Router, type IRouter } from "express";
import { SearchTransportBody } from "@workspace/api-zod";
import { listJourneys, listProviders, searchJourneys } from "../services/transport";

const router: IRouter = Router();

router.get("/transport/providers", (_req, res) => res.json(listProviders()));
router.get("/transport/routes", (_req, res) => res.json(listJourneys()));
router.post("/transport/search", (req, res) => {
  const input = SearchTransportBody.parse(req.body);
  res.json(searchJourneys(input.start, input.destination));
});

export default router;