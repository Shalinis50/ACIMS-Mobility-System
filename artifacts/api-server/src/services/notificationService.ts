import { and, desc, eq } from "drizzle-orm";
import { db } from "../../../../src/db/index.ts";
import { tripNotificationEvents, studentPreferences, notifications } from "../../../../src/db/schema.ts";
import { recordMobilityEvent } from "../../../../src/db/mobilityOps.ts";
import { getDelayNotifyDeltaMinutes, ETA_NOTIFY_WINDOWS } from "./mobilityConfig.ts";
import type { StudentPickupEtaResult } from "./etaService.ts";
import { evaluatePickupGeofence } from "./geofenceEngine.ts";

export type MobilityNotifyEventType =
  | "ETA_10_MINUTES"
  | "ETA_5_MINUTES"
  | "BUS_ARRIVED"
  | "DEPARTED"
  | "DELAY_DETECTED"
  | "DELAY_UPDATED"
  | "GPS_UNAVAILABLE"
  | "TRIP_CANCELLED";

function tripKeyFromContext(tripId: string | null | undefined, busId: string): string {
  if (tripId) return tripId;
  const day = new Date().toISOString().slice(0, 10);
  return `session-${busId}-${day}`;
}

async function hasTripNotificationEvent(
  tripKey: string,
  studentId: string,
  pickupPointId: string,
  eventType: MobilityNotifyEventType,
) {
  const rows = await db
    .select()
    .from(tripNotificationEvents)
    .where(
      and(
        eq(tripNotificationEvents.tripId, tripKey),
        eq(tripNotificationEvents.studentId, studentId),
        eq(tripNotificationEvents.pickupPointId, pickupPointId),
        eq(tripNotificationEvents.eventType, eventType),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function recordTripNotificationEvent(input: {
  tripKey: string;
  studentId: string;
  pickupPointId: string;
  eventType: MobilityNotifyEventType;
  etaAtTrigger?: number;
  delayMinutes?: number;
  idSuffix?: string;
}) {
  const id = input.idSuffix
    ? `${input.tripKey}:${input.studentId}:${input.pickupPointId}:${input.eventType}:${input.idSuffix}`
    : `${input.tripKey}:${input.studentId}:${input.pickupPointId}:${input.eventType}`;
  const existing = await db.select().from(tripNotificationEvents).where(eq(tripNotificationEvents.id, id)).limit(1);
  if (existing.length) return existing[0];

  const inserted = await db
    .insert(tripNotificationEvents)
    .values({
      id,
      tripId: input.tripKey,
      studentId: input.studentId,
      pickupPointId: input.pickupPointId,
      eventType: input.eventType,
      etaAtTrigger: input.etaAtTrigger ?? null,
      delayMinutes: input.delayMinutes ?? null,
      notificationStatus: "SENT",
      deliveredAt: new Date(),
    })
    .returning();
  return inserted[0];
}

async function studentAllowsNotification(
  studentId: string,
  kind: "arrival" | "delay" | "gps" | "arrived",
): Promise<boolean> {
  const pref = await db
    .select()
    .from(studentPreferences)
    .where(eq(studentPreferences.userId, studentId))
    .limit(1);
  if (!pref.length) return true;
  const p = pref[0];
  if (kind === "arrival" || kind === "arrived") return p.notificationArrivals ?? true;
  if (kind === "delay") return p.notificationDelays ?? true;
  return true;
}

async function getLastDelayNotificationMinutes(
  tripKey: string,
  studentId: string,
  pickupPointId: string,
): Promise<number | null> {
  const rows = await db
    .select()
    .from(tripNotificationEvents)
    .where(
      and(
        eq(tripNotificationEvents.tripId, tripKey),
        eq(tripNotificationEvents.studentId, studentId),
        eq(tripNotificationEvents.pickupPointId, pickupPointId),
      ),
    )
    .orderBy(desc(tripNotificationEvents.triggeredAt))
    .limit(30);

  const delayRow = rows.find((r) => r.eventType === "DELAY_DETECTED" || r.eventType === "DELAY_UPDATED");
  return delayRow?.delayMinutes ?? null;
}

async function emitNotification(
  tripKey: string,
  busId: string,
  studentId: string,
  pickupPointId: string,
  eventType: MobilityNotifyEventType,
  title: string,
  message: string,
  etaAtTrigger?: number,
  delayMinutes?: number,
  idSuffix?: string,
) {
  await recordTripNotificationEvent({
    tripKey,
    studentId,
    pickupPointId,
    eventType,
    etaAtTrigger,
    delayMinutes,
    idSuffix,
  });

  await db.insert(notifications).values({
    userId: studentId,
    type: eventType,
    title,
    message,
  });

  const mobilityId = idSuffix
    ? `${studentId}:${tripKey}:${eventType}:${pickupPointId}:${idSuffix}`
    : `${studentId}:${tripKey}:${eventType}:${pickupPointId}`;
  await recordMobilityEvent({
    id: mobilityId,
    userId: studentId,
    busId,
    tripId: tripKey.startsWith("trip-") ? tripKey : undefined,
    pickupPointId,
    eventType,
    payload: { message, etaAtTrigger, delayMinutes },
  });
}

export async function processStudentPickupNotifications(input: {
  eta: StudentPickupEtaResult;
  busNumber: string;
}) {
  const { eta, busNumber } = input;
  const tripKey = tripKeyFromContext(eta.tripId, eta.busId);
  const pickupId = eta.pickup.id;
  const studentId = eta.studentId;
  let sent = 0;

  if (eta.stopPassed) return { sent };

  if (eta.gps.status === "UNAVAILABLE" || eta.gps.status === "STALE") {
    if (!(await hasTripNotificationEvent(tripKey, studentId, pickupId, "GPS_UNAVAILABLE"))) {
      if (await studentAllowsNotification(studentId, "gps")) {
        const msg =
          eta.gps.status === "UNAVAILABLE"
            ? "Live bus location is temporarily unavailable."
            : `Live location is delayed. Last updated ${eta.gps.secondsSinceUpdate} seconds ago.`;
        await emitNotification(
          tripKey,
          eta.busId,
          studentId,
          pickupId,
          "GPS_UNAVAILABLE",
          "GPS update",
          msg,
        );
        sent += 1;
      }
    }
    if (eta.etaMinutes == null) return { sent };
  }

  if (eta.etaMinutes == null) return { sent };

  const hasCoords = eta.gps.latitude != null && eta.gps.longitude != null;
  if (hasCoords) {
    const geofence = evaluatePickupGeofence({
      bus: { latitude: eta.gps.latitude!, longitude: eta.gps.longitude! },
      pickup: {
        latitude: eta.pickup.latitude,
        longitude: eta.pickup.longitude,
        geofenceRadiusM: 120,
      },
    });

    if (geofence === "INSIDE") {
      if (!(await hasTripNotificationEvent(tripKey, studentId, pickupId, "BUS_ARRIVED"))) {
        if (await studentAllowsNotification(studentId, "arrived")) {
          await emitNotification(
            tripKey,
            eta.busId,
            studentId,
            pickupId,
            "BUS_ARRIVED",
            "Bus arrived",
            `🚌 Your bus has arrived at your pickup point (${eta.pickup.name}).`,
            eta.etaMinutes,
            eta.delay?.delayMinutes,
          );
          sent += 1;
        }
      }
      return { sent };
    }
  }

  const in10 =
    eta.etaMinutes <= ETA_NOTIFY_WINDOWS.tenMinutes.max &&
    eta.etaMinutes >= ETA_NOTIFY_WINDOWS.tenMinutes.min;
  if (in10 && !(await hasTripNotificationEvent(tripKey, studentId, pickupId, "ETA_10_MINUTES"))) {
    if (await studentAllowsNotification(studentId, "arrival")) {
      await emitNotification(
        tripKey,
        eta.busId,
        studentId,
        pickupId,
        "ETA_10_MINUTES",
        "10 minutes away",
        `🚌 Your bus is approximately 10 minutes away from your pickup point (${eta.pickup.name}).`,
        eta.etaMinutes,
        eta.delay?.delayMinutes,
      );
      sent += 1;
    }
  }

  const in5 =
    eta.etaMinutes <= ETA_NOTIFY_WINDOWS.fiveMinutes.max &&
    eta.etaMinutes >= ETA_NOTIFY_WINDOWS.fiveMinutes.min;
  if (in5 && !(await hasTripNotificationEvent(tripKey, studentId, pickupId, "ETA_5_MINUTES"))) {
    if (await studentAllowsNotification(studentId, "arrival")) {
      await emitNotification(
        tripKey,
        eta.busId,
        studentId,
        pickupId,
        "ETA_5_MINUTES",
        "5 minutes away",
        `🚌 Your bus is approximately 5 minutes away. Please get ready at ${eta.pickup.name}.`,
        eta.etaMinutes,
        eta.delay?.delayMinutes,
      );
      sent += 1;
    }
  }

  const delayMin = eta.delay?.delayMinutes ?? 0;
  if (delayMin > 2 && eta.delay && eta.delay.status !== "ON_TIME") {
    const last = await getLastDelayNotificationMinutes(tripKey, studentId, pickupId);
    const delta = getDelayNotifyDeltaMinutes();
    const meaningfulChange = last == null || Math.abs(delayMin - last) >= delta;

    if (meaningfulChange) {
      const isFirst = last == null;
      const eventType: MobilityNotifyEventType = isFirst ? "DELAY_DETECTED" : "DELAY_UPDATED";
      if (isFirst) {
        if (!(await hasTripNotificationEvent(tripKey, studentId, pickupId, "DELAY_DETECTED"))) {
          if (await studentAllowsNotification(studentId, "delay")) {
            const arrival = eta.predictedArrivalAt ?? "soon";
            await emitNotification(
              tripKey,
              eta.busId,
              studentId,
              pickupId,
              "DELAY_DETECTED",
              "Bus delayed",
              `⚠️ BUS-${busNumber} is delayed by approximately ${delayMin} minutes. Updated arrival at ${eta.pickup.name}: ${arrival}.`,
              eta.etaMinutes,
              delayMin,
            );
            sent += 1;
          }
        }
      } else if (await studentAllowsNotification(studentId, "delay")) {
        const arrival = eta.predictedArrivalAt ?? "soon";
        await emitNotification(
          tripKey,
          eta.busId,
          studentId,
          pickupId,
          "DELAY_UPDATED",
          "Delay update",
          `⚠️ BUS-${busNumber} delay is now ${delayMin} minutes. Expected at ${eta.pickup.name}: ${arrival}.`,
          eta.etaMinutes,
          delayMin,
          String(delayMin),
        );
        sent += 1;
      }
    }
  }

  return { sent };
}
