import { and, eq } from "drizzle-orm";
import { db } from "../../../../src/db/index.ts";
import { officialPickupPoints, students, studentPreferences } from "../../../../src/db/schema.ts";
import { getProfileWithDetails, getDbBusById } from "../../../../src/db/services.ts";
import { getMvpCollegeRoute, isMvpCollegeRouteActive } from "./mvpCollegeRouteService.ts";

export type StudentPickupPointView = {
  studentId: string;
  pickupPointId: string;
  pickupPointName: string;
  routeId: string;
  latitude: number | null;
  longitude: number | null;
  sequenceNumber: number;
  expectedOffsetMinutes: number;
  scheduledTimeDisplay: string | null;
  active: boolean;
  assignedBusId: string | null;
  assignedRouteId: string | null;
};

export async function getStudentPickupPoint(studentUserId: string): Promise<StudentPickupPointView | null> {
  const profile = await getProfileWithDetails(studentUserId);
  if (!profile?.pickupStopId) return null;

  const points = await db
    .select()
    .from(officialPickupPoints)
    .where(eq(officialPickupPoints.id, profile.pickupStopId))
    .limit(1);

  let pickup = points[0];
  if (!pickup && profile.assignedBusId) {
    const { getRouteForBus } = await import("./routesData.ts");
    const route = getRouteForBus(profile.assignedBusId);
    const stop = route?.stops.find((s) => s.id === profile.pickupStopId);
    if (stop && route) {
      return {
        studentId: studentUserId,
        pickupPointId: stop.id,
        pickupPointName: stop.name,
        routeId: route.id,
        latitude: stop.latitude,
        longitude: stop.longitude,
        sequenceNumber: stop.sequence,
        expectedOffsetMinutes: stop.sequence * 8,
        scheduledTimeDisplay: null,
        active: true,
        assignedBusId: profile.assignedBusId ?? null,
        assignedRouteId: profile.assignedRouteId ?? route.id,
      };
    }
  }
  if (!pickup) return null;

  return {
    studentId: studentUserId,
    pickupPointId: pickup.id,
    pickupPointName: pickup.stopName,
    routeId: pickup.routeId,
    latitude: pickup.latitude,
    longitude: pickup.longitude,
    sequenceNumber: pickup.sequenceNumber,
    expectedOffsetMinutes: pickup.expectedOffsetMinutes ?? pickup.sequenceNumber * 8,
    scheduledTimeDisplay: pickup.scheduledTimeDisplay ?? null,
    active: pickup.active,
    assignedBusId: profile.assignedBusId ?? null,
    assignedRouteId: profile.assignedRouteId ?? null,
  };
}

export async function updateStudentPickupPoint(studentUserId: string, pickupPointId: string) {
  const profile = await getProfileWithDetails(studentUserId);
  if (!profile?.id) throw new Error("Student profile not found");

  const [pickup] = await db
    .select()
    .from(officialPickupPoints)
    .where(eq(officialPickupPoints.id, pickupPointId))
    .limit(1);

  if (!pickup || !pickup.active) {
    throw new Error("Pickup point is not available.");
  }

  const studentRoute = profile.assignedRouteId;
  const bus = profile.assignedBusId ? await getDbBusById(profile.assignedBusId) : null;
  const isRecPickup = pickup.source === "REC_TRANSPORT" || pickup.id.startsWith("rec-stop-");
  const mvp = getMvpCollegeRoute();
  const allowedRoute = isRecPickup
    ? pickup.routeId
    : isMvpCollegeRouteActive()
      ? mvp.routeId
      : studentRoute || bus?.routeId;

  if (!isRecPickup && allowedRoute && pickup.routeId !== allowedRoute) {
    throw new Error("This pickup point is not on the college bus route.");
  }

  await db
    .update(students)
    .set({
      pickupStopId: pickupPointId,
      assignedRouteId: pickup.routeId,
    })
    .where(eq(students.profileId, profile.id));

  const pref = await db.select().from(studentPreferences).where(eq(studentPreferences.userId, studentUserId)).limit(1);
  if (pref.length) {
    await db
      .update(studentPreferences)
      .set({ savedPickupStopId: pickupPointId, updatedAt: new Date() })
      .where(eq(studentPreferences.userId, studentUserId));
  } else {
    await db.insert(studentPreferences).values({
      userId: studentUserId,
      savedPickupStopId: pickupPointId,
    });
  }

  return getStudentPickupPoint(studentUserId);
}

export async function listPickupPointsForStudentRoute(studentUserId: string) {
  const recOfficial = await db
    .select()
    .from(officialPickupPoints)
    .where(and(eq(officialPickupPoints.active, true), eq(officialPickupPoints.source, "REC_TRANSPORT")));
  if (recOfficial.length) {
    const profile = await getProfileWithDetails(studentUserId);
    const assigned = profile?.assignedRouteId;
    if (assigned && recOfficial.some((p) => p.routeId === assigned)) {
      return recOfficial.filter((p) => p.routeId === assigned);
    }
    return recOfficial;
  }
  if (isMvpCollegeRouteActive()) {
    const mvp = getMvpCollegeRoute();
    return db
      .select()
      .from(officialPickupPoints)
      .where(and(eq(officialPickupPoints.routeId, mvp.routeId), eq(officialPickupPoints.active, true)));
  }
  const profile = await getProfileWithDetails(studentUserId);
  const routeId = profile?.assignedRouteId || (profile?.assignedBusId ? (await getDbBusById(profile.assignedBusId))?.routeId : null);
  if (!routeId) {
    return db.select().from(officialPickupPoints).where(eq(officialPickupPoints.active, true));
  }
  return db
    .select()
    .from(officialPickupPoints)
    .where(and(eq(officialPickupPoints.routeId, routeId), eq(officialPickupPoints.active, true)));
}
