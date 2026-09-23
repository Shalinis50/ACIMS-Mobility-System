import { Router, type IRouter } from "express";
import {
  ActivateEmergencyBody,
  CreateSafetyReportBody,
} from "@workspace/api-zod";
import {
  activateEmergency,
  createSafetyReport,
  listAllSafetyReports,
  listSafetyAlerts,
  listSafetyReports,
} from "../services/safety";

const router: IRouter = Router();

router.get("/safety/reports", (req, res) => {
  res.json(listSafetyReports("student-20418"));
});

router.post("/safety/report", (req, res) => {
  const input = CreateSafetyReportBody.parse(req.body);
  res.status(201).json(createSafetyReport({ ...input, studentId: "student-20418" }));
});

router.get("/safety/alerts", (_req, res) => {
  res.json(listSafetyAlerts());
});

router.post("/safety/emergency", (req, res) => {
  const input = ActivateEmergencyBody.parse(req.body);
  res.json(activateEmergency({ ...input, studentId: "student-20418" }));
});

export function getAllSafetyReports() {
  return listAllSafetyReports();
}

export default router;