import { Router, type IRouter } from "express";
import { getOrCreateProfile, getProfileWithDetails } from "../../../../src/db/services.ts";
import { db } from "../../../../src/db/index.ts";
import { profiles, students, drivers } from "../../../../src/db/schema.ts";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/auth/profile", async (req, res) => {
  try {
    const { uid, email, name, role = "STUDENT" } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }
    const profile = await getOrCreateProfile(
      uid,
      email || `${uid}@rec.edu.in`,
      name || "Campus Member",
      role
    );
    const details = await getProfileWithDetails(uid);
    res.json({ profile: details || profile });
  } catch (err: any) {
    console.error("Error syncing profile:", err);
    res.status(500).json({ error: "Failed to sync profile" });
  }
});

router.post("/auth/campus-login", async (req, res) => {
  try {
    const { identifier, role = "STUDENT" } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: "Identifier is required" });
    }
    const cleanId = String(identifier).trim();
    let effectiveRole: "STUDENT" | "DRIVER" | "ADMIN" | "PARENT" = "STUDENT";

    if (role === "ADMIN" || cleanId.toLowerCase() === "admin") {
      effectiveRole = "ADMIN";
    } else if (role === "DRIVER" || cleanId.toLowerCase().startsWith("driver-")) {
      effectiveRole = "DRIVER";
    } else if (role === "PARENT") {
      effectiveRole = "PARENT";
    }

    const email = `${cleanId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@rec.edu.in`;
    const name = effectiveRole === "DRIVER"
      ? (cleanId.startsWith("driver-") ? cleanId.replace("driver-", "Driver ").toUpperCase() : `Driver ${cleanId}`)
      : effectiveRole === "ADMIN"
      ? "Transport Administrator"
      : `Student (${cleanId})`;

    const profile = await getOrCreateProfile(cleanId, email, name, effectiveRole);
    const details = await getProfileWithDetails(cleanId);

    // Return profile with token
    res.json({
      profile: details || profile,
      token: `campus-token-${cleanId}-${Date.now()}`,
    });
  } catch (err: any) {
    console.error("Error in campus login:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/auth/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const details = await getProfileWithDetails(userId);
    if (!details) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json({ profile: details });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.put("/auth/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, pickupStopId, assignedBusId } = req.body;

    const existingProfiles = await db.select().from(profiles).where(eq(profiles.userId, userId));
    if (existingProfiles.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const currentProfile = existingProfiles[0];
    if (name || phone) {
      await db
        .update(profiles)
        .set({
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
        })
        .where(eq(profiles.userId, userId));
    }

    if (currentProfile.role === "STUDENT" && (pickupStopId || assignedBusId)) {
      await db
        .update(students)
        .set({
          ...(pickupStopId ? { pickupStopId } : {}),
          ...(assignedBusId ? { assignedBusId } : {}),
        })
        .where(eq(students.profileId, currentProfile.id));
    }

    const updated = await getProfileWithDetails(userId);
    res.json({ profile: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
