import { Router, type IRouter } from "express";
import {
  ActivateEmergencyBody,
  CreateSafetyReportBody,
} from "@workspace/api-zod";
import {
  activateEmergency,
  addEmergencyContact,
  createSafetyReport,
  listAllSafetyReports,
  listEmergencyContacts,
  listSafetyAlerts,
  listSafetyReports,
  updateSafetyReportStatus,
} from "../services/safety";

const router: IRouter = Router();

router.get("/safety/reports", (req, res) => {
  res.json(listSafetyReports("student-20418"));
});

router.post("/safety/report", (req, res) => {
  const input = CreateSafetyReportBody.parse(req.body);
  res.status(201).json(createSafetyReport({ ...input, studentId: "student-20418" }));
});

router.patch("/safety/reports/:reportId/status", (req, res) => {
  const { reportId } = req.params;
  const { status } = req.body as { status?: string };
  if (!status) {
    res.status(400).json({ error: "Status is required" });
    return;
  }
  const updated = updateSafetyReportStatus(reportId, status);
  if (!updated) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  res.json(updated);
});

router.get("/safety/alerts", (_req, res) => {
  res.json(listSafetyAlerts());
});

router.get("/safety/contacts", (_req, res) => {
  res.json(listEmergencyContacts());
});

router.post("/safety/contacts", (req, res) => {
  const { name, relationship, phone } = req.body as { name?: string; relationship?: string; phone?: string };
  if (!name || !relationship || !phone) {
    res.status(400).json({ error: "Name, relationship, and phone are required" });
    return;
  }
  res.status(201).json(addEmergencyContact({ name, relationship, phone }));
});

router.post("/safety/emergency", (req, res) => {
  const input = ActivateEmergencyBody.parse(req.body);
  res.json(activateEmergency({ ...input, studentId: "student-20418" }));
});

export function getAllSafetyReports() {
  return listAllSafetyReports();
}

export default router;