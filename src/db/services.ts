import { db } from './index.ts';
import {
  buses,
  busRoutes,
  busStops,
  busLocations,
  trackingSessions,
  profiles,
  students,
  drivers,
  notifications,
  notificationPreferences,
  campusLocations,
  campusPaths,
  safetyReports,
  emergencyContacts,
  publicTransportStops,
  publicTransportDepartures,
  studentPickupPoints,
  boardingQueue,
  studentPreferences,
  studentLocations,
} from './schema.ts';
import { eq, desc, and, ilike, or, lte } from 'drizzle-orm';

// -------------------------------------------------------------
// PROFILES & AUTH
// -------------------------------------------------------------
export async function getOrCreateProfile(
  userId: string,
  email: string,
  name: string,
  role: 'STUDENT' | 'DRIVER' | 'ADMIN' | 'PARENT' = 'STUDENT'
) {
  try {
    const existing = await db.select().from(profiles).where(eq(profiles.userId, userId));
    if (existing.length > 0) {
      return existing[0];
    }

    const inserted = await db
      .insert(profiles)
      .values({
        userId,
        email,
        name,
        role,
      })
      .returning();

    const newProfile = inserted[0];

    // Create corresponding role table entry
    if (role === 'STUDENT') {
      let assignedBusId: string | null = null;
      let assignedRouteId: string | null = null;
      let pickupStopId: string | null = null;
      try {
        const { getMvpCollegeRoute, isMvpCollegeRouteActive } = await import(
          '../../artifacts/api-server/src/services/mvpCollegeRouteService.ts'
        );
        if (isMvpCollegeRouteActive()) {
          const mvp = getMvpCollegeRoute();
          assignedBusId = mvp.busId;
          assignedRouteId = mvp.routeId;
        }
      } catch {
        /* leave unassigned until student picks an official pickup */
      }
      await db.insert(students).values({
        profileId: newProfile.id,
        registerNumber: userId.startsWith('student-') ? userId : `REG-${newProfile.id}`,
        assignedBusId,
        assignedRouteId,
        pickupStopId,
      });
    } else if (role === 'DRIVER') {
      await db.insert(drivers).values({
        profileId: newProfile.id,
      });
    }

    return newProfile;
  } catch (error) {
    console.error('Error in getOrCreateProfile:', error);
    throw new Error('Database profile operation failed', { cause: error });
  }
}

export async function getProfileWithDetails(userId: string) {
  try {
    const userProfiles = await db.select().from(profiles).where(eq(profiles.userId, userId));
    if (userProfiles.length === 0) return null;

    const profile = userProfiles[0];
    let details: any = { ...profile };

    if (profile.role === 'STUDENT') {
      const studentRecs = await db.select().from(students).where(eq(students.profileId, profile.id));
      if (studentRecs.length > 0) {
        const s = studentRecs[0];
        details = {
          ...details,
          registerNumber: s.registerNumber,
          pickupStopId: s.pickupStopId,
          assignedBusId: s.assignedBusId,
          assignedRouteId: s.assignedRouteId,
        };
      }
    } else if (profile.role === 'DRIVER') {
      const driverRecs = await db.select().from(drivers).where(eq(drivers.profileId, profile.id));
      if (driverRecs.length > 0) {
        const d = driverRecs[0];
        details = {
          ...details,
          assignedBusId: d.assignedBusId,
        };
      }
    }

    return details;
  } catch (error) {
    console.error('Error in getProfileWithDetails:', error);
    throw new Error('Database profile lookup failed', { cause: error });
  }
}

// -------------------------------------------------------------
// BUSES & ROUTES
// -------------------------------------------------------------
export async function getStudentUserIdsForBus(busId: string): Promise<string[]> {
  try {
    const studentRows = await db.select().from(students).where(eq(students.assignedBusId, busId));
    const userIds: string[] = [];
    for (const row of studentRows) {
      const prof = await db.select().from(profiles).where(eq(profiles.id, row.profileId)).limit(1);
      if (prof[0]?.userId) userIds.push(prof[0].userId);
      else if (row.registerNumber) userIds.push(row.registerNumber);
    }
    return userIds;
  } catch {
    return [];
  }
}

