import { Router, type IRouter } from "express";
import { db } from "../../../../src/db/index.ts";
import { notifications } from "../../../../src/db/schema.ts";
import { eq, desc } from "drizzle-orm";
import { getUserNotifications } from "../../../../src/db/services.ts";

const router: IRouter = Router();

router.get("/notifications", async (req, res) => {
  try {
    const userId = (req.query.userId as string) || req.header("x-acims-user-id") || "student-20418";
    const dbNotifs = await getUserNotifications(userId);

    if (dbNotifs.length > 0) {
      return res.json(
        dbNotifs.map((n) => ({
          id: String(n.id),
          type: n.type,
          title: n.title,
          message: n.message,
          timestamp: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
          read: Boolean(n.readAt),
        }))
      );
    }

    // Default system welcome notification stored in PostgreSQL
    const welcome = await db
      .insert(notifications)
      .values({
        userId,
        type: "info",
        title: "Campus Mobility Pass Ready",
        message: "Your ACIMS transit access is active. Real driver GPS tracking is live for college feeder routes.",
      })
      .returning();

    res.json([
      {
        id: String(welcome[0].id),
        type: welcome[0].type,
        title: welcome[0].title,
        message: welcome[0].message,
        timestamp: welcome[0].createdAt?.toISOString() || new Date().toISOString(),
        read: false,
      },
    ]);
  } catch (err: any) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Failed to list notifications" });
  }
});

router.post("/notifications/read", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Notification id required" });
    }

    const numId = parseInt(id, 10);
    if (!isNaN(numId)) {
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(eq(notifications.id, numId));
    }

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to mark notification read" });
  }
});

export default router;
