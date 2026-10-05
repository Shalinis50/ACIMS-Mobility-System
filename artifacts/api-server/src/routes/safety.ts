import { Router, type IRouter } from "express";
import {
  ActivateEmergencyBody,
  CreateSafetyReportBody,
} from "@workspace/api-zod";
import { db } from "../../../../src/db/index.ts";
import { safetyReports, emergencyContacts, notifications } from "../../../../src/db/schema.ts";
import { eq, desc } from "drizzle-orm";
import { listSafetyAlerts } from "../services/safety";

const router: IRouter = Router();

router.get("/safety/reports", async (req, res) => {
  try {
    const studentId = (req.query.studentId as string) || req.header("x-acims-user-id") || "student-20418";
    const reports = await db
      .select()
      .from(safetyReports)
      .where(eq(safetyReports.studentId, studentId))
      .orderBy(desc(safetyReports.createdAt));

    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list safety reports" });
  }
});

router.post("/safety/report", async (req, res) => {
  try {
    const input = CreateSafetyReportBody.parse(req.body);
    const studentId = (req.body.studentId as string) || req.header("x-acims-user-id") || "student-20418";
    const reportId = `report-${Date.now()}`;

    const created = await db
      .insert(safetyReports)
      .values({
        id: reportId,
        studentId,
        reportType: input.type,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        status: "OPEN",
      })
      .returning();

    // Create corresponding notification
    await db.insert(notifications).values({
      userId: studentId,
      type: "safety",
      title: "Safety Report Logged",
      message: `Your ${input.type} report has been dispatched to campus security.`,
    });

    res.status(201).json(created[0]);
  } catch (err: any) {
    console.error("Error creating safety report:", err);
    res.status(400).json({ error: "Failed to create report" });
  }
});

router.patch("/safety/reports/:reportId/status", async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body as { status?: string };
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const updated = await db
      .update(safetyReports)
      .set({ status })
      .where(eq(safetyReports.id, reportId))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update safety report" });
  }
});

router.get("/safety/alerts", (_req, res) => {
  res.json(listSafetyAlerts());
});

router.get("/safety/contacts", async (req, res) => {
  try {
    const userId = (req.query.userId as string) || req.header("x-acims-user-id") || "student-20418";
    const contacts = await db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.userId, userId));

    if (contacts.length > 0) {
      return res.json(contacts);
    }

    // Default REC Campus Security Contacts
    const defaults = [
      { id: "sec-campus-1", userId, name: "REC Campus Security Control", relationship: "Campus Patrol", phone: "+91 44 2715 6750" },
      { id: "sec-transport-1", userId, name: "Transport Office Helpline", relationship: "Fleet Dispatch", phone: "+91 44 2715 6755" },
    ];
    for (const d of defaults) {
      await db.insert(emergencyContacts).values(d).onConflictDoNothing();
    }
    res.json(defaults);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch emergency contacts" });
  }
});

router.post("/safety/contacts", async (req, res) => {
  try {
    const { name, relationship, phone } = req.body as { name?: string; relationship?: string; phone?: string };
    const userId = (req.body.userId as string) || req.header("x-acims-user-id") || "student-20418";

    if (!name || !relationship || !phone) {
      return res.status(400).json({ error: "Name, relationship, and phone are required" });
    }

    const created = await db
      .insert(emergencyContacts)
      .values({
        id: `contact-${Date.now()}`,
        userId,
        name,
        relationship,
        phone,
      })
      .returning();

    res.status(201).json(created[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to add emergency contact" });
  }
});

router.post("/safety/emergency", async (req, res) => {
  try {
    const input = ActivateEmergencyBody.parse(req.body);
    const studentId = (req.body.studentId as string) || req.header("x-acims-user-id") || "student-20418";

    const created = await db
      .insert(safetyReports)
      .values({
        id: `sos-${Date.now()}`,
        studentId,
        reportType: "EMERGENCY_SOS",
        description: `Immediate SOS Triggered at [${input.latitude}, ${input.longitude}]`,
        latitude: input.latitude,
        longitude: input.longitude,
        status: "URGENT",
      })
      .returning();

    await db.insert(notifications).values({
      userId: studentId,
      type: "alert",
      title: "Emergency Alert Dispatched",
      message: "Campus security and rapid transit emergency response team have been notified of your location.",
    });

    res.json({
      status: "EMERGENCY_DISPATCHED",
      report: created[0],
      dispatchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(400).json({ error: "Failed to activate emergency" });
  }
});

export default router;