export async function bindStudentPickupByUserId(userId: string, pickupPointId: string) {
  const profile = await getProfileWithDetails(userId);
  if (!profile?.id) return null;
  const updated = await db
    .update(students)
    .set({ pickupStopId: pickupPointId })
    .where(eq(students.profileId, profile.id))
    .returning();
  return updated[0] ?? null;
}

export async function getDbBuses() {
  try {
    const rows = await db.select().from(buses).orderBy(buses.busNumber);
    return rows;
  } catch (error) {
    console.error('Error fetching buses from DB:', error);
    return [];
  }
}

export async function getDbBusById(busId: string) {
  try {
    const result = await db.select().from(buses).where(eq(buses.id, busId));
    return result[0] || null;
  } catch (error) {
    console.error(`Error fetching bus ${busId}:`, error);
    return null;
  }
}

export async function createDbBus(data: {
  id: string;
  busNumber: string;
  registrationNumber?: string;
  routeId?: string;
  driverId?: string;
  capacity?: number;
  active?: boolean;
}) {
  try {
    const inserted = await db.insert(buses).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error('Error creating bus:', error);
    throw new Error('Failed to create bus in database', { cause: error });
  }
}

export async function updateDbBus(busId: string, updates: Partial<{
  busNumber: string;
  registrationNumber: string;
  routeId: string;
  driverId: string | null;
  capacity: number;
  active: boolean;
}>) {
  try {
    const updated = await db
      .update(buses)
      .set(updates)
      .where(eq(buses.id, busId))
      .returning();
    return updated[0] || null;
  } catch (error) {
    console.error(`Error updating bus ${busId}:`, error);
    throw new Error('Failed to update bus in database', { cause: error });
  }
}

export async function getDbRoutes() {
  try {
    const rows = await db.select().from(busRoutes).orderBy(busRoutes.routeCode);
    return rows;
  } catch (error) {
    console.error('Error fetching routes:', error);
    return [];
  }
}

export async function getDbRouteById(routeId: string) {
  try {
    const route = await db.select().from(busRoutes).where(eq(busRoutes.id, routeId));
    if (route.length === 0) return null;

    const stops = await db
      .select()
      .from(busStops)
      .where(eq(busStops.routeId, routeId))
      .orderBy(busStops.sequenceNumber);

    return {
      ...route[0],
      stops,
    };
  } catch (error) {
    console.error(`Error fetching route ${routeId}:`, error);
    return null;
  }
}

export async function createDbRoute(data: {
  id: string;
  routeName: string;
  routeCode: string;
  active?: boolean;
}) {
  try {
    const inserted = await db.insert(busRoutes).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error('Error creating route:', error);
    throw new Error('Failed to create route', { cause: error });
  }
}

export async function updateDbRoute(routeId: string, updates: Partial<{
  routeName: string;
  routeCode: string;
  active: boolean;
}>) {
  try {
    const updated = await db
      .update(busRoutes)
      .set(updates)
      .where(eq(busRoutes.id, routeId))
      .returning();
    return updated[0] || null;
  } catch (error) {
    console.error(`Error updating route ${routeId}:`, error);
    throw new Error('Failed to update route', { cause: error });
  }
}

export async function getDbStopsByRoute(routeId: string) {
  try {
    return await db
      .select()
      .from(busStops)
      .where(eq(busStops.routeId, routeId))
      .orderBy(busStops.sequenceNumber);
  } catch (error) {
    console.error('Error fetching stops:', error);
    return [];
  }
}

// -------------------------------------------------------------
// REAL DRIVER GPS & BUS LOCATIONS
// -------------------------------------------------------------
export async function recordBusLocation(location: {
  busId: string;
  driverId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  recordedAt?: Date | string;
  receivedAt?: Date | string;
}) {
  try {
    const recordedDate = location.recordedAt ? new Date(location.recordedAt) : new Date();
    const receivedDate = location.receivedAt ? new Date(location.receivedAt) : new Date();

    const inserted = await db
      .insert(busLocations)
      .values({
        busId: location.busId,
        driverId: location.driverId || null,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: typeof location.accuracy === "number" ? location.accuracy : null,
        altitude: typeof location.altitude === "number" ? location.altitude : null,
        altitudeAccuracy: typeof location.altitudeAccuracy === "number" ? location.altitudeAccuracy : null,
        speed: typeof location.speed === "number" ? location.speed : null,
        heading: typeof location.heading === "number" ? location.heading : null,
        recordedAt: recordedDate,
        receivedAt: receivedDate,
        createdAt: new Date(),
      })
      .returning();

    // Touch active tracking session last_location_at
    await db
      .update(trackingSessions)
      .set({ lastLocationAt: recordedDate })
      .where(
        and(
          eq(trackingSessions.busId, location.busId),
          eq(trackingSessions.status, 'ACTIVE')
        )
      )
      .catch(() => {});

    return inserted[0];
  } catch (error) {
    console.error('Error recording bus location:', error);
    throw new Error('Failed to save bus location', { cause: error });
  }
}

export async function getLatestBusLocation(busId: string) {
  try {
    const result = await db
      .select()
      .from(busLocations)
      .where(eq(busLocations.busId, busId))
      .orderBy(desc(busLocations.recordedAt))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error(`Error getting latest location for bus ${busId}:`, error);
    return null;
  }
}

export async function getRecentBusLocations(busId: string, limit = 50) {
  try {
    return await db
      .select()
      .from(busLocations)
      .where(eq(busLocations.busId, busId))
      .orderBy(desc(busLocations.recordedAt))
      .limit(limit);
  } catch (error) {
    console.error(`Error getting recent locations for bus ${busId}:`, error);
    return [];
  }
}

export async function startTrackingSession(busId: string, driverId: string) {
  try {
    // End any lingering active sessions for this bus first
    await db
      .update(trackingSessions)
      .set({ status: 'ENDED', endedAt: new Date() })
      .where(
        and(
          eq(trackingSessions.busId, busId),
          eq(trackingSessions.status, 'ACTIVE')
        )
      );

    const sessionId = `session-${busId}-${Date.now()}`;
    const inserted = await db
      .insert(trackingSessions)
      .values({
        id: sessionId,
        busId,
        driverId,
        status: 'ACTIVE',
        startedAt: new Date(),
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Error starting tracking session:', error);
    throw new Error('Failed to start tracking session', { cause: error });
  }
}

export async function pauseTrackingSession(busId: string) {
  try {
    const updated = await db
      .update(trackingSessions)
      .set({ status: 'PAUSED' })
      .where(
        and(
          eq(trackingSessions.busId, busId),
          eq(trackingSessions.status, 'ACTIVE')
        )
      )
      .returning();
    return updated[0] || null;
  } catch (error) {
    console.error('Error pausing tracking session:', error);
    throw new Error('Failed to pause tracking session', { cause: error });
  }
}

export async function resumeTrackingSession(busId: string) {
  try {
    const updated = await db
      .update(trackingSessions)
      .set({ status: 'ACTIVE' })
      .where(
        and(
          eq(trackingSessions.busId, busId),
          eq(trackingSessions.status, 'PAUSED')
        )
      )
      .returning();
    return updated[0] || null;
  } catch (error) {
    console.error('Error resuming tracking session:', error);
    throw new Error('Failed to resume tracking session', { cause: error });
  }
}

export async function stopTrackingSession(busId: string) {
  try {
    const updated = await db
      .update(trackingSessions)
      .set({
        status: 'ENDED',
        endedAt: new Date(),
      })
      .where(
        and(
          eq(trackingSessions.busId, busId),
          or(
            eq(trackingSessions.status, 'ACTIVE'),
            eq(trackingSessions.status, 'PAUSED')
          )
        )
      )
      .returning();
    return updated[0] || null;
  } catch (error) {
    console.error('Error stopping tracking session:', error);
    throw new Error('Failed to stop tracking session', { cause: error });
  }
}

export async function getBusTrackingSession(busId: string) {
  try {
    const sessions = await db
      .select()
      .from(trackingSessions)
      .where(eq(trackingSessions.busId, busId))
      .orderBy(desc(trackingSessions.startedAt))
      .limit(1);
    return sessions[0] || null;
  } catch (error) {
    return null;
  }
}

export async function isBusTrackingActive(busId: string) {
  try {
    const session = await getBusTrackingSession(busId);
    return {
      isActive: session?.status === 'ACTIVE',
      isPaused: session?.status === 'PAUSED',
      status: (session?.status as "ACTIVE" | "PAUSED" | "ENDED" | null) || "IDLE",
      session,
    };
  } catch (error) {
    return { isActive: false, isPaused: false, status: "IDLE" as const, session: null };
  }
}

export async function verifyDriverBusAssignment(driverId: string, busId: string): Promise<boolean> {
  try {
    const bus = await getDbBusById(busId);
    if (!bus) return false;
    if (bus.driverId === driverId) return true;

    // Also check profiles and drivers table
    const profile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, driverId))
      .limit(1);

    if (profile.length > 0) {
      const driverRecord = await db
        .select()
        .from(drivers)
        .where(eq(drivers.profileId, profile[0].id))
        .limit(1);
      if (driverRecord.length > 0 && driverRecord[0].assignedBusId === busId) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// NOTIFICATIONS
// -------------------------------------------------------------
export async function createDbNotification(userId: string, type: string, title: string, message: string) {
  try {
    const inserted = await db
      .insert(notifications)
      .values({
        userId,
        type,
        title,
        message,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function getUserNotifications(userId: string) {
  try {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

// -------------------------------------------------------------
// CAMPUS LOCATIONS & PATHS
// -------------------------------------------------------------
export async function getDbCampusLocations(category?: string) {
  try {
    if (category && category !== 'all') {
      return await db
        .select()
        .from(campusLocations)
        .where(eq(campusLocations.category, category))
        .orderBy(campusLocations.name);
    }
    return await db.select().from(campusLocations).orderBy(campusLocations.name);
  } catch (error) {
    console.error('Error fetching campus locations:', error);
    return [];
  }
}

export async function searchDbCampusLocations(term: string) {
  try {
    const pattern = `%${term.trim()}%`;
    return await db
      .select()
      .from(campusLocations)
      .where(
        or(
          ilike(campusLocations.name, pattern),
          ilike(campusLocations.description, pattern),
          ilike(campusLocations.category, pattern)
        )
      )
      .orderBy(campusLocations.name)
      .limit(20);
  } catch (error) {
    console.error('Error searching campus locations:', error);
    return [];
  }
}

export async function getDbCampusPaths() {
  try {
    return await db.select().from(campusPaths);
  } catch (error) {
    console.error('Error fetching campus paths:', error);
    return [];
  }
}

// -------------------------------------------------------------
// SAFETY REPORTS
// -------------------------------------------------------------
export async function createDbSafetyReport(data: {
  id: string;
  studentId: string;
  reportType: string;
  description: string;
  latitude: number;
  longitude: number;
}) {
  try {
    const inserted = await db.insert(safetyReports).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error('Error creating safety report:', error);
    throw new Error('Failed to create safety report', { cause: error });
  }
}

export async function getDbSafetyReports() {
  try {
    return await db.select().from(safetyReports).orderBy(desc(safetyReports.createdAt));
  } catch (error) {
    console.error('Error fetching safety reports:', error);
    return [];
  }
}

// -------------------------------------------------------------
// PUBLIC TRANSPORT
// -------------------------------------------------------------
export async function getDbPublicTransportStops() {
  try {
    return await db.select().from(publicTransportStops).orderBy(publicTransportStops.name);
  } catch (error) {
    console.error('Error fetching public transport stops:', error);
    return [];
  }
}

export async function getDbDeparturesForStop(stopId: string) {
  try {
    return await db
      .select()
      .from(publicTransportDepartures)
      .where(eq(publicTransportDepartures.stopId, stopId))
      .orderBy(publicTransportDepartures.departureTime);
  } catch (error) {
    console.error(`Error fetching departures for stop ${stopId}:`, error);
    return [];
  }
}

// -------------------------------------------------------------
// BOARDING QUEUE (Database-backed queue)
// -------------------------------------------------------------
export async function getDbQueueStatus(busId: string, studentId?: string) {
  try {
    const activeWaiting = await db
      .select()
      .from(boardingQueue)
      .where(and(eq(boardingQueue.busId, busId), eq(boardingQueue.status, 'WAITING')))
      .orderBy(boardingQueue.joinedAt);

    let studentEntry = null;
    let studentPosition = null;

    if (studentId) {
      const idx = activeWaiting.findIndex((q) => q.studentId === studentId);
      if (idx !== -1) {
        studentEntry = activeWaiting[idx];
        studentPosition = idx + 1; // 1-based position
      }
    }

    return {
      busId,
      queueSize: activeWaiting.length,
      userInQueue: Boolean(studentEntry),
      queuePosition: studentPosition,
      entry: studentEntry,
      status: activeWaiting.length > 0 ? 'ACTIVE' : 'EMPTY',
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error getting queue status for bus ${busId}:`, error);
    return {
      busId,
      queueSize: 0,
      userInQueue: false,
      queuePosition: null,
      entry: null,
      status: 'UNAVAILABLE',
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function joinDbQueue(busId: string, studentId: string, boardingStop: string) {
  try {
    // Check if already in queue
    const existing = await db
      .select()
      .from(boardingQueue)
      .where(
        and(
          eq(boardingQueue.busId, busId),
          eq(boardingQueue.studentId, studentId),
          eq(boardingQueue.status, 'WAITING')
        )
      );

    if (existing.length > 0) {
      const status = await getDbQueueStatus(busId, studentId);
      return { duplicate: true, status };
    }

    const inserted = await db
      .insert(boardingQueue)
      .values({
        busId,
        studentId,
        boardingStop,
        status: 'WAITING',
      })
      .returning();

    const status = await getDbQueueStatus(busId, studentId);
    return { duplicate: false, entry: inserted[0], status };
  } catch (error) {
    console.error('Error joining database queue:', error);
    throw new Error('Failed to join queue', { cause: error });
  }
}

export async function leaveDbQueue(busId: string, studentId: string) {
  try {
    await db
      .update(boardingQueue)
      .set({
        status: 'CANCELLED',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(boardingQueue.busId, busId),
          eq(boardingQueue.studentId, studentId),
          eq(boardingQueue.status, 'WAITING')
        )
      );

    return await getDbQueueStatus(busId, studentId);
  } catch (error) {
    console.error('Error leaving database queue:', error);
    throw new Error('Failed to leave queue', { cause: error });
  }
}

export async function getDbStudentActiveQueue(studentId: string) {
  try {
    const active = await db
      .select()
      .from(boardingQueue)
      .where(and(eq(boardingQueue.studentId, studentId), eq(boardingQueue.status, 'WAITING')))
      .orderBy(desc(boardingQueue.joinedAt))
      .limit(1);

    if (active.length === 0) return null;
    const busQueue = await getDbQueueStatus(active[0].busId, studentId);
    return {
      ...active[0],
      queuePosition: busQueue.queuePosition,
      totalInQueue: busQueue.queueSize,
    };
  } catch (error) {
    console.error(`Error fetching active queue for student ${studentId}:`, error);
    return null;
  }
}

// -------------------------------------------------------------
// STUDENT PREFERENCES & DESTINATIONS
// -------------------------------------------------------------
export async function getDbStudentPreferences(userId: string) {
  try {
    const prefs = await db
      .select()
      .from(studentPreferences)
      .where(eq(studentPreferences.userId, userId));

    return prefs[0] || null;
  } catch (error) {
    console.error(`Error fetching preferences for ${userId}:`, error);
    return null;
  }
}

export async function upsertDbStudentPreferences(
  userId: string,
  data: Partial<{
    savedPickupStopId: string;
    preferredBusId: string;
    savedDestinationName: string;
    savedDestinationLat: number;
    savedDestinationLng: number;
    notificationArrivals: boolean;
    notificationDelays: boolean;
  }>
) {
  try {
    const existing = await db
      .select()
      .from(studentPreferences)
      .where(eq(studentPreferences.userId, userId));

    if (existing.length > 0) {
      const updated = await db
        .update(studentPreferences)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(studentPreferences.userId, userId))
        .returning();
      return updated[0];
    }

    const inserted = await db
      .insert(studentPreferences)
      .values({
        userId,
        ...data,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error(`Error saving preferences for ${userId}:`, error);
    throw new Error('Failed to save student preferences', { cause: error });
  }
}

// -------------------------------------------------------------
// STUDENT GPS LOCATION LOGGING
// -------------------------------------------------------------
export async function recordStudentLocation(data: {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
}) {
  try {
    const inserted = await db.insert(studentLocations).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error('Error recording student location:', error);
    return null;
  }
}

export async function getLatestStudentLocation(userId: string) {
  try {
    const loc = await db
      .select()
      .from(studentLocations)
      .where(eq(studentLocations.userId, userId))
      .orderBy(desc(studentLocations.recordedAt))
      .limit(1);

    return loc[0] || null;
  } catch (error) {
    console.error(`Error getting latest location for student ${userId}:`, error);
    return null;
  }
}

// -------------------------------------------------------------
// CAMPUS PATHS & VERIFIED DATABASE WAYFINDING
// -------------------------------------------------------------
export async function calculateDbCampusWalkingRoute(startIdOrCoords: string | { latitude: number; longitude: number }, destId: string) {
  try {
    const allLocations = await db.select().from(campusLocations);
    const allPaths = await db.select().from(campusPaths);

    const dest = allLocations.find((l) => l.id === destId || l.name.toLowerCase() === destId.toLowerCase());
    if (!dest) {
      return null;
    }

    let startCoord: { latitude: number; longitude: number };
    let startName = "Current Location";

    if (typeof startIdOrCoords === "string") {
      const startLoc = allLocations.find((l) => l.id === startIdOrCoords || l.name.toLowerCase() === startIdOrCoords.toLowerCase());
      if (!startLoc) return null;
      startCoord = { latitude: startLoc.latitude, longitude: startLoc.longitude };
      startName = startLoc.name;
    } else {
      startCoord = startIdOrCoords;
    }

    // Direct distance check
    function haversineMeters(c1: { latitude: number; longitude: number }, c2: { latitude: number; longitude: number }) {
      const R = 6371000;
      const dLat = ((c2.latitude - c1.latitude) * Math.PI) / 180;
      const dLon = ((c2.longitude - c1.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((c1.latitude * Math.PI) / 180) *
          Math.cos((c2.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Match closest path segment if available in Cloud SQL
    let matchedPath: any = null;
    for (const p of allPaths) {
      if (
        (p.fromLocationId.toLowerCase().includes(dest.name.toLowerCase()) || p.toLocationId.toLowerCase().includes(dest.name.toLowerCase())) ||
        (dest.description && (p.fromLocationId.includes(dest.id) || p.toLocationId.includes(dest.id)))
      ) {
        matchedPath = p;
        break;
      }
    }

    const directDistance = Math.round(haversineMeters(startCoord, { latitude: dest.latitude, longitude: dest.longitude }));
    const distanceMeters = matchedPath ? Math.round(matchedPath.distanceMeters) : directDistance;
    const walkingMinutes = Math.max(1, Math.round(distanceMeters / 80)); // ~80m/min pedestrian speed

    let pathCoordinates: [number, number][] = [];
    if (matchedPath && matchedPath.pathPoints) {
      try {
        pathCoordinates = JSON.parse(matchedPath.pathPoints);
      } catch (e) {
        pathCoordinates = [
          [startCoord.latitude, startCoord.longitude],
          [dest.latitude, dest.longitude],
        ];
      }
    } else {
      pathCoordinates = [
        [startCoord.latitude, startCoord.longitude],
        [dest.latitude, dest.longitude],
      ];
    }

    return {
      startLocation: startName,
      destination: dest.name,
      destinationCategory: dest.category,
      distanceMeters,
      walkingMinutes,
      steps: [
        `Depart from ${startName}`,
        `Follow pedestrian walkway towards ${dest.name}`,
        `Arrive at ${dest.name} (${dest.category})`,
      ],
      pathPoints: pathCoordinates,
      verifiedSource: "Cloud SQL campus_paths & campus_locations",
    };
  } catch (error) {
    console.error("Error calculating campus walking route:", error);
    return null;
  }
}

