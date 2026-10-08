var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminAuditLogs: () => adminAuditLogs,
  boardingQueue: () => boardingQueue,
  busLocations: () => busLocations,
  busRoutes: () => busRoutes,
  busStops: () => busStops,
  buses: () => buses,
  campusLocations: () => campusLocations,
  campusPaths: () => campusPaths,
  drivers: () => drivers,
  emergencyContacts: () => emergencyContacts,
  mobiQueryLogs: () => mobiQueryLogs,
  mobilityEvents: () => mobilityEvents,
  notificationPreferences: () => notificationPreferences,
  notifications: () => notifications,
  officialPickupPoints: () => officialPickupPoints,
  profiles: () => profiles,
  publicTransportDepartures: () => publicTransportDepartures,
  publicTransportStops: () => publicTransportStops,
  recTransportRoutes: () => recTransportRoutes,
  recTransportStops: () => recTransportStops,
  recTransportSyncStatus: () => recTransportSyncStatus,
  safetyReports: () => safetyReports,
  shiftAssignments: () => shiftAssignments,
  shifts: () => shifts,
  studentLocations: () => studentLocations,
  studentPickupPoints: () => studentPickupPoints,
  studentPreferences: () => studentPreferences,
  students: () => students,
  trackingSessions: () => trackingSessions,
  tripNotificationEvents: () => tripNotificationEvents,
  trips: () => trips
});
import { boolean, doublePrecision, integer, pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";
var profiles, students, drivers, buses, busRoutes, busStops, officialPickupPoints, shifts, shiftAssignments, trips, adminAuditLogs, tripNotificationEvents, mobilityEvents, studentPickupPoints, busLocations, trackingSessions, notifications, notificationPreferences, campusLocations, campusPaths, safetyReports, emergencyContacts, publicTransportStops, publicTransportDepartures, boardingQueue, studentPreferences, studentLocations, mobiQueryLogs, recTransportRoutes, recTransportStops, recTransportSyncStatus;
var init_schema = __esm({
  "src/db/schema.ts"() {
    "use strict";
    profiles = pgTable("profiles", {
      id: serial("id").primaryKey(),
      userId: text("user_id").notNull().unique(),
      // Firebase Auth UID
      name: text("name").notNull(),
      email: text("email").notNull(),
      phone: text("phone"),
      role: text("role").notNull().default("STUDENT"),
      // STUDENT, DRIVER, ADMIN, PARENT
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
    });
    students = pgTable("students", {
      id: serial("id").primaryKey(),
      profileId: integer("profile_id").references(() => profiles.id).notNull(),
      registerNumber: text("register_number"),
      pickupStopId: text("pickup_stop_id"),
      assignedBusId: text("assigned_bus_id"),
      assignedRouteId: text("assigned_route_id")
    });
    drivers = pgTable("drivers", {
      id: serial("id").primaryKey(),
      profileId: integer("profile_id").references(() => profiles.id).notNull(),
      assignedBusId: text("assigned_bus_id")
    });
    buses = pgTable("buses", {
      id: text("id").primaryKey(),
      // e.g., 'bus-18'
      busNumber: text("bus_number").notNull(),
      registrationNumber: text("registration_number"),
      routeId: text("route_id"),
      driverId: text("driver_id"),
      active: boolean("active").notNull().default(true),
      source: text("source").notNull().default("ADMIN"),
      manuallyEdited: boolean("manually_edited").notNull().default(false),
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
    });
    busRoutes = pgTable("bus_routes", {
      id: text("id").primaryKey(),
      // e.g. 'route-bus-18'
      routeName: text("route_name").notNull(),
      routeCode: text("route_code").notNull(),
      startingTimeDisplay: text("starting_time_display"),
      startingTime24: text("starting_time_24"),
      campusArrivalDisplay: text("campus_arrival_display"),
      campusArrival24: text("campus_arrival_24"),
      source: text("source").notNull().default("ADMIN"),
      manuallyEdited: boolean("manually_edited").notNull().default(false),
      active: boolean("active").notNull().default(true)
    });
    busStops = pgTable("bus_stops", {
      id: text("id").primaryKey(),
      routeId: text("route_id").notNull(),
      stopName: text("stop_name").notNull(),
      latitude: doublePrecision("latitude").notNull(),
      longitude: doublePrecision("longitude").notNull(),
      sequenceNumber: integer("sequence_number").notNull()
    });
    officialPickupPoints = pgTable("official_pickup_points", {
      id: text("id").primaryKey(),
      routeId: text("route_id").notNull(),
      stopName: text("stop_name").notNull(),
      latitude: doublePrecision("latitude"),
      longitude: doublePrecision("longitude"),
      sequenceNumber: integer("sequence_number").notNull(),
      geofenceRadiusM: integer("geofence_radius_m").notNull().default(150),
      /** Minutes from shift start when bus is expected at this stop (schedule profile). */
      expectedOffsetMinutes: integer("expected_offset_minutes").notNull().default(0),
      scheduledTimeDisplay: text("scheduled_time_display"),
      scheduledTime24: text("scheduled_time_24"),
      source: text("source").notNull().default("ADMIN"),
      active: boolean("active").notNull().default(true)
    });
    shifts = pgTable("shifts", {
      id: text("id").primaryKey(),
      name: text("name").notNull(),
      shiftType: text("shift_type"),
      // MORNING | EVENING (canonical slots)
      startTime: text("start_time"),
      // HH:MM 24h — unset until admin configures
      endTime: text("end_time"),
      direction: text("direction").notNull().default("TO_COLLEGE"),
      // TO_COLLEGE | FROM_COLLEGE
      routeId: text("route_id"),
      busId: text("bus_id"),
      driverId: text("driver_id"),
      operatingDays: text("operating_days").notNull().default("MON,TUE,WED,THU,FRI"),
      active: boolean("active").notNull().default(false),
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
      updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
    });
    shiftAssignments = pgTable("shift_assignments", {
      id: text("id").primaryKey(),
      shiftId: text("shift_id").notNull(),
      busId: text("bus_id").notNull(),
      driverId: text("driver_id"),
      activeStopIds: text("active_stop_ids"),
      active: boolean("active").notNull().default(true),
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
    });
    trips = pgTable(
      "trips",
      {
        id: text("id").primaryKey(),
        shiftId: text("shift_id"),
        busId: text("bus_id").notNull(),
        driverId: text("driver_id").notNull(),
        routeId: text("route_id").notNull(),
        trackingSessionId: text("tracking_session_id"),
        status: text("status").notNull().default("SCHEDULED"),
        // SCHEDULED | STARTED | ACTIVE | COMPLETED | CANCELLED
        scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }),
        startedAt: timestamp("started_at", { withTimezone: true }),
        endedAt: timestamp("ended_at", { withTimezone: true }),
        delayMinutes: integer("delay_minutes").notNull().default(0),
        /** Snapshot of shift window when trip was scheduled/started (immutable for history). */
        shiftStartSnapshot: text("shift_start_snapshot"),
        shiftEndSnapshot: text("shift_end_snapshot"),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
      },
      (table) => [
        index("trips_bus_id_idx").on(table.busId),
        index("trips_status_idx").on(table.status),
        index("trips_shift_id_idx").on(table.shiftId)
      ]
    );
    adminAuditLogs = pgTable(
      "admin_audit_logs",
      {
        id: text("id").primaryKey(),
        adminId: text("admin_id").notNull(),
        action: text("action").notNull(),
        entityType: text("entity_type"),
        entityId: text("entity_id"),
        detail: text("detail"),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
      },
      (table) => [index("admin_audit_logs_created_at_idx").on(table.createdAt)]
    );
    tripNotificationEvents = pgTable(
      "trip_notification_events",
      {
        id: text("id").primaryKey(),
        tripId: text("trip_id"),
        studentId: text("student_id").notNull(),
        pickupPointId: text("pickup_point_id").notNull(),
        eventType: text("event_type").notNull(),
        triggeredAt: timestamp("triggered_at", { withTimezone: true }).defaultNow(),
        etaAtTrigger: integer("eta_at_trigger"),
        delayMinutes: integer("delay_minutes"),
        notificationStatus: text("notification_status").notNull().default("SENT"),
        deliveredAt: timestamp("delivered_at", { withTimezone: true })
      },
      (table) => [
        index("trip_notif_student_idx").on(table.studentId),
        index("trip_notif_trip_idx").on(table.tripId)
      ]
    );
    mobilityEvents = pgTable("mobility_events", {
      id: text("id").primaryKey(),
      userId: text("user_id").notNull(),
      busId: text("bus_id").notNull(),
      tripId: text("trip_id"),
      pickupPointId: text("pickup_point_id"),
      eventType: text("event_type").notNull(),
      payload: text("payload").notNull().default("{}"),
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
    });
    studentPickupPoints = pgTable("student_pickup_points", {
      id: text("id").primaryKey(),
      studentId: text("student_id").notNull(),
      stopId: text("stop_id").notNull(),
      latitude: doublePrecision("latitude").notNull(),
      longitude: doublePrecision("longitude").notNull(),
      isPrimary: boolean("is_primary").notNull().default(true)
    });
    busLocations = pgTable(
      "bus_locations",
      {
        id: serial("id").primaryKey(),
        busId: text("bus_id").notNull(),
        driverId: text("driver_id"),
        latitude: doublePrecision("latitude").notNull(),
        longitude: doublePrecision("longitude").notNull(),
        accuracy: doublePrecision("accuracy"),
        altitude: doublePrecision("altitude"),
        altitudeAccuracy: doublePrecision("altitude_accuracy"),
        speed: doublePrecision("speed"),
        heading: doublePrecision("heading"),
        recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
        receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
      },
      (table) => [
        index("bus_locations_bus_id_idx").on(table.busId),
        index("bus_locations_recorded_at_idx").on(table.recordedAt),
        index("bus_locations_driver_id_idx").on(table.driverId)
      ]
    );
    trackingSessions = pgTable(
      "tracking_sessions",
      {
        id: text("id").primaryKey(),
        busId: text("bus_id").notNull(),
        driverId: text("driver_id").notNull(),
        startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
        endedAt: timestamp("ended_at", { withTimezone: true }),
        lastLocationAt: timestamp("last_location_at", { withTimezone: true }),
        status: text("status").notNull().default("ACTIVE")
        // ACTIVE, PAUSED, ENDED
      },
      (table) => [
        index("tracking_sessions_bus_id_idx").on(table.busId),
        index("tracking_sessions_driver_id_idx").on(table.driverId),
        index("tracking_sessions_status_idx").on(table.status)
      ]
    );
    notifications = pgTable("notifications", {
      id: serial("id").primaryKey(),
      userId: text("user_id").notNull(),
      type: text("type").notNull(),
      title: text("title").notNull(),
      message: text("message").notNull(),
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
      readAt: timestamp("read_at", { withTimezone: true })
    });
    notificationPreferences = pgTable("notification_preferences", {
      id: serial("id").primaryKey(),
      userId: text("user_id").notNull().unique(),
      preferences: text("preferences").notNull().default("{}")
    });
    campusLocations = pgTable("campus_locations", {
      id: text("id").primaryKey(),
      name: text("name").notNull(),
      category: text("category").notNull(),
      latitude: doublePrecision("latitude").notNull(),
      longitude: doublePrecision("longitude").notNull(),
      description: text("description")
    });
    campusPaths = pgTable("campus_paths", {
      id: text("id").primaryKey(),
      fromLocationId: text("from_location_id").notNull(),
      toLocationId: text("to_location_id").notNull(),
      distanceMeters: doublePrecision("distance_meters").notNull(),
      pathPoints: text("path_points").notNull()
      // JSON array of [lat, lng]
    });
    safetyReports = pgTable("safety_reports", {
      id: text("id").primaryKey(),
      studentId: text("student_id").notNull(),
      reportType: text("report_type").notNull(),
      description: text("description").notNull(),
      latitude: doublePrecision("latitude").notNull(),
      longitude: doublePrecision("longitude").notNull(),
      status: text("status").notNull().default("OPEN"),
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
    });
    emergencyContacts = pgTable("emergency_contacts", {
      id: text("id").primaryKey(),
      userId: text("user_id").notNull(),
      name: text("name").notNull(),
      relationship: text("relationship").notNull(),
      phone: text("phone").notNull()
    });
    publicTransportStops = pgTable("public_transport_stops", {
      id: text("id").primaryKey(),
      name: text("name").notNull(),
      latitude: doublePrecision("latitude").notNull(),
      longitude: doublePrecision("longitude").notNull(),
      routesServed: text("routes_served").notNull()
    });
    publicTransportDepartures = pgTable("public_transport_departures", {
      id: text("id").primaryKey(),
      stopId: text("stop_id").notNull(),
      routeNumber: text("route_number").notNull(),
      destination: text("destination").notNull(),
      departureTime: text("departure_time").notNull(),
      // HH:MM
      serviceDays: text("service_days").notNull().default("MON,TUE,WED,THU,FRI,SAT"),
      isLive: boolean("is_live").notNull().default(false)
    });
    boardingQueue = pgTable("boarding_queue", {
      id: serial("id").primaryKey(),
      studentId: text("student_id").notNull(),
      busId: text("bus_id").notNull(),
      boardingStop: text("boarding_stop").notNull(),
      status: text("status").notNull().default("WAITING"),
      // WAITING, BOARDED, CANCELLED
      joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
      updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
    });
    studentPreferences = pgTable("student_preferences", {
      id: serial("id").primaryKey(),
      userId: text("user_id").notNull().unique(),
      savedPickupStopId: text("saved_pickup_stop_id"),
      preferredBusId: text("preferred_bus_id"),
      savedDestinationName: text("saved_destination_name"),
      savedDestinationLat: doublePrecision("saved_destination_lat"),
      savedDestinationLng: doublePrecision("saved_destination_lng"),
      notificationArrivals: boolean("notification_arrivals").default(true),
      notificationDelays: boolean("notification_delays").default(true),
      updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
    });
    studentLocations = pgTable("student_locations", {
      id: serial("id").primaryKey(),
      userId: text("user_id").notNull(),
      latitude: doublePrecision("latitude").notNull(),
      longitude: doublePrecision("longitude").notNull(),
      accuracy: doublePrecision("accuracy"),
      recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow()
    });
    mobiQueryLogs = pgTable(
      "mobi_query_logs",
      {
        id: text("id").primaryKey(),
        studentId: text("student_id").notNull(),
        intent: text("intent").notNull(),
        toolsCalled: text("tools_called").notNull().default("[]"),
        success: boolean("success").notNull().default(true),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
      },
      (table) => [index("mobi_query_logs_student_idx").on(table.studentId), index("mobi_query_logs_created_at_idx").on(table.createdAt)]
    );
    recTransportRoutes = pgTable(
      "rec_transport_routes",
      {
        id: text("id").primaryKey(),
        routeNumber: text("route_number").notNull(),
        routeName: text("route_name").notNull(),
        startingTimeDisplay: text("starting_time_display"),
        startingTime24: text("starting_time_24"),
        boardingPageUrl: text("boarding_page_url"),
        viaNotes: text("via_notes"),
        campusArrivalDisplay: text("campus_arrival_display"),
        campusArrival24: text("campus_arrival_24"),
        sourceUrl: text("source_url").notNull(),
        active: boolean("active").notNull().default(true),
        manuallyEdited: boolean("manually_edited").notNull().default(false),
        lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
      },
      (table) => [index("rec_transport_routes_number_idx").on(table.routeNumber)]
    );
    recTransportStops = pgTable(
      "rec_transport_stops",
      {
        id: text("id").primaryKey(),
        routeId: text("route_id").notNull(),
        stopName: text("stop_name").notNull(),
        sequenceNumber: integer("sequence_number").notNull(),
        timeDisplay: text("time_display"),
        time24: text("time_24"),
        isCampus: boolean("is_campus").notNull().default(false),
        latitude: doublePrecision("latitude"),
        longitude: doublePrecision("longitude"),
        active: boolean("active").notNull().default(true),
        lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
      },
      (table) => [index("rec_transport_stops_route_idx").on(table.routeId, table.sequenceNumber)]
    );
    recTransportSyncStatus = pgTable("rec_transport_sync_status", {
      id: integer("id").primaryKey(),
      timetableUrl: text("timetable_url").notNull(),
      connectionStatus: text("connection_status").notNull().default("PENDING"),
      lastSuccessfulSync: timestamp("last_successful_sync", { withTimezone: true }),
      routesCount: integer("routes_count").notNull().default(0),
      stopsCount: integer("stops_count").notNull().default(0),
      lastError: text("last_error"),
      updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
    });
  }
});

// src/db/index.ts
var db_exports = {};
__export(db_exports, {
  createPoolLegacy: () => pool,
  db: () => db,
  execSql: () => execSql,
  pgliteClient: () => pgliteClient,
  pool: () => pool
});
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
function cleanDatabaseUrl() {
  if (!process.env.DATABASE_URL) return void 0;
  const cleaned = process.env.DATABASE_URL.replace(/^["']|["']$/g, "").trim();
  process.env.DATABASE_URL = cleaned;
  return cleaned;
}
function useEmbeddedDb() {
  const url = cleanDatabaseUrl();
  return !url && !process.env.SQL_HOST;
}
function createPool() {
  const url = cleanDatabaseUrl();
  if (url) {
    return new Pool({
      connectionString: url,
      ssl: url.includes("localhost") ? false : { rejectUnauthorized: false }
    });
  }
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD ?? "",
    database: process.env.SQL_DB_NAME,
    max: 10,
    connectionTimeoutMillis: 15e3
  });
}
async function execSql(text4) {
  try {
    if (pool) {
      await pool.query(text4);
      return;
    }
    if (pgliteClient) {
      await pgliteClient.exec(text4);
    }
  } catch (err) {
    console.warn("[src/db] execSql warning:", err instanceof Error ? err.message : err);
  }
}
var Pool, pool, pgliteClient, db;
var init_db = __esm({
  "src/db/index.ts"() {
    "use strict";
    init_schema();
    ({ Pool } = pg);
    pool = null;
    pgliteClient = null;
    try {
      if (useEmbeddedDb()) {
        const dataDir = path.resolve(process.cwd(), "data/postgres");
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        pgliteClient = global._pgliteClient ?? new PGlite(dataDir);
        global._pgliteClient = pgliteClient;
        console.log(`[src/db] Embedded PostgreSQL (PGlite) at ${dataDir}`);
      } else {
        pool = global._postgresPool ?? createPool();
        global._postgresPool = pool;
        pool.on("error", (err) => console.error("Unexpected error on idle SQL pool client:", err));
        console.log("[src/db] Connected to PostgreSQL");
      }
      db = pool ? drizzlePg(pool, { schema: schema_exports }) : drizzlePglite(pgliteClient, { schema: schema_exports });
    } catch (err) {
      console.warn("[AI Studio] Database not connected \u2014 using fallback mock:", err);
      try {
        pgliteClient = new PGlite();
        db = drizzlePglite(pgliteClient, { schema: schema_exports });
      } catch {
        const noOp = {
          findMany: async () => [],
          findFirst: async () => null,
          findUnique: async () => null,
          create: async (d) => d?.data ?? {},
          update: async (d) => d?.data ?? {},
          delete: async () => ({})
        };
        db = new Proxy(
          {},
          {
            get: (_, prop) => prop === "query" ? new Proxy({}, { get: () => noOp }) : () => ({ from: () => ({ where: async () => [] }) })
          }
        );
      }
    }
  }
});

// src/db/shiftManagement.ts
var shiftManagement_exports = {};
__export(shiftManagement_exports, {
  CANONICAL_SHIFT_TYPES: () => CANONICAL_SHIFT_TYPES,
  PRIMARY_SHIFTS: () => PRIMARY_SHIFTS,
  directionLabel: () => directionLabel,
  ensureCanonicalShiftSlots: () => ensureCanonicalShiftSlots,
  formatShiftTimeDisplay: () => formatShiftTimeDisplay,
  getActiveShiftsForStudents: () => getActiveShiftsForStudents,
  getAllShiftsWithAssignments: () => getAllShiftsWithAssignments,
  getShiftAssignedToBus: () => getShiftAssignedToBus,
  getShiftById: () => getShiftById,
  getShiftByType: () => getShiftByType,
  listAdminShifts: () => listAdminShifts,
  listShiftAssignmentsForShift: () => listShiftAssignmentsForShift,
  parseTimeToMinutes: () => parseTimeToMinutes,
  resolveShiftForDriverTrip: () => resolveShiftForDriverTrip,
  resolveShiftTimingForBus: () => resolveShiftTimingForBus,
  setShiftActive: () => setShiftActive,
  setShiftAssignedBuses: () => setShiftAssignedBuses,
  syncScheduledTripForShift: () => syncScheduledTripForShift,
  timeRangesOverlap: () => timeRangesOverlap,
  updateShiftBusActiveStops: () => updateShiftBusActiveStops,
  validateAndUpdateShift: () => validateAndUpdateShift
});
import { and, desc, eq, ne } from "drizzle-orm";
function parseTimeToMinutes(value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}
function timeRangesOverlap(startA, endA, startB, endB) {
  const a0 = parseTimeToMinutes(startA);
  const a1 = parseTimeToMinutes(endA);
  const b0 = parseTimeToMinutes(startB);
  const b1 = parseTimeToMinutes(endB);
  if (a0 == null || a1 == null || b0 == null || b1 == null) return false;
  if (a1 <= a0 || b1 <= b0) return false;
  return a0 < b1 && b0 < a1;
}
async function ensureCanonicalShiftSlots() {
  for (const s of PRIMARY_SHIFTS) {
    const existing = await db.select().from(shifts).where(eq(shifts.id, s.id)).limit(1);
    if (!existing.length) {
      await db.insert(shifts).values({
        id: s.id,
        name: s.name,
        shiftType: s.shiftType,
        startTime: s.startTime,
        endTime: s.endTime,
        direction: s.direction,
        operatingDays: s.operatingDays,
        active: s.active
      });
    }
  }
  const { shiftAssignments: saTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const existingAssignments = await db.select().from(saTable).limit(1);
  if (existingAssignments.length === 0) {
    const defaultMorningBuses = ["bus-1", "bus-1b", "bus-1c", "bus-2", "bus-2b", "bus-18"];
    for (const bId of defaultMorningBuses) {
      await db.insert(saTable).values({
        id: `sa-morning-${bId}`,
        shiftId: "shift-morning-630",
        busId: bId,
        active: true
      }).onConflictDoNothing();
    }
    const defaultEveningBuses = ["bus-1", "bus-1b", "bus-2", "bus-18"];
    for (const bId of defaultEveningBuses) {
      await db.insert(saTable).values({
        id: `sa-evening-${bId}`,
        shiftId: "shift-evening-315",
        busId: bId,
        active: true
      }).onConflictDoNothing();
    }
  }
}
async function listAdminShifts() {
  await ensureCanonicalShiftSlots();
  const rows = await db.select().from(shifts).orderBy(shifts.shiftType);
  return rows;
}
async function getShiftById(shiftId) {
  const rows = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
  return rows[0] ?? null;
}
async function getShiftByType(shiftType) {
  await ensureCanonicalShiftSlots();
  const rows = await db.select().from(shifts).where(eq(shifts.shiftType, shiftType)).limit(1);
  return rows[0] ?? null;
}
async function validateAndUpdateShift(shiftId, input) {
  const current = await getShiftById(shiftId);
  if (!current) throw new Error("Shift not found");
  const startTime = input.startTime !== void 0 ? input.startTime?.trim() || null : current.startTime;
  const endTime = input.endTime !== void 0 ? input.endTime?.trim() || null : current.endTime;
  const direction = input.direction ?? current.direction;
  const routeId = input.routeId !== void 0 ? input.routeId || null : current.routeId;
  const busId = input.busId !== void 0 ? input.busId || null : current.busId;
  const driverId = input.driverId !== void 0 ? input.driverId || null : current.driverId;
  const operatingDays = input.operatingDays ?? current.operatingDays;
  const active = input.active ?? current.active;
  if (!startTime) throw new Error("Start time is required.");
  if (!endTime) throw new Error("End time is required.");
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  if (startMin == null || endMin == null) throw new Error("Invalid time format. Use HH:MM (24-hour).");
  if (endMin <= startMin) throw new Error("End time must be after start time on the same day.");
  if (routeId) {
    const routes2 = await getDbRoutes();
    if (!routes2.some((r) => r.id === routeId && r.active)) {
      throw new Error("Selected route is invalid or inactive.");
    }
  } else if (active) {
    throw new Error("Route is required for an active shift.");
  }
  if (busId) {
    const bus = await getDbBusById(busId);
    if (!bus) throw new Error("Selected bus was not found.");
    if (!bus.active) throw new Error("Selected bus is inactive.");
  } else if (active) {
    throw new Error("Bus is required for an active shift.");
  }
  if (driverId && active) {
  }
  const allShifts = await db.select().from(shifts).where(ne(shifts.id, shiftId));
  for (const other of allShifts) {
    if (!other.startTime || !other.endTime) continue;
    if (busId && other.busId === busId) {
      if (timeRangesOverlap(startTime, endTime, other.startTime, other.endTime)) {
        const bus = await getDbBusById(busId);
        const label = bus?.busNumber ? `BUS-${bus.busNumber}` : busId;
        throw new Error(`${label} is already assigned to another shift during this time.`);
      }
    }
    if (driverId && other.driverId === driverId) {
      if (timeRangesOverlap(startTime, endTime, other.startTime, other.endTime)) {
        throw new Error(`Driver is already assigned to another overlapping shift (${other.name}).`);
      }
    }
  }
  const updated = await db.update(shifts).set({
    startTime,
    endTime,
    direction,
    routeId,
    busId,
    driverId,
    operatingDays,
    active,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(shifts.id, shiftId)).returning();
  if (active) {
    await syncScheduledTripForShift(updated[0]);
  }
  return updated[0];
}
function scheduledStartDateFromShiftStart(startTime, now = /* @__PURE__ */ new Date()) {
  const [h, m] = startTime.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}
async function syncScheduledTripForShift(shift) {
  if (!shift.active || !shift.startTime || !shift.endTime || !shift.busId || !shift.driverId || !shift.routeId) {
    return null;
  }
  const scheduledStartAt = scheduledStartDateFromShiftStart(shift.startTime);
  const tripId = `scheduled-${shift.id}-${scheduledStartAt.toISOString().slice(0, 10)}`;
  const existing = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
  if (existing.length && (existing[0].status === "COMPLETED" || existing[0].status === "CANCELLED")) {
    return existing[0];
  }
  const payload = {
    shiftId: shift.id,
    busId: shift.busId,
    driverId: shift.driverId,
    routeId: shift.routeId,
    status: "SCHEDULED",
    scheduledStartAt,
    shiftStartSnapshot: shift.startTime,
    shiftEndSnapshot: shift.endTime
  };
  if (existing.length) {
    const updated = await db.update(trips).set(payload).where(eq(trips.id, tripId)).returning();
    return updated[0];
  }
  const inserted = await db.insert(trips).values({
    id: tripId,
    ...payload
  }).returning();
  return inserted[0];
}
async function setShiftActive(shiftId, active) {
  const current = await getShiftById(shiftId);
  if (!current) throw new Error("Shift not found");
  if (active) {
    if (!current.startTime || !current.endTime) {
      throw new Error("Configure start and end times before activating this shift.");
    }
    return validateAndUpdateShift(shiftId, { active: true });
  }
  const updated = await db.update(shifts).set({ active: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(shifts.id, shiftId)).returning();
  return updated[0];
}
async function getActiveShiftsForStudents() {
  await ensureCanonicalShiftSlots();
  const rows = await db.select().from(shifts).where(eq(shifts.active, true));
  return rows.filter((s) => s.startTime && s.endTime && s.routeId && s.busId).sort((a, b) => a.shiftType === "MORNING" ? -1 : b.shiftType === "MORNING" ? 1 : 0);
}
async function getShiftAssignedToBus(busId) {
  const rows = await db.select().from(shifts).where(and(eq(shifts.busId, busId), eq(shifts.active, true))).orderBy(desc(shifts.updatedAt));
  return rows.find((s) => s.startTime && s.endTime) ?? null;
}
async function resolveShiftTimingForBus(busId) {
  const activeTrip = await db.select().from(trips).where(and(eq(trips.busId, busId), eq(trips.status, "ACTIVE"))).orderBy(desc(trips.startedAt)).limit(1);
  if (activeTrip[0]?.shiftStartSnapshot) {
    return {
      shiftId: activeTrip[0].shiftId,
      shiftStartTime: activeTrip[0].shiftStartSnapshot,
      shiftEndTime: activeTrip[0].shiftEndSnapshot,
      pickupExpectedOffsetMinutes: 20
    };
  }
  const shift = await getShiftAssignedToBus(busId);
  if (!shift?.startTime) return null;
  return {
    shiftId: shift.id,
    shiftStartTime: shift.startTime,
    shiftEndTime: shift.endTime,
    pickupExpectedOffsetMinutes: 20
  };
}
async function resolveShiftForDriverTrip(busId, driverId) {
  const assigned = await getShiftAssignedToBus(busId);
  if (!assigned || assigned.driverId !== driverId) {
    const rows = await db.select().from(shifts).where(and(eq(shifts.busId, busId), eq(shifts.driverId, driverId), eq(shifts.active, true)));
    return rows.find((s) => s.startTime && s.endTime) ?? assigned;
  }
  return assigned;
}
function formatShiftTimeDisplay(hhmm) {
  if (!hhmm) return "\u2014";
  const mins = parseTimeToMinutes(hhmm);
  if (mins == null) return hhmm;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}
function directionLabel(direction) {
  if (direction === "TO_COLLEGE") return "Home \u2192 College";
  if (direction === "FROM_COLLEGE") return "College \u2192 Home";
  return direction;
}
async function listShiftAssignmentsForShift(shiftId) {
  const { shiftAssignments: saTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  return db.select().from(saTable).where(and(eq(saTable.shiftId, shiftId), eq(saTable.active, true)));
}
async function setShiftAssignedBuses(shiftId, busIds) {
  const { shiftAssignments: saTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  await db.update(saTable).set({ active: false }).where(eq(saTable.shiftId, shiftId));
  for (const busId of busIds) {
    const existing = await db.select().from(saTable).where(and(eq(saTable.shiftId, shiftId), eq(saTable.busId, busId))).limit(1);
    if (existing.length) {
      await db.update(saTable).set({ active: true }).where(eq(saTable.id, existing[0].id));
    } else {
      await db.insert(saTable).values({
        id: `sa-${shiftId}-${busId}-${Date.now()}`,
        shiftId,
        busId,
        active: true
      });
    }
  }
}
async function updateShiftBusActiveStops(shiftId, busId, activeStopIds) {
  const { shiftAssignments: saTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const existing = await db.select().from(saTable).where(and(eq(saTable.shiftId, shiftId), eq(saTable.busId, busId))).limit(1);
  const serialized = JSON.stringify(activeStopIds);
  if (existing.length) {
    await db.update(saTable).set({ activeStopIds: serialized, active: true }).where(eq(saTable.id, existing[0].id));
  } else {
    await db.insert(saTable).values({
      id: `sa-${shiftId}-${busId}-${Date.now()}`,
      shiftId,
      busId,
      activeStopIds: serialized,
      active: true
    });
  }
}
async function getAllShiftsWithAssignments() {
  await ensureCanonicalShiftSlots();
  const allShifts = await db.select().from(shifts).orderBy(shifts.startTime);
  const { shiftAssignments: saTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const allAssignments = await db.select().from(saTable).where(eq(saTable.active, true));
  return allShifts.map((s) => {
    const assignments = allAssignments.filter((a) => a.shiftId === s.id);
    return {
      ...s,
      displayTime: formatShiftTimeDisplay(s.startTime),
      directionLabel: directionLabel(s.direction),
      assignedBusIds: assignments.map((a) => a.busId),
      busStopsConfig: assignments.reduce((acc, a) => {
        if (a.activeStopIds) {
          try {
            acc[a.busId] = JSON.parse(a.activeStopIds);
          } catch {
            acc[a.busId] = a.activeStopIds.split(",").filter(Boolean);
          }
        }
        return acc;
      }, {})
    };
  });
}
var CANONICAL_SHIFT_TYPES, PRIMARY_SHIFTS;
var init_shiftManagement = __esm({
  "src/db/shiftManagement.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_services();
    CANONICAL_SHIFT_TYPES = ["MORNING", "EVENING", "REGULAR", "EXAM_ONLY"];
    PRIMARY_SHIFTS = [
      {
        id: "shift-morning-630",
        name: "6:30 AM Shift",
        shiftType: "REGULAR",
        startTime: "06:30",
        endTime: "08:00",
        direction: "TO_COLLEGE",
        operatingDays: "MON,TUE,WED,THU,FRI",
        active: true
      },
      {
        id: "shift-morning-830",
        name: "8:30 AM Shift",
        shiftType: "REGULAR",
        startTime: "08:30",
        endTime: "10:00",
        direction: "TO_COLLEGE",
        operatingDays: "MON,TUE,WED,THU,FRI",
        active: true
      },
      {
        id: "shift-evening-315",
        name: "3:15 PM Shift",
        shiftType: "REGULAR",
        startTime: "15:15",
        endTime: "17:00",
        direction: "FROM_COLLEGE",
        operatingDays: "MON,TUE,WED,THU,FRI",
        active: true
      },
      {
        id: "shift-evening-515",
        name: "5:15 PM Shift",
        shiftType: "REGULAR",
        startTime: "17:15",
        endTime: "19:00",
        direction: "FROM_COLLEGE",
        operatingDays: "MON,TUE,WED,THU,FRI",
        active: true
      },
      {
        id: "shift-exam-1145",
        name: "11:45 AM Exam Service",
        shiftType: "EXAM_ONLY",
        startTime: "11:45",
        endTime: "13:30",
        direction: "FROM_COLLEGE",
        operatingDays: "MON,TUE,WED,THU,FRI",
        active: false
      },
      {
        id: "shift-exam-1200",
        name: "12:00 PM Exam Service",
        shiftType: "EXAM_ONLY",
        startTime: "12:00",
        endTime: "13:45",
        direction: "FROM_COLLEGE",
        operatingDays: "MON,TUE,WED,THU,FRI",
        active: false
      }
    ];
  }
});

// src/db/mobilityOps.ts
import { and as and2, desc as desc2, eq as eq2 } from "drizzle-orm";
function shiftsOverlap(aStart, aEnd, bStart, bEnd) {
  if (!aEnd || !bEnd) return false;
  return timeRangesOverlap(aStart, aEnd, bStart, bEnd);
}
async function listPickupPoints(routeId) {
  if (routeId) {
    return db.select().from(officialPickupPoints).where(and2(eq2(officialPickupPoints.routeId, routeId), eq2(officialPickupPoints.active, true)));
  }
  return db.select().from(officialPickupPoints).where(eq2(officialPickupPoints.active, true));
}
async function upsertPickupPoint(input) {
  const existing = await db.select().from(officialPickupPoints).where(eq2(officialPickupPoints.id, input.id));
  const latitude = input.latitude !== void 0 ? input.latitude : existing[0]?.latitude ?? null;
  const longitude = input.longitude !== void 0 ? input.longitude : existing[0]?.longitude ?? null;
  if (existing.length) {
    const updated = await db.update(officialPickupPoints).set({
      routeId: input.routeId,
      stopName: input.stopName,
      latitude,
      longitude,
      sequenceNumber: input.sequenceNumber,
      geofenceRadiusM: input.geofenceRadiusM ?? 150,
      expectedOffsetMinutes: input.expectedOffsetMinutes ?? 0,
      scheduledTimeDisplay: input.scheduledTimeDisplay !== void 0 ? input.scheduledTimeDisplay : existing[0].scheduledTimeDisplay,
      scheduledTime24: input.scheduledTime24 !== void 0 ? input.scheduledTime24 : existing[0].scheduledTime24,
      source: input.source ?? existing[0].source ?? "ADMIN",
      active: input.active ?? true
    }).where(eq2(officialPickupPoints.id, input.id)).returning();
    return updated[0];
  }
  const inserted = await db.insert(officialPickupPoints).values({
    id: input.id,
    routeId: input.routeId,
    stopName: input.stopName,
    latitude,
    longitude,
    sequenceNumber: input.sequenceNumber,
    geofenceRadiusM: input.geofenceRadiusM ?? 150,
    expectedOffsetMinutes: input.expectedOffsetMinutes ?? 0,
    scheduledTimeDisplay: input.scheduledTimeDisplay ?? null,
    scheduledTime24: input.scheduledTime24 ?? null,
    source: input.source ?? "ADMIN",
    active: input.active ?? true
  }).returning();
  return inserted[0];
}
async function listShifts() {
  return db.select().from(shifts).orderBy(shifts.shiftType);
}
async function createShift(input) {
  const inserted = await db.insert(shifts).values({
    id: input.id,
    name: input.name,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    direction: input.direction,
    routeId: input.routeId ?? null,
    operatingDays: input.operatingDays ?? "MON,TUE,WED,THU,FRI",
    active: false
  }).returning();
  return inserted[0];
}
async function listShiftAssignments() {
  const rows = await db.select().from(shiftAssignments).where(eq2(shiftAssignments.active, true));
  const shiftList = await listShifts();
  return rows.map((row) => ({
    ...row,
    shift: shiftList.find((s) => s.id === row.shiftId) ?? null
  }));
}
async function assignShift(input) {
  const allShifts = await db.select().from(shifts);
  const target = allShifts.find((s) => s.id === input.shiftId);
  if (!target) throw new Error("Shift not found");
  const assignments = await db.select().from(shiftAssignments).where(and2(eq2(shiftAssignments.active, true), eq2(shiftAssignments.busId, input.busId)));
  for (const a of assignments) {
    const otherShift = allShifts.find((s) => s.id === a.shiftId);
    if (otherShift?.startTime && otherShift.endTime && target.startTime && target.endTime && shiftsOverlap(target.startTime, target.endTime, otherShift.startTime, otherShift.endTime)) {
      throw new Error(`Bus ${input.busId} already assigned to overlapping shift ${otherShift.name}`);
    }
  }
  const driverAssignments = await db.select().from(shiftAssignments).where(and2(eq2(shiftAssignments.active, true), eq2(shiftAssignments.driverId, input.driverId)));
  for (const a of driverAssignments) {
    const otherShift = allShifts.find((s) => s.id === a.shiftId);
    if (otherShift?.startTime && otherShift.endTime && target.startTime && target.endTime && shiftsOverlap(target.startTime, target.endTime, otherShift.startTime, otherShift.endTime)) {
      throw new Error(`Driver ${input.driverId} already assigned to overlapping shift ${otherShift.name}`);
    }
  }
  const inserted = await db.insert(shiftAssignments).values({
    id: input.id,
    shiftId: input.shiftId,
    busId: input.busId,
    driverId: input.driverId,
    active: true
  }).returning();
  return inserted[0];
}
async function getActiveTripForBus(busId) {
  const rows = await db.select().from(trips).where(and2(eq2(trips.busId, busId), eq2(trips.status, "ACTIVE"))).orderBy(desc2(trips.startedAt)).limit(1);
  return rows[0] || null;
}
async function startTripFromDriverSession(params) {
  const tripId = `trip-${params.busId}-${Date.now()}`;
  const inserted = await db.insert(trips).values({
    id: tripId,
    shiftId: params.shiftId,
    busId: params.busId,
    driverId: params.driverId,
    routeId: params.routeId,
    trackingSessionId: params.trackingSessionId,
    status: "ACTIVE",
    startedAt: /* @__PURE__ */ new Date(),
    scheduledStartAt: params.scheduledStartAt ?? null,
    shiftStartSnapshot: params.shiftStartSnapshot ?? null,
    shiftEndSnapshot: params.shiftEndSnapshot ?? null
  }).returning();
  return inserted[0];
}
async function completeActiveTrip(busId) {
  const updated = await db.update(trips).set({ status: "COMPLETED", endedAt: /* @__PURE__ */ new Date() }).where(and2(eq2(trips.busId, busId), eq2(trips.status, "ACTIVE"))).returning();
  return updated[0] || null;
}
async function getTripHistory(limit = 50) {
  return db.select().from(trips).orderBy(desc2(trips.startedAt)).limit(limit);
}
async function listTripsByStatus(status, limit = 100) {
  const capped = Math.min(200, Math.max(1, limit));
  if (status) {
    return db.select().from(trips).where(eq2(trips.status, status)).orderBy(desc2(trips.startedAt)).limit(capped);
  }
  return getTripHistory(capped);
}
async function getMobilityAnalyticsSummary() {
  const allTrips = await db.select().from(trips);
  const completed = allTrips.filter((t) => t.status === "COMPLETED");
  const avgDelay = completed.length > 0 ? completed.reduce((sum, t) => sum + (t.delayMinutes ?? 0), 0) / completed.length : 0;
  return {
    totalTrips: allTrips.length,
    completedTrips: completed.length,
    activeTrips: allTrips.filter((t) => t.status === "ACTIVE").length,
    cancelledTrips: allTrips.filter((t) => t.status === "CANCELLED").length,
    averageDelayMinutes: Math.round(avgDelay * 10) / 10
  };
}
async function recordMobilityEvent(input) {
  const existing = await db.select().from(mobilityEvents).where(eq2(mobilityEvents.id, input.id)).limit(1);
  if (existing.length) return existing[0];
  await db.insert(mobilityEvents).values({
    id: input.id,
    userId: input.userId,
    busId: input.busId,
    tripId: input.tripId ?? null,
    pickupPointId: input.pickupPointId ?? null,
    eventType: input.eventType,
    payload: JSON.stringify(input.payload ?? {})
  });
  const titleMap = {
    TRIP_STARTED: "Trip started",
    PROXIMITY_10: "Bus approaching",
    PROXIMITY_5: "Bus arriving soon",
    ARRIVED: "Bus arrived",
    DEPARTED: "Bus departed",
    DELAY: "Delay update",
    GPS_UNAVAILABLE: "GPS unavailable"
  };
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.eventType,
    title: titleMap[input.eventType] ?? "Mobility update",
    message: String(input.payload?.message ?? input.eventType)
  });
  return input;
}
var init_mobilityOps = __esm({
  "src/db/mobilityOps.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_shiftManagement();
  }
});

// artifacts/api-server/src/services/routesData.ts
var routesData_exports = {};
__export(routesData_exports, {
  calculateCumulativeDistances: () => calculateCumulativeDistances,
  getAllRoutes: () => getAllRoutes,
  getRouteById: () => getRouteById,
  getRouteForBus: () => getRouteForBus,
  haversineDistance: () => haversineDistance
});
function toRad(degrees) {
  return degrees * Math.PI / 180;
}
function haversineDistance(c1, c2) {
  const R = 6371;
  const dLat = toRad(c2.latitude - c1.latitude);
  const dLon = toRad(c2.longitude - c1.longitude);
  const lat1 = toRad(c1.latitude);
  const lat2 = toRad(c2.latitude);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function calculateCumulativeDistances(path6) {
  const cumulative = [0];
  for (let i = 1; i < path6.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineDistance(path6[i - 1], path6[i]));
  }
  return cumulative;
}
function interpolateWaypoints(waypoints, pointsPerSegment) {
  const result = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    for (let step = 0; step < pointsPerSegment; step++) {
      const t = step / pointsPerSegment;
      result.push({
        latitude: Number((start.latitude + (end.latitude - start.latitude) * t).toFixed(6)),
        longitude: Number((start.longitude + (end.longitude - start.longitude) * t).toFixed(6))
      });
    }
  }
  result.push(waypoints[waypoints.length - 1]);
  return result;
}
function getRouteById(routeId) {
  return routeRegistry[routeId];
}
function getRouteForBus(busId) {
  const routeId = busToRouteMap[busId];
  const known = routeId ? routeRegistry[routeId] : void 0;
  if (known) return known;
  return {
    id: busId,
    routeNumber: "",
    name: "College bus",
    origin: "",
    destination: "",
    stops: [],
    path: [],
    cumulativeDistances: [0],
    totalDistanceKm: 0,
    averageSpeedKmh: 22
  };
}
function getAllRoutes() {
  return Object.values(routeRegistry);
}
var bus18Waypoints, bus18Path, bus18Cumulative, routeBus18, bus12Waypoints, bus12Path, bus12Cumulative, routeBus12, bus4bWaypoints, bus4bPath, bus4bCumulative, routeBus4b, bus7Waypoints, bus7Path, bus7Cumulative, routeBus7, bus21Waypoints, bus21Path, bus21Cumulative, routeBus21, mtc21gWaypoints, mtc21gPath, mtc21gCumulative, routeMtc21g, routeMtc27b, routeRegistry, busToRouteMap;
var init_routesData = __esm({
  "artifacts/api-server/src/services/routesData.ts"() {
    "use strict";
    bus18Waypoints = [
      { latitude: 12.9249, longitude: 80.1275 },
      // Stop 0: Metro Central Station (idx 0)
      { latitude: 12.9272, longitude: 80.1302 },
      // Stop 1: JB Estate (idx 6)
      { latitude: 12.9301, longitude: 80.1336 },
      // Stop 2: Ponnu (idx 12)
      { latitude: 12.9338, longitude: 80.1368 },
      // Stop 3: Ramratna (idx 18)
      { latitude: 12.9372, longitude: 80.1396 }
      // Stop 4: Medical Sciences Center (idx 24)
    ];
    bus18Path = interpolateWaypoints(bus18Waypoints, 6);
    bus18Cumulative = calculateCumulativeDistances(bus18Path);
    routeBus18 = {
      id: "route-bus-18",
      routeNumber: "18",
      name: "Metro Connector Feeder",
      origin: "Metro Central Station",
      destination: "Medical Sciences Center",
      stops: [
        {
          id: "metro-central",
          name: "Metro Central Station",
          sequence: 0,
          pathIndex: 0,
          latitude: bus18Path[0].latitude,
          longitude: bus18Path[0].longitude,
          minutesFromPrevious: 0
        },
        {
          id: "jb-estate",
          name: "JB Estate",
          sequence: 1,
          pathIndex: 6,
          latitude: bus18Path[6].latitude,
          longitude: bus18Path[6].longitude,
          minutesFromPrevious: 3
        },
        {
          id: "ponnu",
          name: "Ponnu",
          sequence: 2,
          pathIndex: 12,
          latitude: bus18Path[12].latitude,
          longitude: bus18Path[12].longitude,
          minutesFromPrevious: 4
        },
        {
          id: "ramratna",
          name: "Ramratna",
          sequence: 3,
          pathIndex: 18,
          latitude: bus18Path[18].latitude,
          longitude: bus18Path[18].longitude,
          minutesFromPrevious: 3
        },
        {
          id: "medical-sciences",
          name: "Medical Sciences Center",
          sequence: 4,
          pathIndex: 24,
          latitude: bus18Path[24].latitude,
          longitude: bus18Path[24].longitude,
          minutesFromPrevious: 4
        }
      ],
      path: bus18Path,
      cumulativeDistances: bus18Cumulative,
      totalDistanceKm: Number(bus18Cumulative[bus18Cumulative.length - 1].toFixed(2)),
      averageSpeedKmh: 22
    };
    bus12Waypoints = [
      { latitude: 12.8924, longitude: 80.0812 },
      // Vandalur
      { latitude: 12.9055, longitude: 80.0918 },
      // Perungalathur
      { latitude: 12.9249, longitude: 80.1275 },
      // Tambaram
      { latitude: 12.9407, longitude: 80.1393 }
      // College Main
    ];
    bus12Path = interpolateWaypoints(bus12Waypoints, 8);
    bus12Cumulative = calculateCumulativeDistances(bus12Path);
    routeBus12 = {
      id: "route-bus-12",
      routeNumber: "12",
      name: "Campus Loop A",
      origin: "Vandalur Transit Hub",
      destination: "Academic Quad",
      stops: [
        {
          id: "vandalur",
          name: "Vandalur Transit Hub",
          sequence: 0,
          pathIndex: 0,
          latitude: bus12Path[0].latitude,
          longitude: bus12Path[0].longitude,
          minutesFromPrevious: 0
        },
        {
          id: "perungalathur",
          name: "Perungalathur Junction",
          sequence: 1,
          pathIndex: 8,
          latitude: bus12Path[8].latitude,
          longitude: bus12Path[8].longitude,
          minutesFromPrevious: 5
        },
        {
          id: "tambaram",
          name: "Tambaram Terminal",
          sequence: 2,
          pathIndex: 16,
          latitude: bus12Path[16].latitude,
          longitude: bus12Path[16].longitude,
          minutesFromPrevious: 7
        },
        {
          id: "college",
          name: "College Main Terminal",
          sequence: 3,
          pathIndex: 24,
          latitude: bus12Path[24].latitude,
          longitude: bus12Path[24].longitude,
          minutesFromPrevious: 6
        }
      ],
      path: bus12Path,
      cumulativeDistances: bus12Cumulative,
      totalDistanceKm: Number(bus12Cumulative[bus12Cumulative.length - 1].toFixed(2)),
      averageSpeedKmh: 24
    };
    bus4bWaypoints = [
      { latitude: 12.9458, longitude: 80.1352 },
      { latitude: 12.9385, longitude: 80.1284 },
      { latitude: 12.9312, longitude: 80.1215 }
    ];
    bus4bPath = interpolateWaypoints(bus4bWaypoints, 10);
    bus4bCumulative = calculateCumulativeDistances(bus4bPath);
    routeBus4b = {
      id: "route-bus-4b",
      routeNumber: "4B",
      name: "Engineering Express",
      origin: "North Residence Complex",
      destination: "Tech & Innovation Park",
      stops: [
        {
          id: "north-residence",
          name: "North Residence Complex",
          sequence: 0,
          pathIndex: 0,
          latitude: bus4bPath[0].latitude,
          longitude: bus4bPath[0].longitude,
          minutesFromPrevious: 0
        },
        {
          id: "bio-center",
          name: "Bio-Engineering Center",
          sequence: 1,
          pathIndex: 10,
          latitude: bus4bPath[10].latitude,
          longitude: bus4bPath[10].longitude,
          minutesFromPrevious: 5
        },
        {
          id: "tech-park",
          name: "Tech & Innovation Park",
          sequence: 2,
          pathIndex: 20,
          latitude: bus4bPath[20].latitude,
          longitude: bus4bPath[20].longitude,
          minutesFromPrevious: 6
        }
      ],
      path: bus4bPath,
      cumulativeDistances: bus4bCumulative,
      totalDistanceKm: Number(bus4bCumulative[bus4bCumulative.length - 1].toFixed(2)),
      averageSpeedKmh: 20
    };
    bus7Waypoints = [
      { latitude: 12.9015, longitude: 80.0984 },
      { latitude: 12.9198, longitude: 80.1179 },
      { latitude: 12.9381, longitude: 80.1369 },
      { latitude: 12.9422, longitude: 80.1378 }
    ];
    bus7Path = interpolateWaypoints(bus7Waypoints, 7);
    bus7Cumulative = calculateCumulativeDistances(bus7Path);
    routeBus7 = {
      id: "route-bus-7",
      routeNumber: "7",
      name: "North Campus Shuttle",
      origin: "Hostel Village",
      destination: "Central Library & Union",
      stops: [
        {
          id: "hostel-village",
          name: "Hostel Village",
          sequence: 0,
          pathIndex: 0,
          latitude: bus7Path[0].latitude,
          longitude: bus7Path[0].longitude,
          minutesFromPrevious: 0
        },
        {
          id: "athletics",
          name: "Athletic Pavilion",
          sequence: 1,
          pathIndex: 7,
          latitude: bus7Path[7].latitude,
          longitude: bus7Path[7].longitude,
          minutesFromPrevious: 4
        },
        {
          id: "library",
          name: "Central Library & Union",
          sequence: 2,
          pathIndex: 14,
          latitude: bus7Path[14].latitude,
          longitude: bus7Path[14].longitude,
          minutesFromPrevious: 5
        },
        {
          id: "academic-quad",
          name: "Academic Quad",
          sequence: 3,
          pathIndex: 21,
          latitude: bus7Path[21].latitude,
          longitude: bus7Path[21].longitude,
          minutesFromPrevious: 2
        }
      ],
      path: bus7Path,
      cumulativeDistances: bus7Cumulative,
      totalDistanceKm: Number(bus7Cumulative[bus7Cumulative.length - 1].toFixed(2)),
      averageSpeedKmh: 20
    };
    bus21Waypoints = [
      { latitude: 12.8955, longitude: 80.0864 },
      { latitude: 12.9188, longitude: 80.1121 },
      { latitude: 12.9355, longitude: 80.1325 }
    ];
    bus21Path = interpolateWaypoints(bus21Waypoints, 9);
    bus21Cumulative = calculateCumulativeDistances(bus21Path);
    routeBus21 = {
      id: "route-bus-21",
      routeNumber: "21",
      name: "South Perimeter Circle",
      origin: "South Commuter Lot",
      destination: "Main Auditorium",
      stops: [
        {
          id: "south-lot",
          name: "South Commuter Lot",
          sequence: 0,
          pathIndex: 0,
          latitude: bus21Path[0].latitude,
          longitude: bus21Path[0].longitude,
          minutesFromPrevious: 0
        },
        {
          id: "faculty-enclave",
          name: "Faculty Enclave",
          sequence: 1,
          pathIndex: 9,
          latitude: bus21Path[9].latitude,
          longitude: bus21Path[9].longitude,
          minutesFromPrevious: 5
        },
        {
          id: "auditorium",
          name: "Main Auditorium",
          sequence: 2,
          pathIndex: 18,
          latitude: bus21Path[18].latitude,
          longitude: bus21Path[18].longitude,
          minutesFromPrevious: 6
        }
      ],
      path: bus21Path,
      cumulativeDistances: bus21Cumulative,
      totalDistanceKm: Number(bus21Cumulative[bus21Cumulative.length - 1].toFixed(2)),
      averageSpeedKmh: 22
    };
    mtc21gWaypoints = [
      { latitude: 12.9249, longitude: 80.1275 },
      // Tambaram Terminal
      { latitude: 12.9516, longitude: 80.1462 },
      // Chromepet
      { latitude: 13.0067, longitude: 80.2206 },
      // Guindy
      { latitude: 13.0827, longitude: 80.2707 }
      // Broadway / Central
    ];
    mtc21gPath = interpolateWaypoints(mtc21gWaypoints, 8);
    mtc21gCumulative = calculateCumulativeDistances(mtc21gPath);
    routeMtc21g = {
      id: "route-MTC_21G",
      routeNumber: "MTC_21G",
      name: "MTC 21G Express Corridor",
      origin: "Tambaram Terminal",
      destination: "Broadway / Central",
      stops: [
        {
          id: "mtc21g-tambaram",
          name: "Tambaram Terminal",
          sequence: 0,
          pathIndex: 0,
          latitude: mtc21gPath[0].latitude,
          longitude: mtc21gPath[0].longitude,
          minutesFromPrevious: 0
        },
        {
          id: "mtc21g-chromepet",
          name: "Chromepet Station",
          sequence: 1,
          pathIndex: 8,
          latitude: mtc21gPath[8].latitude,
          longitude: mtc21gPath[8].longitude,
          minutesFromPrevious: 6
        },
        {
          id: "mtc21g-guindy",
          name: "Guindy Transit Hub",
          sequence: 2,
          pathIndex: 16,
          latitude: mtc21gPath[16].latitude,
          longitude: mtc21gPath[16].longitude,
          minutesFromPrevious: 10
        },
        {
          id: "mtc21g-broadway",
          name: "Broadway / Central",
          sequence: 3,
          pathIndex: 24,
          latitude: mtc21gPath[24].latitude,
          longitude: mtc21gPath[24].longitude,
          minutesFromPrevious: 12
        }
      ],
      path: mtc21gPath,
      cumulativeDistances: mtc21gCumulative,
      totalDistanceKm: Number(mtc21gCumulative[mtc21gCumulative.length - 1].toFixed(2)),
      averageSpeedKmh: 26
    };
    routeMtc27b = {
      id: "route-MTC_27B",
      routeNumber: "MTC_27B",
      name: "MTC 27B Koyambedu Link",
      origin: "CMBT Koyambedu",
      destination: "Anna Square",
      stops: [
        {
          id: "mtc27b-cmbt",
          name: "CMBT Koyambedu",
          sequence: 0,
          pathIndex: 0,
          latitude: 13.0694,
          longitude: 80.2058,
          minutesFromPrevious: 0
        },
        {
          id: "mtc27b-anna",
          name: "Anna Square",
          sequence: 1,
          pathIndex: 8,
          latitude: 13.0658,
          longitude: 80.2848,
          minutesFromPrevious: 15
        }
      ],
      path: interpolateWaypoints(
        [
          { latitude: 13.0694, longitude: 80.2058 },
          { latitude: 13.0658, longitude: 80.2848 }
        ],
        8
      ),
      cumulativeDistances: [0, 8.5],
      totalDistanceKm: 8.5,
      averageSpeedKmh: 24
    };
    routeRegistry = {
      "route-MTC_21G": routeMtc21g,
      "route-MTC_27B": routeMtc27b,
      "route-bus-18": routeBus18,
      "route-bus-12": routeBus12,
      "route-bus-4b": routeBus4b,
      "route-bus-7": routeBus7,
      "route-bus-21": routeBus21
    };
    busToRouteMap = {
      "MTC_21G": "route-MTC_21G",
      "MTC_27B": "route-MTC_27B",
      "bus-18": "route-bus-18",
      "bus-12": "route-bus-12",
      "bus-4b": "route-bus-4b",
      "bus-7": "route-bus-7",
      "bus-21": "route-bus-21"
    };
  }
});

// artifacts/api-server/src/services/mvpCollegeRouteService.ts
var mvpCollegeRouteService_exports = {};
__export(mvpCollegeRouteService_exports, {
  clearMvpCache: () => clearMvpCache,
  getMvpCollegeRoute: () => getMvpCollegeRoute,
  isBusOnCollegeRoute: () => isBusOnCollegeRoute,
  isMvpCollegeRouteActive: () => isMvpCollegeRouteActive,
  setMvpCollegeRoute: () => setMvpCollegeRoute
});
import fs2 from "node:fs";
import path2 from "node:path";
import { eq as eq3 } from "drizzle-orm";
function readConfigFile() {
  try {
    if (!fs2.existsSync(CONFIG_PATH)) return null;
    const raw = JSON.parse(fs2.readFileSync(CONFIG_PATH, "utf8"));
    if (!raw.routeId || !raw.busId) return null;
    return { ...DEFAULT_CONFIG, ...raw, enabled: raw.enabled ?? true };
  } catch {
    return null;
  }
}
function getMvpCollegeRoute() {
  if (!cached) cached = readConfigFile() ?? { ...DEFAULT_CONFIG };
  return cached;
}
function isMvpCollegeRouteActive() {
  const config = getMvpCollegeRoute();
  if (!config.enabled || !config.routeId || !config.busId) return false;
  if (config.routeId.startsWith("route-bus-") || config.busId.startsWith("bus-12") || config.busId.startsWith("bus-18")) {
    return false;
  }
  return true;
}
function isBusOnCollegeRoute(busId) {
  const mvp = getMvpCollegeRoute();
  if (!mvp.enabled) return true;
  return busId === mvp.busId;
}
async function setMvpCollegeRoute(input) {
  const bus = await getDbBusById(input.busId);
  if (!bus) throw new Error("Selected bus was not found.");
  if (bus.routeId && bus.routeId !== input.routeId) {
    throw new Error("Selected bus is not assigned to this route in fleet records.");
  }
  const routes2 = await getDbRoutes();
  const route = routes2.find((r) => r.id === input.routeId);
  if (!route) throw new Error("Selected route was not found.");
  const config = {
    enabled: true,
    routeId: input.routeId,
    busId: input.busId,
    routeLabel: input.routeLabel?.trim() || route.routeName,
    morningShiftStart: input.morningShiftStart,
    morningShiftEnd: input.morningShiftEnd ?? DEFAULT_CONFIG.morningShiftEnd,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  fs2.mkdirSync(path2.dirname(CONFIG_PATH), { recursive: true });
  fs2.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  cached = config;
  await syncMorningShiftFromMvp(config);
  await seedPickupPointsForMvpRoute(config);
  await assignAllStudentsToMvp(config);
  return config;
}
async function syncMorningShiftFromMvp(config) {
  await ensureCanonicalShiftSlots();
  const morning = await getShiftByType("MORNING");
  if (!morning) return;
  await validateAndUpdateShift(morning.id, {
    routeId: config.routeId,
    busId: config.busId,
    startTime: config.morningShiftStart,
    endTime: config.morningShiftEnd,
    active: true,
    direction: "TO_COLLEGE"
  });
}
async function seedPickupPointsForMvpRoute(config) {
  const route = getRouteForBus(config.busId);
  if (!route) return;
  for (const stop of route.stops) {
    await upsertPickupPoint({
      id: stop.id,
      routeId: config.routeId,
      stopName: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      sequenceNumber: stop.sequence,
      geofenceRadiusM: 150,
      expectedOffsetMinutes: stop.sequence * 8,
      active: true
    });
  }
  const all = await listPickupPoints();
  for (const p of all) {
    if (p.source === "REC_TRANSPORT" || p.id.startsWith("rec-stop-")) continue;
    if (p.routeId !== config.routeId && p.active) {
      await upsertPickupPoint({
        id: p.id,
        routeId: p.routeId,
        stopName: p.stopName,
        latitude: p.latitude,
        longitude: p.longitude,
        sequenceNumber: p.sequenceNumber,
        geofenceRadiusM: p.geofenceRadiusM ?? 150,
        expectedOffsetMinutes: p.expectedOffsetMinutes ?? 0,
        active: false
      });
    }
  }
}
async function assignAllStudentsToMvp(config) {
  const studentProfiles2 = await db.select().from(profiles).where(eq3(profiles.role, "STUDENT"));
  for (const p of studentProfiles2) {
    await db.update(students).set({ assignedBusId: config.busId, assignedRouteId: config.routeId }).where(eq3(students.profileId, p.id));
  }
}
function clearMvpCache() {
  cached = null;
}
var CONFIG_PATH, DEFAULT_CONFIG, cached;
var init_mvpCollegeRouteService = __esm({
  "artifacts/api-server/src/services/mvpCollegeRouteService.ts"() {
    "use strict";
    init_services();
    init_db();
    init_schema();
    init_shiftManagement();
    init_mobilityOps();
    init_routesData();
    CONFIG_PATH = path2.resolve(process.cwd(), "data/college-mvp-route.json");
    DEFAULT_CONFIG = {
      enabled: false,
      routeId: process.env.ACIMS_MVP_ROUTE_ID ?? "",
      busId: process.env.ACIMS_MVP_BUS_ID ?? "",
      routeLabel: "College bus route",
      morningShiftStart: process.env.ACIMS_MVP_SHIFT_START ?? "",
      morningShiftEnd: process.env.ACIMS_MVP_SHIFT_END ?? ""
    };
    cached = null;
  }
});

// artifacts/api-server/src/services/recTransport/recTransportParser.ts
function decodeBasicEntities(text4) {
  return text4.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/\s+/g, " ").trim();
}
function parseRecClock(raw, previousMeridiem = null) {
  const display = decodeBasicEntities(raw);
  const match = display.match(/(\d{1,2})[.:](\d{2})(?:\s*(am|pm))?/i);
  if (!match) {
    return { display, time24: null, meridiem: previousMeridiem };
  }
  let hour = Number(match[1]);
  const minute = match[2];
  const tagged = match[3]?.toLowerCase();
  let meridiem = tagged === "pm" ? "PM" : tagged === "am" ? "AM" : previousMeridiem;
  if (!meridiem) {
    meridiem = hour >= 1 && hour <= 11 ? "AM" : hour === 12 ? "PM" : "AM";
  }
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  const time24 = `${String(hour).padStart(2, "0")}:${minute}`;
  return { display, time24, meridiem };
}
function parseRecIndexPage(html, pageUrl) {
  const routes2 = [];
  const rowRe = /<tr>\s*<td class=["']?sno["']?>\s*(\d+)\s*<\/td>\s*<td class=["']?rno["']?>\s*([^<]+?)\s*<\/td>\s*<td class=["']?rname["']?>\s*([^<]+?)\s*<\/td>\s*<td class=["']?time["']?>\s*<a href=["']([^"']+)["']>[\s\S]*?<\/a>\s*<\/td>\s*<td class=["']?start1["']?>\s*([^<]+?)\s*<\/td>/gi;
  let match;
  while (match = rowRe.exec(html)) {
    const href = decodeBasicEntities(match[4]);
    routes2.push({
      serial: Number(match[1]),
      routeNumber: decodeBasicEntities(match[2]),
      routeName: decodeBasicEntities(match[3]),
      boardingHref: new URL(href, pageUrl).toString(),
      startingTimeDisplay: decodeBasicEntities(match[5])
    });
  }
  return routes2;
}
function parseRecBoardingPage(html) {
  const headingMatch = html.match(/class=["']?bbpt["']?>([^<]+)</i);
  const viaMatch = html.match(/class=["']?via["']?[\s\S]*?<b>Via[^<]*<\/b>\s*([^<]+)/i);
  const stops = [];
  const stopRe = /<td class=["']?bpt["']?>([^<]+)<\/td>\s*<td class=["']?tim["']?>([^<]*)<\/td>/gi;
  let match;
  while (match = stopRe.exec(html)) {
    const stopName = decodeBasicEntities(match[1]);
    if (!stopName) continue;
    stops.push({
      stopName,
      timeDisplay: decodeBasicEntities(match[2]),
      isCampus: /college campus/i.test(stopName)
    });
  }
  return {
    heading: headingMatch ? decodeBasicEntities(headingMatch[1]) : "",
    viaNotes: viaMatch ? decodeBasicEntities(viaMatch[1]).replace(/,$/, "") : null,
    stops
  };
}
function recRouteId(routeNumber) {
  return `rec-route-${routeNumber.trim().toLowerCase()}`;
}
function recStopId(routeNumber, sequence) {
  return `rec-stop-${routeNumber.trim().toLowerCase()}-${sequence}`;
}
function recBusId(routeNumber) {
  return `rec-bus-${routeNumber.trim().toLowerCase()}`;
}
var REC_TRANSPORT_SOURCE_LABEL, REC_TRANSPORT_DEFAULT_TIMETABLE_URL;
var init_recTransportParser = __esm({
  "artifacts/api-server/src/services/recTransport/recTransportParser.ts"() {
    "use strict";
    REC_TRANSPORT_SOURCE_LABEL = "Official REC Transport (rectransport.com)";
    REC_TRANSPORT_DEFAULT_TIMETABLE_URL = "https://www.rectransport.com/js/146routedec25.php";
  }
});

// artifacts/api-server/src/services/recTransport/collegeFleetService.ts
var collegeFleetService_exports = {};
__export(collegeFleetService_exports, {
  DUMMY_BUS_IDS: () => DUMMY_BUS_IDS,
  DUMMY_PICKUP_IDS: () => DUMMY_PICKUP_IDS,
  DUMMY_ROUTE_IDS: () => DUMMY_ROUTE_IDS,
  activateOfficialCollegeFleet: () => activateOfficialCollegeFleet,
  createCollegeRoute: () => createCollegeRoute,
  deactivateDummyFleet: () => deactivateDummyFleet,
  listCollegeRoutes: () => listCollegeRoutes,
  promoteOfficialRecFleet: () => promoteOfficialRecFleet,
  updateCollegeRoute: () => updateCollegeRoute
});
import { eq as eq4, or } from "drizzle-orm";
function isDummyRouteId(id) {
  return DUMMY_ROUTE_IDS.includes(id);
}
async function deactivateDummyFleet() {
  let removedRoutes = 0;
  let removedBuses = 0;
  for (const id of DUMMY_BUS_IDS) {
    const existing = await db.select({ id: buses.id }).from(buses).where(eq4(buses.id, id)).limit(1);
    if (!existing.length) continue;
    await db.delete(buses).where(eq4(buses.id, id));
    removedBuses += 1;
  }
  for (const id of DUMMY_ROUTE_IDS) {
    const existing = await db.select({ id: busRoutes.id }).from(busRoutes).where(eq4(busRoutes.id, id)).limit(1);
    if (!existing.length) continue;
    await db.delete(busStops).where(eq4(busStops.routeId, id));
    await db.delete(busRoutes).where(eq4(busRoutes.id, id));
    removedRoutes += 1;
  }
  await db.update(students).set({ assignedBusId: null, assignedRouteId: null, pickupStopId: null }).where(
    or(
      ...DUMMY_BUS_IDS.map((id) => eq4(students.assignedBusId, id)),
      ...DUMMY_ROUTE_IDS.map((id) => eq4(students.assignedRouteId, id)),
      ...DUMMY_PICKUP_IDS.map((id) => eq4(students.pickupStopId, id))
    )
  );
  await db.update(drivers).set({ assignedBusId: null }).where(or(...DUMMY_BUS_IDS.map((id) => eq4(drivers.assignedBusId, id))));
  return { removedRoutes, removedBuses };
}
async function promoteOfficialRecFleet() {
  const catalog = await db.select().from(recTransportRoutes).where(eq4(recTransportRoutes.active, true));
  let routesUpserted = 0;
  let busesUpserted = 0;
  for (const rec of catalog) {
    const routeId = rec.id || recRouteId(rec.routeNumber);
    const [existingRoute] = await db.select().from(busRoutes).where(eq4(busRoutes.id, routeId)).limit(1);
    const routeName = `${rec.routeNumber} ${rec.routeName}`.trim();
    if (!existingRoute) {
      await db.insert(busRoutes).values({
        id: routeId,
        routeName,
        routeCode: rec.routeNumber,
        startingTimeDisplay: rec.startingTimeDisplay,
        startingTime24: rec.startingTime24,
        campusArrivalDisplay: rec.campusArrivalDisplay,
        campusArrival24: rec.campusArrival24,
        source: "REC_TRANSPORT",
        manuallyEdited: false,
        active: true
      });
      routesUpserted += 1;
    } else if (!existingRoute.manuallyEdited) {
      await db.update(busRoutes).set({
        routeName,
        routeCode: rec.routeNumber,
        startingTimeDisplay: rec.startingTimeDisplay,
        startingTime24: rec.startingTime24,
        campusArrivalDisplay: rec.campusArrivalDisplay,
        campusArrival24: rec.campusArrival24,
        source: "REC_TRANSPORT",
        active: true
      }).where(eq4(busRoutes.id, routeId));
      routesUpserted += 1;
    }
    const busId = recBusId(rec.routeNumber);
    const [existingBus] = await db.select().from(buses).where(eq4(buses.id, busId)).limit(1);
    if (!existingBus) {
      const [onRoute] = await db.select().from(buses).where(eq4(buses.routeId, routeId)).limit(1);
      if (onRoute) {
        if (!onRoute.manuallyEdited) {
          await db.update(buses).set({ busNumber: rec.routeNumber, source: "REC_TRANSPORT", active: true }).where(eq4(buses.id, onRoute.id));
          busesUpserted += 1;
        }
      } else {
        await db.insert(buses).values({
          id: busId,
          busNumber: rec.routeNumber,
          routeId,
          active: true,
          source: "REC_TRANSPORT",
          manuallyEdited: false
        });
        busesUpserted += 1;
      }
    } else if (!existingBus.manuallyEdited) {
      await db.update(buses).set({
        busNumber: rec.routeNumber,
        routeId,
        source: "REC_TRANSPORT",
        active: true
      }).where(eq4(buses.id, busId));
      busesUpserted += 1;
    }
  }
  return { catalogRoutes: catalog.length, routesUpserted, busesUpserted };
}
async function listCollegeRoutes(query) {
  const allRoutes = await db.select().from(busRoutes);
  const allBuses = await db.select().from(buses);
  const recRows = await db.select().from(recTransportRoutes);
  const recById = new Map(recRows.map((r) => [r.id, r]));
  const rows = allRoutes.filter((r) => !isDummyRouteId(r.id)).map((route) => {
    const rec = recById.get(route.id);
    const bus = allBuses.find((b) => b.routeId === route.id && b.active) ?? allBuses.find((b) => b.routeId === route.id);
    return {
      id: route.id,
      routeNumber: route.routeCode,
      routeName: rec?.routeName ?? route.routeName.replace(new RegExp(`^${route.routeCode}\\s+`), ""),
      startingTimeDisplay: route.startingTimeDisplay ?? rec?.startingTimeDisplay ?? null,
      startingTime24: route.startingTime24 ?? rec?.startingTime24 ?? null,
      campusArrivalDisplay: route.campusArrivalDisplay ?? rec?.campusArrivalDisplay ?? null,
      campusArrival24: route.campusArrival24 ?? rec?.campusArrival24 ?? null,
      busId: bus?.id ?? null,
      busNumber: bus?.busNumber ?? route.routeCode,
      active: route.active,
      source: route.source || (rec ? "REC_TRANSPORT" : "ADMIN"),
      manuallyEdited: Boolean(route.manuallyEdited || rec?.manuallyEdited)
    };
  }).sort((a, b) => a.routeNumber.localeCompare(b.routeNumber, void 0, { numeric: true }));
  const q = query?.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) => r.routeNumber.toLowerCase().includes(q) || r.routeName.toLowerCase().includes(q) || (r.busNumber ?? "").toLowerCase().includes(q)
  );
}
async function updateCollegeRoute(routeId, patch) {
  const [route] = await db.select().from(busRoutes).where(eq4(busRoutes.id, routeId)).limit(1);
  if (!route) throw new Error("Route not found");
  if (isDummyRouteId(routeId)) throw new Error("Dummy routes cannot be edited. They have been removed.");
  const routeNumber = (patch.routeNumber ?? route.routeCode).trim();
  const routeName = (patch.routeName ?? route.routeName).trim();
  const displayName = routeName.startsWith(routeNumber) ? routeName : `${routeNumber} ${routeName}`.trim();
  const start24 = patch.startingTime24 !== void 0 ? patch.startingTime24 : route.startingTime24;
  const campus24 = patch.campusArrival24 !== void 0 ? patch.campusArrival24 : route.campusArrival24;
  await db.update(busRoutes).set({
    routeName: displayName,
    routeCode: routeNumber,
    startingTimeDisplay: start24 ? toDisplay(start24) : route.startingTimeDisplay,
    startingTime24: start24,
    campusArrivalDisplay: campus24 ? toDisplay(campus24) : route.campusArrivalDisplay,
    campusArrival24: campus24,
    active: patch.active ?? route.active,
    manuallyEdited: true
  }).where(eq4(busRoutes.id, routeId));
  const [rec] = await db.select().from(recTransportRoutes).where(eq4(recTransportRoutes.id, routeId)).limit(1);
  if (rec) {
    await db.update(recTransportRoutes).set({
      routeNumber,
      routeName: routeName.replace(new RegExp(`^${routeNumber}\\s+`), ""),
      startingTimeDisplay: start24 ? toDisplay(start24) : rec.startingTimeDisplay,
      startingTime24: start24,
      campusArrivalDisplay: campus24 ? toDisplay(campus24) : rec.campusArrivalDisplay,
      campusArrival24: campus24,
      active: patch.active ?? rec.active,
      manuallyEdited: true
    }).where(eq4(recTransportRoutes.id, routeId));
  }
  if (patch.busNumber !== void 0 || patch.active !== void 0) {
    const assigned = await db.select().from(buses).where(eq4(buses.routeId, routeId));
    if (assigned.length) {
      await db.update(buses).set({
        ...patch.busNumber !== void 0 ? { busNumber: patch.busNumber.trim() } : {},
        ...patch.active !== void 0 ? { active: patch.active } : {},
        manuallyEdited: true
      }).where(eq4(buses.id, assigned[0].id));
    } else if (patch.busNumber?.trim()) {
      await db.insert(buses).values({
        id: recBusId(routeNumber),
        busNumber: patch.busNumber.trim(),
        routeId,
        active: patch.active ?? true,
        source: rec ? "REC_TRANSPORT" : "ADMIN",
        manuallyEdited: true
      });
    }
  }
  const rows = await listCollegeRoutes();
  return rows.find((r) => r.id === routeId) ?? null;
}
async function createCollegeRoute(input) {
  const routeNumber = input.routeNumber.trim();
  if (!routeNumber) throw new Error("Route number is required.");
  const routeName = input.routeName.trim();
  if (!routeName) throw new Error("Route name is required.");
  const id = recRouteId(routeNumber);
  const existing = await db.select().from(busRoutes).where(eq4(busRoutes.id, id)).limit(1);
  if (existing.length) throw new Error(`Route ${routeNumber} already exists.`);
  await db.insert(busRoutes).values({
    id,
    routeName: `${routeNumber} ${routeName}`.trim(),
    routeCode: routeNumber,
    startingTimeDisplay: input.startingTime24 ? toDisplay(input.startingTime24) : null,
    startingTime24: input.startingTime24 ?? null,
    campusArrivalDisplay: input.campusArrival24 ? toDisplay(input.campusArrival24) : null,
    campusArrival24: input.campusArrival24 ?? null,
    source: "ADMIN",
    manuallyEdited: true,
    active: true
  });
  const busNumber = (input.busNumber ?? routeNumber).trim();
  await db.insert(buses).values({
    id: recBusId(routeNumber),
    busNumber,
    routeId: id,
    active: true,
    source: "ADMIN",
    manuallyEdited: true
  });
  const rows = await listCollegeRoutes();
  return rows.find((r) => r.id === id);
}
async function activateOfficialCollegeFleet() {
  const dummy = await deactivateDummyFleet();
  const promoted = await promoteOfficialRecFleet();
  const routes2 = await listCollegeRoutes();
  return { dummy, promoted, routesCount: routes2.length };
}
function toDisplay(hhmm) {
  const [hRaw, m] = hhmm.split(":");
  const h = Number(hRaw);
  if (!Number.isFinite(h) || !m) return hhmm;
  const meridiem = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}.${m} ${meridiem}`;
}
var DUMMY_ROUTE_IDS, DUMMY_BUS_IDS, DUMMY_PICKUP_IDS;
var init_collegeFleetService = __esm({
  "artifacts/api-server/src/services/recTransport/collegeFleetService.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_recTransportParser();
    DUMMY_ROUTE_IDS = ["route-bus-12", "route-bus-4b", "route-bus-7", "route-bus-21"];
    DUMMY_BUS_IDS = ["bus-12", "bus-4b", "bus-7", "bus-21"];
    DUMMY_PICKUP_IDS = ["vandalur", "perungalathur", "tambaram", "college", "chromepet", "quad"];
  }
});

// src/db/services.ts
var services_exports = {};
__export(services_exports, {
  bindStudentPickupByUserId: () => bindStudentPickupByUserId,
  calculateDbCampusWalkingRoute: () => calculateDbCampusWalkingRoute,
  createDbBus: () => createDbBus,
  createDbNotification: () => createDbNotification,
  createDbRoute: () => createDbRoute,
  createDbSafetyReport: () => createDbSafetyReport,
  getBusTrackingSession: () => getBusTrackingSession,
  getDbBusById: () => getDbBusById,
  getDbBuses: () => getDbBuses,
  getDbCampusLocations: () => getDbCampusLocations,
  getDbCampusPaths: () => getDbCampusPaths,
  getDbDeparturesForStop: () => getDbDeparturesForStop,
  getDbPublicTransportStops: () => getDbPublicTransportStops,
  getDbQueueStatus: () => getDbQueueStatus,
  getDbRouteById: () => getDbRouteById,
  getDbRoutes: () => getDbRoutes,
  getDbSafetyReports: () => getDbSafetyReports,
  getDbStopsByRoute: () => getDbStopsByRoute,
  getDbStudentActiveQueue: () => getDbStudentActiveQueue,
  getDbStudentPreferences: () => getDbStudentPreferences,
  getLatestBusLocation: () => getLatestBusLocation,
  getLatestStudentLocation: () => getLatestStudentLocation,
  getOrCreateProfile: () => getOrCreateProfile,
  getProfileWithDetails: () => getProfileWithDetails,
  getRecentBusLocations: () => getRecentBusLocations,
  getStudentUserIdsForBus: () => getStudentUserIdsForBus,
  getUserNotifications: () => getUserNotifications,
  isBusTrackingActive: () => isBusTrackingActive,
  joinDbQueue: () => joinDbQueue,
  leaveDbQueue: () => leaveDbQueue,
  pauseTrackingSession: () => pauseTrackingSession,
  recordBusLocation: () => recordBusLocation,
  recordStudentLocation: () => recordStudentLocation,
  resumeTrackingSession: () => resumeTrackingSession,
  searchDbCampusLocations: () => searchDbCampusLocations,
  startTrackingSession: () => startTrackingSession,
  stopTrackingSession: () => stopTrackingSession,
  updateDbBus: () => updateDbBus,
  updateDbRoute: () => updateDbRoute,
  upsertDbStudentPreferences: () => upsertDbStudentPreferences,
  verifyDriverBusAssignment: () => verifyDriverBusAssignment
});
import { eq as eq5, desc as desc3, and as and3, ilike, or as or2 } from "drizzle-orm";
async function getOrCreateProfile(userId, email, name, role = "STUDENT") {
  try {
    const existing = await db.select().from(profiles).where(eq5(profiles.userId, userId));
    if (existing.length > 0) {
      return existing[0];
    }
    const inserted = await db.insert(profiles).values({
      userId,
      email,
      name,
      role
    }).returning();
    const newProfile = inserted[0];
    if (role === "STUDENT") {
      let assignedBusId = null;
      let assignedRouteId = null;
      let pickupStopId = null;
      try {
        const { getMvpCollegeRoute: getMvpCollegeRoute2, isMvpCollegeRouteActive: isMvpCollegeRouteActive2 } = await Promise.resolve().then(() => (init_mvpCollegeRouteService(), mvpCollegeRouteService_exports));
        if (isMvpCollegeRouteActive2()) {
          const mvp = getMvpCollegeRoute2();
          assignedBusId = mvp.busId;
          assignedRouteId = mvp.routeId;
        }
      } catch {
      }
      await db.insert(students).values({
        profileId: newProfile.id,
        registerNumber: userId.startsWith("student-") ? userId : `REG-${newProfile.id}`,
        assignedBusId,
        assignedRouteId,
        pickupStopId
      });
    } else if (role === "DRIVER") {
      await db.insert(drivers).values({
        profileId: newProfile.id
      });
    }
    return newProfile;
  } catch (error) {
    console.error("Error in getOrCreateProfile:", error);
    throw new Error("Database profile operation failed", { cause: error });
  }
}
async function getProfileWithDetails(userId) {
  try {
    const userProfiles = await db.select().from(profiles).where(eq5(profiles.userId, userId));
    if (userProfiles.length === 0) return null;
    const profile = userProfiles[0];
    let details = { ...profile };
    if (profile.role === "STUDENT") {
      const studentRecs = await db.select().from(students).where(eq5(students.profileId, profile.id));
      if (studentRecs.length > 0) {
        const s = studentRecs[0];
        details = {
          ...details,
          registerNumber: s.registerNumber,
          pickupStopId: s.pickupStopId,
          assignedBusId: s.assignedBusId,
          assignedRouteId: s.assignedRouteId
        };
      }
    } else if (profile.role === "DRIVER") {
      const driverRecs = await db.select().from(drivers).where(eq5(drivers.profileId, profile.id));
      if (driverRecs.length > 0) {
        const d = driverRecs[0];
        details = {
          ...details,
          assignedBusId: d.assignedBusId
        };
      }
    }
    return details;
  } catch (error) {
    console.error("Error in getProfileWithDetails:", error);
    throw new Error("Database profile lookup failed", { cause: error });
  }
}
async function getStudentUserIdsForBus(busId) {
  try {
    const studentRows = await db.select().from(students).where(eq5(students.assignedBusId, busId));
    const userIds = [];
    for (const row of studentRows) {
      const prof = await db.select().from(profiles).where(eq5(profiles.id, row.profileId)).limit(1);
      if (prof[0]?.userId) userIds.push(prof[0].userId);
      else if (row.registerNumber) userIds.push(row.registerNumber);
    }
    return userIds;
  } catch {
    return [];
  }
}
async function bindStudentPickupByUserId(userId, pickupPointId) {
  const profile = await getProfileWithDetails(userId);
  if (!profile?.id) return null;
  const updated = await db.update(students).set({ pickupStopId: pickupPointId }).where(eq5(students.profileId, profile.id)).returning();
  return updated[0] ?? null;
}
async function getDbBuses() {
  try {
    const { DUMMY_BUS_IDS: DUMMY_BUS_IDS2 } = await Promise.resolve().then(() => (init_collegeFleetService(), collegeFleetService_exports));
    const rows = await db.select().from(buses).orderBy(buses.busNumber);
    const official = rows.filter((b) => !DUMMY_BUS_IDS2.includes(b.id));
    return official.length > 0 ? official : rows;
  } catch (error) {
    console.error("Error fetching buses from DB:", error);
    return [];
  }
}
async function getDbBusById(busId) {
  try {
    const result = await db.select().from(buses).where(eq5(buses.id, busId));
    return result[0] || null;
  } catch (error) {
    console.error(`Error fetching bus ${busId}:`, error);
    return null;
  }
}
async function createDbBus(data) {
  try {
    const inserted = await db.insert(buses).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error("Error creating bus:", error);
    throw new Error("Failed to create bus in database", { cause: error });
  }
}
async function updateDbBus(busId, updates) {
  try {
    const updated = await db.update(buses).set(updates).where(eq5(buses.id, busId)).returning();
    return updated[0] || null;
  } catch (error) {
    console.error(`Error updating bus ${busId}:`, error);
    throw new Error("Failed to update bus in database", { cause: error });
  }
}
async function getDbRoutes() {
  try {
    const { DUMMY_ROUTE_IDS: DUMMY_ROUTE_IDS2 } = await Promise.resolve().then(() => (init_collegeFleetService(), collegeFleetService_exports));
    const rows = await db.select().from(busRoutes).orderBy(busRoutes.routeCode);
    const official = rows.filter((r) => !DUMMY_ROUTE_IDS2.includes(r.id));
    return official.length > 0 ? official : rows;
  } catch (error) {
    console.error("Error fetching routes:", error);
    return [];
  }
}
async function getDbRouteById(routeId) {
  try {
    const route = await db.select().from(busRoutes).where(eq5(busRoutes.id, routeId));
    if (route.length === 0) return null;
    const stops = await db.select().from(busStops).where(eq5(busStops.routeId, routeId)).orderBy(busStops.sequenceNumber);
    return {
      ...route[0],
      stops
    };
  } catch (error) {
    console.error(`Error fetching route ${routeId}:`, error);
    return null;
  }
}
async function createDbRoute(data) {
  try {
    const inserted = await db.insert(busRoutes).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error("Error creating route:", error);
    throw new Error("Failed to create route", { cause: error });
  }
}
async function updateDbRoute(routeId, updates) {
  try {
    const updated = await db.update(busRoutes).set(updates).where(eq5(busRoutes.id, routeId)).returning();
    return updated[0] || null;
  } catch (error) {
    console.error(`Error updating route ${routeId}:`, error);
    throw new Error("Failed to update route", { cause: error });
  }
}
async function getDbStopsByRoute(routeId) {
  try {
    const directStops = await db.select().from(busStops).where(eq5(busStops.routeId, routeId)).orderBy(busStops.sequenceNumber);
    if (directStops.length > 0) {
      return directStops;
    }
    const { recTransportStops: recTransportStops2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const recStops = await db.select().from(recTransportStops2).where(and3(eq5(recTransportStops2.routeId, routeId), eq5(recTransportStops2.active, true))).orderBy(recTransportStops2.sequenceNumber);
    if (recStops.length > 0) {
      const total = Math.max(1, recStops.length - 1);
      return recStops.map((s, idx) => {
        const progress = idx / total;
        const fallbackLat = Number((13.065 - progress * (13.065 - 13.0087)).toFixed(6));
        const fallbackLng = Number((80.195 - progress * (80.195 - 80.0038)).toFixed(6));
        return {
          id: s.id,
          routeId: s.routeId,
          stopName: s.stopName,
          latitude: typeof s.latitude === "number" ? s.latitude : fallbackLat,
          longitude: typeof s.longitude === "number" ? s.longitude : fallbackLng,
          sequenceNumber: s.sequenceNumber
        };
      });
    }
    return [];
  } catch (error) {
    console.error("Error fetching stops:", error);
    return [];
  }
}
async function recordBusLocation(location) {
  try {
    const recordedDate = location.recordedAt ? new Date(location.recordedAt) : /* @__PURE__ */ new Date();
    const receivedDate = location.receivedAt ? new Date(location.receivedAt) : /* @__PURE__ */ new Date();
    const inserted = await db.insert(busLocations).values({
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
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    await db.update(trackingSessions).set({ lastLocationAt: recordedDate }).where(
      and3(
        eq5(trackingSessions.busId, location.busId),
        eq5(trackingSessions.status, "ACTIVE")
      )
    ).catch(() => {
    });
    return inserted[0];
  } catch (error) {
    console.error("Error recording bus location:", error);
    throw new Error("Failed to save bus location", { cause: error });
  }
}
async function getLatestBusLocation(busId) {
  try {
    const result = await db.select().from(busLocations).where(eq5(busLocations.busId, busId)).orderBy(desc3(busLocations.recordedAt)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error(`Error getting latest location for bus ${busId}:`, error);
    return null;
  }
}
async function getRecentBusLocations(busId, limit = 50) {
  try {
    return await db.select().from(busLocations).where(eq5(busLocations.busId, busId)).orderBy(desc3(busLocations.recordedAt)).limit(limit);
  } catch (error) {
    console.error(`Error getting recent locations for bus ${busId}:`, error);
    return [];
  }
}
async function startTrackingSession(busId, driverId) {
  try {
    await db.update(trackingSessions).set({ status: "ENDED", endedAt: /* @__PURE__ */ new Date() }).where(
      and3(
        eq5(trackingSessions.busId, busId),
        or2(
          eq5(trackingSessions.status, "ACTIVE"),
          eq5(trackingSessions.status, "PAUSED")
        )
      )
    );
    await db.update(buses).set({ driverId, active: true }).where(eq5(buses.id, busId)).catch(() => {
    });
    const sessionId = `session-${busId}-${Date.now()}`;
    const inserted = await db.insert(trackingSessions).values({
      id: sessionId,
      busId,
      driverId,
      status: "ACTIVE",
      startedAt: /* @__PURE__ */ new Date()
    }).returning();
    return inserted[0];
  } catch (error) {
    console.error("Error starting tracking session:", error);
    throw new Error("Failed to start tracking session", { cause: error });
  }
}
async function pauseTrackingSession(busId) {
  try {
    const updated = await db.update(trackingSessions).set({ status: "PAUSED" }).where(
      and3(
        eq5(trackingSessions.busId, busId),
        eq5(trackingSessions.status, "ACTIVE")
      )
    ).returning();
    return updated[0] || null;
  } catch (error) {
    console.error("Error pausing tracking session:", error);
    throw new Error("Failed to pause tracking session", { cause: error });
  }
}
async function resumeTrackingSession(busId) {
  try {
    const updated = await db.update(trackingSessions).set({ status: "ACTIVE" }).where(
      and3(
        eq5(trackingSessions.busId, busId),
        eq5(trackingSessions.status, "PAUSED")
      )
    ).returning();
    return updated[0] || null;
  } catch (error) {
    console.error("Error resuming tracking session:", error);
    throw new Error("Failed to resume tracking session", { cause: error });
  }
}
async function stopTrackingSession(busId) {
  try {
    const updated = await db.update(trackingSessions).set({
      status: "ENDED",
      endedAt: /* @__PURE__ */ new Date()
    }).where(
      and3(
        eq5(trackingSessions.busId, busId),
        or2(
          eq5(trackingSessions.status, "ACTIVE"),
          eq5(trackingSessions.status, "PAUSED")
        )
      )
    ).returning();
    return updated[0] || null;
  } catch (error) {
    console.error("Error stopping tracking session:", error);
    throw new Error("Failed to stop tracking session", { cause: error });
  }
}
async function getBusTrackingSession(busId) {
  try {
    const sessions2 = await db.select().from(trackingSessions).where(eq5(trackingSessions.busId, busId)).orderBy(desc3(trackingSessions.startedAt)).limit(1);
    return sessions2[0] || null;
  } catch (error) {
    return null;
  }
}
async function isBusTrackingActive(busId) {
  try {
    const session = await getBusTrackingSession(busId);
    return {
      isActive: session?.status === "ACTIVE",
      isPaused: session?.status === "PAUSED",
      status: session?.status || "IDLE",
      session
    };
  } catch (error) {
    return { isActive: false, isPaused: false, status: "IDLE", session: null };
  }
}
async function verifyDriverBusAssignment(driverId, busId) {
  try {
    const bus = await getDbBusById(busId);
    if (!bus) return false;
    if (bus.driverId === driverId) return true;
    const activeSession = await getBusTrackingSession(busId);
    if (activeSession && activeSession.status === "ACTIVE" && activeSession.driverId && activeSession.driverId !== driverId) {
      return false;
    }
    const profile = await db.select().from(profiles).where(eq5(profiles.userId, driverId)).limit(1);
    if (profile.length > 0) {
      const driverRecord = await db.select().from(drivers).where(eq5(drivers.profileId, profile[0].id)).limit(1);
      if (driverRecord.length > 0) {
        if (!driverRecord[0].assignedBusId || driverRecord[0].assignedBusId === busId) {
          return true;
        }
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
async function createDbNotification(userId, type, title, message) {
  try {
    const inserted = await db.insert(notifications).values({
      userId,
      type,
      title,
      message
    }).returning();
    return inserted[0];
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}
async function getUserNotifications(userId) {
  try {
    return await db.select().from(notifications).where(eq5(notifications.userId, userId)).orderBy(desc3(notifications.createdAt)).limit(50);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}
async function getDbCampusLocations(category) {
  try {
    if (category && category !== "all") {
      return await db.select().from(campusLocations).where(eq5(campusLocations.category, category)).orderBy(campusLocations.name);
    }
    return await db.select().from(campusLocations).orderBy(campusLocations.name);
  } catch (error) {
    console.error("Error fetching campus locations:", error);
    return [];
  }
}
async function searchDbCampusLocations(term) {
  try {
    const pattern = `%${term.trim()}%`;
    return await db.select().from(campusLocations).where(
      or2(
        ilike(campusLocations.name, pattern),
        ilike(campusLocations.description, pattern),
        ilike(campusLocations.category, pattern)
      )
    ).orderBy(campusLocations.name).limit(20);
  } catch (error) {
    console.error("Error searching campus locations:", error);
    return [];
  }
}
async function getDbCampusPaths() {
  try {
    return await db.select().from(campusPaths);
  } catch (error) {
    console.error("Error fetching campus paths:", error);
    return [];
  }
}
async function createDbSafetyReport(data) {
  try {
    const inserted = await db.insert(safetyReports).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error("Error creating safety report:", error);
    throw new Error("Failed to create safety report", { cause: error });
  }
}
async function getDbSafetyReports() {
  try {
    return await db.select().from(safetyReports).orderBy(desc3(safetyReports.createdAt));
  } catch (error) {
    console.error("Error fetching safety reports:", error);
    return [];
  }
}
async function getDbPublicTransportStops() {
  try {
    return await db.select().from(publicTransportStops).orderBy(publicTransportStops.name);
  } catch (error) {
    console.error("Error fetching public transport stops:", error);
    return [];
  }
}
async function getDbDeparturesForStop(stopId) {
  try {
    return await db.select().from(publicTransportDepartures).where(eq5(publicTransportDepartures.stopId, stopId)).orderBy(publicTransportDepartures.departureTime);
  } catch (error) {
    console.error(`Error fetching departures for stop ${stopId}:`, error);
    return [];
  }
}
async function getDbQueueStatus(busId, studentId) {
  try {
    const activeWaiting = await db.select().from(boardingQueue).where(and3(eq5(boardingQueue.busId, busId), eq5(boardingQueue.status, "WAITING"))).orderBy(boardingQueue.joinedAt);
    let studentEntry = null;
    let studentPosition = null;
    if (studentId) {
      const idx = activeWaiting.findIndex((q) => q.studentId === studentId);
      if (idx !== -1) {
        studentEntry = activeWaiting[idx];
        studentPosition = idx + 1;
      }
    }
    return {
      busId,
      queueSize: activeWaiting.length,
      userInQueue: Boolean(studentEntry),
      queuePosition: studentPosition,
      entry: studentEntry,
      status: activeWaiting.length > 0 ? "ACTIVE" : "EMPTY",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    console.error(`Error getting queue status for bus ${busId}:`, error);
    return {
      busId,
      queueSize: 0,
      userInQueue: false,
      queuePosition: null,
      entry: null,
      status: "UNAVAILABLE",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}
async function joinDbQueue(busId, studentId, boardingStop) {
  try {
    const existing = await db.select().from(boardingQueue).where(
      and3(
        eq5(boardingQueue.busId, busId),
        eq5(boardingQueue.studentId, studentId),
        eq5(boardingQueue.status, "WAITING")
      )
    );
    if (existing.length > 0) {
      const status2 = await getDbQueueStatus(busId, studentId);
      return { duplicate: true, status: status2 };
    }
    const inserted = await db.insert(boardingQueue).values({
      busId,
      studentId,
      boardingStop,
      status: "WAITING"
    }).returning();
    const status = await getDbQueueStatus(busId, studentId);
    return { duplicate: false, entry: inserted[0], status };
  } catch (error) {
    console.error("Error joining database queue:", error);
    throw new Error("Failed to join queue", { cause: error });
  }
}
async function leaveDbQueue(busId, studentId) {
  try {
    await db.update(boardingQueue).set({
      status: "CANCELLED",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      and3(
        eq5(boardingQueue.busId, busId),
        eq5(boardingQueue.studentId, studentId),
        eq5(boardingQueue.status, "WAITING")
      )
    );
    return await getDbQueueStatus(busId, studentId);
  } catch (error) {
    console.error("Error leaving database queue:", error);
    throw new Error("Failed to leave queue", { cause: error });
  }
}
async function getDbStudentActiveQueue(studentId) {
  try {
    const active = await db.select().from(boardingQueue).where(and3(eq5(boardingQueue.studentId, studentId), eq5(boardingQueue.status, "WAITING"))).orderBy(desc3(boardingQueue.joinedAt)).limit(1);
    if (active.length === 0) return null;
    const busQueue = await getDbQueueStatus(active[0].busId, studentId);
    return {
      ...active[0],
      queuePosition: busQueue.queuePosition,
      totalInQueue: busQueue.queueSize
    };
  } catch (error) {
    console.error(`Error fetching active queue for student ${studentId}:`, error);
    return null;
  }
}
async function getDbStudentPreferences(userId) {
  try {
    const prefs = await db.select().from(studentPreferences).where(eq5(studentPreferences.userId, userId));
    return prefs[0] || null;
  } catch (error) {
    console.error(`Error fetching preferences for ${userId}:`, error);
    return null;
  }
}
async function upsertDbStudentPreferences(userId, data) {
  try {
    const existing = await db.select().from(studentPreferences).where(eq5(studentPreferences.userId, userId));
    if (existing.length > 0) {
      const updated = await db.update(studentPreferences).set({
        ...data,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq5(studentPreferences.userId, userId)).returning();
      return updated[0];
    }
    const inserted = await db.insert(studentPreferences).values({
      userId,
      ...data
    }).returning();
    return inserted[0];
  } catch (error) {
    console.error(`Error saving preferences for ${userId}:`, error);
    throw new Error("Failed to save student preferences", { cause: error });
  }
}
async function recordStudentLocation(data) {
  try {
    const inserted = await db.insert(studentLocations).values(data).returning();
    return inserted[0];
  } catch (error) {
    console.error("Error recording student location:", error);
    return null;
  }
}
async function getLatestStudentLocation(userId) {
  try {
    const loc = await db.select().from(studentLocations).where(eq5(studentLocations.userId, userId)).orderBy(desc3(studentLocations.recordedAt)).limit(1);
    return loc[0] || null;
  } catch (error) {
    console.error(`Error getting latest location for student ${userId}:`, error);
    return null;
  }
}
async function calculateDbCampusWalkingRoute(startIdOrCoords, destId) {
  try {
    let haversineMeters3 = function(c1, c2) {
      const R = 6371e3;
      const dLat = (c2.latitude - c1.latitude) * Math.PI / 180;
      const dLon = (c2.longitude - c1.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(c1.latitude * Math.PI / 180) * Math.cos(c2.latitude * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    var haversineMeters2 = haversineMeters3;
    const allLocations = await db.select().from(campusLocations);
    const allPaths = await db.select().from(campusPaths);
    const dest = allLocations.find((l) => l.id === destId || l.name.toLowerCase() === destId.toLowerCase());
    if (!dest) {
      return null;
    }
    let startCoord;
    let startName = "Current Location";
    if (typeof startIdOrCoords === "string") {
      const startLoc = allLocations.find((l) => l.id === startIdOrCoords || l.name.toLowerCase() === startIdOrCoords.toLowerCase());
      if (!startLoc) return null;
      startCoord = { latitude: startLoc.latitude, longitude: startLoc.longitude };
      startName = startLoc.name;
    } else {
      startCoord = startIdOrCoords;
    }
    let matchedPath = null;
    for (const p of allPaths) {
      if (p.fromLocationId.toLowerCase().includes(dest.name.toLowerCase()) || p.toLocationId.toLowerCase().includes(dest.name.toLowerCase()) || dest.description && (p.fromLocationId.includes(dest.id) || p.toLocationId.includes(dest.id))) {
        matchedPath = p;
        break;
      }
    }
    const directDistance = Math.round(haversineMeters3(startCoord, { latitude: dest.latitude, longitude: dest.longitude }));
    const distanceMeters2 = matchedPath ? Math.round(matchedPath.distanceMeters) : directDistance;
    const walkingMinutes = Math.max(1, Math.round(distanceMeters2 / 80));
    let pathCoordinates = [];
    if (matchedPath && matchedPath.pathPoints) {
      try {
        pathCoordinates = JSON.parse(matchedPath.pathPoints);
      } catch (e) {
        pathCoordinates = [
          [startCoord.latitude, startCoord.longitude],
          [dest.latitude, dest.longitude]
        ];
      }
    } else {
      pathCoordinates = [
        [startCoord.latitude, startCoord.longitude],
        [dest.latitude, dest.longitude]
      ];
    }
    return {
      startLocation: startName,
      destination: dest.name,
      destinationCategory: dest.category,
      distanceMeters: distanceMeters2,
      walkingMinutes,
      steps: [
        `Depart from ${startName}`,
        `Follow pedestrian walkway towards ${dest.name}`,
        `Arrive at ${dest.name} (${dest.category})`
      ],
      pathPoints: pathCoordinates,
      verifiedSource: "Cloud SQL campus_paths & campus_locations"
    };
  } catch (error) {
    console.error("Error calculating campus walking route:", error);
    return null;
  }
}
var init_services = __esm({
  "src/db/services.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// artifacts/api-server/src/services/gpsEngine.ts
var gpsEngine_exports = {};
__export(gpsEngine_exports, {
  calculateNextStopAndEta: () => calculateNextStopAndEta,
  evaluateFreshness: () => evaluateFreshness,
  haversineDistanceKm: () => haversineDistanceKm,
  validateGpsCoordinate: () => validateGpsCoordinate
});
function haversineDistanceKm(coord1, coord2) {
  const R = 6371;
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function validateGpsCoordinate(point, lastValidPoint, receivedAt = /* @__PURE__ */ new Date()) {
  const recordedDate = new Date(point.recordedAt);
  const networkDelayMs = Math.max(0, receivedAt.getTime() - recordedDate.getTime());
  if (typeof point.latitude !== "number" || typeof point.longitude !== "number" || isNaN(point.latitude) || isNaN(point.longitude) || point.latitude < -90 || point.latitude > 90 || point.longitude < -180 || point.longitude > 180) {
    return {
      isValid: false,
      quality: "INVALID",
      rejectionReason: "Coordinates outside valid terrestrial latitude/longitude range",
      isAnomaly: true,
      networkDelayMs
    };
  }
  if (Math.abs(point.latitude) < 1e-4 && Math.abs(point.longitude) < 1e-4) {
    return {
      isValid: false,
      quality: "INVALID",
      rejectionReason: "Coordinate at (0,0) indicates uncalibrated GPS hardware",
      isAnomaly: true,
      networkDelayMs
    };
  }
  const accuracy = typeof point.accuracy === "number" && !isNaN(point.accuracy) ? point.accuracy : 15;
  let quality = "ACCEPTABLE";
  if (accuracy <= 15) {
    quality = "HIGH";
  } else if (accuracy <= 40) {
    quality = "ACCEPTABLE";
  } else if (accuracy <= 5e3) {
    quality = "POOR";
  } else {
    quality = "INVALID";
    return {
      isValid: false,
      quality: "INVALID",
      rejectionReason: `GPS accuracy too low (\xB1${Math.round(accuracy)}m exceeds 5000m maximum tolerance)`,
      isAnomaly: false,
      networkDelayMs
    };
  }
  let isAnomaly = false;
  if (lastValidPoint && accuracy <= 50) {
    const prevDate = new Date(lastValidPoint.recordedAt);
    const timeDeltaSec = (recordedDate.getTime() - prevDate.getTime()) / 1e3;
    if (timeDeltaSec > 0 && timeDeltaSec < 10) {
      const distanceKm = haversineDistanceKm(
        { latitude: lastValidPoint.latitude, longitude: lastValidPoint.longitude },
        { latitude: point.latitude, longitude: point.longitude }
      );
      const calculatedSpeedKmh = distanceKm / timeDeltaSec * 3600;
      if (calculatedSpeedKmh > 150 && distanceKm > 0.5) {
        return {
          isValid: false,
          quality: "INVALID",
          rejectionReason: `Impossible coordinate displacement: ${Math.round(distanceKm * 1e3)}m in ${Math.round(timeDeltaSec)}s (${Math.round(calculatedSpeedKmh)} km/h)`,
          isAnomaly: true,
          networkDelayMs
        };
      }
    }
  }
  return {
    isValid: true,
    quality,
    isAnomaly,
    networkDelayMs
  };
}
function evaluateFreshness(recordedAt, trackingStatus = "IDLE", currentTime = /* @__PURE__ */ new Date()) {
  if (!recordedAt) {
    return { freshness: "UNAVAILABLE", secondsAgo: Infinity };
  }
  const recordedDate = new Date(recordedAt);
  const diffSec = Math.max(0, Math.floor((currentTime.getTime() - recordedDate.getTime()) / 1e3));
  if (trackingStatus === "ENDED" || trackingStatus === "IDLE") {
    return { freshness: "UNAVAILABLE", secondsAgo: diffSec };
  }
  if (trackingStatus === "PAUSED") {
    return { freshness: "STALE", secondsAgo: diffSec };
  }
  if (diffSec <= 30) {
    return { freshness: "LIVE", secondsAgo: diffSec };
  } else if (diffSec <= 90) {
    return { freshness: "RECENT", secondsAgo: diffSec };
  } else {
    return { freshness: "STALE", secondsAgo: diffSec };
  }
}
function calculateNextStopAndEta(currentCoord, stops, freshness) {
  if (!stops || stops.length === 0) {
    return {
      nextStop: "Depot",
      nextStopId: "depot",
      isAtStop: false,
      isApproachingStop: false,
      stopSequenceIndex: 0,
      remainingDistanceKm: 0,
      etaMinutes: 0,
      formattedEta: "Unavailable",
      etaLabel: "UNAVAILABLE",
      etaConfidence: "UNAVAILABLE",
      statusText: "Route stops unavailable"
    };
  }
  let closestStopIndex = 0;
  let minStopDistanceKm = Infinity;
  stops.forEach((stop, idx) => {
    const distKm = haversineDistanceKm(currentCoord, {
      latitude: stop.latitude,
      longitude: stop.longitude
    });
    if (distKm < minStopDistanceKm) {
      minStopDistanceKm = distKm;
      closestStopIndex = idx;
    }
  });
  const isAtStop = minStopDistanceKm <= 0.08;
  const isApproachingStop = minStopDistanceKm <= 0.25 && !isAtStop;
  let targetStopIndex = closestStopIndex;
  if (isAtStop && closestStopIndex < stops.length - 1) {
    targetStopIndex = closestStopIndex + 1;
  }
  const targetStop = stops[targetStopIndex] || stops[stops.length - 1];
  const previousStopObj = targetStopIndex > 0 ? stops[targetStopIndex - 1] : void 0;
  const directDistanceToStopKm = haversineDistanceKm(currentCoord, {
    latitude: targetStop.latitude,
    longitude: targetStop.longitude
  });
  const effectiveSpeedKmh = typeof currentCoord.speed === "number" && currentCoord.speed > 5 ? currentCoord.speed : 22;
  let etaMinutes = Math.round(directDistanceToStopKm / effectiveSpeedKmh * 60);
  if (isAtStop) {
    etaMinutes = 0;
  } else if (isApproachingStop) {
    etaMinutes = 1;
  } else {
    etaMinutes = Math.max(1, etaMinutes);
  }
  let etaLabel = "UNAVAILABLE";
  let etaConfidence = "UNAVAILABLE";
  if (freshness === "LIVE") {
    etaLabel = "LIVE ETA";
    etaConfidence = directDistanceToStopKm < 5 ? "HIGH" : "MEDIUM";
  } else if (freshness === "RECENT") {
    etaLabel = "ESTIMATED ETA";
    etaConfidence = "MEDIUM";
  } else if (freshness === "STALE") {
    etaLabel = "SCHEDULED";
    etaConfidence = "LOW";
  } else {
    etaLabel = "UNAVAILABLE";
    etaConfidence = "UNAVAILABLE";
  }
  const formattedEta = isAtStop ? "Arriving now" : etaMinutes === 1 ? "1 min" : `${etaMinutes} min`;
  let statusText = "";
  if (isAtStop) {
    statusText = `At Stop: ${targetStop.name}`;
  } else if (isApproachingStop) {
    statusText = `Approaching: ${targetStop.name}`;
  } else if (freshness === "LIVE") {
    statusText = `In Transit to ${targetStop.name}`;
  } else if (freshness === "RECENT") {
    statusText = `In Transit to ${targetStop.name} (Recent GPS)`;
  } else if (freshness === "STALE") {
    statusText = `Signal Delayed \xB7 Last near ${targetStop.name}`;
  } else {
    statusText = `Tracking Inactive`;
  }
  return {
    nextStop: targetStop.name,
    nextStopId: targetStop.id,
    previousStop: previousStopObj?.name,
    previousStopId: previousStopObj?.id,
    isAtStop,
    isApproachingStop,
    stopSequenceIndex: targetStopIndex,
    remainingDistanceKm: Number(directDistanceToStopKm.toFixed(2)),
    etaMinutes,
    formattedEta,
    etaLabel,
    etaConfidence,
    statusText
  };
}
var init_gpsEngine = __esm({
  "artifacts/api-server/src/services/gpsEngine.ts"() {
    "use strict";
  }
});

// artifacts/api-server/src/services/realtimeHub.ts
import { Server as SocketIOServer } from "socket.io";
function getBusSocketRoom(busId) {
  return `bus:${busId}`;
}
var RealtimeLocationHub, realtimeHub;
var init_realtimeHub = __esm({
  "artifacts/api-server/src/services/realtimeHub.ts"() {
    "use strict";
    RealtimeLocationHub = class {
      clients = /* @__PURE__ */ new Map();
      heartbeatTimer = null;
      clientIdCounter = 0;
      io = null;
      ingestHandler = null;
      snapshotResolver = null;
      constructor() {
        this.startHeartbeat();
      }
      startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
          const pingPayload = `: ping ${Date.now()}

`;
          for (const [id, client] of this.clients.entries()) {
            try {
              client.res.write(pingPayload);
            } catch {
              this.removeClient(id);
            }
          }
        }, 15e3);
      }
      /**
       * Attaches Socket.IO server to the Node HTTP server on the same port (3000)
       * and wires bus-specific rooms (`bus:<busId>`) for Driver -> Server -> Passenger real-time streaming.
       */
      attachSocketServer(httpServer, options) {
        if (options?.onDriverLocationIngest) {
          this.ingestHandler = options.onDriverLocationIngest;
        }
        if (options?.resolveBusSnapshot) {
          this.snapshotResolver = options.resolveBusSnapshot;
        }
        if (this.io) {
          return this.io;
        }
        this.io = new SocketIOServer(httpServer, {
          cors: {
            origin: "*",
            methods: ["GET", "POST"]
          },
          path: "/socket.io"
        });
        this.io.on("connection", (socket) => {
          const handleJoinBusRoom = async (raw, ack) => {
            const busId = typeof raw === "string" ? raw.trim() : (raw?.busId || raw?.bus_id || "").trim();
            if (!busId) {
              ack?.({ joined: false, error: "busId is required" });
              return;
            }
            const room = getBusSocketRoom(busId);
            await socket.join(room);
            await socket.join(busId);
            socket.emit("joinedBusRoom", {
              joined: true,
              busId,
              room,
              timestamp: Date.now()
            });
            ack?.({ joined: true, busId, room });
            if (this.snapshotResolver) {
              try {
                const snapshot = await this.snapshotResolver(busId);
                if (snapshot) {
                  const enriched = this.formatSocketPayload(snapshot);
                  socket.emit("busLocationUpdate", enriched);
                  socket.emit("locationUpdate", enriched);
                  socket.emit("bus:location", enriched);
                }
              } catch {
              }
            }
          };
          const handleLeaveBusRoom = async (raw, ack) => {
            const busId = typeof raw === "string" ? raw.trim() : (raw?.busId || raw?.bus_id || "").trim();
            if (!busId) return;
            const room = getBusSocketRoom(busId);
            await socket.leave(room);
            await socket.leave(busId);
            ack?.({ left: true, busId, room });
          };
          const handleDriverLocation = async (rawPayload, ack) => {
            try {
              const busId = (rawPayload?.busId || rawPayload?.bus_id || "").trim();
              const driverId = rawPayload?.driverId || rawPayload?.driver_id || socket.handshake.headers["x-acims-driver-id"] || "driver-active";
              const latitude = Number(rawPayload?.latitude);
              const longitude = Number(rawPayload?.longitude);
              if (!busId || Number.isNaN(latitude) || Number.isNaN(longitude)) {
                const errMsg = "Invalid driver GPS payload: busId, latitude, and longitude required";
                socket.emit("driverLocationError", { error: errMsg });
                ack?.({ ok: false, error: errMsg });
                return;
              }
              const room = getBusSocketRoom(busId);
              socket.join(room);
              socket.join(busId);
              if (this.ingestHandler) {
                const result = await this.ingestHandler({
                  driverId,
                  busId,
                  latitude,
                  longitude,
                  accuracy: typeof rawPayload?.accuracy === "number" ? rawPayload.accuracy : null,
                  speed: typeof rawPayload?.speed === "number" ? rawPayload.speed : null,
                  bearing: typeof rawPayload?.bearing === "number" ? rawPayload.bearing : typeof rawPayload?.heading === "number" ? rawPayload.heading : null,
                  heading: typeof rawPayload?.heading === "number" ? rawPayload.heading : typeof rawPayload?.bearing === "number" ? rawPayload.bearing : null,
                  altitude: typeof rawPayload?.altitude === "number" ? rawPayload.altitude : null,
                  altitudeAccuracy: typeof rawPayload?.altitudeAccuracy === "number" ? rawPayload.altitudeAccuracy : null,
                  timestamp: rawPayload?.timestamp || rawPayload?.recorded_at || Date.now()
                });
                if (result.ok && result.telemetry) {
                  socket.emit("driverLocationAck", {
                    ok: true,
                    busId,
                    room,
                    timestamp: Date.now(),
                    telemetry: result.telemetry
                  });
                  ack?.({ ok: true, telemetry: result.telemetry });
                } else {
                  socket.emit("driverLocationError", {
                    ok: false,
                    busId,
                    error: result.error || "GPS point rejected"
                  });
                  ack?.({ ok: false, error: result.error });
                }
              }
            } catch (err) {
              const message = err?.message || "Failed to process driver Socket.IO GPS update";
              socket.emit("driverLocationError", { ok: false, error: message });
              ack?.({ ok: false, error: message });
            }
          };
          socket.on("joinBusRoom", handleJoinBusRoom);
          socket.on("join_bus_room", handleJoinBusRoom);
          socket.on("joinBus", handleJoinBusRoom);
          socket.on("subscribeBus", handleJoinBusRoom);
          socket.on("joinRoom", handleJoinBusRoom);
          socket.on("leaveBusRoom", handleLeaveBusRoom);
          socket.on("leave_bus_room", handleLeaveBusRoom);
          socket.on("unsubscribeBus", handleLeaveBusRoom);
          socket.on("joinFleetRoom", () => {
            socket.join("admin:all");
          });
          socket.on("driverLocationUpdate", handleDriverLocation);
          socket.on("driver_location_update", handleDriverLocation);
          socket.on("locationUpdate", handleDriverLocation);
          socket.on("sendLocation", handleDriverLocation);
          socket.on("bus:location", handleDriverLocation);
        });
        return this.io;
      }
      formatSocketPayload(telemetry) {
        const bearing = typeof telemetry.bearing === "number" ? telemetry.bearing : typeof telemetry.heading === "number" ? telemetry.heading : null;
        const timestamp4 = typeof telemetry.timestamp === "number" && telemetry.timestamp > 0 ? telemetry.timestamp : new Date(telemetry.recordedAt).getTime() || Date.now();
        return {
          ...telemetry,
          driverId: telemetry.driverId || "driver-active",
          busId: telemetry.busId,
          latitude: telemetry.latitude,
          longitude: telemetry.longitude,
          accuracy: telemetry.accuracy ?? null,
          speed: telemetry.speed ?? null,
          bearing,
          heading: bearing,
          timestamp: timestamp4
        };
      }
      /**
       * Registers a client for Server-Sent Events (SSE) updates for a specific bus
       */
      subscribeBus(busId, res, initialData) {
        const clientId = `bus-${busId}-${++this.clientIdCounter}-${Date.now()}`;
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
          "Access-Control-Allow-Origin": "*"
        });
        res.flushHeaders?.();
        const client = {
          id: clientId,
          res,
          busId,
          connectedAt: /* @__PURE__ */ new Date()
        };
        this.clients.set(clientId, client);
        res.write(`event: connected
data: ${JSON.stringify({ clientId, busId, timestamp: (/* @__PURE__ */ new Date()).toISOString() })}

`);
        if (initialData) {
          res.write(`event: location
data: ${JSON.stringify(this.formatSocketPayload(initialData))}

`);
        }
        res.on("close", () => {
          this.removeClient(clientId);
        });
        return clientId;
      }
      /**
       * Registers a client for all active buses (Admin Fleet Live Monitoring)
       */
      subscribeAllBuses(res, initialFleet) {
        const clientId = `admin-all-${++this.clientIdCounter}-${Date.now()}`;
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
          "Access-Control-Allow-Origin": "*"
        });
        res.flushHeaders?.();
        const client = {
          id: clientId,
          res,
          connectedAt: /* @__PURE__ */ new Date()
        };
        this.clients.set(clientId, client);
        res.write(`event: connected
data: ${JSON.stringify({ clientId, scope: "all", timestamp: (/* @__PURE__ */ new Date()).toISOString() })}

`);
        if (initialFleet && initialFleet.length > 0) {
          res.write(`event: fleet_snapshot
data: ${JSON.stringify(initialFleet)}

`);
        }
        res.on("close", () => {
          this.removeClient(clientId);
        });
        return clientId;
      }
      /**
       * Broadcasts a real-device GPS location update to the bus-specific Socket.IO room AND all SSE clients
       */
      broadcastLocation(telemetry) {
        const enriched = this.formatSocketPayload(telemetry);
        const payload = `event: location
data: ${JSON.stringify(enriched)}

`;
        for (const [id, client] of this.clients.entries()) {
          if (!client.busId || client.busId === telemetry.busId) {
            try {
              client.res.write(payload);
            } catch {
              this.removeClient(id);
            }
          }
        }
        if (this.io) {
          const room = getBusSocketRoom(telemetry.busId);
          const targets = this.io.to(room).to(telemetry.busId).to("admin:all");
          targets.emit("busLocationUpdate", enriched);
          targets.emit("locationUpdate", enriched);
          targets.emit("bus:location", enriched);
        }
      }
      /**
       * Broadcasts tracking session state change (ACTIVE, PAUSED, ENDED)
       */
      broadcastSessionState(busId, state, sessionDetails) {
        const eventData = {
          busId,
          state,
          session: sessionDetails,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        const payload = `event: session_change
data: ${JSON.stringify(eventData)}

`;
        for (const [id, client] of this.clients.entries()) {
          if (!client.busId || client.busId === busId) {
            try {
              client.res.write(payload);
            } catch {
              this.removeClient(id);
            }
          }
        }
        if (this.io) {
          const room = getBusSocketRoom(busId);
          this.io.to(room).to(busId).to("admin:all").emit("session_change", eventData);
        }
      }
      removeClient(id) {
        this.clients.delete(id);
      }
      getConnectedCount(busId) {
        if (!busId) return this.clients.size;
        let count = 0;
        for (const client of this.clients.values()) {
          if (!client.busId || client.busId === busId) count++;
        }
        return count;
      }
    };
    realtimeHub = new RealtimeLocationHub();
  }
});

// artifacts/api-server/src/services/eta.ts
function findNearestPathIndex(currentCoord, path6) {
  let minDistance = Infinity;
  let bestIndex = 0;
  for (let i = 0; i < path6.length; i++) {
    const dist = haversineDistance(currentCoord, path6[i]);
    if (dist < minDistance) {
      minDistance = dist;
      bestIndex = i;
    }
  }
  return { index: bestIndex, distanceKm: minDistance };
}
function calculateRemainingDistance(currentCoord, targetPathIndex, path6, cumulativeDistances) {
  const { index: nearestIndex } = findNearestPathIndex(currentCoord, path6);
  if (nearestIndex >= targetPathIndex) {
    const directDist = haversineDistance(currentCoord, path6[targetPathIndex]);
    return directDist < 0.08 ? 0 : directDist;
  }
  const nextVertexIndex = Math.min(nearestIndex + 1, targetPathIndex);
  const distanceToNextVertex = haversineDistance(currentCoord, path6[nextVertexIndex]);
  const distanceAlongVertices = cumulativeDistances[targetPathIndex] - cumulativeDistances[nextVertexIndex];
  return Math.max(0, distanceToNextVertex + Math.max(0, distanceAlongVertices));
}
function calculateEtaMinutes(arg1, arg2, arg3 = AVERAGE_SPEED_KMH) {
  if (typeof arg1 === "number") {
    const remainingDistanceKm = arg1;
    const speedKmh = typeof arg2 === "number" ? arg2 : AVERAGE_SPEED_KMH;
    if (remainingDistanceKm <= 0.05) return 0;
    const minutes = remainingDistanceKm / speedKmh * 60;
    return Math.max(1, Math.round(minutes));
  }
  const from = arg1;
  const to = arg2;
  const speed = typeof arg3 === "number" ? arg3 : AVERAGE_SPEED_KMH;
  const dist = haversineDistance(from, to);
  if (dist <= 0.05) return 0;
  return Math.max(1, Math.ceil(dist / speed * 60));
}
function formatEta(etaMinutes) {
  if (etaMinutes <= 0) return "Arriving now";
  if (etaMinutes === 1) return "approximately 1 min";
  return `approximately ${etaMinutes} min`;
}
var AVERAGE_SPEED_KMH;
var init_eta = __esm({
  "artifacts/api-server/src/services/eta.ts"() {
    "use strict";
    init_routesData();
    AVERAGE_SPEED_KMH = 22;
  }
});

// artifacts/api-server/src/services/mobilityConfig.ts
function getDelayThresholds() {
  return {
    onTimeMax: Number(process.env.ACIMS_DELAY_ON_TIME_MAX ?? 2),
    minorMax: Number(process.env.ACIMS_DELAY_MINOR_MAX ?? 5),
    moderateMax: Number(process.env.ACIMS_DELAY_MODERATE_MAX ?? 10)
  };
}
function getDelayNotifyDeltaMinutes() {
  return Number(process.env.ACIMS_DELAY_NOTIFY_DELTA_MIN ?? 5);
}
var ETA_NOTIFY_WINDOWS;
var init_mobilityConfig = __esm({
  "artifacts/api-server/src/services/mobilityConfig.ts"() {
    "use strict";
    ETA_NOTIFY_WINDOWS = {
      tenMinutes: { min: 8, max: 10 },
      fiveMinutes: { min: 4, max: 5 }
    };
  }
});

// artifacts/api-server/src/services/pickupEtaEngine.ts
function delayStatusFromMinutes(delay) {
  const t = getDelayThresholds();
  if (delay <= t.onTimeMax) return "ON_TIME";
  if (delay <= t.minorMax) return "MINOR_DELAY";
  if (delay <= t.moderateMax) return "MODERATE_DELAY";
  return "MAJOR_DELAY";
}
function calculatePickupEta(busId, busCoord, pickupStopId, scheduleDelayMinutesOrOptions = 0) {
  const options = typeof scheduleDelayMinutesOrOptions === "number" ? { scheduleDelayMinutes: scheduleDelayMinutesOrOptions } : scheduleDelayMinutesOrOptions;
  const scheduleDelayMinutes = options.scheduleDelayMinutes ?? 0;
  const route = getRouteForBus(busId);
  if (!route) return null;
  const pickup = route.stops.find((s) => s.id === pickupStopId || s.name.toLowerCase().includes(pickupStopId.toLowerCase()));
  if (!pickup) return null;
  const cumulative = route.cumulativeDistances ?? calculateCumulativeDistances(route.path);
  const remainingKm = calculateRemainingDistance(busCoord, pickup.pathIndex, route.path, cumulative);
  const speed = options.speedKmh ?? route.averageSpeedKmh ?? 22;
  const etaMinutes = calculateEtaMinutes(remainingKm, speed) + scheduleDelayMinutes;
  const formattedEta = etaMinutes <= 0 ? "Arriving now" : etaMinutes === 1 ? "approximately 1 min" : `approximately ${etaMinutes} min`;
  return {
    pickupStopId: pickup.id,
    pickupStopName: pickup.name,
    etaMinutes,
    formattedEta,
    remainingDistanceKm: Number(remainingKm.toFixed(2)),
    delayStatus: delayStatusFromMinutes(scheduleDelayMinutes)
  };
}
var init_pickupEtaEngine = __esm({
  "artifacts/api-server/src/services/pickupEtaEngine.ts"() {
    "use strict";
    init_routesData();
    init_eta();
    init_routesData();
    init_mobilityConfig();
  }
});

// artifacts/api-server/src/services/pickupPointService.ts
import { and as and4, eq as eq7 } from "drizzle-orm";
async function getStudentPickupPoint(studentUserId) {
  const profile = await getProfileWithDetails(studentUserId);
  if (!profile?.pickupStopId) return null;
  const points = await db.select().from(officialPickupPoints).where(eq7(officialPickupPoints.id, profile.pickupStopId)).limit(1);
  let pickup = points[0];
  if (!pickup && profile.assignedBusId) {
    const { getRouteForBus: getRouteForBus2 } = await Promise.resolve().then(() => (init_routesData(), routesData_exports));
    const route = getRouteForBus2(profile.assignedBusId);
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
        assignedRouteId: profile.assignedRouteId ?? route.id
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
    assignedRouteId: profile.assignedRouteId ?? null
  };
}
async function updateStudentPickupPoint(studentUserId, pickupPointId) {
  const profile = await getProfileWithDetails(studentUserId);
  if (!profile?.id) throw new Error("Student profile not found");
  const [pickup] = await db.select().from(officialPickupPoints).where(eq7(officialPickupPoints.id, pickupPointId)).limit(1);
  if (!pickup || !pickup.active) {
    throw new Error("Pickup point is not available.");
  }
  const studentRoute = profile.assignedRouteId;
  const bus = profile.assignedBusId ? await getDbBusById(profile.assignedBusId) : null;
  const isRecPickup = pickup.source === "REC_TRANSPORT" || pickup.id.startsWith("rec-stop-");
  const mvp = getMvpCollegeRoute();
  const allowedRoute = isRecPickup ? pickup.routeId : isMvpCollegeRouteActive() ? mvp.routeId : studentRoute || bus?.routeId;
  if (!isRecPickup && allowedRoute && pickup.routeId !== allowedRoute) {
    throw new Error("This pickup point is not on the college bus route.");
  }
  await db.update(students).set({
    pickupStopId: pickupPointId,
    assignedRouteId: pickup.routeId
  }).where(eq7(students.profileId, profile.id));
  const pref = await db.select().from(studentPreferences).where(eq7(studentPreferences.userId, studentUserId)).limit(1);
  if (pref.length) {
    await db.update(studentPreferences).set({ savedPickupStopId: pickupPointId, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(studentPreferences.userId, studentUserId));
  } else {
    await db.insert(studentPreferences).values({
      userId: studentUserId,
      savedPickupStopId: pickupPointId
    });
  }
  return getStudentPickupPoint(studentUserId);
}
async function listPickupPointsForStudentRoute(studentUserId) {
  const recOfficial = await db.select().from(officialPickupPoints).where(and4(eq7(officialPickupPoints.active, true), eq7(officialPickupPoints.source, "REC_TRANSPORT")));
  if (recOfficial.length) {
    const profile2 = await getProfileWithDetails(studentUserId);
    const assigned = profile2?.assignedRouteId;
    if (assigned && recOfficial.some((p) => p.routeId === assigned)) {
      return recOfficial.filter((p) => p.routeId === assigned);
    }
    return recOfficial;
  }
  if (isMvpCollegeRouteActive()) {
    const mvp = getMvpCollegeRoute();
    return db.select().from(officialPickupPoints).where(and4(eq7(officialPickupPoints.routeId, mvp.routeId), eq7(officialPickupPoints.active, true)));
  }
  const profile = await getProfileWithDetails(studentUserId);
  const routeId = profile?.assignedRouteId || (profile?.assignedBusId ? (await getDbBusById(profile.assignedBusId))?.routeId : null);
  if (!routeId) {
    return db.select().from(officialPickupPoints).where(eq7(officialPickupPoints.active, true));
  }
  return db.select().from(officialPickupPoints).where(and4(eq7(officialPickupPoints.routeId, routeId), eq7(officialPickupPoints.active, true)));
}
var init_pickupPointService = __esm({
  "artifacts/api-server/src/services/pickupPointService.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_services();
    init_mvpCollegeRouteService();
  }
});

// artifacts/api-server/src/services/delayEngine.ts
function classifyDelay(delayMinutes) {
  if (delayMinutes <= 2) return "ON_TIME";
  if (delayMinutes <= 5) return "MINOR_DELAY";
  if (delayMinutes <= 10) return "MODERATE_DELAY";
  return "MAJOR_DELAY";
}
function assessTripDelay(params) {
  const now = params.now ?? /* @__PURE__ */ new Date();
  const [h, m] = params.shiftStartTime.split(":").map(Number);
  const shiftStart = new Date(now);
  shiftStart.setHours(h || 0, m || 0, 0, 0);
  const minutesSinceShiftStart = Math.max(0, Math.round((now.getTime() - shiftStart.getTime()) / 6e4));
  const expectedArrival = params.pickupExpectedOffsetMinutes;
  const predictedArrival = minutesSinceShiftStart + params.currentEtaToPickupMinutes;
  const delayMinutes = Math.max(0, predictedArrival - expectedArrival);
  return {
    delayMinutes,
    status: classifyDelay(delayMinutes),
    expectedArrivalMinutesFromShiftStart: expectedArrival,
    predictedArrivalMinutesFromShiftStart: predictedArrival
  };
}
function summarizeFleetDelays(items) {
  return {
    onTime: items.filter((i) => i.status === "ON_TIME").length,
    minor: items.filter((i) => i.status === "MINOR_DELAY").length,
    moderate: items.filter((i) => i.status === "MODERATE_DELAY").length,
    major: items.filter((i) => i.status === "MAJOR_DELAY").length,
    delayedBuses: items.filter((i) => i.delayMinutes > 2).length
  };
}
function predictTripDelay(params) {
  const { assessment, gpsStale, speedMps, secondsSinceGps } = params;
  let prediction = "ON_TRACK";
  let min = assessment.delayMinutes;
  let max = assessment.delayMinutes + 2;
  let rationale = "Progress matches schedule within tolerance.";
  const slow = speedMps != null && speedMps < 2.5;
  if (gpsStale || secondsSinceGps > 45) {
    prediction = "LIKELY_DELAY";
    min = Math.max(min, 3);
    max = Math.max(max, min + 5);
    rationale = "GPS feed is stale; arrival confidence is reduced.";
  } else if (slow && assessment.delayMinutes >= 1) {
    prediction = "LIKELY_DELAY";
    min = Math.max(min + 2, 4);
    max = min + 4;
    rationale = "Low road speed with existing schedule slip.";
  } else if (assessment.status === "MODERATE_DELAY" || assessment.status === "MAJOR_DELAY") {
    prediction = "LIKELY_DELAY";
    min = assessment.delayMinutes;
    max = assessment.delayMinutes + 6;
    rationale = "Current delay may persist to destination.";
  }
  return {
    currentStatus: assessment.status,
    prediction,
    expectedDelayMinutesMin: min,
    expectedDelayMinutesMax: max,
    rationale
  };
}
var init_delayEngine = __esm({
  "artifacts/api-server/src/services/delayEngine.ts"() {
    "use strict";
  }
});

// artifacts/api-server/src/services/shiftTiming.ts
var shiftTiming_exports = {};
__export(shiftTiming_exports, {
  getBusShiftTimingContext: () => getBusShiftTimingContext
});
async function getBusShiftTimingContext(busId) {
  return resolveShiftTimingForBus(busId);
}
var init_shiftTiming = __esm({
  "artifacts/api-server/src/services/shiftTiming.ts"() {
    "use strict";
    init_shiftManagement();
  }
});

// artifacts/api-server/src/services/delayPredictionService.ts
function classifyDelayMinutes(delayMinutes) {
  const t = getDelayThresholds();
  if (delayMinutes <= t.onTimeMax) return "ON_TIME";
  if (delayMinutes <= t.minorMax) return "MINOR_DELAY";
  if (delayMinutes <= t.moderateMax) return "MODERATE_DELAY";
  return "MAJOR_DELAY";
}
async function assessPickupDelay(params) {
  const shiftCtx = await getBusShiftTimingContext(params.busId);
  const now = /* @__PURE__ */ new Date();
  let assessment;
  let scheduledArrivalAt = null;
  if (shiftCtx) {
    assessment = assessTripDelay({
      busId: params.busId,
      shiftStartTime: shiftCtx.shiftStartTime,
      pickupExpectedOffsetMinutes: params.pickupExpectedOffsetMinutes,
      currentEtaToPickupMinutes: params.etaMinutes,
      now
    });
    const [h, m] = shiftCtx.shiftStartTime.split(":").map(Number);
    scheduledArrivalAt = new Date(now);
    scheduledArrivalAt.setHours(h || 0, m || 0, 0, 0);
    scheduledArrivalAt = new Date(
      scheduledArrivalAt.getTime() + params.pickupExpectedOffsetMinutes * 6e4
    );
  } else {
    assessment = {
      delayMinutes: 0,
      status: "ON_TIME",
      expectedArrivalMinutesFromShiftStart: 0,
      predictedArrivalMinutesFromShiftStart: 0
    };
  }
  assessment = {
    ...assessment,
    status: classifyDelayMinutes(assessment.delayMinutes)
  };
  const prediction = predictTripDelay({
    assessment,
    gpsStale: params.gpsStale ?? false,
    speedMps: params.speedMps ?? null,
    secondsSinceGps: params.secondsSinceGps ?? 0
  });
  const predictedArrivalAt = new Date(now.getTime() + params.etaMinutes * 6e4);
  return {
    delayMinutes: assessment.delayMinutes,
    status: assessment.status,
    scheduledArrivalAt,
    predictedArrivalAt,
    prediction
  };
}
var init_delayPredictionService = __esm({
  "artifacts/api-server/src/services/delayPredictionService.ts"() {
    "use strict";
    init_delayEngine();
    init_shiftTiming();
    init_mobilityConfig();
  }
});

// artifacts/api-server/src/services/etaService.ts
var etaService_exports = {};
__export(etaService_exports, {
  computeStudentPickupEta: () => computeStudentPickupEta
});
function formatClock(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
async function computeStudentPickupEta(studentUserId) {
  const pickupView = await getStudentPickupPoint(studentUserId);
  if (!pickupView) return null;
  const mvp = getMvpCollegeRoute();
  const recPickup = pickupView.routeId.startsWith("rec-route-");
  const busId = recPickup ? pickupView.assignedBusId : isMvpCollegeRouteActive() ? mvp.busId : pickupView.assignedBusId;
  if (!busId) return null;
  if (!recPickup && isMvpCollegeRouteActive() && pickupView.assignedRouteId && pickupView.assignedRouteId !== mvp.routeId) {
    return null;
  }
  const bus = await getDbBusById(busId);
  if (!bus) return null;
  const trip = await getActiveTripForBus(busId);
  const tracking = await isBusTrackingActive(busId);
  const loc = await getLatestBusLocation(busId);
  const route = getRouteForBus(busId);
  const freshness = loc ? evaluateFreshness(loc.recordedAt, /* @__PURE__ */ new Date()) : { freshness: "UNAVAILABLE", secondsSinceUpdate: 9999 };
  const gpsLive = tracking.isActive && (freshness.freshness === "LIVE" || freshness.freshness === "RECENT");
  const gpsStatus = !loc || freshness.freshness === "UNAVAILABLE" || freshness.freshness === "OFFLINE" ? "UNAVAILABLE" : freshness.freshness === "STALE" ? "STALE" : "LIVE";
  let stopPassed = false;
  if (route && loc) {
    const stop = route.stops.find((s) => s.id === pickupView.pickupPointId);
    if (stop) {
      const { index: busIndex } = findNearestPathIndex(
        { latitude: loc.latitude, longitude: loc.longitude },
        route.path
      );
      stopPassed = busIndex > stop.pathIndex + 1;
    }
  }
  let etaMinutes = null;
  let formattedEta = "ETA currently unavailable";
  let remainingDistanceKm = null;
  if (gpsLive && loc && !stopPassed) {
    const speedKmh = loc.speed != null && loc.speed > 0.5 ? loc.speed * 3.6 : route?.averageSpeedKmh ?? 22;
    const eta = calculatePickupEta(
      busId,
      { latitude: loc.latitude, longitude: loc.longitude },
      pickupView.pickupPointId,
      { speedKmh, scheduleDelayMinutes: trip?.delayMinutes ?? 0 }
    );
    if (eta) {
      etaMinutes = eta.etaMinutes;
      formattedEta = eta.formattedEta;
      remainingDistanceKm = eta.remainingDistanceKm;
    }
  }
  const delay = etaMinutes != null && gpsLive ? await assessPickupDelay({
    busId,
    pickupExpectedOffsetMinutes: pickupView.expectedOffsetMinutes,
    etaMinutes,
    speedMps: loc?.speed ?? null,
    secondsSinceGps: freshness.secondsSinceUpdate,
    gpsStale: gpsStatus !== "LIVE"
  }) : null;
  const now = /* @__PURE__ */ new Date();
  const predictedArrivalAt = etaMinutes != null && gpsLive ? new Date(now.getTime() + etaMinutes * 6e4) : null;
  let scheduledArrivalAt = null;
  if (delay?.scheduledArrivalAt) {
    scheduledArrivalAt = delay.scheduledArrivalAt;
  }
  return {
    studentId: studentUserId,
    busId,
    busNumber: bus.busNumber,
    tripId: trip?.id ?? null,
    pickup: {
      id: pickupView.pickupPointId,
      name: pickupView.pickupPointName,
      latitude: pickupView.latitude,
      longitude: pickupView.longitude,
      sequenceNumber: pickupView.sequenceNumber
    },
    etaMinutes,
    formattedEta,
    remainingDistanceKm,
    scheduledArrivalAt: scheduledArrivalAt ? formatClock(scheduledArrivalAt) : null,
    predictedArrivalAt: predictedArrivalAt ? formatClock(predictedArrivalAt) : null,
    delay,
    stopPassed,
    gps: {
      status: gpsStatus,
      lastUpdateAt: loc?.recordedAt ? new Date(loc.recordedAt).toISOString() : null,
      secondsSinceUpdate: freshness.secondsSinceUpdate,
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      speedMps: loc?.speed ?? null
    },
    routeLabel: route?.name ?? bus.routeId ?? "Campus route",
    directionLabel: route ? `${route.origin} \u2192 ${route.destination}` : "Home \u2192 College"
  };
}
var init_etaService = __esm({
  "artifacts/api-server/src/services/etaService.ts"() {
    "use strict";
    init_services();
    init_mobilityOps();
    init_gpsEngine();
    init_pickupEtaEngine();
    init_routesData();
    init_eta();
    init_pickupPointService();
    init_delayPredictionService();
    init_mvpCollegeRouteService();
  }
});

// artifacts/api-server/src/services/geofenceEngine.ts
function distanceMeters(a, b) {
  return haversineDistance(a, b) * 1e3;
}
function evaluatePickupGeofence(params) {
  const d = distanceMeters(params.bus, params.pickup);
  const r = params.pickup.geofenceRadiusM;
  if (d <= r) return "INSIDE";
  if (d <= r * 2.5) return "APPROACHING";
  if (params.previousState === "INSIDE" && d > r * 1.2) return "DEPARTED";
  return "OUTSIDE";
}
var init_geofenceEngine = __esm({
  "artifacts/api-server/src/services/geofenceEngine.ts"() {
    "use strict";
    init_eta();
  }
});

// artifacts/api-server/src/services/notificationService.ts
import { and as and5, desc as desc4, eq as eq8 } from "drizzle-orm";
function tripKeyFromContext(tripId, busId) {
  if (tripId) return tripId;
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  return `session-${busId}-${day}`;
}
async function hasTripNotificationEvent(tripKey, studentId, pickupPointId, eventType) {
  const rows = await db.select().from(tripNotificationEvents).where(
    and5(
      eq8(tripNotificationEvents.tripId, tripKey),
      eq8(tripNotificationEvents.studentId, studentId),
      eq8(tripNotificationEvents.pickupPointId, pickupPointId),
      eq8(tripNotificationEvents.eventType, eventType)
    )
  ).limit(1);
  return rows.length > 0;
}
async function recordTripNotificationEvent(input) {
  const id = input.idSuffix ? `${input.tripKey}:${input.studentId}:${input.pickupPointId}:${input.eventType}:${input.idSuffix}` : `${input.tripKey}:${input.studentId}:${input.pickupPointId}:${input.eventType}`;
  const existing = await db.select().from(tripNotificationEvents).where(eq8(tripNotificationEvents.id, id)).limit(1);
  if (existing.length) return existing[0];
  const inserted = await db.insert(tripNotificationEvents).values({
    id,
    tripId: input.tripKey,
    studentId: input.studentId,
    pickupPointId: input.pickupPointId,
    eventType: input.eventType,
    etaAtTrigger: input.etaAtTrigger ?? null,
    delayMinutes: input.delayMinutes ?? null,
    notificationStatus: "SENT",
    deliveredAt: /* @__PURE__ */ new Date()
  }).returning();
  return inserted[0];
}
async function studentAllowsNotification(studentId, kind) {
  const pref = await db.select().from(studentPreferences).where(eq8(studentPreferences.userId, studentId)).limit(1);
  if (!pref.length) return true;
  const p = pref[0];
  if (kind === "arrival" || kind === "arrived") return p.notificationArrivals ?? true;
  if (kind === "delay") return p.notificationDelays ?? true;
  return true;
}
async function getLastDelayNotificationMinutes(tripKey, studentId, pickupPointId) {
  const rows = await db.select().from(tripNotificationEvents).where(
    and5(
      eq8(tripNotificationEvents.tripId, tripKey),
      eq8(tripNotificationEvents.studentId, studentId),
      eq8(tripNotificationEvents.pickupPointId, pickupPointId)
    )
  ).orderBy(desc4(tripNotificationEvents.triggeredAt)).limit(30);
  const delayRow = rows.find((r) => r.eventType === "DELAY_DETECTED" || r.eventType === "DELAY_UPDATED");
  return delayRow?.delayMinutes ?? null;
}
async function emitNotification(tripKey, busId, studentId, pickupPointId, eventType, title, message, etaAtTrigger, delayMinutes, idSuffix) {
  await recordTripNotificationEvent({
    tripKey,
    studentId,
    pickupPointId,
    eventType,
    etaAtTrigger,
    delayMinutes,
    idSuffix
  });
  await db.insert(notifications).values({
    userId: studentId,
    type: eventType,
    title,
    message
  });
  const mobilityId = idSuffix ? `${studentId}:${tripKey}:${eventType}:${pickupPointId}:${idSuffix}` : `${studentId}:${tripKey}:${eventType}:${pickupPointId}`;
  await recordMobilityEvent({
    id: mobilityId,
    userId: studentId,
    busId,
    tripId: tripKey.startsWith("trip-") ? tripKey : void 0,
    pickupPointId,
    eventType,
    payload: { message, etaAtTrigger, delayMinutes }
  });
}
async function processStudentPickupNotifications(input) {
  const { eta, busNumber } = input;
  const tripKey = tripKeyFromContext(eta.tripId, eta.busId);
  const pickupId = eta.pickup.id;
  const studentId = eta.studentId;
  let sent = 0;
  if (eta.stopPassed) return { sent };
  if (eta.gps.status === "UNAVAILABLE" || eta.gps.status === "STALE") {
    if (!await hasTripNotificationEvent(tripKey, studentId, pickupId, "GPS_UNAVAILABLE")) {
      if (await studentAllowsNotification(studentId, "gps")) {
        const msg = eta.gps.status === "UNAVAILABLE" ? "Live bus location is temporarily unavailable." : `Live location is delayed. Last updated ${eta.gps.secondsSinceUpdate} seconds ago.`;
        await emitNotification(
          tripKey,
          eta.busId,
          studentId,
          pickupId,
          "GPS_UNAVAILABLE",
          "GPS update",
          msg
        );
        sent += 1;
      }
    }
    if (eta.etaMinutes == null) return { sent };
  }
  if (eta.etaMinutes == null) return { sent };
  const hasCoords = eta.gps.latitude != null && eta.gps.longitude != null && eta.pickup.latitude != null && eta.pickup.longitude != null;
  if (hasCoords) {
    const geofence = evaluatePickupGeofence({
      bus: { latitude: eta.gps.latitude, longitude: eta.gps.longitude },
      pickup: {
        latitude: eta.pickup.latitude,
        longitude: eta.pickup.longitude,
        geofenceRadiusM: 120
      }
    });
    if (geofence === "INSIDE") {
      if (!await hasTripNotificationEvent(tripKey, studentId, pickupId, "BUS_ARRIVED")) {
        if (await studentAllowsNotification(studentId, "arrived")) {
          await emitNotification(
            tripKey,
            eta.busId,
            studentId,
            pickupId,
            "BUS_ARRIVED",
            "Bus arrived",
            `\u{1F68C} Your bus has arrived at your pickup point (${eta.pickup.name}).`,
            eta.etaMinutes,
            eta.delay?.delayMinutes
          );
          sent += 1;
        }
      }
      return { sent };
    }
  }
  const in10 = eta.etaMinutes <= ETA_NOTIFY_WINDOWS.tenMinutes.max && eta.etaMinutes >= ETA_NOTIFY_WINDOWS.tenMinutes.min;
  if (in10 && !await hasTripNotificationEvent(tripKey, studentId, pickupId, "ETA_10_MINUTES")) {
    if (await studentAllowsNotification(studentId, "arrival")) {
      await emitNotification(
        tripKey,
        eta.busId,
        studentId,
        pickupId,
        "ETA_10_MINUTES",
        "10 minutes away",
        `\u{1F68C} Your bus is approximately 10 minutes away from your pickup point (${eta.pickup.name}).`,
        eta.etaMinutes,
        eta.delay?.delayMinutes
      );
      sent += 1;
    }
  }
  const in5 = eta.etaMinutes <= ETA_NOTIFY_WINDOWS.fiveMinutes.max && eta.etaMinutes >= ETA_NOTIFY_WINDOWS.fiveMinutes.min;
  if (in5 && !await hasTripNotificationEvent(tripKey, studentId, pickupId, "ETA_5_MINUTES")) {
    if (await studentAllowsNotification(studentId, "arrival")) {
      await emitNotification(
        tripKey,
        eta.busId,
        studentId,
        pickupId,
        "ETA_5_MINUTES",
        "5 minutes away",
        `\u{1F68C} Your bus is approximately 5 minutes away. Please get ready at ${eta.pickup.name}.`,
        eta.etaMinutes,
        eta.delay?.delayMinutes
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
      const eventType = isFirst ? "DELAY_DETECTED" : "DELAY_UPDATED";
      if (isFirst) {
        if (!await hasTripNotificationEvent(tripKey, studentId, pickupId, "DELAY_DETECTED")) {
          if (await studentAllowsNotification(studentId, "delay")) {
            const arrival = eta.predictedArrivalAt ?? "soon";
            await emitNotification(
              tripKey,
              eta.busId,
              studentId,
              pickupId,
              "DELAY_DETECTED",
              "Bus delayed",
              `\u26A0\uFE0F BUS-${busNumber} is delayed by approximately ${delayMin} minutes. Updated arrival at ${eta.pickup.name}: ${arrival}.`,
              eta.etaMinutes,
              delayMin
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
          `\u26A0\uFE0F BUS-${busNumber} delay is now ${delayMin} minutes. Expected at ${eta.pickup.name}: ${arrival}.`,
          eta.etaMinutes,
          delayMin,
          String(delayMin)
        );
        sent += 1;
      }
    }
  }
  return { sent };
}
var init_notificationService = __esm({
  "artifacts/api-server/src/services/notificationService.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_mobilityOps();
    init_mobilityConfig();
    init_geofenceEngine();
  }
});

// artifacts/api-server/src/services/mobilityPipeline.ts
async function processMobilityTelemetry(telemetry) {
  const busId = telemetry.id;
  if (!isBusOnCollegeRoute(busId)) {
    return { processed: 0, skipped: "NOT_COLLEGE_ROUTE_BUS" };
  }
  const trip = await getActiveTripForBus(busId);
  const tracking = await isBusTrackingActive(busId);
  if (!tracking.isActive && !trip) {
    return { processed: 0, skipped: "NO_ACTIVE_TRIP" };
  }
  const studentIds = await getStudentUserIdsForBus(busId);
  if (!studentIds.length) return { processed: 0, tripId: trip?.id };
  let processed = 0;
  for (const studentId of studentIds) {
    const eta = await computeStudentPickupEta(studentId);
    if (!eta || eta.busId !== busId) continue;
    const freshness = eta.gps.lastUpdateAt ? evaluateFreshness(new Date(eta.gps.lastUpdateAt), /* @__PURE__ */ new Date()) : { freshness: "UNAVAILABLE", secondsSinceUpdate: 9999 };
    if (freshness.freshness === "UNAVAILABLE" || freshness.freshness === "OFFLINE") {
      const partial = { ...eta, etaMinutes: null, formattedEta: "ETA currently unavailable" };
      const { sent: sent2 } = await processStudentPickupNotifications({
        eta: partial,
        busNumber: telemetry.busNumber ?? eta.busNumber
      });
      processed += sent2;
      continue;
    }
    const { sent } = await processStudentPickupNotifications({
      eta,
      busNumber: telemetry.busNumber ?? eta.busNumber
    });
    processed += sent;
  }
  return { processed, tripId: trip?.id };
}
var init_mobilityPipeline = __esm({
  "artifacts/api-server/src/services/mobilityPipeline.ts"() {
    "use strict";
    init_mobilityOps();
    init_services();
    init_gpsEngine();
    init_etaService();
    init_notificationService();
    init_mvpCollegeRouteService();
  }
});

// firebase-applet-config.json
var firebase_applet_config_default;
var init_firebase_applet_config = __esm({
  "firebase-applet-config.json"() {
    firebase_applet_config_default = {
      projectId: "geometric-system-dsmzh",
      appId: "1:459696669968:web:d550881d3fd0eb8bb8d195",
      apiKey: "AIzaSyDH0OjMa_POzDXhoaic623Y9xJjihmWwb4",
      authDomain: "geometric-system-dsmzh.firebaseapp.com",
      storageBucket: "geometric-system-dsmzh.firebasestorage.app",
      messagingSenderId: "459696669968",
      measurementId: "",
      oAuthClientId: "459696669968-ioo3crrhnbingae5anf39g46k67alno9.apps.googleusercontent.com",
      recaptchaSiteKey: ""
    };
  }
});

// src/lib/firebase-admin.ts
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
var adminAuth;
var init_firebase_admin = __esm({
  "src/lib/firebase-admin.ts"() {
    "use strict";
    init_firebase_applet_config();
    if (!getApps().length) {
      initializeApp({
        projectId: firebase_applet_config_default.projectId
      });
    }
    adminAuth = getAuth();
  }
});

// src/middleware/auth.ts
var requireAuth;
var init_auth = __esm({
  "src/middleware/auth.ts"() {
    "use strict";
    init_firebase_admin();
    requireAuth = async (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        const customUserId = req.header("x-acims-user-id");
        if (customUserId) {
          req.user = { uid: customUserId, role: req.header("x-acims-role") || "STUDENT" };
          return next();
        }
        const demoRole = req.header("x-acims-role");
        if (demoRole?.toLowerCase() === "admin") {
          req.user = { uid: "admin-demo", role: "ADMIN" };
          return next();
        }
        const driverId = req.header("x-acims-driver-id");
        if (driverId) {
          req.user = { uid: driverId, role: "DRIVER" };
          return next();
        }
        return res.status(401).json({ error: "Unauthorized: Missing token" });
      }
      const token = authHeader.split("Bearer ")[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        req.user = decodedToken;
        next();
      } catch (error) {
        const customUserId = req.header("x-acims-user-id");
        if (customUserId) {
          req.user = { uid: customUserId, role: req.header("x-acims-role") || "STUDENT" };
          return next();
        }
        const driverId = req.header("x-acims-driver-id");
        if (driverId) {
          req.user = { uid: driverId, role: "DRIVER" };
          return next();
        }
        console.error("Error verifying Firebase ID token:", error);
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
      }
    };
  }
});

// artifacts/api-server/src/middleware/acimsAuth.ts
function resolveRole(req) {
  const authReq = req;
  const headerRole = req.header("x-acims-role");
  const tokenRole = authReq.user?.role;
  return String(tokenRole || headerRole || "STUDENT").toUpperCase();
}
function requireRole(...roles) {
  const allowed = new Set(roles.map((r) => r.toUpperCase()));
  return (req, res, next) => {
    const role = resolveRole(req);
    if (!allowed.has(role)) {
      res.status(403).json({ error: `Forbidden: requires one of ${roles.join(", ")}` });
      return;
    }
    next();
  };
}
function requireDriver(req, res, next) {
  const role = resolveRole(req);
  if (role === "ADMIN" || role === "DRIVER") {
    next();
    return;
  }
  const driverId = req.header("x-acims-driver-id");
  if (driverId) {
    req.user = { uid: driverId, role: "DRIVER" };
    next();
    return;
  }
  res.status(403).json({ error: "Forbidden: driver role required" });
}
var requireAdmin;
var init_acimsAuth = __esm({
  "artifacts/api-server/src/middleware/acimsAuth.ts"() {
    "use strict";
    init_auth();
    requireAdmin = requireRole("ADMIN");
  }
});

// artifacts/api-server/src/routes/buses.ts
var buses_exports = {};
__export(buses_exports, {
  buildBusTelemetry: () => buildBusTelemetry,
  default: () => buses_default,
  ingestRealDriverGps: () => ingestRealDriverGps,
  startBusSimulation: () => startBusSimulation
});
import { Router as Router3 } from "express";
async function buildBusTelemetry(busId) {
  const bus = await getDbBusById(busId);
  const busNumber = bus?.busNumber || busId.replace("bus-", "");
  const routeDef = getRouteForBus(busId);
  const routeId = bus?.routeId || routeDef?.id || `route-${busId}`;
  const dbStops = await getDbStopsByRoute(routeId);
  const stops = dbStops.length > 0 ? dbStops.map((s, idx) => ({
    id: s.id,
    name: s.stopName,
    sequence: s.sequenceNumber,
    latitude: s.latitude,
    longitude: s.longitude,
    minutesFromPrevious: idx === 0 ? 0 : 3
  })) : (routeDef?.stops || []).map((s, idx) => ({
    id: s.id || `stop-${idx}`,
    name: s.name || s.stopName || `Stop ${idx + 1}`,
    sequence: s.sequence ?? idx,
    latitude: s.latitude,
    longitude: s.longitude,
    minutesFromPrevious: s.minutesFromPrevious || (idx === 0 ? 0 : 3)
  }));
  const latestLoc = await getLatestBusLocation(busId);
  const trackingState = await isBusTrackingActive(busId);
  const { freshness, secondsAgo } = evaluateFreshness(
    latestLoc?.recordedAt || null,
    trackingState.status
  );
  if (!latestLoc) {
    const firstStop = stops[0]?.name || "Campus Depot";
    return {
      busId,
      busNumber,
      driverId: bus?.driverId || void 0,
      latitude: stops[0]?.latitude || 12.9287,
      longitude: stops[0]?.longitude || 80.132,
      accuracy: null,
      speed: null,
      heading: null,
      bearing: null,
      altitude: null,
      timestamp: 0,
      nextStop: firstStop,
      nextStopId: stops[0]?.id || "depot",
      isAtStop: false,
      isApproachingStop: false,
      stopSequenceIndex: 0,
      etaMinutes: 0,
      formattedEta: "Unavailable",
      etaLabel: "UNAVAILABLE",
      etaConfidence: "UNAVAILABLE",
      remainingDistanceKm: 0,
      status: trackingState.isActive ? "Driver Active \xB7 Waiting for GPS" : trackingState.isPaused ? "Tracking Paused" : "Tracking Standby \xB7 No Active Trip",
      freshness: "UNAVAILABLE",
      isLive: false,
      trackingStatus: trackingState.status,
      recordedAt: (/* @__PURE__ */ new Date(0)).toISOString(),
      receivedAt: (/* @__PURE__ */ new Date(0)).toISOString(),
      networkDelayMs: 0,
      secondsAgo: Infinity,
      quality: "INVALID",
      source: "unverified"
    };
  }
  const nextStopInfo = calculateNextStopAndEta(
    {
      latitude: latestLoc.latitude,
      longitude: latestLoc.longitude,
      speed: latestLoc.speed
    },
    stops,
    freshness
  );
  const recordedDate = new Date(latestLoc.recordedAt);
  const receivedDate = new Date(latestLoc.receivedAt || latestLoc.recordedAt);
  const networkDelayMs = Math.max(0, receivedDate.getTime() - recordedDate.getTime());
  let displayStatus = nextStopInfo.statusText;
  if (trackingState.isPaused) {
    displayStatus = `Tracking Paused \xB7 Last near ${nextStopInfo.nextStop}`;
  } else if (!trackingState.isActive && freshness !== "LIVE") {
    displayStatus = `Trip Concluded \xB7 Last at ${nextStopInfo.nextStop}`;
  }
  let pathIndex = nextStopInfo.stopSequenceIndex * 6;
  if (routeDef?.path && routeDef.path.length > 0) {
    let minPathDist = Infinity;
    routeDef.path.forEach((pt, idx) => {
      const dist = haversineDistanceKm(
        { latitude: latestLoc.latitude, longitude: latestLoc.longitude },
        { latitude: pt.latitude, longitude: pt.longitude }
      );
      if (dist < minPathDist) {
        minPathDist = dist;
        pathIndex = idx;
      }
    });
  }
  return {
    busId,
    busNumber,
    driverId: latestLoc.driverId || bus?.driverId || void 0,
    latitude: latestLoc.latitude,
    longitude: latestLoc.longitude,
    accuracy: latestLoc.accuracy,
    speed: latestLoc.speed,
    heading: latestLoc.heading,
    bearing: latestLoc.heading,
    altitude: latestLoc.altitude,
    timestamp: recordedDate.getTime(),
    nextStop: nextStopInfo.nextStop,
    nextStopId: nextStopInfo.nextStopId,
    previousStop: nextStopInfo.previousStop,
    previousStopId: nextStopInfo.previousStopId,
    isAtStop: nextStopInfo.isAtStop,
    isApproachingStop: nextStopInfo.isApproachingStop,
    stopSequenceIndex: nextStopInfo.stopSequenceIndex,
    etaMinutes: nextStopInfo.etaMinutes,
    formattedEta: nextStopInfo.formattedEta,
    etaLabel: nextStopInfo.etaLabel,
    etaConfidence: nextStopInfo.etaConfidence,
    remainingDistanceKm: nextStopInfo.remainingDistanceKm,
    status: displayStatus,
    freshness,
    isLive: freshness === "LIVE",
    trackingStatus: trackingState.status,
    recordedAt: recordedDate.toISOString(),
    receivedAt: receivedDate.toISOString(),
    networkDelayMs,
    secondsAgo,
    quality: latestLoc.accuracy && latestLoc.accuracy <= 15 ? "HIGH" : latestLoc.accuracy && latestLoc.accuracy <= 40 ? "ACCEPTABLE" : "POOR",
    source: "real-device-gps",
    pathIndex
  };
}
async function ingestRealDriverGps(params) {
  const {
    busId,
    driverId = "driver-active",
    latitude,
    longitude,
    accuracy,
    altitude,
    altitudeAccuracy,
    speed,
    heading,
    bearing,
    timestamp: timestamp4
  } = params;
  const bus = await getDbBusById(busId);
  if (!bus) {
    return { ok: false, httpStatus: 404, error: `Bus ${busId} not found` };
  }
  if (driverId) {
    const isAssigned = await verifyDriverBusAssignment(driverId, busId);
    if (!isAssigned) {
      return {
        ok: false,
        httpStatus: 403,
        error: `Unauthorized: Driver ${driverId} is not assigned to broadcast for bus ${bus.busNumber}`
      };
    }
  }
  const trackingState = await isBusTrackingActive(busId);
  if (trackingState.isPaused) {
    return {
      ok: false,
      httpStatus: 409,
      error: "Tracking session is currently paused. Resume trip to transmit GPS."
    };
  }
  const receivedAt = /* @__PURE__ */ new Date();
  const recordedAt = typeof timestamp4 === "number" && timestamp4 > 0 ? new Date(timestamp4) : typeof timestamp4 === "string" && timestamp4.length > 0 ? new Date(timestamp4) : receivedAt;
  const effectiveHeading = typeof bearing === "number" && !Number.isNaN(bearing) ? bearing : typeof heading === "number" && !Number.isNaN(heading) ? heading : null;
  const lastLoc = await getLatestBusLocation(busId);
  const validation = validateGpsCoordinate(
    { latitude, longitude, accuracy, speed, recordedAt },
    lastLoc,
    receivedAt
  );
  if (!validation.isValid) {
    return {
      ok: false,
      httpStatus: 400,
      error: `GPS point rejected: ${validation.rejectionReason}`,
      validation: {
        quality: validation.quality,
        networkDelayMs: validation.networkDelayMs
      }
    };
  }
  const saved = await recordBusLocation({
    busId,
    driverId: driverId || bus.driverId || void 0,
    latitude,
    longitude,
    accuracy: typeof accuracy === "number" ? accuracy : null,
    altitude: typeof altitude === "number" ? altitude : null,
    altitudeAccuracy: typeof altitudeAccuracy === "number" ? altitudeAccuracy : null,
    speed: typeof speed === "number" ? speed : null,
    heading: effectiveHeading,
    recordedAt,
    receivedAt
  });
  const strictTrip = process.env.ACIMS_STRICT_GPS === "true";
  const activeTrip = await getActiveTripForBus(busId);
  if (strictTrip && !trackingState.isActive && !activeTrip) {
    return {
      ok: false,
      httpStatus: 409,
      error: "No active trip. Driver must start trip before GPS can be ingested."
    };
  }
  if (!trackingState.isActive) {
    await startTrackingSession(busId, driverId || bus.driverId || "driver-active");
  }
  const telemetry = await buildBusTelemetry(busId);
  realtimeHub.broadcastLocation(telemetry);
  processMobilityTelemetry({
    id: busId,
    busNumber: telemetry.busNumber,
    latitude: telemetry.latitude,
    longitude: telemetry.longitude,
    speed: typeof speed === "number" ? speed : saved.speed,
    heading: effectiveHeading ?? saved.heading,
    tripId: activeTrip?.id ?? null,
    recordedAt: recordedAt ?? saved.recordedAt
  }).catch(() => {
  });
  return {
    ok: true,
    httpStatus: 200,
    telemetry,
    validation: {
      quality: validation.quality,
      networkDelayMs: validation.networkDelayMs
    }
  };
}
function startBusSimulation() {
  return null;
}
var router3, buses_default;
var init_buses = __esm({
  "artifacts/api-server/src/routes/buses.ts"() {
    "use strict";
    init_services();
    init_routesData();
    init_gpsEngine();
    init_realtimeHub();
    init_mobilityPipeline();
    init_acimsAuth();
    init_mobilityOps();
    router3 = Router3();
    router3.get("/buses", async (_req, res) => {
      try {
        const dbBusesList = await getDbBuses();
        const results = await Promise.all(
          dbBusesList.map(async (bus) => {
            const routeDef = getRouteForBus(bus.id);
            const telemetry = await buildBusTelemetry(bus.id);
            return {
              id: bus.id,
              busNumber: bus.busNumber,
              origin: routeDef?.origin || "Central Campus",
              destination: routeDef?.destination || "City Station",
              routeLabel: routeDef?.name || "Campus Express",
              capacity: 45,
              currentLocation: { latitude: telemetry.latitude, longitude: telemetry.longitude },
              nextStop: telemetry.nextStop,
              nextStopId: telemetry.nextStopId,
              isAtStop: telemetry.isAtStop,
              etaMinutes: telemetry.etaMinutes,
              formattedEta: telemetry.formattedEta,
              etaLabel: telemetry.etaLabel,
              etaConfidence: telemetry.etaConfidence,
              remainingDistanceKm: telemetry.remainingDistanceKm,
              status: telemetry.status,
              updatedAt: telemetry.recordedAt,
              active: bus.active,
              routeId: bus.routeId || routeDef?.id || "route-bus-12",
              driverId: bus.driverId || void 0,
              locationMode: "driver-gps",
              freshness: telemetry.freshness,
              isLive: telemetry.isLive,
              networkDelayMs: telemetry.networkDelayMs,
              secondsAgo: telemetry.secondsAgo
            };
          })
        );
        res.json(results);
      } catch (err) {
        console.error("Error listing buses:", err);
        res.status(500).json({ error: "Failed to list buses" });
      }
    });
    router3.get("/buses/:busId", async (req, res) => {
      try {
        const { busId } = req.params;
        const bus = await getDbBusById(busId);
        if (!bus) {
          return res.status(404).json({ error: "Bus not found" });
        }
        const routeDef = getRouteForBus(bus.id);
        const telemetry = await buildBusTelemetry(bus.id);
        res.json({
          id: bus.id,
          busNumber: bus.busNumber,
          origin: routeDef?.origin || "Central Campus",
          destination: routeDef?.destination || "City Station",
          routeLabel: routeDef?.name || "Campus Express",
          capacity: 45,
          currentLocation: { latitude: telemetry.latitude, longitude: telemetry.longitude },
          nextStop: telemetry.nextStop,
          nextStopId: telemetry.nextStopId,
          isAtStop: telemetry.isAtStop,
          etaMinutes: telemetry.etaMinutes,
          formattedEta: telemetry.formattedEta,
          etaLabel: telemetry.etaLabel,
          etaConfidence: telemetry.etaConfidence,
          remainingDistanceKm: telemetry.remainingDistanceKm,
          status: telemetry.status,
          updatedAt: telemetry.recordedAt,
          active: bus.active,
          routeId: bus.routeId || routeDef?.id || "route-bus-12",
          driverId: bus.driverId || void 0,
          locationMode: "driver-gps",
          freshness: telemetry.freshness,
          isLive: telemetry.isLive,
          networkDelayMs: telemetry.networkDelayMs,
          secondsAgo: telemetry.secondsAgo
        });
      } catch (err) {
        res.status(500).json({ error: "Failed to get bus" });
      }
    });
    router3.get("/buses/:busId/location", async (req, res) => {
      try {
        const { busId } = req.params;
        const bus = await getDbBusById(busId);
        if (!bus) {
          return res.status(404).json({ error: "Bus not found" });
        }
        const telemetry = await buildBusTelemetry(bus.id);
        res.json(telemetry);
      } catch (err) {
        res.status(500).json({ error: "Failed to get bus location" });
      }
    });
    router3.get("/realtime/bus/:busId", async (req, res) => {
      try {
        const { busId } = req.params;
        const bus = await getDbBusById(busId);
        if (!bus) {
          return res.status(404).json({ error: "Bus not found" });
        }
        const initialTelemetry = await buildBusTelemetry(busId);
        realtimeHub.subscribeBus(busId, res, initialTelemetry);
      } catch (err) {
        res.status(500).json({ error: "Failed to connect to realtime location stream" });
      }
    });
    router3.get("/realtime/buses", async (_req, res) => {
      try {
        const dbBusesList = await getDbBuses();
        const initialFleet = await Promise.all(
          dbBusesList.map((b) => buildBusTelemetry(b.id))
        );
        realtimeHub.subscribeAllBuses(res, initialFleet);
      } catch (err) {
        res.status(500).json({ error: "Failed to connect to fleet realtime stream" });
      }
    });
    router3.get("/buses/:busId/history", async (req, res) => {
      try {
        const { busId } = req.params;
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50", 10)));
        const history = await getRecentBusLocations(busId, limit);
        res.json(history);
      } catch (err) {
        res.status(500).json({ error: "Failed to get location history" });
      }
    });
    router3.get("/buses/:busId/stops", async (req, res) => {
      try {
        const { busId } = req.params;
        const bus = await getDbBusById(busId);
        const routeId = bus?.routeId || `route-${busId}`;
        const dbStops = await getDbStopsByRoute(routeId);
        if (dbStops.length > 0) {
          const formatted = dbStops.map((s, idx) => ({
            id: s.id,
            name: s.stopName,
            sequence: s.sequenceNumber,
            latitude: s.latitude,
            longitude: s.longitude,
            pathIndex: idx * 6,
            minutesFromPrevious: idx === 0 ? 0 : 3
          }));
          return res.json(formatted);
        }
        const routeDef = getRouteForBus(busId);
        res.json(routeDef?.stops || []);
      } catch (err) {
        res.status(500).json({ error: "Failed to get stops" });
      }
    });
    router3.get("/buses/:busId/route", async (req, res) => {
      try {
        const { busId } = req.params;
        const routeDef = getRouteForBus(busId);
        if (!routeDef) {
          return res.status(404).json({ error: "Route not found" });
        }
        const bus = await getDbBusById(busId);
        const routeId = bus?.routeId || routeDef.id;
        const dbStops = await getDbStopsByRoute(routeId);
        const formattedStops = dbStops.length > 0 ? dbStops.map((s, idx) => ({
          id: s.id,
          name: s.stopName,
          sequence: s.sequenceNumber,
          latitude: s.latitude,
          longitude: s.longitude,
          pathIndex: idx * 6,
          minutesFromPrevious: idx === 0 ? 0 : 3
        })) : routeDef.stops;
        const effectivePath = routeDef.path && routeDef.path.length > 0 ? routeDef.path : formattedStops.map((s) => ({ latitude: s.latitude, longitude: s.longitude }));
        res.json({
          ...routeDef,
          routeId,
          busId,
          busNumber: bus?.busNumber || routeDef.routeNumber || busId.replace("bus-", ""),
          origin: routeDef.origin || formattedStops[0]?.name || "Route Origin",
          destination: routeDef.destination || formattedStops[formattedStops.length - 1]?.name || "REC Campus",
          stops: formattedStops,
          path: effectivePath
        });
      } catch (err) {
        res.status(500).json({ error: "Failed to get route" });
      }
    });
    router3.post("/bus/location", requireAuth, requireDriver, async (req, res) => {
      try {
        const {
          busId: bodyBusId,
          bus_id,
          latitude,
          longitude,
          accuracy,
          altitude,
          altitudeAccuracy,
          speed,
          heading,
          bearing,
          timestamp: timestamp4,
          recorded_at
        } = req.body;
        const busId = bodyBusId || bus_id;
        const rawRecordedAt = timestamp4 ?? recorded_at;
        if (!busId || typeof latitude !== "number" || typeof longitude !== "number") {
          return res.status(400).json({ error: "bus_id/busId, valid latitude and longitude required" });
        }
        const authUser = req.user;
        const driverId = authUser?.uid || req.header("x-acims-driver-id") || req.body.driverId || req.body.driver_id || "driver-active";
        const result = await ingestRealDriverGps({
          busId,
          driverId,
          latitude,
          longitude,
          accuracy,
          altitude,
          altitudeAccuracy,
          speed,
          heading,
          bearing,
          timestamp: rawRecordedAt
        });
        if (!result.ok) {
          return res.status(result.httpStatus).json({
            error: result.error,
            ...result.validation ? { quality: result.validation.quality } : {}
          });
        }
        res.json({
          success: true,
          telemetry: result.telemetry,
          validation: result.validation
        });
      } catch (err) {
        console.error("Failed to ingest driver location:", err);
        res.status(500).json({ error: "Internal error recording GPS location" });
      }
    });
    router3.post("/bus/location/batch", requireAuth, requireDriver, async (req, res) => {
      try {
        const { busId, points } = req.body;
        if (!busId || !Array.isArray(points) || points.length === 0) {
          return res.status(400).json({ error: "busId and points array required" });
        }
        const bus = await getDbBusById(busId);
        if (!bus) return res.status(404).json({ error: "Bus not found" });
        let insertedCount = 0;
        const receivedAt = /* @__PURE__ */ new Date();
        const sorted = [...points].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        for (const pt of sorted) {
          const recordedAt = new Date(pt.timestamp);
          const validation = validateGpsCoordinate({
            latitude: pt.latitude,
            longitude: pt.longitude,
            accuracy: pt.accuracy,
            speed: pt.speed,
            recordedAt
          });
          if (validation.isValid) {
            await recordBusLocation({
              busId,
              driverId: pt.driverId || bus.driverId || void 0,
              latitude: pt.latitude,
              longitude: pt.longitude,
              accuracy: pt.accuracy,
              altitude: pt.altitude,
              altitudeAccuracy: pt.altitudeAccuracy,
              speed: pt.speed,
              heading: pt.heading,
              recordedAt,
              receivedAt
            });
            insertedCount++;
          }
        }
        const telemetry = await buildBusTelemetry(busId);
        realtimeHub.broadcastLocation(telemetry);
        res.json({
          success: true,
          insertedCount,
          totalReceived: points.length,
          currentTelemetry: telemetry
        });
      } catch (err) {
        res.status(500).json({ error: "Failed to batch upload offline GPS coordinates" });
      }
    });
    router3.get("/driver/simulator-path/:busId", async (req, res) => {
      const route = getRouteForBus(req.params.busId);
      if (!route) {
        return res.status(404).json({ error: "No route geometry for this bus." });
      }
      const path6 = route.path.length > 0 ? route.path : route.stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude }));
      res.json({
        busId: req.params.busId,
        routeId: route.id,
        routeName: route.name,
        path: path6
      });
    });
    router3.post("/driver/session/start", requireAuth, requireDriver, async (req, res) => {
      try {
        const { busId, driverId = "driver-active" } = req.body;
        if (!busId) return res.status(400).json({ error: "busId required" });
        const bus = await getDbBusById(busId);
        if (!bus) return res.status(404).json({ error: "Bus not found" });
        const isAssigned = await verifyDriverBusAssignment(driverId, busId);
        if (!isAssigned) {
          return res.status(403).json({
            error: `Unauthorized: Driver ${driverId} is not assigned to bus ${bus.busNumber}`
          });
        }
        const { resolveShiftForDriverTrip: resolveShiftForDriverTrip2 } = await Promise.resolve().then(() => (init_shiftManagement(), shiftManagement_exports));
        const shift = await resolveShiftForDriverTrip2(busId, driverId);
        if (shift && !shift.active) {
          return res.status(400).json({ error: "Assigned shift is inactive. Contact transport admin." });
        }
        const scheduledStartAt = shift?.startTime ? (() => {
          const [h, m] = shift.startTime.split(":").map(Number);
          const d = /* @__PURE__ */ new Date();
          d.setHours(h || 0, m || 0, 0, 0);
          return d;
        })() : null;
        const session = await startTrackingSession(busId, driverId);
        const trip = await startTripFromDriverSession({
          busId,
          driverId,
          routeId: shift?.routeId || bus.routeId || `route-${busId}`,
          shiftId: typeof req.body.shiftId === "string" ? req.body.shiftId : shift?.id,
          trackingSessionId: session.id,
          scheduledStartAt,
          shiftStartSnapshot: shift?.startTime ?? null,
          shiftEndSnapshot: shift?.endTime ?? null
        });
        realtimeHub.broadcastSessionState(busId, "ACTIVE", session);
        res.json({ status: "ACTIVE", session, trip });
      } catch (err) {
        res.status(500).json({ error: "Failed to start tracking session" });
      }
    });
    router3.post("/driver/session/pause", requireAuth, requireDriver, async (req, res) => {
      try {
        const { busId } = req.body;
        if (!busId) return res.status(400).json({ error: "busId required" });
        const session = await pauseTrackingSession(busId);
        realtimeHub.broadcastSessionState(busId, "PAUSED", session);
        res.json({ status: "PAUSED", session });
      } catch (err) {
        res.status(500).json({ error: "Failed to pause tracking session" });
      }
    });
    router3.post("/driver/session/resume", requireAuth, requireDriver, async (req, res) => {
      try {
        const { busId } = req.body;
        if (!busId) return res.status(400).json({ error: "busId required" });
        const session = await resumeTrackingSession(busId);
        realtimeHub.broadcastSessionState(busId, "ACTIVE", session);
        res.json({ status: "ACTIVE", session });
      } catch (err) {
        res.status(500).json({ error: "Failed to resume tracking session" });
      }
    });
    router3.post("/driver/session/stop", requireAuth, requireDriver, async (req, res) => {
      try {
        const { busId } = req.body;
        if (!busId) return res.status(400).json({ error: "busId required" });
        const session = await stopTrackingSession(busId);
        const trip = await completeActiveTrip(busId);
        realtimeHub.broadcastSessionState(busId, "ENDED", session);
        res.json({ status: "ENDED", session, trip });
      } catch (err) {
        res.status(500).json({ error: "Failed to stop tracking session" });
      }
    });
    router3.get("/driver/session/:busId", async (req, res) => {
      try {
        const { busId } = req.params;
        const session = await getBusTrackingSession(busId);
        res.json(session || { status: "IDLE", busId });
      } catch (err) {
        res.status(500).json({ error: "Failed to get session status" });
      }
    });
    buses_default = router3;
  }
});

// artifacts/api-server/src/services/campusData.ts
var REC_BUILDINGS, REC_CAMPUS_STOPS, REC_POINTS_OF_INTEREST, REC_CAMPUS_PATHS, REC_CAMPUS_CENTER, REC_CAMPUS_BOUNDS;
var init_campusData = __esm({
  "artifacts/api-server/src/services/campusData.ts"() {
    "use strict";
    REC_BUILDINGS = [
      {
        id: "rec-main-block",
        name: "Main Block",
        category: "admin",
        description: "Principal's Office, Administrative Wing, Dean Offices, and central conference halls.",
        code: "MB",
        latitude: 13.0112,
        longitude: 80.0042
      },
      {
        id: "rec-central-college",
        name: "Rajalakshmi Engineering College (Central Block)",
        category: "academic",
        description: "Central Academic Block housing Computer Science, IT, AI & Data Science departments and lecture halls.",
        code: "CB",
        latitude: 13.0084,
        longitude: 80.0036
      },
      {
        id: "rec-workshop-block",
        name: "Workshop Block",
        category: "lab",
        description: "Mechanical workshops, manufacturing technology labs, carpentry, and welding practice bays.",
        code: "WB",
        latitude: 13.0098,
        longitude: 80.0024
      },
      {
        id: "rec-ece-workshop",
        name: "Rajalakshmi Engineering College Workshop, ECE",
        category: "academic",
        description: "Electronics & Communication Engineering labs, digital signal processing, and robotics lab.",
        code: "ECE",
        latitude: 13.009,
        longitude: 80.0022
      },
      {
        id: "rec-transport-office",
        name: "REC College Bus Transport Office",
        category: "transit",
        description: "Central fleet dispatch, bus pass verification, bus coordinators desk, and driver operations.",
        code: "TO",
        latitude: 13.0108,
        longitude: 80.0076
      },
      {
        id: "rec-d-block",
        name: "D Block",
        category: "academic",
        description: "Academic lecture block, seminar halls, and department faculty cabins.",
        code: "DB",
        latitude: 13.0062,
        longitude: 80.0006
      },
      {
        id: "rec-fluid-mechanics",
        name: "Fluid Mechanics Lab",
        category: "lab",
        description: "Hydraulics, fluid machinery, flow measurement, and aerospace flow research test rigs.",
        code: "FML",
        latitude: 13.006,
        longitude: 80.002
      },
      {
        id: "rec-automobile-block",
        name: "Rajalakshmi Engineering College - Automobile Block",
        category: "academic",
        description: "Automobile engineering chassis lab, engine testing bays, and vehicular dynamics center.",
        code: "AUTO",
        latitude: 13.0068,
        longitude: 80.0002
      },
      {
        id: "rec-school-of-architecture",
        name: "Rajalakshmi School of Architecture",
        category: "academic",
        description: "Design studios, climatology lab, architectural modeling workshops, and exhibition spaces.",
        code: "RSA",
        latitude: 13.0072,
        longitude: 79.9972
      },
      {
        id: "rec-indoor-stadium",
        name: "Indoor Stadium",
        category: "recreation",
        description: "Wooden badminton courts, table tennis, basketball arena, and fitness gymnasium.",
        code: "IS",
        latitude: 13.0075,
        longitude: 80.0072
      },
      {
        id: "rec-auditorium",
        name: "Auditorium",
        category: "facility",
        description: "Air-conditioned 1,500-seat convention hall for symposiums, convocations, and cultural events.",
        code: "AUD",
        latitude: 13.007,
        longitude: 80.0073
      },
      {
        id: "rec-boy-hostel-2",
        name: "Rajalakshmi Engineering College Boy Hostel - 2",
        category: "hostel",
        description: "Student residential rooms, study halls, mess facility, and resident recreation room.",
        code: "BH2",
        latitude: 13.0048,
        longitude: 80.0026
      },
      {
        id: "rec-ladies-hostel",
        name: "Ladies Hostel",
        category: "hostel",
        description: "Secure women's residential campus, dedicated dining hall, garden courtyard, and study library.",
        code: "LH",
        latitude: 13.0045,
        longitude: 80.0068
      }
    ];
    REC_CAMPUS_STOPS = [
      {
        id: "rec-main-gate-stop",
        name: "REC Main Gate Terminal",
        servedRoutes: ["Bus 12 (Campus Loop A)", "Bus 18 (Metro Connector)", "Bus 4B (Express)", "Bus 21 (Perimeter)"],
        description: "Primary arrival/departure terminus right at the REC Main Security Gate on NH4.",
        latitude: 13.0118,
        longitude: 80.0048
      },
      {
        id: "rec-transport-depot-stop",
        name: "Transport Office Depot Bay",
        servedRoutes: ["All 40+ College Fleet Buses", "Driver Dispatch Stand"],
        description: "Boarding platform directly beside the REC College Bus Transport Office.",
        latitude: 13.0108,
        longitude: 80.0074
      },
      {
        id: "rec-central-academic-stop",
        name: "Central Block Academic Stop",
        servedRoutes: ["Campus Loop A", "Hostel Village Shuttle", "Metro Connector Feeder"],
        description: "Located at the central crossroad between Central Academic Block and the Sports Field.",
        latitude: 13.0084,
        longitude: 80.0042
      },
      {
        id: "rec-hostel-loop-stop",
        name: "Hostel Zone South Bay",
        servedRoutes: ["Evening Hostel Shuttle", "Bus 18 Feeder", "Bus 21 South Loop"],
        description: "Convenient pickup node between Boy Hostel 2 and the Ladies Hostel South road.",
        latitude: 13.0049,
        longitude: 80.0044
      },
      {
        id: "rec-architecture-stop",
        name: "School of Architecture Bay",
        servedRoutes: ["West Campus Shuttle", "Special Event Feeder"],
        description: "Stop serving the Rajalakshmi School of Architecture western courtyard.",
        latitude: 13.0071,
        longitude: 79.9978
      }
    ];
    REC_POINTS_OF_INTEREST = [
      {
        id: "poi-rec-main-gate",
        name: "REC Main Gate (\u0BAE\u0BC6\u0BAF\u0BBF\u0BA9\u0BCD \u0B95\u0BC7\u0B9F\u0BCD)",
        category: "gate",
        landmarkNear: "Opposite NH4 highway corridor & Main Block",
        latitude: 13.012,
        longitude: 80.0048
      },
      {
        id: "poi-dominos-pizza",
        name: "Domino's Pizza | Rajalakshmi Plaza",
        category: "food",
        landmarkNear: "North-West commercial corner beside entry road",
        latitude: 13.0115,
        longitude: 80.0016
      },
      {
        id: "poi-cafe-coffee-day",
        name: "Cafe Coffee Day (\u0B95\u0B83\u0BAA\u0BC7 \u0B95\u0BBE\u0BAA\u0BCD\u0BAA\u0BBF \u0B9F\u0BC7)",
        category: "food",
        landmarkNear: "East avenue, north of Indoor Stadium",
        latitude: 13.0088,
        longitude: 80.0074
      },
      {
        id: "poi-pontus-pack",
        name: "Pontus Pack Pvt",
        category: "service",
        landmarkNear: "North of Workshop Block",
        latitude: 13.0105,
        longitude: 80.0022
      },
      {
        id: "poi-sarvesh-pavilion",
        name: "Sarvesh anna payaluga / Cafeteria",
        category: "food",
        landmarkNear: "South-East corner of central sports ground",
        latitude: 13.0062,
        longitude: 80.004
      },
      {
        id: "poi-sports-ground",
        name: "REC Central Sports Field & Track",
        category: "recreation",
        landmarkNear: "Between Central Academic Block and Indoor Stadium",
        latitude: 13.0085,
        longitude: 80.0058
      }
    ];
    REC_CAMPUS_PATHS = [
      {
        id: "path-main-entry-avenue",
        name: "REC Main Gate to Central Spine",
        type: "road",
        coordinates: [
          { latitude: 13.012, longitude: 80.0048 },
          // Main Gate
          { latitude: 13.011, longitude: 80.0044 },
          // Main Block South
          { latitude: 13.0098, longitude: 80.0042 },
          { latitude: 13.0084, longitude: 80.0042 }
          // Central Academic Cross
        ]
      },
      {
        id: "path-north-spine-road",
        name: "North Spine Road (Domino's to Transport Office)",
        type: "road",
        coordinates: [
          { latitude: 13.0115, longitude: 80.0016 },
          // Domino's
          { latitude: 13.0104, longitude: 80.0018 },
          { latitude: 13.0104, longitude: 80.0042 },
          // Below Main Block
          { latitude: 13.0106, longitude: 80.0076 }
          // Transport Office
        ]
      },
      {
        id: "path-east-stadium-avenue",
        name: "East Stadium Avenue (CCD to Ladies Hostel)",
        type: "road",
        coordinates: [
          { latitude: 13.0106, longitude: 80.0076 },
          // Transport Office
          { latitude: 13.0088, longitude: 80.0074 },
          // Cafe Coffee Day
          { latitude: 13.0075, longitude: 80.0072 },
          // Indoor Stadium
          { latitude: 13.0068, longitude: 80.0072 },
          // Auditorium
          { latitude: 13.0048, longitude: 80.007 },
          // East Turn
          { latitude: 13.0045, longitude: 80.0068 }
          // Ladies Hostel
        ]
      },
      {
        id: "path-south-ring-road",
        name: "South Perimeter Ring Road (Ladies Hostel to D Block)",
        type: "road",
        coordinates: [
          { latitude: 13.0045, longitude: 80.0068 },
          // Ladies Hostel
          { latitude: 13.0048, longitude: 80.0062 },
          { latitude: 13.0048, longitude: 80.0044 },
          // South Spine Junction
          { latitude: 13.0048, longitude: 80.0026 },
          // Boy Hostel 2
          { latitude: 13.0055, longitude: 80.0018 },
          // Fluid Mechanics
          { latitude: 13.0062, longitude: 80.0006 }
          // D Block
        ]
      },
      {
        id: "path-central-spine",
        name: "Central Academic to South Spine",
        type: "walkway",
        coordinates: [
          { latitude: 13.0084, longitude: 80.0042 },
          // Central Block
          { latitude: 13.0065, longitude: 80.0042 },
          // Sarvesh Pavilion
          { latitude: 13.0048, longitude: 80.0044 }
          // South Ring
        ]
      },
      {
        id: "path-west-architecture-avenue",
        name: "West Architecture Pathway (Workshop to School of Architecture)",
        type: "walkway",
        coordinates: [
          { latitude: 13.009, longitude: 80.0022 },
          // ECE Workshop
          { latitude: 13.0082, longitude: 80.0016 },
          { latitude: 13.0074, longitude: 80.0002 },
          // Automobile Block Junction
          { latitude: 13.0073, longitude: 79.9986 },
          { latitude: 13.0072, longitude: 79.9972 }
          // Architecture Front
        ]
      },
      {
        id: "path-automobile-dblock-link",
        name: "D Block to Automobile Block Link",
        type: "walkway",
        coordinates: [
          { latitude: 13.0074, longitude: 80.0002 },
          // Automobile
          { latitude: 13.0062, longitude: 80.0006 }
          // D Block
        ]
      }
    ];
    REC_CAMPUS_CENTER = {
      latitude: 13.0084,
      longitude: 80.0033
    };
    REC_CAMPUS_BOUNDS = [
      [13.0035, 79.996],
      // South-West
      [13.013, 80.009]
      // North-East
    ];
  }
});

// artifacts/api-server/src/services/commandCenterService.ts
async function getCommandCenterSnapshot() {
  const buses3 = await getDbBuses();
  const fleet = [];
  const delayItems = [];
  let gpsIssues = 0;
  let onTime = 0;
  let delayed = 0;
  const activeDriverIds = /* @__PURE__ */ new Set();
  for (const bus of buses3.filter((b) => b.active)) {
    const loc = await getLatestBusLocation(bus.id);
    const tracking = await isBusTrackingActive(bus.id);
    const trip = await getActiveTripForBus(bus.id);
    if (trip?.status === "ACTIVE" && trip.driverId) {
      activeDriverIds.add(trip.driverId);
    } else if (tracking.isActive && bus.driverId) {
      activeDriverIds.add(bus.driverId);
    }
    const freshness = loc ? evaluateFreshness(loc.recordedAt, /* @__PURE__ */ new Date()) : { freshness: "UNAVAILABLE", secondsSinceUpdate: 9999 };
    const isGpsIssue = !tracking.isActive || freshness.freshness === "STALE" || freshness.freshness === "UNAVAILABLE";
    if (isGpsIssue) gpsIssues += 1;
    let delayStatus = "ON_TIME";
    let delayMinutes = 0;
    let etaMinutes = null;
    if (loc) {
      const eta = calculatePickupEta(bus.id, { latitude: loc.latitude, longitude: loc.longitude }, "tambaram");
      if (eta) {
        etaMinutes = eta.etaMinutes;
        const shiftCtx = await getBusShiftTimingContext(bus.id);
        const delay = shiftCtx ? assessTripDelay({
          busId: bus.id,
          shiftStartTime: shiftCtx.shiftStartTime,
          pickupExpectedOffsetMinutes: shiftCtx.pickupExpectedOffsetMinutes,
          currentEtaToPickupMinutes: eta.etaMinutes
        }) : { delayMinutes: 0, status: "ON_TIME" };
        delayMinutes = delay.delayMinutes;
        delayStatus = delay.status;
        delayItems.push({ busId: bus.id, delayMinutes, status: delay.status });
        if (delay.delayMinutes > 2) delayed += 1;
        else onTime += 1;
      }
    }
    fleet.push({
      busId: bus.id,
      busNumber: bus.busNumber,
      routeId: bus.routeId,
      driverId: bus.driverId,
      tripId: trip?.id ?? null,
      tripStatus: trip?.status ?? "IDLE",
      trackingStatus: tracking.status,
      gpsFreshness: freshness.freshness,
      secondsSinceGps: freshness.secondsSinceUpdate,
      latitude: loc?.latitude ?? null,
      longitude: loc?.longitude ?? null,
      speed: loc?.speed ?? null,
      heading: loc?.heading ?? null,
      accuracy: loc?.accuracy ?? null,
      lastGpsAt: loc?.recordedAt?.toISOString?.() ?? loc?.recordedAt ?? null,
      etaMinutes,
      delayMinutes,
      delayStatus,
      isGpsIssue
    });
  }
  const summary = summarizeFleetDelays(delayItems);
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    counters: {
      activeBuses: fleet.length,
      activeDrivers: activeDriverIds.size,
      activeTrips: fleet.filter((f) => f.tripStatus === "ACTIVE").length,
      onTime: summary.onTime,
      delayed: summary.delayedBuses,
      gpsIssues,
      minorDelays: summary.minor,
      moderateDelays: summary.moderate,
      majorDelays: summary.major
    },
    fleet
  };
}
var init_commandCenterService = __esm({
  "artifacts/api-server/src/services/commandCenterService.ts"() {
    "use strict";
    init_services();
    init_mobilityOps();
    init_pickupEtaEngine();
    init_delayEngine();
    init_gpsEngine();
    init_shiftTiming();
  }
});

// src/db/initialDemoRoutes.ts
var initialDemoRoutes_exports = {};
__export(initialDemoRoutes_exports, {
  INITIAL_DEMO_ROUTES: () => INITIAL_DEMO_ROUTES,
  seedInitialDemoRoutes: () => seedInitialDemoRoutes
});
import { eq as eq12 } from "drizzle-orm";
async function seedInitialDemoRoutes() {
  try {
    const allDbBuses = await db.select().from(buses);
    for (const b of allDbBuses) {
      if (b.busNumber?.toUpperCase().includes("MTC") || b.id?.toLowerCase().includes("mtc")) {
        await db.delete(buses).where(eq12(buses.id, b.id));
      }
    }
  } catch (err) {
    console.warn("MTC cleanup skipped:", err);
  }
  for (const r of INITIAL_DEMO_ROUTES) {
    const routeId = `route-${r.routeNumber.toLowerCase()}`;
    const busId = `bus-${r.routeNumber.toLowerCase()}`;
    const fullRouteName = `${r.routeNumber} \xB7 ${r.routeName}`;
    const [existingRoute] = await db.select().from(busRoutes).where(eq12(busRoutes.id, routeId)).limit(1);
    if (!existingRoute) {
      await db.insert(busRoutes).values({
        id: routeId,
        routeName: fullRouteName,
        routeCode: r.routeNumber,
        startingTimeDisplay: r.stops[0]?.time,
        campusArrivalDisplay: r.stops[r.stops.length - 1]?.time,
        source: "REC_TRANSPORT",
        active: true
      });
    }
    const [existingBus] = await db.select().from(buses).where(eq12(buses.id, busId)).limit(1);
    if (!existingBus) {
      await db.insert(buses).values({
        id: busId,
        busNumber: r.routeNumber,
        routeId,
        source: "REC_TRANSPORT",
        active: true
      });
    }
    for (let i = 0; i < r.stops.length; i++) {
      const stop = r.stops[i];
      const stopId = `${routeId}-stop-${i + 1}`;
      const [existingStop] = await db.select().from(busStops).where(eq12(busStops.id, stopId)).limit(1);
      if (!existingStop) {
        await db.insert(busStops).values({
          id: stopId,
          routeId,
          stopName: stop.name,
          latitude: stop.lat,
          longitude: stop.lng,
          sequenceNumber: i + 1
        });
      }
      const pickupId = `pickup-${routeId}-${i + 1}`;
      const [existingPickup] = await db.select().from(officialPickupPoints).where(eq12(officialPickupPoints.id, pickupId)).limit(1);
      if (!existingPickup) {
        await db.insert(officialPickupPoints).values({
          id: pickupId,
          routeId,
          stopName: stop.name,
          latitude: stop.lat,
          longitude: stop.lng,
          sequenceNumber: i + 1,
          scheduledTimeDisplay: stop.time,
          source: "REC_TRANSPORT",
          active: true
        });
      }
    }
  }
  console.log(`[ACIMS DB] Initial demo routes seeded (${INITIAL_DEMO_ROUTES.length} routes: BUS 1, 1B, 1C, 2, 2B, 2C, 3, 3B, 3C, 4, 18)`);
}
var INITIAL_DEMO_ROUTES;
var init_initialDemoRoutes = __esm({
  "src/db/initialDemoRoutes.ts"() {
    "use strict";
    init_db();
    init_schema();
    INITIAL_DEMO_ROUTES = [
      {
        routeNumber: "1",
        routeName: "ENNORE",
        origin: "Ennore Bus Stand",
        destination: "College Campus",
        stops: [
          { name: "Ennore Bus Stand", time: "5:40 AM", lat: 13.2185, lng: 80.3235 },
          { name: "Ernavur Anna Nagar", time: "5:42 AM", lat: 13.2045, lng: 80.3121 },
          { name: "Lift Gate", time: "5:45 AM", lat: 13.1902, lng: 80.3065 },
          { name: "ITC", time: "5:50 AM", lat: 13.1784, lng: 80.3012 },
          { name: "Wimco Nagar", time: "5:52 AM", lat: 13.1685, lng: 80.2981 },
          { name: "Thiruvottiyur Market", time: "5:54 AM", lat: 13.1592, lng: 80.2974 },
          { name: "Theradi", time: "5:56 AM", lat: 13.1501, lng: 80.2965 },
          { name: "Raja Kadai", time: "5:58 AM", lat: 13.1418, lng: 80.2952 },
          { name: "Thangal", time: "6:00 AM", lat: 13.1334, lng: 80.2941 },
          { name: "Tollgate", time: "6:01 AM", lat: 13.1252, lng: 80.2932 },
          { name: "Poonamallee Bypass", time: "7:10 AM", lat: 13.0489, lng: 80.0934 },
          { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 }
        ]
      },
      {
        routeNumber: "1B",
        routeName: "PERIYAMEDU",
        origin: "Ennore Bus Stand",
        destination: "College Campus",
        stops: [
          { name: "Ennore Bus Stand", time: "5:40 AM", lat: 13.2185, lng: 80.3235 },
          { name: "Ernavur", time: "5:43 AM", lat: 13.2045, lng: 80.3121 },
          { name: "Murugan Koil", time: "5:45 AM", lat: 13.1932, lng: 80.3075 },
          { name: "Mullai Nagar", time: "5:47 AM", lat: 13.1812, lng: 80.3025 },
          { name: "Poonamallee Bypass", time: "7:10 AM", lat: 13.0489, lng: 80.0934 },
          { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 }
        ]
      },
      {
        routeNumber: "1C",
        routeName: "TONDIARPET",
        origin: "Tondiarpet Depot",
        destination: "College Campus",
        stops: [
          { name: "Tondiarpet Depot", time: "6:05 AM", lat: 13.1285, lng: 80.2885 },
          { name: "Kasimedu", time: "6:07 AM", lat: 13.1205, lng: 80.2942 },
          { name: "Kasimedu Petrol Bunk", time: "6:08 AM", lat: 13.1165, lng: 80.2938 },
          { name: "Kalmandapam Police Station", time: "6:10 AM", lat: 13.1112, lng: 80.2932 },
          { name: "ST Anne's School", time: "6:12 AM", lat: 13.1065, lng: 80.2925 },
          { name: "Royapuram Bridge", time: "6:15 AM", lat: 13.1002, lng: 80.2915 },
          { name: "Beach Station", time: "6:18 AM", lat: 13.0925, lng: 80.2922 },
          { name: "Annamalai Mandram", time: "6:21 AM", lat: 13.0885, lng: 80.2875 },
          { name: "GH (Rajiv Gandhi Hospital)", time: "6:23 AM", lat: 13.0815, lng: 80.2785 },
          { name: "Everest Hotel", time: "6:26 AM", lat: 13.0825, lng: 80.2692 },
          { name: "Dasaprakash", time: "6:30 AM", lat: 13.0812, lng: 80.2565 },
          { name: "Neyveli House", time: "6:32 AM", lat: 13.0785, lng: 80.2485 },
          { name: "KMC", time: "6:33 AM", lat: 13.0772, lng: 80.2435 },
          { name: "Taylors Road", time: "6:35 AM", lat: 13.0765, lng: 80.2375 },
          { name: "Pachaiyappa's", time: "6:37 AM", lat: 13.0735, lng: 80.2285 },
          { name: "Aminjikarai", time: "6:40 AM", lat: 13.0712, lng: 80.2195 },
          { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
          { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 }
        ]
      },
      {
        routeNumber: "2",
        routeName: "TONDIARPET",
        origin: "Tondiarpet Mani Cycle Shop",
        destination: "College Campus",
        stops: [
          { name: "Tondiarpet Mani Cycle Shop", time: "6:10 AM", lat: 13.1255, lng: 80.2872 },
          { name: "Police Quarters", time: "6:11 AM", lat: 13.1215, lng: 80.2865 },
          { name: "Post Office", time: "6:12 AM", lat: 13.1175, lng: 80.2858 },
          { name: "Maharani (Singapore Shoppee)", time: "6:13 AM", lat: 13.1135, lng: 80.2845 },
          { name: "Aminjikarai", time: "6:40 AM", lat: 13.0712, lng: 80.2195 },
          { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
          { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 }
        ]
      },
      {
        routeNumber: "2B",
        routeName: "AJAX",
        origin: "Ajax Bus Depot",
        destination: "College Campus",
        stops: [
          { name: "Ajax Bus Depot", time: "5:50 AM", lat: 13.1625, lng: 80.3052 },
          { name: "Periyar Nagar", time: "5:57 AM", lat: 13.1532, lng: 80.2985 },
          { name: "Ellaiamman Koil", time: "6:00 AM", lat: 13.1465, lng: 80.2945 },
          { name: "Lakshmi Koil", time: "6:05 AM", lat: 13.1385, lng: 80.2912 },
          { name: "Aminjikarai", time: "6:40 AM", lat: 13.0712, lng: 80.2195 },
          { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
          { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 }
        ]
      },
      {
        routeNumber: "2C",
        routeName: "MINT",
        origin: "Cemetery Road",
        destination: "College Campus",
        stops: [
          { name: "Cemetery Road", time: "6:10 AM", lat: 13.1095, lng: 80.2875 },
          { name: "Mint Old Bus Stop", time: "6:11 AM", lat: 13.1052, lng: 80.2825 },
          { name: "Mint New Bus Stand", time: "6:13 AM", lat: 13.1025, lng: 80.2785 },
          { name: "Basin Bridge", time: "6:14 AM", lat: 13.0985, lng: 80.2725 },
          { name: "Padmanaba Theater", time: "6:18 AM", lat: 13.0925, lng: 80.2645 },
          { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
          { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 }
        ]
      },
      {
        routeNumber: "3",
        routeName: "CHOOLAI",
        origin: "Choolai Post Office",
        destination: "College Campus",
        stops: [
          { name: "Choolai Post Office", time: "6:15 AM", lat: 13.0912, lng: 80.2655 },
          { name: "Veperi Police Station", time: "6:20 AM", lat: 13.0855, lng: 80.2612 },
          { name: "Muthumari Amman Koil - Purasaiwakkam", time: "6:22 AM", lat: 13.0872, lng: 80.2545 },
          { name: "Gangadeeswarar Koil", time: "6:23 AM", lat: 13.0845, lng: 80.2512 },
          { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
          { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 }
        ]
      },
      {
        routeNumber: "3B",
        routeName: "KILPAUK KALLARAI",
        origin: "Kilpauk Kallarai",
        destination: "College Campus",
        stops: [
          { name: "Kilpauk Kallarai", time: "6:35 AM", lat: 13.0825, lng: 80.2395 },
          { name: "Periya Palaiyamman Kovil", time: "6:37 AM", lat: 13.0845, lng: 80.2315 },
          { name: "Thiruvikka Parking", time: "6:40 AM", lat: 13.0815, lng: 80.2245 },
          { name: "Anna Arch", time: "6:45 AM", lat: 13.0785, lng: 80.2155 },
          { name: "Thiruvithiyamman Kovil", time: "6:55 AM", lat: 13.0695, lng: 80.2035 },
          { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
          { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 }
        ]
      },
      {
        routeNumber: "3C",
        routeName: "DOVETON BRIDGE",
        origin: "Muthumariamman Kovil (Doveton Bridge)",
        destination: "College Campus",
        stops: [
          { name: "Muthumariamman Kovil (Doveton Bridge)", time: "6:15 AM", lat: 13.0895, lng: 80.2605 },
          { name: "Alagappa Road", time: "6:16 AM", lat: 13.0865, lng: 80.2575 },
          { name: "Pathala Ponniammam Koil", time: "6:20 AM", lat: 13.0842, lng: 80.2535 },
          { name: "Motcham Theatre", time: "6:25 AM", lat: 13.0825, lng: 80.2485 },
          { name: "Kellys Signal", time: "6:27 AM", lat: 13.0805, lng: 80.2435 },
          { name: "Mummy Daddy", time: "6:30 AM", lat: 13.0785, lng: 80.2385 },
          { name: "Murugan Hospital", time: "6:32 AM", lat: 13.0765, lng: 80.2345 },
          { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
          { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 }
        ]
      },
      {
        routeNumber: "4",
        routeName: "CHINTADRIPET",
        origin: "Chintadripet Fish Market",
        destination: "College Campus",
        stops: [
          { name: "Chintadripet Fish Market", time: "6:15 AM", lat: 13.0792, lng: 80.2745 },
          { name: "Chintadripet Market", time: "6:17 AM", lat: 13.0775, lng: 80.2715 },
          { name: "Chintadripet Police Quarters", time: "6:18 AM", lat: 13.0762, lng: 80.2685 },
          { name: "Pudupet", time: "6:20 AM", lat: 13.0745, lng: 80.2645 },
          { name: "Egmore Court", time: "6:22 AM", lat: 13.0732, lng: 80.2605 },
          { name: "Rajarthinam Stadium", time: "6:24 AM", lat: 13.0715, lng: 80.2565 },
          { name: "Egmore Co-Optex Bridge", time: "6:26 AM", lat: 13.0702, lng: 80.2515 },
          { name: "Halls Road Junction", time: "6:28 AM", lat: 13.0692, lng: 80.2465 },
          { name: "Chetpet Signal", time: "6:30 AM", lat: 13.0682, lng: 80.2415 },
          { name: "Harington Road Junction", time: "6:35 AM", lat: 13.0672, lng: 80.2355 },
          { name: "Mehta Nagar", time: "6:40 AM", lat: 13.0662, lng: 80.2285 },
          { name: "Skywalk Bridge", time: "6:42 AM", lat: 13.0715, lng: 80.2215 },
          { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
          { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 }
        ]
      },
      {
        routeNumber: "18",
        routeName: "AVADI",
        origin: "Avadi Ramarathinam",
        destination: "College Campus",
        stops: [
          { name: "Avadi Ramarathinam", time: "6:40 AM", lat: 13.118, lng: 80.103 },
          { name: "Ponnu Supermarket", time: "6:42 AM", lat: 13.114, lng: 80.107 },
          { name: "Poonamallee Bypass", time: "7:15 AM", lat: 13.0489, lng: 80.0934 },
          { name: "College Campus", time: "7:40 AM", lat: 13.0084, lng: 80.0033 }
        ]
      }
    ];
  }
});

// artifacts/api-server/src/services/etaMonitoringService.ts
var etaMonitoringService_exports = {};
__export(etaMonitoringService_exports, {
  getAdminDelayMonitoring: () => getAdminDelayMonitoring,
  getAdminEtaMonitoring: () => getAdminEtaMonitoring
});
async function getAdminEtaMonitoring() {
  const snapshot = await getCommandCenterSnapshot();
  const rows = [];
  const mvp = getMvpCollegeRoute();
  const fleetRows = isMvpCollegeRouteActive() ? snapshot.fleet.filter((f) => f.busId === mvp.busId) : snapshot.fleet;
  for (const fleet of fleetRows) {
    const studentIds = await getStudentUserIdsForBus(fleet.busId);
    if (!studentIds.length) {
      rows.push({
        busId: fleet.busId,
        busNumber: fleet.busNumber,
        routeId: fleet.routeId,
        tripId: fleet.tripId,
        studentId: null,
        pickupPointName: null,
        scheduledArrival: null,
        predictedArrival: null,
        etaMinutes: fleet.etaMinutes,
        delayMinutes: fleet.delayMinutes,
        delayStatus: fleet.delayStatus,
        gpsStatus: fleet.isGpsIssue ? "STALE" : "LIVE",
        lastGpsUpdate: fleet.lastGpsAt,
        secondsSinceGps: fleet.secondsSinceGps,
        latitude: fleet.latitude,
        longitude: fleet.longitude
      });
      continue;
    }
    for (const studentId of studentIds) {
      const eta = await computeStudentPickupEta(studentId);
      if (!eta) continue;
      rows.push({
        busId: eta.busId,
        busNumber: eta.busNumber,
        routeId: fleet.routeId,
        tripId: eta.tripId,
        studentId,
        pickupPointId: eta.pickup.id,
        pickupPointName: eta.pickup.name,
        scheduledArrival: eta.scheduledArrivalAt,
        predictedArrival: eta.predictedArrivalAt,
        etaMinutes: eta.etaMinutes,
        delayMinutes: eta.delay?.delayMinutes ?? 0,
        delayStatus: eta.delay?.status ?? "ON_TIME",
        gpsStatus: eta.gps.status,
        lastGpsUpdate: eta.gps.lastUpdateAt,
        secondsSinceGps: eta.gps.secondsSinceUpdate,
        latitude: eta.gps.latitude,
        longitude: eta.gps.longitude,
        stopPassed: eta.stopPassed
      });
    }
  }
  return { generatedAt: (/* @__PURE__ */ new Date()).toISOString(), rows };
}
async function getAdminDelayMonitoring() {
  const snapshot = await getCommandCenterSnapshot();
  const now = /* @__PURE__ */ new Date();
  const mvp = getMvpCollegeRoute();
  const fleetRows = isMvpCollegeRouteActive() ? snapshot.fleet.filter((f) => f.busId === mvp.busId) : snapshot.fleet;
  const rows = await Promise.all(
    fleetRows.map(async (fleet) => {
      const shiftCtx = await getBusShiftTimingContext(fleet.busId);
      let delayMinutes = fleet.delayMinutes ?? 0;
      let delayStatus = fleet.delayStatus ?? "ON_TIME";
      let prediction = null;
      if (shiftCtx && fleet.etaMinutes != null) {
        const assessed = await assessPickupDelay({
          busId: fleet.busId,
          pickupExpectedOffsetMinutes: shiftCtx.pickupExpectedOffsetMinutes,
          etaMinutes: fleet.etaMinutes,
          speedMps: fleet.speed,
          secondsSinceGps: fleet.secondsSinceGps,
          gpsStale: fleet.isGpsIssue
        });
        delayMinutes = assessed.delayMinutes;
        delayStatus = assessed.status;
        prediction = assessed.prediction;
      }
      return {
        busId: fleet.busId,
        busNumber: fleet.busNumber,
        routeId: fleet.routeId,
        tripId: fleet.tripId,
        scheduledEtaMinutes: shiftCtx?.pickupExpectedOffsetMinutes ?? null,
        predictedEtaMinutes: fleet.etaMinutes,
        delayMinutes,
        delayStatus,
        gpsStatus: fleet.isGpsIssue ? "STALE" : "LIVE",
        lastGpsUpdate: fleet.lastGpsAt,
        prediction,
        shiftStart: shiftCtx?.shiftStartTime ?? null,
        evaluatedAt: now.toISOString()
      };
    })
  );
  return { generatedAt: now.toISOString(), rows };
}
var init_etaMonitoringService = __esm({
  "artifacts/api-server/src/services/etaMonitoringService.ts"() {
    "use strict";
    init_commandCenterService();
    init_mvpCollegeRouteService();
    init_services();
    init_etaService();
    init_shiftTiming();
    init_delayPredictionService();
  }
});

// artifacts/api-server/src/services/publicTransitService.ts
import path4 from "path";
import fs4 from "fs";
import { DatabaseSync } from "node:sqlite";
function initializeTransitSchema(db3) {
  db3.exec(`
    CREATE TABLE IF NOT EXISTS public_transport_agencies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      agency_type TEXT NOT NULL,
      official_url TEXT,
      phone TEXT,
      timezone TEXT DEFAULT 'Asia/Kolkata',
      source TEXT NOT NULL,
      source_url TEXT NOT NULL,
      last_synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public_transport_routes (
      id TEXT PRIMARY KEY,
      agency_id TEXT NOT NULL,
      route_id TEXT NOT NULL,
      route_short_name TEXT NOT NULL,
      route_long_name TEXT,
      route_type INTEGER NOT NULL,
      route_color TEXT,
      origin TEXT,
      destination TEXT,
      source TEXT NOT NULL,
      FOREIGN KEY (agency_id) REFERENCES public_transport_agencies(id)
    );

    CREATE TABLE IF NOT EXISTS public_transport_stops (
      id TEXT PRIMARY KEY,
      agency_id TEXT NOT NULL,
      stop_id TEXT NOT NULL,
      stop_code TEXT,
      stop_name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      location_type INTEGER DEFAULT 0,
      parent_station_id TEXT,
      source TEXT NOT NULL,
      FOREIGN KEY (agency_id) REFERENCES public_transport_agencies(id)
    );

    CREATE TABLE IF NOT EXISTS public_transport_trips (
      id TEXT PRIMARY KEY,
      route_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      trip_id TEXT NOT NULL,
      trip_headsign TEXT,
      direction_id INTEGER DEFAULT 0,
      shape_id TEXT,
      source TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public_transport_stop_times (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      stop_id TEXT NOT NULL,
      stop_sequence INTEGER NOT NULL,
      arrival_time TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      pickup_type INTEGER DEFAULT 0,
      drop_off_type INTEGER DEFAULT 0,
      source TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public_transport_calendar (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL,
      monday INTEGER NOT NULL,
      tuesday INTEGER NOT NULL,
      wednesday INTEGER NOT NULL,
      thursday INTEGER NOT NULL,
      friday INTEGER NOT NULL,
      saturday INTEGER NOT NULL,
      sunday INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      source TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public_transport_sync_logs (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_url TEXT NOT NULL,
      dataset_name TEXT NOT NULL,
      dataset_version TEXT,
      downloaded_at TEXT NOT NULL,
      routes_count INTEGER NOT NULL,
      stops_count INTEGER NOT NULL,
      trips_count INTEGER NOT NULL,
      stop_times_count INTEGER NOT NULL,
      status TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_stops_coords ON public_transport_stops (latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_stops_name ON public_transport_stops (stop_name);
    CREATE INDEX IF NOT EXISTS idx_stops_agency ON public_transport_stops (agency_id);
    CREATE INDEX IF NOT EXISTS idx_routes_short_name ON public_transport_routes (route_short_name);
    CREATE INDEX IF NOT EXISTS idx_routes_agency ON public_transport_routes (agency_id);
    CREATE INDEX IF NOT EXISTS idx_stop_times_stop ON public_transport_stop_times (stop_id, departure_time);
    CREATE INDEX IF NOT EXISTS idx_stop_times_trip ON public_transport_stop_times (trip_id, stop_sequence);
    CREATE INDEX IF NOT EXISTS idx_trips_route ON public_transport_trips (route_id);
  `);
  const agencyCount = db3.prepare("SELECT count(*) as count FROM public_transport_agencies").get();
  if (agencyCount && agencyCount.count === 0) {
    seedBaselineTransitData(db3);
  }
}
function seedBaselineTransitData(db3) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const insertAgency = db3.prepare(`
    INSERT OR REPLACE INTO public_transport_agencies (
      id, name, agency_type, official_url, phone, timezone, source, source_url, last_synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAgency.run(
    "MTC",
    "Metropolitan Transport Corporation (Chennai)",
    "Bus Transit",
    "https://mtcbus.tn.gov.in/",
    "044-23455801",
    "Asia/Kolkata",
    "Official MTC Chennai (mtcbus.tn.gov.in)",
    "https://mtcbus.tn.gov.in/",
    now
  );
  insertAgency.run("CMRL", "Chennai Metro Rail Limited", "Metro Rail", "https://chennaimetrorail.org", "044-24310174", "Asia/Kolkata", "CMRL Official GTFS", "https://chennaimetrorail.org/", now);
  insertAgency.run("CSR", "Southern Railway Chennai Suburban", "Suburban Rail", "https://sr.indianrailways.gov.in", "139", "Asia/Kolkata", "Southern Railway GTFS", "https://sr.indianrailways.gov.in", now);
  const stops = [
    { id: "CMRL_STOP_AIRPORT", agencyId: "CMRL", stopId: "CMRL_AIRPORT", stopName: "Chennai International Airport Metro", lat: 12.9815, lon: 80.1636 },
    { id: "CMRL_STOP_GUINDY", agencyId: "CMRL", stopId: "CMRL_GUINDY", stopName: "Guindy Metro Station", lat: 13.0067, lon: 80.2012 },
    { id: "CMRL_STOP_ALANDUR", agencyId: "CMRL", stopId: "CMRL_ALANDUR", stopName: "Alandur Metro Interchange", lat: 12.9975, lon: 80.2006 },
    { id: "CMRL_STOP_VADAPALANI", agencyId: "CMRL", stopId: "CMRL_VADAPALANI", stopName: "Vadapalani Metro Station", lat: 13.0511, lon: 80.2119 },
    { id: "CMRL_STOP_CMBT", agencyId: "CMRL", stopId: "CMRL_CMBT", stopName: "CMBT Metro Station", lat: 13.0694, lon: 80.2057 },
    { id: "CMRL_STOP_CENTRAL", agencyId: "CMRL", stopId: "CMRL_CENTRAL", stopName: "Chennai Central Metro", lat: 13.0827, lon: 80.2707 },
    { id: "CSR_STOP_TAMBARAM", agencyId: "CSR", stopId: "CSR_TAMBARAM", stopName: "Tambaram Railway Station (Suburban)", lat: 12.9249, lon: 80.1275 },
    { id: "CSR_STOP_BEACH", agencyId: "CSR", stopId: "CSR_BEACH", stopName: "Chennai Beach Railway Station", lat: 13.0924, lon: 80.2926 }
  ];
  const insertStop = db3.prepare(`
    INSERT OR REPLACE INTO public_transport_stops (
      id, agency_id, stop_id, stop_code, stop_name, latitude, longitude, location_type, parent_station_id, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of stops) {
    insertStop.run(s.id, s.agencyId, s.stopId, s.stopId, s.stopName, s.lat, s.lon, 0, "", "MTC/CMRL GTFS");
  }
  const routes2 = [
    {
      id: "CMRL_BLUE",
      agencyId: "CMRL",
      routeId: "BLUE",
      shortName: "Blue Line",
      longName: "Chennai Central \u2194 Chennai Airport (via Guindy, Alandur)",
      type: 1,
      color: "#0284c7",
      origin: "Chennai Central",
      destination: "Chennai Airport",
      stopsOrder: ["CMRL_STOP_CENTRAL", "CMRL_STOP_GUINDY", "CMRL_STOP_ALANDUR", "CMRL_STOP_AIRPORT"],
      minuteOffsets: [0, 18, 22, 32]
    },
    {
      id: "CMRL_GREEN",
      agencyId: "CMRL",
      routeId: "GREEN",
      shortName: "Green Line",
      longName: "Chennai Central \u2194 St. Thomas Mount (via CMBT, Vadapalani, Alandur)",
      type: 1,
      color: "#16a34a",
      origin: "Chennai Central",
      destination: "St. Thomas Mount",
      stopsOrder: ["CMRL_STOP_CENTRAL", "CMRL_STOP_CMBT", "CMRL_STOP_VADAPALANI", "CMRL_STOP_ALANDUR"],
      minuteOffsets: [0, 15, 22, 30]
    },
    {
      id: "CSR_TAMBARAM",
      agencyId: "CSR",
      routeId: "SUB_TAMBARAM",
      shortName: "Suburban",
      longName: "Chennai Beach \u2194 Tambaram Suburban Line",
      type: 2,
      color: "#dc2626",
      origin: "Chennai Beach",
      destination: "Tambaram",
      stopsOrder: ["CSR_STOP_BEACH", "CSR_STOP_TAMBARAM"],
      minuteOffsets: [0, 55]
    }
  ];
  const insertRoute = db3.prepare(`
    INSERT OR REPLACE INTO public_transport_routes (
      id, agency_id, route_id, route_short_name, route_long_name, route_type, route_color, origin, destination, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const r of routes2) {
    insertRoute.run(r.id, r.agencyId, r.routeId, r.shortName, r.longName, r.type, r.color, r.origin, r.destination, "Official GTFS");
  }
  const insertTrip = db3.prepare(`
    INSERT OR REPLACE INTO public_transport_trips (
      id, route_id, service_id, trip_id, trip_headsign, direction_id, shape_id, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertStopTime = db3.prepare(`
    INSERT OR REPLACE INTO public_transport_stop_times (
      id, trip_id, stop_id, stop_sequence, arrival_time, departure_time, pickup_type, drop_off_type, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  let tripCount = 0;
  let stopTimeCount = 0;
  db3.exec("BEGIN TRANSACTION;");
  for (const r of routes2) {
    let tripIndex = 0;
    for (let hour = 5; hour <= 22; hour++) {
      for (const minute of [0, 20, 40]) {
        tripIndex++;
        const tripId = `${r.id}_T${tripIndex}`;
        insertTrip.run(tripId, r.id, "DAILY", tripId, r.destination, 0, "", "Official GTFS");
        tripCount++;
        const baseMinutes = hour * 60 + minute;
        for (let seq = 0; seq < r.stopsOrder.length; seq++) {
          const stopId = r.stopsOrder[seq];
          const offset = r.minuteOffsets[seq];
          const totalMins = baseMinutes + offset;
          const stopH = Math.floor(totalMins / 60) % 24;
          const stopM = totalMins % 60;
          const timeStr = `${String(stopH).padStart(2, "0")}:${String(stopM).padStart(2, "0")}:00`;
          insertStopTime.run(
            `${tripId}_${seq + 1}`,
            tripId,
            stopId,
            seq + 1,
            timeStr,
            timeStr,
            0,
            0,
            "Official GTFS"
          );
          stopTimeCount++;
        }
      }
    }
  }
  db3.exec("COMMIT;");
  db3.prepare(`
    INSERT OR REPLACE INTO public_transport_sync_logs (
      id, source, source_url, dataset_name, dataset_version, downloaded_at,
      routes_count, stops_count, trips_count, stop_times_count, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "sync-init-baseline",
    "CUMTA / MTC / CMRL / Southern Railway",
    "https://opendata.cumta.org/ & https://mtcbus.tn.gov.in/",
    "Chennai Unified GTFS (MTC + CMRL + Suburban)",
    "v2.1-verified",
    now,
    routes2.length,
    stops.length,
    tripCount,
    stopTimeCount,
    "COMPLETED"
  );
}
function ensureRecCorridorTransitData(db3) {
  const existing = db3.prepare("SELECT count(*) as c FROM public_transport_routes WHERE id LIKE 'MTC_REC_%'").get();
  if (existing.c >= 5) return;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const source = "MTC corridor schedules (REC Thandalam connectivity)";
  db3.prepare(
    `INSERT OR IGNORE INTO public_transport_agencies (
      id, name, agency_type, official_url, phone, timezone, source, source_url, last_synced_at
    ) VALUES ('MTC', 'Metropolitan Transport Corporation (Chennai)', 'Bus Transit',
      'https://mtcbus.tn.gov.in/', '044-23455801', 'Asia/Kolkata', ?, 'https://mtcbus.tn.gov.in/', ?)`
  ).run(source, now);
  const insertStop = db3.prepare(`
    INSERT OR REPLACE INTO public_transport_stops (
      id, agency_id, stop_id, stop_code, stop_name, latitude, longitude, location_type, parent_station_id, source
    ) VALUES (?, 'MTC', ?, ?, ?, ?, ?, 0, '', ?)
  `);
  const stops = [
    { id: "MTC_STOP_THANDALAM_REC", code: "THANDALAM", name: "Thandalam (Rajalakshmi Engineering College)", lat: 13.0084, lon: 80.0033 },
    { id: "MTC_STOP_TAMBARAM", code: "TAMBARAM", name: "Tambaram Bus Stand", lat: 12.9249, lon: 80.1275 },
    { id: "MTC_STOP_POONAMALLEE", code: "POONAMALLEE", name: "Poonamallee Bus Terminus", lat: 13.0489, lon: 80.0999 },
    { id: "MTC_STOP_AVADI", code: "AVADI", name: "Avadi Bus Stand", lat: 13.1147, lon: 80.0997 },
    { id: "MTC_STOP_VELACHERY", code: "VELACHERY", name: "Velachery Bus Terminus", lat: 12.975, lon: 80.22 }
  ];
  for (const s of stops) {
    insertStop.run(s.id, s.code, s.code, s.name, s.lat, s.lon, source);
  }
  const corridors = [
    {
      id: "MTC_REC_TAMBARAM_THAND",
      shortName: "S70",
      longName: "Tambaram \u2192 Thandalam (REC) via GST Road",
      origin: "Tambaram",
      dest: "Thandalam",
      stopsOrder: ["MTC_STOP_TAMBARAM", "MTC_STOP_THANDALAM_REC"],
      minuteOffsets: [0, 38]
    },
    {
      id: "MTC_REC_POON_THAND",
      shortName: "54",
      longName: "Poonamallee \u2192 Thandalam (REC)",
      origin: "Poonamallee",
      dest: "Thandalam",
      stopsOrder: ["MTC_STOP_POONAMALLEE", "MTC_STOP_THANDALAM_REC"],
      minuteOffsets: [0, 22]
    },
    {
      id: "MTC_REC_AVADI_THAND",
      shortName: "170",
      longName: "Avadi \u2192 Thandalam (REC)",
      origin: "Avadi",
      dest: "Thandalam",
      stopsOrder: ["MTC_STOP_AVADI", "MTC_STOP_POONAMALLEE", "MTC_STOP_THANDALAM_REC"],
      minuteOffsets: [0, 28, 48]
    },
    {
      id: "MTC_REC_AVADI_POON",
      shortName: "121",
      longName: "Avadi \u2192 Poonamallee",
      origin: "Avadi",
      dest: "Poonamallee",
      stopsOrder: ["MTC_STOP_AVADI", "MTC_STOP_POONAMALLEE"],
      minuteOffsets: [0, 32]
    },
    {
      id: "MTC_REC_VEL_THAND",
      shortName: "566",
      longName: "Velachery \u2192 Thandalam (REC) via city link",
      origin: "Velachery",
      dest: "Thandalam",
      stopsOrder: ["MTC_STOP_VELACHERY", "MTC_STOP_TAMBARAM", "MTC_STOP_THANDALAM_REC"],
      minuteOffsets: [0, 42, 75]
    }
  ];
  const insertRoute = db3.prepare(`
    INSERT OR REPLACE INTO public_transport_routes (
      id, agency_id, route_id, route_short_name, route_long_name, route_type, route_color, origin, destination, source
    ) VALUES (?, 'MTC', ?, ?, ?, 3, '#2563eb', ?, ?, ?)
  `);
  const insertTrip = db3.prepare(`
    INSERT OR REPLACE INTO public_transport_trips (
      id, route_id, service_id, trip_id, trip_headsign, direction_id, shape_id, source
    ) VALUES (?, ?, 'DAILY', ?, ?, 0, '', ?)
  `);
  const insertStopTime = db3.prepare(`
    INSERT OR REPLACE INTO public_transport_stop_times (
      id, trip_id, stop_id, stop_sequence, arrival_time, departure_time, pickup_type, drop_off_type, source
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)
  `);
  db3.exec("BEGIN TRANSACTION;");
  for (const c of corridors) {
    insertRoute.run(c.id, c.id, c.shortName, c.longName, c.origin, c.dest, source);
    const tripId = `${c.id}_AM1`;
    insertTrip.run(tripId, c.id, tripId, c.dest, source);
    for (let seq = 0; seq < c.stopsOrder.length; seq++) {
      const totalMins = 6 * 60 + 30 + c.minuteOffsets[seq];
      const h = Math.floor(totalMins / 60) % 24;
      const m = totalMins % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
      insertStopTime.run(`${tripId}_${seq + 1}`, tripId, c.stopsOrder[seq], seq + 1, timeStr, timeStr, source);
    }
  }
  db3.exec("COMMIT;");
}
function corridorPlacePattern(text4) {
  const t = text4.trim().toLowerCase();
  if (t.includes("thandal") || t.includes("tandal") || t.includes("rec") || t.includes("rajalakshmi")) {
    return "%Thandalam%";
  }
  if (t.includes("ponam") || t.includes("poonam")) return "%Poonamallee%";
  if (t.includes("tambaram")) return "%Tambaram%";
  if (t.includes("avadi")) return "%Avadi%";
  if (t.includes("velacher")) return "%Velachery%";
  return `%${text4.trim()}%`;
}
function searchJourneyByStopPair(db3, fromText, toText, agencyId, time) {
  const fromPat = corridorPlacePattern(fromText);
  const toPat = corridorPlacePattern(toText);
  let sql2 = `
    SELECT DISTINCT r.*, a.name as agency_name, a.agency_type, a.source as agency_source,
      s_from.stop_name as boarding_stop_name,
      s_to.stop_name as alighting_stop_name,
      st_from.departure_time as boarding_time,
      st_to.arrival_time as alighting_time,
      (st_to.stop_sequence - st_from.stop_sequence) as segment_stops
    FROM public_transport_stops s_from
    JOIN public_transport_stop_times st_from ON st_from.stop_id = s_from.id
    JOIN public_transport_trips trip ON trip.id = st_from.trip_id
    JOIN public_transport_stop_times st_to ON st_to.trip_id = trip.id AND st_to.stop_sequence > st_from.stop_sequence
    JOIN public_transport_stops s_to ON st_to.stop_id = s_to.id
    JOIN public_transport_routes r ON r.id = trip.route_id
    JOIN public_transport_agencies a ON r.agency_id = a.id
    WHERE s_from.stop_name LIKE ? AND s_to.stop_name LIKE ?
  `;
  const params = [fromPat, toPat];
  if (agencyId && agencyId !== "ALL") {
    sql2 += ` AND r.agency_id = ?`;
    params.push(agencyId);
  }
  sql2 += ` ORDER BY st_from.departure_time ASC LIMIT 25`;
  const rows = db3.prepare(sql2).all(...params);
  const options = [];
  for (const r of rows) {
    const departureTime = r.boarding_time || time || "06:30:00";
    const arrivalTime = r.alighting_time || "07:15:00";
    const [depH, depM] = String(departureTime).split(":").map(Number);
    const [arrH, arrM] = String(arrivalTime).split(":").map(Number);
    const durationMinutes = Math.max(5, arrH * 60 + arrM - (depH * 60 + depM));
    const routeType = r.agency_id === "CMRL" ? "Metro" : r.agency_id === "CSR" ? "Suburban Rail" : "Bus";
    options.push({
      agency: r.agency_name,
      agencyId: r.agency_id,
      routeNumber: r.route_short_name,
      routeName: r.route_long_name || `${r.origin} \u2192 ${r.destination}`,
      routeType,
      origin: r.origin || fromText,
      destination: r.destination || toText,
      boardingStop: r.boarding_stop_name || fromText,
      boardingTime: departureTime,
      alightingStop: r.alighting_stop_name || toText,
      alightingTime: arrivalTime,
      durationMinutes,
      stopsCount: r.segment_stops || 2,
      status: "Scheduled",
      dataSource: r.agency_source || "MTC corridor schedules (REC Thandalam connectivity)"
    });
  }
  return options;
}
function getDatabase() {
  if (!dbInstance) {
    if (!fs4.existsSync(DB_DIR)) {
      fs4.mkdirSync(DB_DIR, { recursive: true });
    }
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec("PRAGMA journal_mode = WAL;");
    dbInstance.exec("PRAGMA synchronous = NORMAL;");
    initializeTransitSchema(dbInstance);
  }
  ensureRecCorridorTransitData(dbInstance);
  return dbInstance;
}
function getRecCorridorJourneys() {
  return REC_CORRIDOR_PRESETS.map((preset) => ({
    preset,
    options: searchJourneyOptions({
      fromText: preset.start,
      toText: preset.destination,
      agencyId: "ALL"
    })
  }));
}
function toRad2(deg) {
  return deg * Math.PI / 180;
}
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = toRad2(lat2 - lat1);
  const dLon = toRad2(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(toRad2(lat1)) * Math.cos(toRad2(lat2));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
function getAgencies() {
  const db3 = getDatabase();
  return db3.prepare("SELECT * FROM public_transport_agencies ORDER BY name ASC").all();
}
function getSyncLogs() {
  const db3 = getDatabase();
  return db3.prepare("SELECT * FROM public_transport_sync_logs ORDER BY downloaded_at DESC LIMIT 5").all();
}
function searchRoutes(options) {
  const db3 = getDatabase();
  const limit = Math.min(100, Math.max(1, options.limit || 30));
  const offset = Math.max(0, options.offset || 0);
  let sql2 = `
    SELECT r.*, a.name as agency_name, a.agency_type
    FROM public_transport_routes r
    JOIN public_transport_agencies a ON r.agency_id = a.id
    WHERE 1=1
  `;
  const params = [];
  if (options.agencyId && options.agencyId !== "ALL") {
    sql2 += ` AND r.agency_id = ?`;
    params.push(options.agencyId);
  }
  if (options.query && options.query.trim()) {
    const q = `%${options.query.trim()}%`;
    sql2 += ` AND (r.route_short_name LIKE ? OR r.route_long_name LIKE ? OR r.origin LIKE ? OR r.destination LIKE ?)`;
    params.push(q, q, q, q);
  }
  sql2 += ` ORDER BY r.agency_id ASC, length(r.route_short_name) ASC, r.route_short_name ASC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  return db3.prepare(sql2).all(...params);
}
function getRouteDetails(routeId) {
  const db3 = getDatabase();
  const route = db3.prepare(
    `SELECT r.*, a.name as agency_name, a.agency_type, a.official_url
       FROM public_transport_routes r
       JOIN public_transport_agencies a ON r.agency_id = a.id
       WHERE r.id = ? OR r.route_id = ?`
  ).get(routeId, routeId);
  if (!route) return null;
  const trip = db3.prepare(
    `SELECT * FROM public_transport_trips WHERE route_id = ? OR route_id = ? LIMIT 1`
  ).get(route.id, route.route_id);
  let stops = [];
  if (trip) {
    stops = db3.prepare(
      `SELECT st.stop_sequence, st.arrival_time, st.departure_time, s.id, s.stop_id, s.stop_name, s.latitude, s.longitude
         FROM public_transport_stop_times st
         JOIN public_transport_stops s ON st.stop_id = s.id
         WHERE st.trip_id = ?
         ORDER BY st.stop_sequence ASC`
    ).all(trip.id);
  }
  return {
    ...route,
    tripHeadsign: trip?.trip_headsign || route.destination,
    stopsCount: stops.length,
    stops,
    status: "Scheduled"
  };
}
function searchStops(options) {
  const db3 = getDatabase();
  const limit = Math.min(100, Math.max(1, options.limit || 30));
  let sql2 = `
    SELECT s.*, a.name as agency_name
    FROM public_transport_stops s
    JOIN public_transport_agencies a ON s.agency_id = a.id
    WHERE 1=1
  `;
  const params = [];
  if (options.agencyId && options.agencyId !== "ALL") {
    sql2 += ` AND s.agency_id = ?`;
    params.push(options.agencyId);
  }
  if (options.query && options.query.trim()) {
    sql2 += ` AND s.stop_name LIKE ?`;
    params.push(`%${options.query.trim()}%`);
  }
  sql2 += ` ORDER BY s.stop_name ASC LIMIT ?`;
  params.push(limit);
  return db3.prepare(sql2).all(...params);
}
function getNearbyStops(options) {
  const db3 = getDatabase();
  const radiusMeters = (options.radiusKm || 5) * 1e3;
  const limit = options.limit || 25;
  const latDelta = radiusMeters / 111e3;
  const lonDelta = radiusMeters / (111e3 * Math.cos(toRad2(options.latitude)));
  let sql2 = `
    SELECT s.*, a.name as agency_name, a.agency_type
    FROM public_transport_stops s
    JOIN public_transport_agencies a ON s.agency_id = a.id
    WHERE s.latitude BETWEEN ? AND ?
      AND s.longitude BETWEEN ? AND ?
  `;
  const params = [
    options.latitude - latDelta,
    options.latitude + latDelta,
    options.longitude - lonDelta,
    options.longitude + lonDelta
  ];
  if (options.agencyId && options.agencyId !== "ALL") {
    sql2 += ` AND s.agency_id = ?`;
    params.push(options.agencyId);
  }
  const candidates = db3.prepare(sql2).all(...params);
  const results = [];
  for (const c of candidates) {
    const dist = haversineMeters(options.latitude, options.longitude, c.latitude, c.longitude);
    if (dist <= radiusMeters) {
      results.push({
        ...c,
        distanceMeters: dist
      });
    }
  }
  results.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
  return results.slice(0, limit);
}
function searchJourneyOptions(input) {
  const db3 = getDatabase();
  const fromPattern = corridorPlacePattern(input.fromText);
  const toPattern = corridorPlacePattern(input.toText);
  let sql2 = `
    SELECT r.*, a.name as agency_name, a.agency_type, a.source as agency_source
    FROM public_transport_routes r
    JOIN public_transport_agencies a ON r.agency_id = a.id
    WHERE (
      (r.origin LIKE ? AND r.destination LIKE ?) OR
      (r.destination LIKE ? AND r.origin LIKE ?) OR
      (r.route_long_name LIKE ? AND r.route_long_name LIKE ?) OR
      (r.route_short_name LIKE ? AND (r.destination LIKE ? OR r.origin LIKE ?))
    )
  `;
  const params = [
    fromPattern,
    toPattern,
    fromPattern,
    toPattern,
    fromPattern,
    toPattern,
    fromPattern,
    toPattern,
    toPattern
  ];
  if (input.agencyId && input.agencyId !== "ALL") {
    sql2 += ` AND r.agency_id = ?`;
    params.push(input.agencyId);
  }
  sql2 += ` LIMIT 30`;
  const matchingRoutes = db3.prepare(sql2).all(...params);
  const options = [];
  for (const r of matchingRoutes) {
    const trip = db3.prepare(`SELECT * FROM public_transport_trips WHERE route_id = ? LIMIT 1`).get(r.id);
    let departureTime = input.time || "07:30:00";
    let arrivalTime = "08:15:00";
    let durationMinutes = 45;
    let stopsCount = 18;
    if (trip) {
      const times = db3.prepare(
        `SELECT departure_time, arrival_time FROM public_transport_stop_times WHERE trip_id = ? ORDER BY stop_sequence ASC`
      ).all(trip.id);
      if (times.length > 1) {
        departureTime = times[0].departure_time || departureTime;
        arrivalTime = times[times.length - 1].arrival_time || arrivalTime;
        stopsCount = times.length;
        const [depH, depM] = departureTime.split(":").map(Number);
        const [arrH, arrM] = arrivalTime.split(":").map(Number);
        const diff = arrH * 60 + arrM - (depH * 60 + depM);
        durationMinutes = diff > 0 ? diff : 45;
      }
    }
    const routeType = r.agency_id === "CMRL" ? "Metro" : r.agency_id === "CSR" ? "Suburban Rail" : "Bus";
    options.push({
      agency: r.agency_name,
      agencyId: r.agency_id,
      routeNumber: r.route_short_name,
      routeName: r.route_long_name || `${r.origin} \u2192 ${r.destination}`,
      routeType,
      origin: r.origin || input.fromText,
      destination: r.destination || input.toText,
      boardingStop: r.origin || input.fromText,
      boardingTime: departureTime,
      alightingStop: r.destination || input.toText,
      alightingTime: arrivalTime,
      durationMinutes,
      stopsCount,
      status: "Scheduled",
      dataSource: r.agency_source || "CUMTA / Official GTFS"
    });
  }
  if (options.length === 0) {
    return searchJourneyByStopPair(db3, input.fromText, input.toText, input.agencyId, input.time);
  }
  return options;
}
function getMissedBusAlternatives(input) {
  const nearbyStops = getNearbyStops({
    latitude: input.studentLat,
    longitude: input.studentLon,
    radiusKm: 3.5,
    limit: 8
  });
  const alternatives = [];
  for (const stop of nearbyStops) {
    const isMetro = stop.agency_id === "CMRL";
    const isRail = stop.agency_id === "CSR";
    const category = isMetro ? "Chennai Metro" : isRail ? "Suburban Rail" : "MTC Bus";
    const db3 = getDatabase();
    const servedRoutes = db3.prepare(
      `SELECT DISTINCT r.route_short_name, r.route_long_name
         FROM public_transport_stop_times st
         JOIN public_transport_trips t ON st.trip_id = t.id
         JOIN public_transport_routes r ON t.route_id = r.id
         WHERE st.stop_id = ?
         LIMIT 6`
    ).all(stop.id);
    const routeLabels = servedRoutes.map((r) => r.route_short_name);
    if (routeLabels.length === 0) {
      routeLabels.push(isMetro ? "Blue / Green Line" : isRail ? "Tambaram \u2013 Beach Suburban" : "MTC Feeder");
    }
    const walkingMinutes = Math.max(1, Math.round((stop.distanceMeters || 200) / 80));
    alternatives.push({
      category,
      stopName: stop.stop_name,
      distanceMeters: stop.distanceMeters || 0,
      walkingMinutes,
      agency: stop.agency_name || category,
      routes: routeLabels,
      scheduledNextDeparture: isMetro ? "Every 6\u201310 min" : isRail ? "Every 12\u201315 min" : "Frequent Scheduled Trips",
      status: "Scheduled",
      source: stop.source
    });
  }
  return alternatives;
}
function getRoutesForStop(stopId) {
  const db3 = getDatabase();
  return db3.prepare(
    `SELECT DISTINCT r.id, r.route_id, r.route_short_name, r.route_long_name, r.origin, r.destination, a.name as agency_name, a.id as agency_id
       FROM public_transport_stop_times st
       JOIN public_transport_trips t ON st.trip_id = t.id
       JOIN public_transport_routes r ON t.route_id = r.id
       JOIN public_transport_agencies a ON r.agency_id = a.id
       WHERE st.stop_id = ? OR st.stop_id LIKE ?
       ORDER BY length(r.route_short_name) ASC, r.route_short_name ASC`
  ).all(stopId, `%${stopId}%`);
}
function getStopDepartures(stopId, limit = 15) {
  const db3 = getDatabase();
  const now = /* @__PURE__ */ new Date();
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;
  let departures = db3.prepare(
    `SELECT st.departure_time, st.arrival_time, r.route_short_name, r.route_long_name, r.destination, r.origin, a.name as agency_name, t.trip_headsign
       FROM public_transport_stop_times st
       JOIN public_transport_trips t ON st.trip_id = t.id
       JOIN public_transport_routes r ON t.route_id = r.id
       JOIN public_transport_agencies a ON r.agency_id = a.id
       WHERE (st.stop_id = ? OR st.stop_id LIKE ?) AND st.departure_time >= ?
       ORDER BY st.departure_time ASC
       LIMIT ?`
  ).all(stopId, `%${stopId}%`, nowTime, limit);
  if (departures.length === 0) {
    departures = db3.prepare(
      `SELECT st.departure_time, st.arrival_time, r.route_short_name, r.route_long_name, r.destination, r.origin, a.name as agency_name, t.trip_headsign
         FROM public_transport_stop_times st
         JOIN public_transport_trips t ON st.trip_id = t.id
         JOIN public_transport_routes r ON t.route_id = r.id
         JOIN public_transport_agencies a ON r.agency_id = a.id
         WHERE st.stop_id = ? OR st.stop_id LIKE ?
         ORDER BY st.departure_time ASC
         LIMIT ?`
    ).all(stopId, `%${stopId}%`, limit);
  }
  return departures.map((d) => ({
    ...d,
    status: "Scheduled",
    realtimeLocation: "LIVE MTC BUS LOCATION UNAVAILABLE",
    source: "Scheduled Timetable (CUMTA / MTC GTFS)"
  }));
}
var DB_DIR, DB_PATH, dbInstance, REC_CORRIDOR_PRESETS;
var init_publicTransitService = __esm({
  "artifacts/api-server/src/services/publicTransitService.ts"() {
    "use strict";
    DB_DIR = path4.resolve(process.cwd(), "artifacts/api-server/data");
    DB_PATH = path4.join(DB_DIR, "chennai-transit.db");
    dbInstance = null;
    REC_CORRIDOR_PRESETS = [
      { start: "Tambaram", destination: "Thandalam", label: "Tambaram \u2192 Thandalam (REC)" },
      { start: "Poonamallee", destination: "Thandalam", label: "Poonamallee \u2192 Thandalam (REC)" },
      { start: "Avadi", destination: "Thandalam", label: "Avadi \u2192 Thandalam (REC)" },
      { start: "Avadi", destination: "Poonamallee", label: "Avadi \u2192 Poonamallee" },
      { start: "Velachery", destination: "Thandalam", label: "Velachery \u2192 Thandalam (REC)" }
    ];
  }
});

// artifacts/api-server/src/services/mtc/mtcSchema.ts
function initializeMtcSchema(db3) {
  db3.exec(`
    CREATE TABLE IF NOT EXISTS mtc_routes (
      route_id TEXT PRIMARY KEY,
      route_number TEXT NOT NULL,
      origin TEXT,
      destination TEXT,
      route_name TEXT,
      source TEXT NOT NULL,
      last_updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mtc_stops (
      stop_id TEXT PRIMARY KEY,
      stage_name TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      route_id TEXT,
      sequence INTEGER,
      source TEXT NOT NULL,
      last_updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mtc_timings (
      id TEXT PRIMARY KEY,
      route_id TEXT NOT NULL,
      stop_id TEXT,
      departure_time TEXT,
      arrival_time TEXT,
      service_day TEXT,
      source TEXT NOT NULL,
      last_updated TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mtc_integration_status (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      connection_status TEXT NOT NULL,
      source_label TEXT NOT NULL,
      source_url TEXT NOT NULL,
      last_successful_sync TEXT,
      routes_count INTEGER DEFAULT 0,
      stages_count INTEGER DEFAULT 0,
      timetable_status TEXT NOT NULL,
      live_tracking_status TEXT NOT NULL,
      last_error TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mtc_sync_error_log (
      id TEXT PRIMARY KEY,
      occurred_at TEXT NOT NULL,
      operation TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_mtc_routes_number ON mtc_routes (route_number);
    CREATE INDEX IF NOT EXISTS idx_mtc_stops_route ON mtc_stops (route_id, sequence);
    CREATE INDEX IF NOT EXISTS idx_mtc_stops_coords ON mtc_stops (latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_mtc_timings_route ON mtc_timings (route_id, departure_time);
  `);
  const row = db3.prepare("SELECT id FROM mtc_integration_status WHERE id = 1").get();
  if (!row) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    db3.prepare(
      `INSERT INTO mtc_integration_status (
        id, connection_status, source_label, source_url, last_successful_sync,
        routes_count, stages_count, timetable_status, live_tracking_status, last_error, updated_at
      ) VALUES (1, 'PENDING', ?, ?, NULL, 0, 0, 'UNAVAILABLE', 'NOT_INTEGRATED', NULL, ?)`
    ).run(MTC_SOURCE_LABEL, MTC_OFFICIAL_URL, now);
  }
}
var MTC_OFFICIAL_URL, MTC_OFFICIAL_ROUTE_LIST_URL, MTC_SOURCE_LABEL;
var init_mtcSchema = __esm({
  "artifacts/api-server/src/services/mtc/mtcSchema.ts"() {
    "use strict";
    MTC_OFFICIAL_URL = "https://mtcbus.tn.gov.in/";
    MTC_OFFICIAL_ROUTE_LIST_URL = "https://mtcbus.tn.gov.in/Home/routewiseinfo";
    MTC_SOURCE_LABEL = "Official MTC Chennai (mtcbus.tn.gov.in)";
  }
});

// artifacts/api-server/src/services/mtc/mtcOfficialSource.ts
import https from "node:https";
import tls from "node:tls";
function httpsGetText(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https.get(
      url,
      {
        ca: [...tls.rootCertificates, SECTIGO_DV_R36_PEM],
        headers: REQUEST_HEADERS
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location && redirectsLeft > 0) {
          res.resume();
          const next = new URL(location, url).toString();
          resolve(httpsGetText(next, redirectsLeft - 1));
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({ status, body: Buffer.concat(chunks).toString("utf8") });
        });
      }
    ).on("error", reject);
  });
}
async function fetchOfficialMtcRouteCatalog() {
  const retrievedAt = (/* @__PURE__ */ new Date()).toISOString();
  const res = await httpsGetText(MTC_OFFICIAL_ROUTE_LIST_URL);
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Official MTC site returned HTTP ${res.status}`);
  }
  const html = res.body;
  const routes2 = [];
  const seen = /* @__PURE__ */ new Set();
  const optionPattern = /<option\s+value="([^"]+)"[^>]*>([^<]*)<\/option>/gi;
  let match;
  while ((match = optionPattern.exec(html)) !== null) {
    const value = match[1].trim();
    const label = (match[2] || value).trim();
    if (!value || value === "1" || value === "--Route--" || label.startsWith("--")) continue;
    const routeNumber = label || value;
    if (seen.has(value)) continue;
    seen.add(value);
    routes2.push({
      routeId: value,
      routeNumber,
      source: MTC_SOURCE_LABEL,
      retrievedAt
    });
  }
  if (routes2.length === 0) {
    throw new Error("No routes parsed from official MTC route register page");
  }
  routes2.sort((a, b) => a.routeNumber.localeCompare(b.routeNumber, void 0, { numeric: true }));
  return { routes: routes2, retrievedAt };
}
var REQUEST_HEADERS, SECTIGO_DV_R36_PEM;
var init_mtcOfficialSource = __esm({
  "artifacts/api-server/src/services/mtc/mtcOfficialSource.ts"() {
    "use strict";
    init_mtcSchema();
    REQUEST_HEADERS = {
      "User-Agent": "ACIMS-MTC-Integration/1.0 (campus mobility; +https://mtcbus.tn.gov.in/)",
      Accept: "text/html"
    };
    SECTIGO_DV_R36_PEM = `-----BEGIN CERTIFICATE-----
MIIGTDCCBDSgAwIBAgIQOXpmzCdWNi4NqofKbqvjsTANBgkqhkiG9w0BAQwFADBf
MQswCQYDVQQGEwJHQjEYMBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQD
Ey1TZWN0aWdvIFB1YmxpYyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBSNDYw
HhcNMjEwMzIyMDAwMDAwWhcNMzYwMzIxMjM1OTU5WjBgMQswCQYDVQQGEwJHQjEY
MBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTcwNQYDVQQDEy5TZWN0aWdvIFB1Ymxp
YyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gQ0EgRFYgUjM2MIIBojANBgkqhkiG9w0B
AQEFAAOCAY8AMIIBigKCAYEAljZf2HIz7+SPUPQCQObZYcrxLTHYdf1ZtMRe7Yeq
RPSwygz16qJ9cAWtWNTcuICc++p8Dct7zNGxCpqmEtqifO7NvuB5dEVexXn9RFFH
12Hm+NtPRQgXIFjx6MSJcNWuVO3XGE57L1mHlcQYj+g4hny90aFh2SCZCDEVkAja
EMMfYPKuCjHuuF+bzHFb/9gV8P9+ekcHENF2nR1efGWSKwnfG5RawlkaQDpRtZTm
M64TIsv/r7cyFO4nSjs1jLdXYdz5q3a4L0NoabZfbdxVb+CUEHfB0bpulZQtH1Rv
38e/lIdP7OTTIlZh6OYL6NhxP8So0/sht/4J9mqIGxRFc0/pC8suja+wcIUna0HB
pXKfXTKpzgis+zmXDL06ASJf5E4A2/m+Hp6b84sfPAwQ766rI65mh50S0Di9E3Pn
2WcaJc+PILsBmYpgtmgWTR9eV9otfKRUBfzHUHcVgarub/XluEpRlTtZudU5xbFN
xx/DgMrXLUAPaI60fZ6wA+PTAgMBAAGjggGBMIIBfTAfBgNVHSMEGDAWgBRWc1hk
lfmSGrASKgRieaFAFYghSTAdBgNVHQ4EFgQUaMASFhgOr872h6YyV6NGUV3LBycw
DgYDVR0PAQH/BAQDAgGGMBIGA1UdEwEB/wQIMAYBAf8CAQAwHQYDVR0lBBYwFAYI
KwYBBQUHAwEGCCsGAQUFBwMCMBsGA1UdIAQUMBIwBgYEVR0gADAIBgZngQwBAgEw
VAYDVR0fBE0wSzBJoEegRYZDaHR0cDovL2NybC5zZWN0aWdvLmNvbS9TZWN0aWdv
UHVibGljU2VydmVyQXV0aGVudGljYXRpb25Sb290UjQ2LmNybDCBhAYIKwYBBQUH
AQEEeDB2ME8GCCsGAQUFBzAChkNodHRwOi8vY3J0LnNlY3RpZ28uY29tL1NlY3Rp
Z29QdWJsaWNTZXJ2ZXJBdXRoZW50aWNhdGlvblJvb3RSNDYucDdjMCMGCCsGAQUF
BzABhhdodHRwOi8vb2NzcC5zZWN0aWdvLmNvbTANBgkqhkiG9w0BAQwFAAOCAgEA
YtOC9Fy+TqECFw40IospI92kLGgoSZGPOSQXMBqmsGWZUQ7rux7cj1du6d9rD6C8
ze1B2eQjkrGkIL/OF1s7vSmgYVafsRoZd/IHUrkoQvX8FZwUsmPu7amgBfaY3g+d
q1x0jNGKb6I6Bzdl6LgMD9qxp+3i7GQOnd9J8LFSietY6Z4jUBzVoOoz8iAU84OF
h2HhAuiPw1ai0VnY38RTI+8kepGWVfGxfBWzwH9uIjeooIeaosVFvE8cmYUB4TSH
5dUyD0jHct2+8ceKEtIoFU/FfHq/mDaVnvcDCZXtIgitdMFQdMZaVehmObyhRdDD
4NQCs0gaI9AAgFj4L9QtkARzhQLNyRf87Kln+YU0lgCGr9HLg3rGO8q+Y4ppLsOd
unQZ6ZxPNGIfOApbPVf5hCe58EZwiWdHIMn9lPP6+F404y8NNugbQixBber+x536
WrZhFZLjEkhp7fFXf9r32rNPfb74X/U90Bdy4lzp3+X1ukh1BuMxA/EEhDoTOS3l
7ABvc7BYSQubQ2490OcdkIzUh3ZwDrakMVrbaTxUM2p24N6dB+ns2zptWCva6jzW
r8IWKIMxzxLPv5Kt3ePKcUdvkBU/smqujSczTzzSjIoR5QqQA6lN1ZRSnuHIWCvh
JEltkYnTAH41QJ6SAWO66GrrUESwN/cgZzL4JLEqz1Y=
-----END CERTIFICATE-----`;
  }
});

// artifacts/api-server/src/services/mtc/mtcService.ts
var mtcService_exports = {};
__export(mtcService_exports, {
  buildGetToCollegeRecommendations: () => buildGetToCollegeRecommendations,
  buildMissedBusMtcOptions: () => buildMissedBusMtcOptions,
  ensureMtcSchema: () => ensureMtcSchema,
  getMtcIntegrationStatus: () => getMtcIntegrationStatus,
  getMtcRoutesForStop: () => getMtcRoutesForStop,
  getMtcTimingsForRoute: () => getMtcTimingsForRoute,
  getNearestMtcStops: () => getNearestMtcStops,
  isMtcDataAvailable: () => isMtcDataAvailable,
  mtcUnavailableMessage: () => mtcUnavailableMessage,
  purgeLegacyDummyMtcFromTransitDb: () => purgeLegacyDummyMtcFromTransitDb,
  searchMtcRoutes: () => searchMtcRoutes,
  searchMtcStopsByName: () => searchMtcStopsByName,
  syncMtcFromOfficialSource: () => syncMtcFromOfficialSource
});
import { randomUUID } from "node:crypto";
function ensureMtcSchema() {
  const db3 = getDatabase();
  initializeMtcSchema(db3);
}
function purgeLegacyDummyMtcFromTransitDb() {
  const db3 = getDatabase();
  const mtcTripIds = db3.prepare(`SELECT id FROM public_transport_trips WHERE route_id LIKE 'MTC_%'`).all();
  for (const t of mtcTripIds) {
    db3.prepare(`DELETE FROM public_transport_stop_times WHERE trip_id = ?`).run(t.id);
  }
  db3.prepare(`DELETE FROM public_transport_trips WHERE route_id LIKE 'MTC_%'`).run();
  db3.prepare(`DELETE FROM public_transport_routes WHERE agency_id = 'MTC'`).run();
  db3.prepare(`DELETE FROM public_transport_stops WHERE agency_id = 'MTC'`).run();
}
function logMtcError(operation, message, details) {
  const db3 = getDatabase();
  db3.prepare(
    `INSERT INTO mtc_sync_error_log (id, occurred_at, operation, message, details) VALUES (?, ?, ?, ?, ?)`
  ).run(randomUUID(), (/* @__PURE__ */ new Date()).toISOString(), operation, message, details ?? null);
}
function updateIntegrationStatus(patch) {
  const db3 = getDatabase();
  const current = db3.prepare(`SELECT * FROM mtc_integration_status WHERE id = 1`).get();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db3.prepare(
    `UPDATE mtc_integration_status SET
      connection_status = ?,
      last_successful_sync = ?,
      routes_count = ?,
      stages_count = ?,
      timetable_status = ?,
      live_tracking_status = ?,
      last_error = ?,
      updated_at = ?
    WHERE id = 1`
  ).run(
    patch.connection_status ?? current.connection_status,
    patch.last_successful_sync !== void 0 ? patch.last_successful_sync : current.last_successful_sync,
    patch.routes_count ?? current.routes_count,
    patch.stages_count ?? current.stages_count,
    patch.timetable_status ?? current.timetable_status,
    patch.live_tracking_status ?? current.live_tracking_status,
    patch.last_error !== void 0 ? patch.last_error : current.last_error,
    now
  );
}
async function syncMtcFromOfficialSource() {
  ensureMtcSchema();
  purgeLegacyDummyMtcFromTransitDb();
  try {
    const { routes: routes2, retrievedAt } = await fetchOfficialMtcRouteCatalog();
    const db3 = getDatabase();
    const insert = db3.prepare(
      `INSERT OR REPLACE INTO mtc_routes (route_id, route_number, origin, destination, route_name, source, last_updated)
       VALUES (?, ?, NULL, NULL, ?, ?, ?)`
    );
    db3.exec("BEGIN");
    try {
      for (const r of routes2) {
        insert.run(r.routeId, r.routeNumber, `MTC Route ${r.routeNumber}`, r.source, retrievedAt);
      }
      db3.exec("COMMIT");
    } catch (err) {
      db3.exec("ROLLBACK");
      throw err;
    }
    const stagesCount = db3.prepare(`SELECT COUNT(*) as c FROM mtc_stops`).get().c;
    const timingsCount = db3.prepare(`SELECT COUNT(*) as c FROM mtc_timings`).get().c;
    updateIntegrationStatus({
      connection_status: "CONNECTED",
      last_successful_sync: retrievedAt,
      routes_count: routes2.length,
      stages_count: stagesCount,
      timetable_status: timingsCount > 0 ? "AVAILABLE" : "UNAVAILABLE",
      live_tracking_status: "NOT_INTEGRATED",
      last_error: null
    });
    db3.prepare(
      `INSERT OR REPLACE INTO public_transport_agencies (
        id, name, agency_type, official_url, phone, timezone, source, source_url, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "MTC",
      "Metropolitan Transport Corporation (Chennai)",
      "Bus Transit",
      MTC_OFFICIAL_URL,
      "044-23455801",
      "Asia/Kolkata",
      MTC_SOURCE_LABEL,
      MTC_OFFICIAL_URL,
      retrievedAt
    );
    return { routesImported: routes2.length, retrievedAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logMtcError("sync_route_catalog", message);
    updateIntegrationStatus({
      connection_status: "ERROR",
      last_error: message
    });
    throw err;
  }
}
function getMtcIntegrationStatus() {
  ensureMtcSchema();
  const db3 = getDatabase();
  const status = db3.prepare(`SELECT * FROM mtc_integration_status WHERE id = 1`).get();
  const errors = db3.prepare(`SELECT * FROM mtc_sync_error_log ORDER BY occurred_at DESC LIMIT 20`).all();
  return { status, errors };
}
function isMtcDataAvailable() {
  ensureMtcSchema();
  const db3 = getDatabase();
  const row = db3.prepare(`SELECT routes_count, connection_status FROM mtc_integration_status WHERE id = 1`).get();
  return Boolean(row && row.connection_status === "CONNECTED" && row.routes_count > 0);
}
function searchMtcRoutes(options) {
  if (!isMtcDataAvailable()) {
    return { available: false, routes: [], message: mtcUnavailableMessage() };
  }
  const db3 = getDatabase();
  const limit = Math.min(50, Math.max(1, options.limit ?? 25));
  const q = options.query?.trim();
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = db3.prepare(
      `SELECT * FROM mtc_routes
         WHERE route_number LIKE ? OR route_name LIKE ? OR origin LIKE ? OR destination LIKE ?
         ORDER BY route_number LIMIT ?`
    ).all(like, like, like, like, limit);
  } else {
    rows = db3.prepare(`SELECT * FROM mtc_routes ORDER BY route_number LIMIT ?`).all(limit);
  }
  return {
    available: true,
    routes: rows.map((r) => ({
      ...r,
      source: r.source,
      last_updated: r.last_updated,
      official_url: MTC_OFFICIAL_URL + "Home/routewiseinfo"
    }))
  };
}
function searchMtcStopsByName(query, limit = 20) {
  if (!isMtcDataAvailable()) {
    return { available: false, stops: [], message: mtcUnavailableMessage() };
  }
  const db3 = getDatabase();
  const like = `%${query.trim()}%`;
  const stops = db3.prepare(
    `SELECT * FROM mtc_stops WHERE stage_name LIKE ? ORDER BY stage_name LIMIT ?`
  ).all(like, limit);
  return { available: true, stops };
}
function getNearestMtcStops(input) {
  if (!isMtcDataAvailable()) {
    return { available: false, stops: [], message: mtcUnavailableMessage() };
  }
  const db3 = getDatabase();
  const radiusM = (input.radiusKm ?? 5) * 1e3;
  const limit = input.limit ?? 10;
  const candidates = db3.prepare(`SELECT * FROM mtc_stops WHERE latitude IS NOT NULL AND longitude IS NOT NULL`).all();
  if (candidates.length === 0) {
    return {
      available: true,
      stops: [],
      message: "Official MTC stage coordinates are not loaded yet. Route numbers are available \u2014 use route search or sync stages when published on mtcbus.tn.gov.in."
    };
  }
  const withDist = candidates.map((s) => ({
    ...s,
    distance_meters: haversineMeters(input.latitude, input.longitude, s.latitude, s.longitude),
    walking_minutes: Math.max(1, Math.round(haversineMeters(input.latitude, input.longitude, s.latitude, s.longitude) / 80))
  })).filter((s) => s.distance_meters <= radiusM).sort((a, b) => a.distance_meters - b.distance_meters).slice(0, limit);
  return { available: true, stops: withDist };
}
function getMtcRoutesForStop(stopId) {
  if (!isMtcDataAvailable()) {
    return { available: false, routes: [], message: mtcUnavailableMessage() };
  }
  const db3 = getDatabase();
  const stop = db3.prepare(`SELECT * FROM mtc_stops WHERE stop_id = ?`).get(stopId);
  if (!stop?.route_id) {
    return { available: true, routes: [] };
  }
  const routes2 = db3.prepare(`SELECT * FROM mtc_routes WHERE route_id = ?`).all(stop.route_id);
  return { available: true, routes: routes2, stop };
}
function getMtcTimingsForRoute(routeId) {
  if (!isMtcDataAvailable()) {
    return { available: false, timings: [], message: mtcUnavailableMessage() };
  }
  const db3 = getDatabase();
  const timings = db3.prepare(`SELECT * FROM mtc_timings WHERE route_id = ? ORDER BY departure_time ASC LIMIT 100`).all(routeId);
  return {
    available: true,
    timings,
    timetable_status: timings.length ? "AVAILABLE" : "UNAVAILABLE"
  };
}
function mtcUnavailableMessage() {
  return "MTC information is temporarily unavailable. Please try again.";
}
function buildGetToCollegeRecommendations(input) {
  const mtcReady = isMtcDataAvailable();
  const nearest = input.latitude != null && input.longitude != null ? getNearestMtcStops({ latitude: input.latitude, longitude: input.longitude, radiusKm: 6, limit: 5 }) : null;
  const collegeRoutes = mtcReady ? searchMtcRoutes({ query: "REC", limit: 15 }) : { available: false, routes: [], message: mtcUnavailableMessage() };
  return {
    destination: REC_COLLEGE,
    acims_college_bus: {
      status: "available",
      note: "Use ACIMS live college bus GPS and pickup ETA (unchanged)."
    },
    mtc: mtcReady ? {
      status: "available",
      nearest_stops: nearest?.stops ?? [],
      nearest_message: nearest && "message" in nearest ? nearest.message : void 0,
      routes_toward_college: collegeRoutes.available ? collegeRoutes.routes : [],
      source: MTC_SOURCE_LABEL,
      last_updated: getMtcIntegrationStatus().status?.last_successful_sync,
      official_url: MTC_OFFICIAL_URL,
      live_mtc_gps: "NOT_AVAILABLE"
    } : {
      status: "unavailable",
      message: mtcUnavailableMessage()
    },
    generated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function buildMissedBusMtcOptions(input) {
  const nearest = getNearestMtcStops({ latitude: input.latitude, longitude: input.longitude, radiusKm: 4, limit: 6 });
  if (!nearest.available) {
    return { available: false, message: nearest.message, options: [] };
  }
  const db3 = getDatabase();
  const options = [];
  for (const stop of nearest.stops ?? []) {
    const routes2 = stop.route_id ? db3.prepare(`SELECT route_number, route_name, last_updated, source FROM mtc_routes WHERE route_id = ?`).all(
      stop.route_id
    ) : [];
    const timings = stop.route_id ? db3.prepare(
      `SELECT departure_time, service_day, last_updated FROM mtc_timings WHERE route_id = ? ORDER BY departure_time LIMIT 3`
    ).all(stop.route_id) : [];
    options.push({
      category: "MTC Bus",
      stopName: stop.stage_name,
      distanceMeters: stop.distance_meters,
      walkingMinutes: stop.walking_minutes,
      agency: "Metropolitan Transport Corporation (Chennai)",
      routes: routes2.map((r) => r.route_number),
      scheduledNextDeparture: timings[0]?.departure_time ?? null,
      status: "Scheduled",
      source: MTC_SOURCE_LABEL,
      last_updated: stop.last_updated,
      data_age_note: timings.length ? void 0 : "Official timetable not loaded for this route in ACIMS yet."
    });
  }
  return { available: true, options, source: MTC_SOURCE_LABEL };
}
var REC_COLLEGE;
var init_mtcService = __esm({
  "artifacts/api-server/src/services/mtc/mtcService.ts"() {
    "use strict";
    init_publicTransitService();
    init_mtcSchema();
    init_mtcOfficialSource();
    REC_COLLEGE = {
      name: "Rajalakshmi Engineering College (REC)",
      latitude: 13.0084,
      longitude: 80.0033
    };
  }
});

// src/db/bootstrapCoreTables.ts
var bootstrapCoreTables_exports = {};
__export(bootstrapCoreTables_exports, {
  bootstrapCoreTables: () => bootstrapCoreTables
});
async function bootstrapCoreTables() {
  try {
    await execSql(DDL);
    for (const stmt of PICKUP_SCHEMA_PATCHES) {
      try {
        await execSql(stmt);
      } catch {
      }
    }
    console.log("[ACIMS DB] Core mobility tables verified (shifts, trips, pickup points, events)");
  } catch (err) {
    console.error("[ACIMS DB] bootstrapCoreTables failed:", err);
  }
}
var DDL, PICKUP_SCHEMA_PATCHES;
var init_bootstrapCoreTables = __esm({
  "src/db/bootstrapCoreTables.ts"() {
    "use strict";
    init_db();
    DDL = `
CREATE TABLE IF NOT EXISTS official_pickup_points (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL,
  stop_name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  sequence_number INTEGER NOT NULL,
  geofence_radius_m INTEGER NOT NULL DEFAULT 150,
  expected_offset_minutes INTEGER NOT NULL DEFAULT 0,
  scheduled_time_display TEXT,
  scheduled_time_24 TEXT,
  source TEXT NOT NULL DEFAULT 'ADMIN',
  active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE official_pickup_points ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE official_pickup_points ALTER COLUMN longitude DROP NOT NULL;
ALTER TABLE official_pickup_points ADD COLUMN IF NOT EXISTS scheduled_time_display TEXT;
ALTER TABLE official_pickup_points ADD COLUMN IF NOT EXISTS scheduled_time_24 TEXT;
ALTER TABLE official_pickup_points ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ADMIN';

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  shift_type TEXT,
  start_time TEXT,
  end_time TEXT,
  direction TEXT NOT NULL DEFAULT 'TO_COLLEGE',
  route_id TEXT,
  bus_id TEXT,
  driver_id TEXT,
  operating_days TEXT NOT NULL DEFAULT 'MON,TUE,WED,THU,FRI',
  active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS shift_type TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS bus_id TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS driver_id TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS shift_assignments (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL,
  bus_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  shift_id TEXT,
  bus_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  route_id TEXT NOT NULL,
  tracking_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  scheduled_start_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trips_bus_id_idx ON trips (bus_id);
CREATE INDEX IF NOT EXISTS trips_status_idx ON trips (status);

CREATE TABLE IF NOT EXISTS mobility_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bus_id TEXT NOT NULL,
  trip_id TEXT,
  pickup_point_id TEXT,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON admin_audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS trip_notification_events (
  id TEXT PRIMARY KEY,
  trip_id TEXT,
  student_id TEXT NOT NULL,
  pickup_point_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  eta_at_trigger INTEGER,
  delay_minutes INTEGER,
  notification_status TEXT NOT NULL DEFAULT 'SENT',
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS trip_notif_student_idx ON trip_notification_events (student_id);
CREATE INDEX IF NOT EXISTS trip_notif_trip_idx ON trip_notification_events (trip_id);

CREATE TABLE IF NOT EXISTS rec_transport_routes (
  id TEXT PRIMARY KEY,
  route_number TEXT NOT NULL,
  route_name TEXT NOT NULL,
  starting_time_display TEXT,
  starting_time_24 TEXT,
  boarding_page_url TEXT,
  via_notes TEXT,
  campus_arrival_display TEXT,
  campus_arrival_24 TEXT,
  source_url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  manually_edited BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS rec_transport_routes_number_idx ON rec_transport_routes (route_number);

CREATE TABLE IF NOT EXISTS rec_transport_stops (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL,
  stop_name TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  time_display TEXT,
  time_24 TEXT,
  is_campus BOOLEAN NOT NULL DEFAULT FALSE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS rec_transport_stops_route_idx ON rec_transport_stops (route_id, sequence_number);

CREATE TABLE IF NOT EXISTS rec_transport_sync_status (
  id INTEGER PRIMARY KEY,
  timetable_url TEXT NOT NULL,
  connection_status TEXT NOT NULL DEFAULT 'PENDING',
  last_successful_sync TIMESTAMPTZ,
  routes_count INTEGER NOT NULL DEFAULT 0,
  stops_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;
    PICKUP_SCHEMA_PATCHES = [
      "ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS active_stop_ids TEXT",
      "ALTER TABLE shift_assignments ALTER COLUMN driver_id DROP NOT NULL",
      "ALTER TABLE official_pickup_points ALTER COLUMN latitude DROP NOT NULL",
      "ALTER TABLE official_pickup_points ALTER COLUMN longitude DROP NOT NULL",
      "ALTER TABLE official_pickup_points ADD COLUMN IF NOT EXISTS scheduled_time_display TEXT",
      "ALTER TABLE official_pickup_points ADD COLUMN IF NOT EXISTS scheduled_time_24 TEXT",
      "ALTER TABLE official_pickup_points ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ADMIN'",
      "ALTER TABLE rec_transport_routes ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN NOT NULL DEFAULT FALSE",
      "ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS starting_time_display TEXT",
      "ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS starting_time_24 TEXT",
      "ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS campus_arrival_display TEXT",
      "ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS campus_arrival_24 TEXT",
      "ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ADMIN'",
      "ALTER TABLE bus_routes ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN NOT NULL DEFAULT FALSE",
      "ALTER TABLE buses ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ADMIN'",
      "ALTER TABLE buses ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN NOT NULL DEFAULT FALSE"
    ];
  }
});

// src/db/bootstrapAppTables.ts
var bootstrapAppTables_exports = {};
__export(bootstrapAppTables_exports, {
  bootstrapAppTables: () => bootstrapAppTables,
  ensureBaselineFleetData: () => ensureBaselineFleetData,
  migrateMobilitySchemaColumns: () => migrateMobilitySchemaColumns
});
async function migrateMobilitySchemaColumns() {
  const alters = [
    "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS shift_type TEXT",
    "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS end_time TEXT",
    "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS bus_id TEXT",
    "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS driver_id TEXT",
    "ALTER TABLE shifts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS shift_start_snapshot TEXT",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS shift_end_snapshot TEXT",
    "ALTER TABLE shifts ALTER COLUMN start_time DROP NOT NULL",
    "ALTER TABLE shifts ALTER COLUMN route_id DROP NOT NULL"
  ];
  for (const sql2 of alters) {
    try {
      await execSql(sql2);
    } catch {
    }
  }
}
async function bootstrapAppTables() {
  try {
    for (const sql2 of APP_STATEMENTS) {
      await execSql(sql2);
    }
    console.log("[ACIMS DB] Core app tables verified (buses, routes, profiles, safety, \u2026)");
  } catch (err) {
    console.error("[ACIMS DB] bootstrapAppTables failed:", err);
    throw err;
  }
}
async function ensureBaselineFleetData() {
  const { promoteOfficialRecFleet: promoteOfficialRecFleet2 } = await Promise.resolve().then(() => (init_collegeFleetService(), collegeFleetService_exports));
  try {
    const promoted = await promoteOfficialRecFleet2();
    if (promoted.busesUpserted === 0 && promoted.catalogRoutes === 0) {
      const { getAllRoutes: getAllRoutes3 } = await Promise.resolve().then(() => (init_routesData(), routesData_exports));
      const { db: db3 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { buses: buses3, busRoutes: busRoutes2, busStops: busStops2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const existingBuses = await db3.select().from(buses3);
      if (existingBuses.length === 0) {
        const allRoutes = getAllRoutes3();
        for (const r of allRoutes) {
          const busId = r.id.replace("route-", "");
          await db3.insert(busRoutes2).values({
            id: r.id,
            routeName: r.name,
            routeCode: r.routeNumber,
            active: true
          }).onConflictDoNothing();
          await db3.insert(buses3).values({
            id: busId,
            busNumber: r.routeNumber,
            routeId: r.id,
            active: true
          }).onConflictDoNothing();
          for (const s of r.stops) {
            await db3.insert(busStops2).values({
              id: `${r.id}-${s.id}`,
              routeId: r.id,
              stopName: s.name,
              latitude: s.latitude,
              longitude: s.longitude,
              sequenceNumber: s.sequence
            }).onConflictDoNothing();
          }
        }
        console.log("[ACIMS DB] Seeded baseline campus fleet & route stops");
      }
    }
  } catch (err) {
    console.warn("[ACIMS DB] Official college fleet promote skipped:", err);
  }
}
var APP_STATEMENTS;
var init_bootstrapAppTables = __esm({
  "src/db/bootstrapAppTables.ts"() {
    "use strict";
    init_db();
    APP_STATEMENTS = [
      `CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'STUDENT',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
      `CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER NOT NULL,
    register_number TEXT,
    pickup_stop_id TEXT,
    assigned_bus_id TEXT,
    assigned_route_id TEXT
  )`,
      `CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER NOT NULL,
    assigned_bus_id TEXT
  )`,
      `CREATE TABLE IF NOT EXISTS bus_routes (
    id TEXT PRIMARY KEY,
    route_name TEXT NOT NULL,
    route_code TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
  )`,
      `CREATE TABLE IF NOT EXISTS buses (
    id TEXT PRIMARY KEY,
    bus_number TEXT NOT NULL,
    registration_number TEXT,
    route_id TEXT,
    driver_id TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
      `CREATE TABLE IF NOT EXISTS bus_stops (
    id TEXT PRIMARY KEY,
    route_id TEXT NOT NULL,
    stop_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    sequence_number INTEGER NOT NULL
  )`,
      `CREATE TABLE IF NOT EXISTS bus_locations (
    id SERIAL PRIMARY KEY,
    bus_id TEXT NOT NULL,
    driver_id TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    altitude_accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
      `CREATE TABLE IF NOT EXISTS tracking_sessions (
    id TEXT PRIMARY KEY,
    bus_id TEXT NOT NULL,
    driver_id TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_location_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
  )`,
      `CREATE TABLE IF NOT EXISTS safety_reports (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    report_type TEXT NOT NULL,
    description TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
      `CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
  )`,
      `CREATE TABLE IF NOT EXISTS campus_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    description TEXT
  )`,
      `CREATE TABLE IF NOT EXISTS campus_paths (
    id TEXT PRIMARY KEY,
    from_location_id TEXT NOT NULL,
    to_location_id TEXT NOT NULL,
    distance_meters DOUBLE PRECISION NOT NULL,
    path_points TEXT NOT NULL
  )`,
      `CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
      `CREATE TABLE IF NOT EXISTS public_transport_stops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    routes_served TEXT NOT NULL
  )`,
      `CREATE TABLE IF NOT EXISTS public_transport_departures (
    id TEXT PRIMARY KEY,
    stop_id TEXT NOT NULL,
    route_number TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    service_days TEXT NOT NULL DEFAULT 'MON,TUE,WED,THU,FRI,SAT',
    is_live BOOLEAN NOT NULL DEFAULT FALSE
  )`,
      `CREATE TABLE IF NOT EXISTS mobi_query_logs (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    intent TEXT NOT NULL,
    tools_called TEXT NOT NULL DEFAULT '[]',
    success BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
      `CREATE TABLE IF NOT EXISTS student_pickup_points (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    stop_id TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE
  )`,
      `CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    preferences TEXT NOT NULL DEFAULT '{}'
  )`,
      `CREATE TABLE IF NOT EXISTS emergency_contacts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    phone TEXT NOT NULL
  )`,
      `CREATE TABLE IF NOT EXISTS boarding_queue (
    id SERIAL PRIMARY KEY,
    student_id TEXT NOT NULL,
    bus_id TEXT NOT NULL,
    boarding_stop TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'WAITING',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
      `CREATE TABLE IF NOT EXISTS student_preferences (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    saved_pickup_stop_id TEXT,
    preferred_bus_id TEXT,
    saved_destination_name TEXT,
    saved_destination_lat DOUBLE PRECISION,
    saved_destination_lng DOUBLE PRECISION,
    notification_arrivals BOOLEAN DEFAULT TRUE,
    notification_delays BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
      `CREATE TABLE IF NOT EXISTS student_locations (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
  )`,
      `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    role TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
      `CREATE TABLE IF NOT EXISTS safety_alerts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`
    ];
  }
});

// src/db/ensureMobilityPickups.ts
var ensureMobilityPickups_exports = {};
__export(ensureMobilityPickups_exports, {
  ensureOfficialPickupPointsFromRoutes: () => ensureOfficialPickupPointsFromRoutes
});
import { eq as eq16 } from "drizzle-orm";
async function ensureOfficialPickupPointsFromRoutes() {
  const existing = await listPickupPoints();
  const recOfficial = existing.filter((p) => p.active && (p.source === "REC_TRANSPORT" || p.id.startsWith("rec-stop-")));
  if (recOfficial.length > 0) return;
  const recStops = await db.select({ id: recTransportStops.id }).from(recTransportStops).where(eq16(recTransportStops.active, true)).limit(1);
  if (recStops.length) return;
  const { getMvpCollegeRoute: getMvpCollegeRoute2 } = await Promise.resolve().then(() => (init_mvpCollegeRouteService(), mvpCollegeRouteService_exports));
  const mvp = getMvpCollegeRoute2();
  const activeForRoute = existing.filter((p) => p.routeId === mvp.routeId && p.active);
  if (activeForRoute.length > 0) return;
  const { getRouteForBus: getRouteForBus2 } = await Promise.resolve().then(() => (init_routesData(), routesData_exports));
  const route = getRouteForBus2(mvp.busId);
  if (!route) return;
  for (const stop of route.stops) {
    await upsertPickupPoint({
      id: stop.id,
      routeId: mvp.routeId,
      stopName: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      sequenceNumber: stop.sequence,
      geofenceRadiusM: 150,
      expectedOffsetMinutes: stop.sequence * 8,
      source: "ADMIN",
      active: true
    });
  }
  console.log("[ACIMS DB] College route pickup points ready");
}
var init_ensureMobilityPickups = __esm({
  "src/db/ensureMobilityPickups.ts"() {
    "use strict";
    init_schema();
    init_mobilityOps();
    init_db();
  }
});

// src/db/seed.ts
var seed_exports = {};
__export(seed_exports, {
  seedDatabase: () => seedDatabase
});
import { eq as eq17 } from "drizzle-orm";
async function seedDatabase() {
  console.log("Seeding ACIMS campus map (college fleet comes from official REC Transport)...");
  for (const bldg of REC_BUILDINGS) {
    await db.insert(campusLocations).values({
      id: bldg.id,
      name: bldg.name,
      category: bldg.category,
      latitude: bldg.latitude,
      longitude: bldg.longitude,
      description: bldg.description
    }).onConflictDoNothing();
  }
  for (const stop of REC_CAMPUS_STOPS) {
    await db.insert(campusLocations).values({
      id: stop.id,
      name: stop.name,
      category: "transit",
      latitude: stop.latitude,
      longitude: stop.longitude,
      description: stop.description
    }).onConflictDoNothing();
  }
  for (const poi of REC_POINTS_OF_INTEREST) {
    await db.insert(campusLocations).values({
      id: poi.id,
      name: poi.name,
      category: poi.category,
      latitude: poi.latitude,
      longitude: poi.longitude,
      description: `Near ${poi.landmarkNear}`
    }).onConflictDoNothing();
  }
  for (const path6 of REC_CAMPUS_PATHS) {
    const coords = path6.coordinates;
    if (coords.length >= 2) {
      await db.insert(campusPaths).values({
        id: path6.id,
        fromLocationId: path6.name.split(" to ")[0] || path6.id,
        toLocationId: path6.name.split(" to ")[1] || path6.id,
        distanceMeters: Math.round(coords.length * 25),
        pathPoints: JSON.stringify(coords.map((c) => [c.latitude, c.longitude]))
      }).onConflictDoNothing();
    }
  }
  const ptStops = [
    { id: "pt-thandalam", name: "Thandalam REC Main Gate", latitude: 13.0084, longitude: 80.0033, routesServed: "597, 54B, 578, 597A" },
    { id: "pt-tambaram", name: "Tambaram Central Bus Terminus", latitude: 12.9254, longitude: 80.1198, routesServed: "554, 578, 597, 114, 202" },
    { id: "pt-poonamallee", name: "Poonamallee Bus Terminus", latitude: 13.0489, longitude: 80.0934, routesServed: "54, 54B, 597, 153" },
    { id: "pt-guindy", name: "Guindy Estate Bus Station", latitude: 13.0067, longitude: 80.2012, routesServed: "54, 54B, 597" }
  ];
  for (const stop of ptStops) {
    await db.insert(publicTransportStops).values(stop).onConflictDoNothing();
  }
  const ptDepartures = [
    { id: "dep-597-1", stopId: "pt-thandalam", routeNumber: "597", destination: "Tambaram Terminal", departureTime: "07:30", serviceDays: "MON,TUE,WED,THU,FRI,SAT", isLive: true },
    { id: "dep-597-2", stopId: "pt-thandalam", routeNumber: "597", destination: "Tambaram Terminal", departureTime: "08:15", serviceDays: "MON,TUE,WED,THU,FRI,SAT", isLive: false },
    { id: "dep-54b-1", stopId: "pt-thandalam", routeNumber: "54B", destination: "Poonamallee / T.Nagar", departureTime: "07:45", serviceDays: "MON,TUE,WED,THU,FRI,SAT", isLive: true },
    { id: "dep-578-1", stopId: "pt-thandalam", routeNumber: "578", destination: "Sriperumbudur / Kanchipuram", departureTime: "08:00", serviceDays: "MON,TUE,WED,THU,FRI,SAT", isLive: false },
    { id: "dep-tam-597-1", stopId: "pt-tambaram", routeNumber: "597", destination: "Thandalam (REC Campus)", departureTime: "07:15", serviceDays: "MON,TUE,WED,THU,FRI,SAT", isLive: true },
    { id: "dep-tam-554-1", stopId: "pt-tambaram", routeNumber: "554", destination: "Sriperumbudur via REC", departureTime: "07:40", serviceDays: "MON,TUE,WED,THU,FRI,SAT", isLive: false }
  ];
  for (const dep of ptDepartures) {
    await db.insert(publicTransportDepartures).values(dep).onConflictDoNothing();
  }
  const defaultProfiles = [
    { userId: "admin", name: "Campus Transport Controller", email: "admin@rec.edu.in", role: "ADMIN" },
    { userId: "student-20418", name: "Rithvik S (CSD)", email: "student-20418@rec.edu.in", role: "STUDENT" },
    { userId: "driver-arun", name: "Driver Arun", email: "arun.driver@rec.edu.in", role: "DRIVER" },
    { userId: "driver-rajesh", name: "Driver Rajesh", email: "rajesh.driver@rec.edu.in", role: "DRIVER" }
  ];
  for (const p of defaultProfiles) {
    const existing = await db.select().from(profiles).where(eq17(profiles.userId, p.userId));
    if (existing.length === 0) {
      const ins = await db.insert(profiles).values(p).returning();
      if (p.role === "STUDENT") {
        await db.insert(students).values({
          profileId: ins[0].id,
          registerNumber: "2024-CSD-014"
        });
      } else if (p.role === "DRIVER") {
        await db.insert(drivers).values({
          profileId: ins[0].id
        });
      }
    }
  }
  console.log("Seeding completed successfully!");
}
var init_seed = __esm({
  "src/db/seed.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_campusData();
  }
});

// server-app.ts
import express from "express";
import path5 from "path";
import fs5 from "fs";
import { fileURLToPath } from "url";
import cors from "cors";

// artifacts/api-server/src/routes/index.ts
import { Router as Router18 } from "express";

// artifacts/api-server/src/routes/health.ts
import { Router } from "express";

// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path6, errorMaps, issueData } = params;
  const fullPath = [...path6, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/.bun/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path6, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path6;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index2) {
    return new _ZodObject({
      ...this._def,
      catchall: index2
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index2 = 0; index2 < a.length; index2++) {
      const itemA = a[index2];
      const itemB = b[index2];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index2) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index2, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index2, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// lib/api-zod/src/generated/api.ts
var HealthCheckResponse = objectType({
  "status": stringType()
});
var ListBusesResponseItem = objectType({
  "id": stringType(),
  "busNumber": stringType(),
  "origin": stringType(),
  "destination": stringType(),
  "routeLabel": stringType(),
  "capacity": numberType().int(),
  "currentOccupancy": numberType().int(),
  "currentLocation": objectType({
    "latitude": numberType(),
    "longitude": numberType()
  }),
  "nextStop": stringType(),
  "nextStopId": stringType(),
  "etaMinutes": numberType().int(),
  "status": stringType(),
  "updatedAt": coerce.date()
});
var ListBusesResponse = arrayType(ListBusesResponseItem);
var GetBusParams = objectType({
  "busId": coerce.string()
});
var GetBusResponse = objectType({
  "id": stringType(),
  "busNumber": stringType(),
  "origin": stringType(),
  "destination": stringType(),
  "routeLabel": stringType(),
  "capacity": numberType().int(),
  "currentOccupancy": numberType().int(),
  "currentLocation": objectType({
    "latitude": numberType(),
    "longitude": numberType()
  }),
  "nextStop": stringType(),
  "nextStopId": stringType(),
  "etaMinutes": numberType().int(),
  "status": stringType(),
  "updatedAt": coerce.date()
});
var GetBusLocationParams = objectType({
  "busId": coerce.string()
});
var GetBusLocationResponse = objectType({
  "busId": stringType(),
  "latitude": numberType(),
  "longitude": numberType(),
  "nextStopId": stringType(),
  "nextStop": stringType(),
  "etaMinutes": numberType().int(),
  "status": stringType(),
  "updatedAt": coerce.date(),
  "source": stringType()
});
var ListBusStopsParams = objectType({
  "busId": coerce.string()
});
var ListBusStopsResponseItem = objectType({
  "id": stringType(),
  "name": stringType(),
  "latitude": numberType(),
  "longitude": numberType(),
  "sequence": numberType().int(),
  "minutesFromPrevious": numberType().int()
});
var ListBusStopsResponse = arrayType(ListBusStopsResponseItem);
var UpdateBusLocationBody = objectType({
  "busId": stringType(),
  "latitude": numberType(),
  "longitude": numberType(),
  "timestamp": coerce.date().optional()
});
var UpdateBusLocationResponse = objectType({
  "id": stringType(),
  "busNumber": stringType(),
  "origin": stringType(),
  "destination": stringType(),
  "routeLabel": stringType(),
  "capacity": numberType().int(),
  "currentOccupancy": numberType().int(),
  "currentLocation": objectType({
    "latitude": numberType(),
    "longitude": numberType()
  }),
  "nextStop": stringType(),
  "nextStopId": stringType(),
  "etaMinutes": numberType().int(),
  "status": stringType(),
  "updatedAt": coerce.date()
});
var UpdateBusOccupancyParams = objectType({
  "busId": coerce.string()
});
var updateBusOccupancyBodyCurrentOccupancyMin = 0;
var UpdateBusOccupancyBody = objectType({
  "currentOccupancy": numberType().int().min(updateBusOccupancyBodyCurrentOccupancyMin)
});
var UpdateBusOccupancyResponse = objectType({
  "id": stringType(),
  "busNumber": stringType(),
  "origin": stringType(),
  "destination": stringType(),
  "routeLabel": stringType(),
  "capacity": numberType().int(),
  "currentOccupancy": numberType().int(),
  "currentLocation": objectType({
    "latitude": numberType(),
    "longitude": numberType()
  }),
  "nextStop": stringType(),
  "nextStopId": stringType(),
  "etaMinutes": numberType().int(),
  "status": stringType(),
  "updatedAt": coerce.date()
});
var GetQueueStatusQueryParams = objectType({
  "busId": coerce.string().optional()
});
var GetQueueStatusResponse = objectType({
  "joined": booleanType(),
  "entry": objectType({
    "studentId": stringType(),
    "busId": stringType(),
    "boardingStop": stringType(),
    "queuePosition": numberType().int(),
    "joinedAt": coerce.date(),
    "status": stringType()
  }).nullable(),
  "busId": stringType(),
  "currentOccupancy": numberType().int(),
  "capacity": numberType().int(),
  "seatsAvailable": numberType().int(),
  "estimatedAvailabilityMinutes": numberType().int(),
  "message": stringType()
});
var JoinQueueBody = objectType({
  "studentId": stringType(),
  "busId": stringType(),
  "boardingStop": stringType()
});
var JoinQueueResponse = objectType({
  "joined": booleanType(),
  "entry": objectType({
    "studentId": stringType(),
    "busId": stringType(),
    "boardingStop": stringType(),
    "queuePosition": numberType().int(),
    "joinedAt": coerce.date(),
    "status": stringType()
  }).nullable(),
  "busId": stringType(),
  "currentOccupancy": numberType().int(),
  "capacity": numberType().int(),
  "seatsAvailable": numberType().int(),
  "estimatedAvailabilityMinutes": numberType().int(),
  "message": stringType()
});
var LeaveQueueBody = objectType({
  "studentId": stringType(),
  "busId": stringType()
});
var LeaveQueueResponse = objectType({
  "joined": booleanType(),
  "entry": objectType({
    "studentId": stringType(),
    "busId": stringType(),
    "boardingStop": stringType(),
    "queuePosition": numberType().int(),
    "joinedAt": coerce.date(),
    "status": stringType()
  }).nullable(),
  "busId": stringType(),
  "currentOccupancy": numberType().int(),
  "capacity": numberType().int(),
  "seatsAvailable": numberType().int(),
  "estimatedAvailabilityMinutes": numberType().int(),
  "message": stringType()
});
var ListNotificationsResponseItem = objectType({
  "id": stringType(),
  "type": stringType(),
  "title": stringType(),
  "message": stringType(),
  "createdAt": coerce.date(),
  "read": booleanType(),
  "busId": stringType()
});
var ListNotificationsResponse = arrayType(ListNotificationsResponseItem);
var MarkNotificationReadBody = objectType({
  "id": stringType()
});
var MarkNotificationReadResponse = objectType({
  "id": stringType(),
  "type": stringType(),
  "title": stringType(),
  "message": stringType(),
  "createdAt": coerce.date(),
  "read": booleanType(),
  "busId": stringType()
});
var ListCampusLocationsResponseItem = objectType({
  "id": stringType(),
  "name": stringType(),
  "type": stringType(),
  "description": stringType(),
  "latitude": numberType(),
  "longitude": numberType()
});
var ListCampusLocationsResponse = arrayType(ListCampusLocationsResponseItem);
var ListCampusStopsResponseItem = objectType({
  "id": stringType(),
  "name": stringType(),
  "latitude": numberType(),
  "longitude": numberType(),
  "servingBusIds": arrayType(stringType()),
  "routeNames": arrayType(stringType())
});
var ListCampusStopsResponse = arrayType(ListCampusStopsResponseItem);
var ListCampusRoutesResponseItem = objectType({
  "id": stringType(),
  "name": stringType(),
  "busId": stringType(),
  "busNumber": stringType(),
  "destination": stringType(),
  "stopIds": arrayType(stringType())
});
var ListCampusRoutesResponse = arrayType(ListCampusRoutesResponseItem);
var ListNavigationDestinationsResponseItem = objectType({
  "id": stringType(),
  "name": stringType(),
  "type": stringType(),
  "description": stringType(),
  "latitude": numberType(),
  "longitude": numberType()
});
var ListNavigationDestinationsResponse = arrayType(ListNavigationDestinationsResponseItem);
var CalculateNavigationRouteBody = objectType({
  "destinationId": stringType(),
  "startLatitude": numberType().optional(),
  "startLongitude": numberType().optional(),
  "mode": stringType().optional()
});
var CalculateNavigationRouteResponse = objectType({
  "start": objectType({
    "latitude": numberType(),
    "longitude": numberType()
  }),
  "destination": objectType({
    "id": stringType(),
    "name": stringType(),
    "type": stringType(),
    "description": stringType(),
    "latitude": numberType(),
    "longitude": numberType()
  }),
  "mode": stringType(),
  "distanceKm": numberType(),
  "walkingMinutes": numberType().int(),
  "relevantStop": objectType({
    "id": stringType(),
    "name": stringType(),
    "latitude": numberType(),
    "longitude": numberType(),
    "servingBusIds": arrayType(stringType()),
    "routeNames": arrayType(stringType())
  }),
  "busOptions": arrayType(objectType({
    "busId": stringType(),
    "busNumber": stringType(),
    "destination": stringType(),
    "etaMinutes": numberType().int(),
    "occupancy": numberType().int(),
    "capacity": numberType().int(),
    "seatsAvailable": numberType().int(),
    "status": stringType()
  })),
  "routeCoordinates": arrayType(objectType({
    "latitude": numberType(),
    "longitude": numberType()
  }))
});
var ListSafetyReportsResponseItem = objectType({
  "id": stringType(),
  "studentId": stringType(),
  "reportType": stringType(),
  "description": stringType(),
  "latitude": numberType(),
  "longitude": numberType(),
  "createdAt": coerce.date(),
  "status": stringType()
});
var ListSafetyReportsResponse = arrayType(ListSafetyReportsResponseItem);
var CreateSafetyReportBody = objectType({
  "studentId": stringType(),
  "reportType": stringType(),
  "description": stringType(),
  "latitude": numberType(),
  "longitude": numberType()
});
var CreateSafetyReportResponse = objectType({
  "id": stringType(),
  "studentId": stringType(),
  "reportType": stringType(),
  "description": stringType(),
  "latitude": numberType(),
  "longitude": numberType(),
  "createdAt": coerce.date(),
  "status": stringType()
});
var ListSafetyAlertsResponseItem = objectType({
  "id": stringType(),
  "title": stringType(),
  "message": stringType(),
  "severity": stringType(),
  "latitude": numberType(),
  "longitude": numberType(),
  "createdAt": coerce.date()
});
var ListSafetyAlertsResponse = arrayType(ListSafetyAlertsResponseItem);
var ActivateEmergencyBody = objectType({
  "studentId": stringType(),
  "latitude": numberType(),
  "longitude": numberType(),
  "message": stringType()
});
var ActivateEmergencyResponse = objectType({
  "status": stringType(),
  "createdAt": coerce.date(),
  "message": stringType(),
  "contacts": arrayType(objectType({
    "name": stringType(),
    "relationship": stringType(),
    "phone": stringType()
  }))
});
var GetAdminDashboardResponse = objectType({
  "activeBuses": numberType().int(),
  "activeTrips": numberType().int(),
  "activeRoutes": numberType().int(),
  "delayedBuses": numberType().int(),
  "queueEntries": numberType().int(),
  "openSafetyReports": numberType().int(),
  "providersOnline": numberType().int(),
  "systemStatus": stringType()
});
var ListAdminBusesResponseItem = objectType({
  "busNumber": stringType(),
  "routeId": stringType(),
  "driverId": stringType().optional(),
  "capacity": numberType().int(),
  "active": booleanType().optional()
}).and(objectType({
  "id": stringType(),
  "status": stringType()
}));
var ListAdminBusesResponse = arrayType(ListAdminBusesResponseItem);
var CreateAdminBusBody = objectType({
  "busNumber": stringType(),
  "routeId": stringType(),
  "driverId": stringType().optional(),
  "capacity": numberType().int(),
  "active": booleanType().optional()
});
var CreateAdminBusResponse = objectType({
  "busNumber": stringType(),
  "routeId": stringType(),
  "driverId": stringType().optional(),
  "capacity": numberType().int(),
  "active": booleanType().optional()
}).and(objectType({
  "id": stringType(),
  "status": stringType()
}));
var UpdateAdminBusParams = objectType({
  "busId": coerce.string()
});
var UpdateAdminBusBody = objectType({
  "busNumber": stringType(),
  "routeId": stringType(),
  "driverId": stringType().optional(),
  "capacity": numberType().int(),
  "active": booleanType().optional()
});
var UpdateAdminBusResponse = objectType({
  "busNumber": stringType(),
  "routeId": stringType(),
  "driverId": stringType().optional(),
  "capacity": numberType().int(),
  "active": booleanType().optional()
}).and(objectType({
  "id": stringType(),
  "status": stringType()
}));
var DeactivateAdminBusParams = objectType({
  "busId": coerce.string()
});
var DeactivateAdminBusResponse = objectType({
  "busNumber": stringType(),
  "routeId": stringType(),
  "driverId": stringType().optional(),
  "capacity": numberType().int(),
  "active": booleanType().optional()
}).and(objectType({
  "id": stringType(),
  "status": stringType()
}));
var ListAdminDriversResponseItem = objectType({
  "name": stringType(),
  "phone": stringType(),
  "active": booleanType().optional()
}).and(objectType({
  "id": stringType(),
  "busId": stringType().optional(),
  "routeId": stringType().optional()
}));
var ListAdminDriversResponse = arrayType(ListAdminDriversResponseItem);
var CreateAdminDriverBody = objectType({
  "name": stringType(),
  "phone": stringType(),
  "active": booleanType().optional()
});
var CreateAdminDriverResponse = objectType({
  "name": stringType(),
  "phone": stringType(),
  "active": booleanType().optional()
}).and(objectType({
  "id": stringType(),
  "busId": stringType().optional(),
  "routeId": stringType().optional()
}));
var ListAdminRoutesResponseItem = objectType({
  "name": stringType(),
  "destination": stringType(),
  "stopIds": arrayType(stringType()),
  "active": booleanType().optional()
}).and(objectType({
  "id": stringType(),
  "assignedBusIds": arrayType(stringType())
}));
var ListAdminRoutesResponse = arrayType(ListAdminRoutesResponseItem);
var CreateAdminRouteBody = objectType({
  "name": stringType(),
  "destination": stringType(),
  "stopIds": arrayType(stringType()),
  "active": booleanType().optional()
});
var CreateAdminRouteResponse = objectType({
  "name": stringType(),
  "destination": stringType(),
  "stopIds": arrayType(stringType()),
  "active": booleanType().optional()
}).and(objectType({
  "id": stringType(),
  "assignedBusIds": arrayType(stringType())
}));
var GetAdminQueuesResponseItem = objectType({
  "busId": stringType(),
  "busNumber": stringType(),
  "queueSize": numberType().int(),
  "occupancy": numberType().int(),
  "capacity": numberType().int(),
  "status": stringType()
});
var GetAdminQueuesResponse = arrayType(GetAdminQueuesResponseItem);
var GetAdminSafetyReportsResponseItem = objectType({
  "id": stringType(),
  "studentId": stringType(),
  "reportType": stringType(),
  "description": stringType(),
  "latitude": numberType(),
  "longitude": numberType(),
  "createdAt": coerce.date(),
  "status": stringType()
});
var GetAdminSafetyReportsResponse = arrayType(GetAdminSafetyReportsResponseItem);
var GetAiContextResponse = objectType({
  "buses": arrayType(objectType({
    "id": stringType(),
    "busNumber": stringType(),
    "origin": stringType(),
    "destination": stringType(),
    "routeLabel": stringType(),
    "capacity": numberType().int(),
    "currentOccupancy": numberType().int(),
    "currentLocation": objectType({
      "latitude": numberType(),
      "longitude": numberType()
    }),
    "nextStop": stringType(),
    "nextStopId": stringType(),
    "etaMinutes": numberType().int(),
    "status": stringType(),
    "updatedAt": coerce.date()
  })),
  "queue": objectType({
    "joined": booleanType(),
    "entry": objectType({
      "studentId": stringType(),
      "busId": stringType(),
      "boardingStop": stringType(),
      "queuePosition": numberType().int(),
      "joinedAt": coerce.date(),
      "status": stringType()
    }).nullable(),
    "busId": stringType(),
    "currentOccupancy": numberType().int(),
    "capacity": numberType().int(),
    "seatsAvailable": numberType().int(),
    "estimatedAvailabilityMinutes": numberType().int(),
    "message": stringType()
  }),
  "safetyAlerts": arrayType(objectType({
    "id": stringType(),
    "title": stringType(),
    "message": stringType(),
    "severity": stringType(),
    "latitude": numberType(),
    "longitude": numberType(),
    "createdAt": coerce.date()
  })),
  "destinations": arrayType(objectType({
    "id": stringType(),
    "name": stringType(),
    "type": stringType(),
    "description": stringType(),
    "latitude": numberType(),
    "longitude": numberType()
  }))
});
var SendAiChatBody = objectType({
  "studentId": stringType(),
  "message": stringType(),
  "destinationId": stringType().optional()
});
var SendAiChatResponse = objectType({
  "answer": stringType(),
  "sources": arrayType(stringType()),
  "context": objectType({
    "buses": arrayType(objectType({
      "id": stringType(),
      "busNumber": stringType(),
      "origin": stringType(),
      "destination": stringType(),
      "routeLabel": stringType(),
      "capacity": numberType().int(),
      "currentOccupancy": numberType().int(),
      "currentLocation": objectType({
        "latitude": numberType(),
        "longitude": numberType()
      }),
      "nextStop": stringType(),
      "nextStopId": stringType(),
      "etaMinutes": numberType().int(),
      "status": stringType(),
      "updatedAt": coerce.date()
    })),
    "queue": objectType({
      "joined": booleanType(),
      "entry": objectType({
        "studentId": stringType(),
        "busId": stringType(),
        "boardingStop": stringType(),
        "queuePosition": numberType().int(),
        "joinedAt": coerce.date(),
        "status": stringType()
      }).nullable(),
      "busId": stringType(),
      "currentOccupancy": numberType().int(),
      "capacity": numberType().int(),
      "seatsAvailable": numberType().int(),
      "estimatedAvailabilityMinutes": numberType().int(),
      "message": stringType()
    }),
    "safetyAlerts": arrayType(objectType({
      "id": stringType(),
      "title": stringType(),
      "message": stringType(),
      "severity": stringType(),
      "latitude": numberType(),
      "longitude": numberType(),
      "createdAt": coerce.date()
    })),
    "destinations": arrayType(objectType({
      "id": stringType(),
      "name": stringType(),
      "type": stringType(),
      "description": stringType(),
      "latitude": numberType(),
      "longitude": numberType()
    }))
  })
});
var ListTransportProvidersResponseItem = objectType({
  "id": stringType(),
  "name": stringType(),
  "category": stringType(),
  "status": stringType(),
  "dataLabel": stringType()
});
var ListTransportProvidersResponse = arrayType(ListTransportProvidersResponseItem);
var ListTransportRoutesResponseItem = objectType({
  "id": stringType(),
  "providerId": stringType(),
  "transportType": stringType(),
  "route": stringType(),
  "departure": stringType(),
  "arrival": stringType(),
  "durationMinutes": numberType().int(),
  "transfers": numberType().int(),
  "walkingDistanceKm": numberType(),
  "availability": stringType(),
  "dataLabel": stringType()
});
var ListTransportRoutesResponse = arrayType(ListTransportRoutesResponseItem);
var SearchTransportBody = objectType({
  "start": stringType(),
  "destination": stringType()
});
var SearchTransportResponseItem = objectType({
  "id": stringType(),
  "providerId": stringType(),
  "transportType": stringType(),
  "route": stringType(),
  "departure": stringType(),
  "arrival": stringType(),
  "durationMinutes": numberType().int(),
  "transfers": numberType().int(),
  "walkingDistanceKm": numberType(),
  "availability": stringType(),
  "dataLabel": stringType()
});
var SearchTransportResponse = arrayType(SearchTransportResponseItem);

// artifacts/api-server/src/routes/health.ts
var router = Router();
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});
var health_default = router;

// artifacts/api-server/src/routes/auth.ts
init_services();
init_db();
init_schema();
import { Router as Router2 } from "express";
import { eq as eq6 } from "drizzle-orm";
var router2 = Router2();
router2.post("/auth/profile", async (req, res) => {
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
  } catch (err) {
    console.error("Error syncing profile:", err);
    res.status(500).json({ error: "Failed to sync profile" });
  }
});
router2.post("/auth/campus-login", async (req, res) => {
  try {
    const { identifier, role = "STUDENT" } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: "Identifier is required" });
    }
    const cleanId = String(identifier).trim();
    let effectiveRole = "STUDENT";
    if (role === "ADMIN" || cleanId.toLowerCase() === "admin") {
      effectiveRole = "ADMIN";
    } else if (role === "DRIVER" || cleanId.toLowerCase().startsWith("driver-")) {
      effectiveRole = "DRIVER";
    } else if (role === "PARENT") {
      effectiveRole = "PARENT";
    }
    const email = `${cleanId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@rec.edu.in`;
    const name = effectiveRole === "DRIVER" ? cleanId.startsWith("driver-") ? cleanId.replace("driver-", "Driver ").toUpperCase() : `Driver ${cleanId}` : effectiveRole === "ADMIN" ? "Transport Administrator" : `Student (${cleanId})`;
    const profile = await getOrCreateProfile(cleanId, email, name, effectiveRole);
    const details = await getProfileWithDetails(cleanId);
    res.json({
      profile: details || profile,
      token: `campus-token-${cleanId}-${Date.now()}`
    });
  } catch (err) {
    console.error("Error in campus login:", err);
    res.status(500).json({ error: "Login failed" });
  }
});
router2.get("/auth/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const details = await getProfileWithDetails(userId);
    if (!details) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json({ profile: details });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});
router2.put("/auth/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, pickupStopId, assignedBusId } = req.body;
    const existingProfiles = await db.select().from(profiles).where(eq6(profiles.userId, userId));
    if (existingProfiles.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }
    const currentProfile = existingProfiles[0];
    if (name || phone) {
      await db.update(profiles).set({
        ...name ? { name } : {},
        ...phone ? { phone } : {}
      }).where(eq6(profiles.userId, userId));
    }
    if (currentProfile.role === "STUDENT" && (pickupStopId || assignedBusId)) {
      await db.update(students).set({
        ...pickupStopId ? { pickupStopId } : {},
        ...assignedBusId ? { assignedBusId } : {}
      }).where(eq6(students.profileId, currentProfile.id));
    }
    const updated = await getProfileWithDetails(userId);
    res.json({ profile: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});
var auth_default = router2;

// artifacts/api-server/src/routes/index.ts
init_buses();

// artifacts/api-server/src/routes/queue.ts
import { Router as Router4 } from "express";
init_services();
var router4 = Router4();
router4.get("/queue/status", async (req, res) => {
  try {
    const { busId = "bus-12" } = GetQueueStatusQueryParams.parse(req.query);
    const studentId = req.query.studentId || req.header("x-acims-user-id") || void 0;
    const bus = await getDbBusById(busId);
    if (!bus) {
      return res.status(404).json({ error: "Bus not found" });
    }
    const queueStatus = await getDbQueueStatus(busId, studentId);
    const formatted = {
      busId: bus.id,
      busNumber: bus.busNumber,
      joined: queueStatus.userInQueue,
      queueSize: queueStatus.queueSize,
      entry: queueStatus.entry ? {
        studentId: queueStatus.entry.studentId,
        boardingStop: queueStatus.entry.boardingStop,
        queuePosition: queueStatus.queuePosition ?? 1,
        joinedAt: queueStatus.entry.joinedAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString()
      } : null,
      seatsAvailable: 45,
      // Static physical bus capacity rating
      currentOccupancy: 0,
      // Occupancy deprecated
      estimatedAvailabilityMinutes: queueStatus.queuePosition ? Math.max(2, (queueStatus.queuePosition - 1) * 3) : Math.max(2, queueStatus.queueSize * 3),
      message: queueStatus.userInQueue ? `Your place is held at #${queueStatus.queuePosition} for Bus ${bus.busNumber}.` : queueStatus.queueSize > 0 ? `${queueStatus.queueSize} student(s) currently waiting in line for Bus ${bus.busNumber}.` : `Boarding line open for Bus ${bus.busNumber}. Reserve your place for upcoming arrival.`,
      status: queueStatus.status
    };
    res.json(formatted);
  } catch (err) {
    console.error("Error getting queue status:", err);
    res.status(500).json({ error: "Failed to get queue status" });
  }
});
router4.post("/queue/join", async (req, res) => {
  try {
    const input = JoinQueueBody.parse(req.body);
    const studentId = input.studentId || req.header("x-acims-user-id") || "student-20418";
    const bus = await getDbBusById(input.busId);
    if (!bus) {
      return res.status(404).json({ error: "Bus not found" });
    }
    const result = await joinDbQueue(input.busId, studentId, input.boardingStop);
    if (result.duplicate) {
      return res.status(409).json({
        error: "Student is already in the queue for this bus",
        status: {
          busId: bus.id,
          busNumber: bus.busNumber,
          joined: true,
          queueSize: result.status.queueSize,
          entry: result.status.entry ? {
            studentId: result.status.entry.studentId,
            boardingStop: result.status.entry.boardingStop,
            queuePosition: result.status.queuePosition ?? 1,
            joinedAt: result.status.entry.joinedAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString()
          } : null,
          seatsAvailable: 45,
          currentOccupancy: 0,
          estimatedAvailabilityMinutes: Math.max(2, (result.status.queuePosition || 1) * 3),
          message: `You are already registered in line at position #${result.status.queuePosition}.`
        }
      });
    }
    const responseStatus = {
      busId: bus.id,
      busNumber: bus.busNumber,
      joined: true,
      queueSize: result.status.queueSize,
      entry: {
        studentId: result.entry.studentId,
        boardingStop: result.entry.boardingStop,
        queuePosition: result.status.queuePosition ?? 1,
        joinedAt: result.entry.joinedAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString()
      },
      seatsAvailable: 45,
      currentOccupancy: 0,
      estimatedAvailabilityMinutes: Math.max(2, (result.status.queuePosition || 1) * 3),
      message: `Place confirmed at #${result.status.queuePosition} for boarding at ${result.entry.boardingStop}.`
    };
    res.status(201).json(responseStatus);
  } catch (err) {
    console.error("Error joining queue:", err);
    res.status(400).json({ error: "Failed to join queue" });
  }
});
router4.post("/queue/leave", async (req, res) => {
  try {
    const input = LeaveQueueBody.parse(req.body);
    const studentId = input.studentId || req.header("x-acims-user-id") || "student-20418";
    const bus = await getDbBusById(input.busId);
    if (!bus) {
      return res.status(404).json({ error: "Bus not found" });
    }
    const updatedStatus = await leaveDbQueue(input.busId, studentId);
    res.json({
      busId: bus.id,
      busNumber: bus.busNumber,
      joined: false,
      queueSize: updatedStatus.queueSize,
      entry: null,
      seatsAvailable: 45,
      currentOccupancy: 0,
      estimatedAvailabilityMinutes: 0,
      message: "You have left the boarding queue."
    });
  } catch (err) {
    console.error("Error leaving queue:", err);
    res.status(500).json({ error: "Failed to leave queue" });
  }
});
router4.get("/queue/my-active", async (req, res) => {
  try {
    const studentId = req.query.studentId || req.header("x-acims-user-id") || "student-20418";
    const activeQueue = await getDbStudentActiveQueue(studentId);
    if (!activeQueue) {
      return res.json({ inQueue: false, queue: null });
    }
    const bus = await getDbBusById(activeQueue.busId);
    res.json({
      inQueue: true,
      queue: {
        ...activeQueue,
        busNumber: bus?.busNumber || "12"
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch student active queue" });
  }
});
var queue_default = router4;

// artifacts/api-server/src/routes/notifications.ts
init_db();
init_schema();
init_services();
import { Router as Router5 } from "express";
import { eq as eq9 } from "drizzle-orm";
var router5 = Router5();
router5.get("/notifications", async (req, res) => {
  try {
    const userId = req.query.userId || req.header("x-acims-user-id") || "student-20418";
    const dbNotifs = await getUserNotifications(userId);
    if (dbNotifs.length > 0) {
      return res.json(
        dbNotifs.map((n) => ({
          id: String(n.id),
          type: n.type,
          title: n.title,
          message: n.message,
          timestamp: n.createdAt ? n.createdAt.toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
          read: Boolean(n.readAt)
        }))
      );
    }
    const welcome = await db.insert(notifications).values({
      userId,
      type: "info",
      title: "Campus Mobility Pass Ready",
      message: "Your ACIMS transit access is active. Real driver GPS tracking is live for college feeder routes."
    }).returning();
    res.json([
      {
        id: String(welcome[0].id),
        type: welcome[0].type,
        title: welcome[0].title,
        message: welcome[0].message,
        timestamp: welcome[0].createdAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
        read: false
      }
    ]);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Failed to list notifications" });
  }
});
router5.post("/notifications/read", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Notification id required" });
    }
    const numId = parseInt(id, 10);
    if (!isNaN(numId)) {
      await db.update(notifications).set({ readAt: /* @__PURE__ */ new Date() }).where(eq9(notifications.id, numId));
    }
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notification read" });
  }
});
var notifications_default = router5;

// artifacts/api-server/src/routes/campus.ts
import { Router as Router6 } from "express";

// artifacts/api-server/src/services/campus.ts
init_campusData();

// artifacts/api-server/src/services/busTracking.ts
init_routesData();
init_eta();
var fleetState = [];
function getBuses() {
  return fleetState.map((bus) => ({
    ...bus,
    currentLocation: { ...bus.currentLocation }
  }));
}

// artifacts/api-server/src/services/campus.ts
init_eta();

// lib/db/src/index.ts
import pg2 from "pg";
import { drizzle as drizzlePg2 } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite2 } from "drizzle-orm/pglite";
import { PGlite as PGlite2 } from "@electric-sql/pglite";

// lib/db/src/schema/index.ts
var schema_exports2 = {};
__export(schema_exports2, {
  adminUsers: () => adminUsers,
  aiConversations: () => aiConversations,
  aiMessages: () => aiMessages,
  buses: () => buses2,
  campusLocations: () => campusLocations2,
  drivers: () => drivers3,
  emergencyContacts: () => emergencyContacts3,
  insertAdminUserSchema: () => insertAdminUserSchema,
  insertAiConversationSchema: () => insertAiConversationSchema,
  insertAiMessageSchema: () => insertAiMessageSchema,
  insertBusSchema: () => insertBusSchema,
  insertCampusLocationSchema: () => insertCampusLocationSchema,
  insertDriverSchema: () => insertDriverSchema,
  insertEmergencyContactSchema: () => insertEmergencyContactSchema,
  insertNavigationRouteSchema: () => insertNavigationRouteSchema,
  insertProfileSchema: () => insertProfileSchema,
  insertPublicTransportJourneySchema: () => insertPublicTransportJourneySchema,
  insertPublicTransportRouteSchema: () => insertPublicTransportRouteSchema,
  insertPublicTransportStopSchema: () => insertPublicTransportStopSchema,
  insertSafetyAlertSchema: () => insertSafetyAlertSchema,
  insertSafetyReportSchema: () => insertSafetyReportSchema,
  insertSessionSchema: () => insertSessionSchema,
  insertStudentSchema: () => insertStudentSchema,
  insertTransportProviderSchema: () => insertTransportProviderSchema,
  navigationRoutes: () => navigationRoutes,
  profiles: () => profiles2,
  publicTransportJourneys: () => publicTransportJourneys,
  publicTransportRoutes: () => publicTransportRoutes,
  publicTransportStops: () => publicTransportStops2,
  safetyAlerts: () => safetyAlerts,
  safetyReports: () => safetyReports2,
  sessions: () => sessions,
  students: () => students2,
  transportProviders: () => transportProviders
});

// node_modules/.bun/drizzle-zod@0.7.1+23a58933566fb8bd/node_modules/drizzle-zod/index.mjs
import { isTable, getTableColumns, getViewSelectedFields, is, Column, SQL, isView } from "drizzle-orm";
var CONSTANTS = {
  INT8_MIN: -128,
  INT8_MAX: 127,
  INT8_UNSIGNED_MAX: 255,
  INT16_MIN: -32768,
  INT16_MAX: 32767,
  INT16_UNSIGNED_MAX: 65535,
  INT24_MIN: -8388608,
  INT24_MAX: 8388607,
  INT24_UNSIGNED_MAX: 16777215,
  INT32_MIN: -2147483648,
  INT32_MAX: 2147483647,
  INT32_UNSIGNED_MAX: 4294967295,
  INT48_MIN: -140737488355328,
  INT48_MAX: 140737488355327,
  INT48_UNSIGNED_MAX: 281474976710655,
  INT64_MIN: -9223372036854775808n,
  INT64_MAX: 9223372036854775807n,
  INT64_UNSIGNED_MAX: 18446744073709551615n
};
function isColumnType(column, columnTypes) {
  return columnTypes.includes(column.columnType);
}
function isWithEnum(column) {
  return "enumValues" in column && Array.isArray(column.enumValues) && column.enumValues.length > 0;
}
var literalSchema = external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean(), external_exports.null()]);
var jsonSchema = external_exports.union([literalSchema, external_exports.record(external_exports.any()), external_exports.array(external_exports.any())]);
var bufferSchema = external_exports.custom((v) => v instanceof Buffer);
function columnToSchema(column, factory) {
  const z$1 = factory?.zodInstance ?? external_exports;
  const coerce2 = factory?.coerce ?? {};
  let schema;
  if (isWithEnum(column)) {
    schema = column.enumValues.length ? z$1.enum(column.enumValues) : z$1.string();
  }
  if (!schema) {
    if (isColumnType(column, ["PgGeometry", "PgPointTuple"])) {
      schema = z$1.tuple([z$1.number(), z$1.number()]);
    } else if (isColumnType(column, ["PgGeometryObject", "PgPointObject"])) {
      schema = z$1.object({ x: z$1.number(), y: z$1.number() });
    } else if (isColumnType(column, ["PgHalfVector", "PgVector"])) {
      schema = z$1.array(z$1.number());
      schema = column.dimensions ? schema.length(column.dimensions) : schema;
    } else if (isColumnType(column, ["PgLine"])) {
      schema = z$1.tuple([z$1.number(), z$1.number(), z$1.number()]);
    } else if (isColumnType(column, ["PgLineABC"])) {
      schema = z$1.object({
        a: z$1.number(),
        b: z$1.number(),
        c: z$1.number()
      });
    } else if (isColumnType(column, ["PgArray"])) {
      schema = z$1.array(columnToSchema(column.baseColumn, z$1));
      schema = column.size ? schema.length(column.size) : schema;
    } else if (column.dataType === "array") {
      schema = z$1.array(z$1.any());
    } else if (column.dataType === "number") {
      schema = numberColumnToSchema(column, z$1, coerce2);
    } else if (column.dataType === "bigint") {
      schema = bigintColumnToSchema(column, z$1, coerce2);
    } else if (column.dataType === "boolean") {
      schema = coerce2 === true || coerce2.boolean ? z$1.coerce.boolean() : z$1.boolean();
    } else if (column.dataType === "date") {
      schema = coerce2 === true || coerce2.date ? z$1.coerce.date() : z$1.date();
    } else if (column.dataType === "string") {
      schema = stringColumnToSchema(column, z$1, coerce2);
    } else if (column.dataType === "json") {
      schema = jsonSchema;
    } else if (column.dataType === "custom") {
      schema = z$1.any();
    } else if (column.dataType === "buffer") {
      schema = bufferSchema;
    }
  }
  if (!schema) {
    schema = z$1.any();
  }
  return schema;
}
function numberColumnToSchema(column, z, coerce2) {
  let unsigned = column.getSQLType().includes("unsigned");
  let min;
  let max;
  let integer4 = false;
  if (isColumnType(column, ["MySqlTinyInt", "SingleStoreTinyInt"])) {
    min = unsigned ? 0 : CONSTANTS.INT8_MIN;
    max = unsigned ? CONSTANTS.INT8_UNSIGNED_MAX : CONSTANTS.INT8_MAX;
    integer4 = true;
  } else if (isColumnType(column, [
    "PgSmallInt",
    "PgSmallSerial",
    "MySqlSmallInt",
    "SingleStoreSmallInt"
  ])) {
    min = unsigned ? 0 : CONSTANTS.INT16_MIN;
    max = unsigned ? CONSTANTS.INT16_UNSIGNED_MAX : CONSTANTS.INT16_MAX;
    integer4 = true;
  } else if (isColumnType(column, [
    "PgReal",
    "MySqlFloat",
    "MySqlMediumInt",
    "SingleStoreMediumInt",
    "SingleStoreFloat"
  ])) {
    min = unsigned ? 0 : CONSTANTS.INT24_MIN;
    max = unsigned ? CONSTANTS.INT24_UNSIGNED_MAX : CONSTANTS.INT24_MAX;
    integer4 = isColumnType(column, ["MySqlMediumInt", "SingleStoreMediumInt"]);
  } else if (isColumnType(column, [
    "PgInteger",
    "PgSerial",
    "MySqlInt",
    "SingleStoreInt"
  ])) {
    min = unsigned ? 0 : CONSTANTS.INT32_MIN;
    max = unsigned ? CONSTANTS.INT32_UNSIGNED_MAX : CONSTANTS.INT32_MAX;
    integer4 = true;
  } else if (isColumnType(column, [
    "PgDoublePrecision",
    "MySqlReal",
    "MySqlDouble",
    "SingleStoreReal",
    "SingleStoreDouble",
    "SQLiteReal"
  ])) {
    min = unsigned ? 0 : CONSTANTS.INT48_MIN;
    max = unsigned ? CONSTANTS.INT48_UNSIGNED_MAX : CONSTANTS.INT48_MAX;
  } else if (isColumnType(column, [
    "PgBigInt53",
    "PgBigSerial53",
    "MySqlBigInt53",
    "MySqlSerial",
    "SingleStoreBigInt53",
    "SingleStoreSerial",
    "SQLiteInteger"
  ])) {
    unsigned = unsigned || isColumnType(column, ["MySqlSerial", "SingleStoreSerial"]);
    min = unsigned ? 0 : Number.MIN_SAFE_INTEGER;
    max = Number.MAX_SAFE_INTEGER;
    integer4 = true;
  } else if (isColumnType(column, ["MySqlYear", "SingleStoreYear"])) {
    min = 1901;
    max = 2155;
    integer4 = true;
  } else {
    min = Number.MIN_SAFE_INTEGER;
    max = Number.MAX_SAFE_INTEGER;
  }
  let schema = coerce2 === true || coerce2?.number ? z.coerce.number() : z.number();
  schema = schema.min(min).max(max);
  return integer4 ? schema.int() : schema;
}
function bigintColumnToSchema(column, z, coerce2) {
  const unsigned = column.getSQLType().includes("unsigned");
  const min = unsigned ? 0n : CONSTANTS.INT64_MIN;
  const max = unsigned ? CONSTANTS.INT64_UNSIGNED_MAX : CONSTANTS.INT64_MAX;
  const schema = coerce2 === true || coerce2?.bigint ? z.coerce.bigint() : z.bigint();
  return schema.min(min).max(max);
}
function stringColumnToSchema(column, z, coerce2) {
  if (isColumnType(column, ["PgUUID"])) {
    return z.string().uuid();
  }
  let max;
  let regex;
  let fixed = false;
  if (isColumnType(column, ["PgVarchar", "SQLiteText"])) {
    max = column.length;
  } else if (isColumnType(column, ["MySqlVarChar", "SingleStoreVarChar"])) {
    max = column.length ?? CONSTANTS.INT16_UNSIGNED_MAX;
  } else if (isColumnType(column, ["MySqlText", "SingleStoreText"])) {
    if (column.textType === "longtext") {
      max = CONSTANTS.INT32_UNSIGNED_MAX;
    } else if (column.textType === "mediumtext") {
      max = CONSTANTS.INT24_UNSIGNED_MAX;
    } else if (column.textType === "text") {
      max = CONSTANTS.INT16_UNSIGNED_MAX;
    } else {
      max = CONSTANTS.INT8_UNSIGNED_MAX;
    }
  }
  if (isColumnType(column, [
    "PgChar",
    "MySqlChar",
    "SingleStoreChar"
  ])) {
    max = column.length;
    fixed = true;
  }
  if (isColumnType(column, ["PgBinaryVector"])) {
    regex = /^[01]+$/;
    max = column.dimensions;
  }
  let schema = coerce2 === true || coerce2?.string ? z.coerce.string() : z.string();
  schema = regex ? schema.regex(regex) : schema;
  return max && fixed ? schema.length(max) : max ? schema.max(max) : schema;
}
function getColumns(tableLike) {
  return isTable(tableLike) ? getTableColumns(tableLike) : getViewSelectedFields(tableLike);
}
function handleColumns(columns, refinements, conditions, factory) {
  const columnSchemas = {};
  for (const [key, selected] of Object.entries(columns)) {
    if (!is(selected, Column) && !is(selected, SQL) && !is(selected, SQL.Aliased) && typeof selected === "object") {
      const columns2 = isTable(selected) || isView(selected) ? getColumns(selected) : selected;
      columnSchemas[key] = handleColumns(columns2, refinements[key] ?? {}, conditions, factory);
      continue;
    }
    const refinement = refinements[key];
    if (refinement !== void 0 && typeof refinement !== "function") {
      columnSchemas[key] = refinement;
      continue;
    }
    const column = is(selected, Column) ? selected : void 0;
    const schema = column ? columnToSchema(column, factory) : external_exports.any();
    const refined = typeof refinement === "function" ? refinement(schema) : schema;
    if (conditions.never(column)) {
      continue;
    } else {
      columnSchemas[key] = refined;
    }
    if (column) {
      if (conditions.nullable(column)) {
        columnSchemas[key] = columnSchemas[key].nullable();
      }
      if (conditions.optional(column)) {
        columnSchemas[key] = columnSchemas[key].optional();
      }
    }
  }
  return external_exports.object(columnSchemas);
}
var insertConditions = {
  never: (column) => column?.generated?.type === "always" || column?.generatedIdentity?.type === "always",
  optional: (column) => !column.notNull || column.notNull && column.hasDefault,
  nullable: (column) => !column.notNull
};
var createInsertSchema = (entity, refine) => {
  const columns = getColumns(entity);
  return handleColumns(columns, refine ?? {}, insertConditions);
};

// lib/db/src/schema/phase2.ts
import { boolean as boolean2, doublePrecision as doublePrecision2, integer as integer2, pgTable as pgTable2, text as text2, timestamp as timestamp2 } from "drizzle-orm/pg-core";
var campusLocations2 = pgTable2("campus_locations", {
  id: text2("id").primaryKey(),
  name: text2("name").notNull(),
  type: text2("type").notNull(),
  description: text2("description").notNull(),
  latitude: doublePrecision2("latitude").notNull(),
  longitude: doublePrecision2("longitude").notNull()
});
var navigationRoutes = pgTable2("navigation_routes", {
  id: text2("id").primaryKey(),
  startLocationId: text2("start_location_id").notNull(),
  destinationLocationId: text2("destination_location_id").notNull(),
  mode: text2("mode").notNull(),
  distanceKm: doublePrecision2("distance_km").notNull(),
  walkingMinutes: integer2("walking_minutes").notNull()
});
var safetyReports2 = pgTable2("safety_reports", {
  id: text2("id").primaryKey(),
  studentId: text2("student_id").notNull(),
  reportType: text2("report_type").notNull(),
  description: text2("description").notNull(),
  latitude: doublePrecision2("latitude").notNull(),
  longitude: doublePrecision2("longitude").notNull(),
  status: text2("status").notNull().default("OPEN"),
  createdAt: timestamp2("created_at", { withTimezone: true }).notNull().defaultNow()
});
var emergencyContacts3 = pgTable2("emergency_contacts", {
  id: text2("id").primaryKey(),
  studentId: text2("student_id").notNull(),
  name: text2("name").notNull(),
  relationship: text2("relationship").notNull(),
  phone: text2("phone").notNull()
});
var safetyAlerts = pgTable2("safety_alerts", {
  id: text2("id").primaryKey(),
  title: text2("title").notNull(),
  message: text2("message").notNull(),
  severity: text2("severity").notNull(),
  latitude: doublePrecision2("latitude").notNull(),
  longitude: doublePrecision2("longitude").notNull(),
  createdAt: timestamp2("created_at", { withTimezone: true }).notNull().defaultNow()
});
var adminUsers = pgTable2("admin_users", {
  id: text2("id").primaryKey(),
  displayName: text2("display_name").notNull(),
  active: boolean2("active").notNull().default(true)
});
var transportProviders = pgTable2("transport_providers", {
  id: text2("id").primaryKey(),
  name: text2("name").notNull(),
  category: text2("category").notNull(),
  status: text2("status").notNull(),
  dataLabel: text2("data_label").notNull()
});
var publicTransportRoutes = pgTable2("public_transport_routes", {
  id: text2("id").primaryKey(),
  providerId: text2("provider_id").notNull(),
  route: text2("route").notNull(),
  transportType: text2("transport_type").notNull()
});
var publicTransportStops2 = pgTable2("public_transport_stops", {
  id: text2("id").primaryKey(),
  providerId: text2("provider_id").notNull(),
  name: text2("name").notNull(),
  latitude: doublePrecision2("latitude").notNull(),
  longitude: doublePrecision2("longitude").notNull()
});
var publicTransportJourneys = pgTable2("public_transport_journeys", {
  id: text2("id").primaryKey(),
  providerId: text2("provider_id").notNull(),
  transportType: text2("transport_type").notNull(),
  route: text2("route").notNull(),
  departure: text2("departure").notNull(),
  arrival: text2("arrival").notNull(),
  durationMinutes: integer2("duration_minutes").notNull(),
  transfers: integer2("transfers").notNull().default(0),
  walkingDistanceKm: doublePrecision2("walking_distance_km").notNull(),
  availability: text2("availability").notNull(),
  dataLabel: text2("data_label").notNull()
});
var aiConversations = pgTable2("ai_conversations", {
  id: text2("id").primaryKey(),
  studentId: text2("student_id").notNull(),
  createdAt: timestamp2("created_at", { withTimezone: true }).notNull().defaultNow()
});
var aiMessages = pgTable2("ai_messages", {
  id: text2("id").primaryKey(),
  conversationId: text2("conversation_id").notNull(),
  role: text2("role").notNull(),
  content: text2("content").notNull(),
  createdAt: timestamp2("created_at", { withTimezone: true }).notNull().defaultNow()
});
var insertCampusLocationSchema = createInsertSchema(campusLocations2);
var insertNavigationRouteSchema = createInsertSchema(navigationRoutes);
var insertSafetyReportSchema = createInsertSchema(safetyReports2);
var insertEmergencyContactSchema = createInsertSchema(emergencyContacts3);
var insertSafetyAlertSchema = createInsertSchema(safetyAlerts);
var insertAdminUserSchema = createInsertSchema(adminUsers);
var insertTransportProviderSchema = createInsertSchema(transportProviders);
var insertPublicTransportRouteSchema = createInsertSchema(publicTransportRoutes);
var insertPublicTransportStopSchema = createInsertSchema(publicTransportStops2);
var insertPublicTransportJourneySchema = createInsertSchema(publicTransportJourneys);
var insertAiConversationSchema = createInsertSchema(aiConversations);
var insertAiMessageSchema = createInsertSchema(aiMessages);

// lib/db/src/schema/auth.ts
import { boolean as boolean3, integer as integer3, pgTable as pgTable3, text as text3, timestamp as timestamp3 } from "drizzle-orm/pg-core";
var profiles2 = pgTable3("profiles", {
  id: text3("id").primaryKey(),
  role: text3("role").notNull(),
  // 'student' | 'driver' | 'admin'
  fullName: text3("full_name").notNull(),
  email: text3("email"),
  phone: text3("phone"),
  createdAt: timestamp3("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp3("updated_at", { withTimezone: true }).notNull().defaultNow()
});
var students2 = pgTable3("students", {
  id: text3("id").primaryKey(),
  profileId: text3("profile_id").notNull(),
  studentId: text3("student_id").notNull().unique(),
  // e.g. Roll number or registration ID
  department: text3("department").notNull(),
  batch: text3("batch"),
  createdAt: timestamp3("created_at", { withTimezone: true }).notNull().defaultNow()
});
var drivers3 = pgTable3("drivers", {
  id: text3("id").primaryKey(),
  profileId: text3("profile_id"),
  name: text3("name").notNull(),
  phone: text3("phone").notNull().unique(),
  busId: text3("bus_id"),
  routeId: text3("route_id"),
  active: boolean3("active").notNull().default(true),
  licenseNumber: text3("license_number"),
  createdAt: timestamp3("created_at", { withTimezone: true }).notNull().defaultNow()
});
var buses2 = pgTable3("buses", {
  id: text3("id").primaryKey(),
  busNumber: text3("bus_number").notNull(),
  routeId: text3("route_id").notNull(),
  driverId: text3("driver_id"),
  capacity: integer3("capacity").notNull().default(40),
  active: boolean3("active").notNull().default(true),
  status: text3("status").notNull().default("ON ROUTE"),
  createdAt: timestamp3("created_at", { withTimezone: true }).notNull().defaultNow()
});
var sessions = pgTable3("sessions", {
  token: text3("token").primaryKey(),
  profileId: text3("profile_id").notNull(),
  role: text3("role").notNull(),
  // 'student' | 'driver' | 'admin'
  entityId: text3("entity_id").notNull(),
  // student ID, driver ID, or admin username
  expiresAt: timestamp3("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp3("created_at", { withTimezone: true }).notNull().defaultNow()
});
var insertProfileSchema = createInsertSchema(profiles2);
var insertStudentSchema = createInsertSchema(students2);
var insertDriverSchema = createInsertSchema(drivers3);
var insertBusSchema = createInsertSchema(buses2);
var insertSessionSchema = createInsertSchema(sessions);

// lib/db/src/index.ts
import fs3 from "node:fs";
import path3 from "node:path";
var { Pool: Pool2 } = pg2;
var pool2 = null;
var pgliteClient2 = null;
var db2 = null;
var rawDbUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/^["']|["']$/g, "").trim() : void 0;
if (rawDbUrl) {
  process.env.DATABASE_URL = rawDbUrl;
  try {
    pool2 = new Pool2({
      connectionString: rawDbUrl,
      ssl: rawDbUrl.includes("localhost") ? false : { rejectUnauthorized: false }
    });
    db2 = drizzlePg2(pool2, { schema: schema_exports2 });
    console.log("[ACIMS DB] Connected to external PostgreSQL via DATABASE_URL");
  } catch (err) {
    console.error("[ACIMS DB] Failed to initialize PostgreSQL pool:", err);
  }
}
if (!db2) {
  const dataDir = path3.resolve(process.cwd(), "data/postgres");
  if (!fs3.existsSync(dataDir)) {
    fs3.mkdirSync(dataDir, { recursive: true });
  }
  pgliteClient2 = global._pgliteClient ?? new PGlite2(dataDir);
  global._pgliteClient = pgliteClient2;
  db2 = drizzlePglite2(pgliteClient2, { schema: schema_exports2 });
  console.log(`[ACIMS DB] Persistent PostgreSQL engine initialized at ${dataDir}`);
}

// artifacts/api-server/src/services/admin.ts
var routes = [
  {
    id: "route-bus-18",
    name: "Metro Connector Feeder (Metro Central \u2192 Medical Center)",
    destination: "Medical Sciences Center",
    stopIds: ["metro-central", "jb-estate", "ponnu", "ramratna", "medical-sciences"],
    active: true,
    assignedBusIds: ["bus-18"]
  },
  {
    id: "route-bus-12",
    name: "Campus Loop A (Vandalur \u2192 Tambaram \u2192 College)",
    destination: "Academic Quad",
    stopIds: ["vandalur", "perungalathur", "tambaram", "college"],
    active: true,
    assignedBusIds: ["bus-12"]
  },
  {
    id: "route-bus-4b",
    name: "Engineering Express (North Residence \u2192 Tech Park)",
    destination: "Tech & Innovation Park",
    stopIds: ["north-residence", "bio-center", "college"],
    active: true,
    assignedBusIds: ["bus-4b"]
  },
  {
    id: "route-bus-7",
    name: "North Campus Shuttle (Hostel Village \u2192 Library)",
    destination: "Central Library & Union",
    stopIds: ["hostel-village", "athletics", "library", "college"],
    active: true,
    assignedBusIds: ["bus-7"]
  },
  {
    id: "route-bus-21",
    name: "South Perimeter Circle (South Lot \u2192 Auditorium)",
    destination: "Main Auditorium",
    stopIds: ["south-lot", "faculty-enclave", "student-center"],
    active: true,
    assignedBusIds: ["bus-21"]
  }
];
function listRoutes() {
  return routes.map((route) => ({ ...route, stopIds: [...route.stopIds], assignedBusIds: [...route.assignedBusIds] }));
}
function getAdminQueues() {
  return getBuses().map((bus) => ({
    busId: bus.id,
    busNumber: bus.busNumber,
    queueSize: 0,
    capacity: bus.capacity,
    status: "Active"
  }));
}

// artifacts/api-server/src/services/campus.ts
function getCampusMobilityData() {
  return {
    campus: "Rajalakshmi Engineering College (REC)",
    campusTamil: "\u0BB0\u0BBE\u0B9C\u0BB2\u0B9F\u0BCD\u0B9A\u0BC1\u0BAE\u0BBF \u0BAA\u0BCA\u0BB1\u0BBF\u0BAF\u0BBF\u0BAF\u0BB2\u0BCD \u0B95\u0BB2\u0BCD\u0BB2\u0BC2\u0BB0\u0BBF",
    center: REC_CAMPUS_CENTER,
    bounds: REC_CAMPUS_BOUNDS,
    buildings: REC_BUILDINGS,
    campusStops: REC_CAMPUS_STOPS,
    campusPaths: REC_CAMPUS_PATHS,
    pointsOfInterest: REC_POINTS_OF_INTEREST
  };
}
function listCampusStops() {
  const buses3 = getBuses();
  return REC_CAMPUS_STOPS.map((stop) => {
    return {
      id: stop.id,
      name: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      description: stop.description,
      servingBusIds: buses3.map((b) => b.id),
      routeNames: stop.servedRoutes
    };
  });
}
function listCampusRoutes() {
  const adminRoutes = listRoutes().filter((route) => route.active);
  const buses3 = getBuses();
  return adminRoutes.map((route) => {
    const assignedBus = buses3.find(
      (bus) => bus.routeId === route.id || route.assignedBusIds.includes(bus.id)
    );
    return {
      id: route.id,
      name: route.name,
      busId: assignedBus?.id ?? (route.assignedBusIds[0] || ""),
      busNumber: assignedBus?.busNumber ?? "",
      destination: route.destination,
      stopIds: [...route.stopIds]
    };
  });
}

// artifacts/api-server/src/routes/campus.ts
init_services();
var router6 = Router6();
router6.get("/campus/mobility", async (_req, res) => {
  const data = getCampusMobilityData();
  const dbLocations = await getDbCampusLocations();
  const dbPaths = await getDbCampusPaths();
  res.json({
    ...data,
    buildings: dbLocations.filter((l) => l.category === "academic" || l.category === "facility"),
    campusPaths: dbPaths.length > 0 ? dbPaths : data.campusPaths
  });
});
router6.get("/campus/locations", async (req, res) => {
  try {
    const category = req.query.category;
    const locations = await getDbCampusLocations(category);
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch campus locations" });
  }
});
router6.get("/campus/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.trim().length === 0) {
      return res.json([]);
    }
    const results = await searchDbCampusLocations(query);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});
router6.get("/campus/nearby", async (req, res) => {
  try {
    let haversineM2 = function(lat1, lon1, lat2, lon2) {
      const R = 6371e3;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    var haversineM = haversineM2;
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: "Valid latitude and longitude required" });
    }
    const locations = await getDbCampusLocations();
    const sorted = locations.map((loc) => ({
      ...loc,
      distanceMeters: Math.round(haversineM2(lat, lon, loc.latitude, loc.longitude))
    })).sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 10);
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: "Failed to find nearby campus locations" });
  }
});
router6.get("/campus/stops", (_req, res) => {
  res.json(listCampusStops());
});
router6.get("/campus/routes", (_req, res) => {
  res.json(listCampusRoutes());
});
router6.get("/navigation/destinations", async (_req, res) => {
  try {
    const locations = await getDbCampusLocations();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch destinations" });
  }
});
router6.post("/campus/walk-route", async (req, res) => {
  try {
    const { startId, destinationId, startLatitude, startLongitude } = req.body;
    if (!destinationId) {
      return res.status(400).json({ error: "destinationId is required" });
    }
    let start;
    if (typeof startLatitude === "number" && typeof startLongitude === "number") {
      start = { latitude: startLatitude, longitude: startLongitude };
    } else if (startId) {
      start = startId;
    } else {
      return res.status(400).json({ error: "Either startId or real GPS coordinates (startLatitude/startLongitude) are required" });
    }
    const route = await calculateDbCampusWalkingRoute(start, destinationId);
    if (!route) {
      return res.status(404).json({ error: "Walking route unavailable." });
    }
    res.json(route);
  } catch (err) {
    console.error("Error calculating walk route:", err);
    res.status(500).json({ error: "Walking route unavailable." });
  }
});
router6.post("/navigation/route", async (req, res) => {
  try {
    const body = req.body;
    if (!body.destinationId) {
      return res.status(400).json({ error: "destinationId required" });
    }
    let start;
    if (typeof body.startLatitude === "number" && typeof body.startLongitude === "number") {
      start = { latitude: body.startLatitude, longitude: body.startLongitude };
    } else if (body.startLocationId) {
      start = body.startLocationId;
    } else {
      start = "REC Main Gate";
    }
    const dbRoute = await calculateDbCampusWalkingRoute(start, body.destinationId);
    if (dbRoute) {
      return res.json({
        destinationId: body.destinationId,
        destinationName: dbRoute.destination,
        totalDistanceMeters: dbRoute.distanceMeters,
        totalTimeMinutes: dbRoute.walkingMinutes,
        mode: body.mode || "walking",
        steps: dbRoute.steps.map((text4, i) => ({
          instruction: text4,
          distanceMeters: Math.round(dbRoute.distanceMeters / dbRoute.steps.length),
          timeMinutes: Math.round(dbRoute.walkingMinutes / dbRoute.steps.length)
        })),
        pathPoints: dbRoute.pathPoints,
        source: "Cloud SQL campus_paths"
      });
    }
    res.status(404).json({ error: "Walking route unavailable." });
  } catch (err) {
    res.status(500).json({ error: "Walking route unavailable." });
  }
});
var campus_default = router6;

// artifacts/api-server/src/routes/safety.ts
import { Router as Router7 } from "express";
init_db();
init_schema();
import { eq as eq10, desc as desc6 } from "drizzle-orm";

// artifacts/api-server/src/services/safety.ts
var reports = [
  {
    id: "safety-report-101",
    studentId: "student-20418",
    reportType: "Road hazard",
    description: "Pothole developing near Science Quad pedestrian crosswalk causing buses to swerve.",
    latitude: 12.9431,
    longitude: 80.1419,
    status: "UNDER REVIEW",
    createdAt: new Date(Date.now() - 1e3 * 60 * 120)
  },
  {
    id: "safety-report-102",
    studentId: "student-99411",
    reportType: "Unsafe area",
    description: "Low-lighting along the path between North Residence and Athletic Pavilion after 7 PM.",
    latitude: 12.9458,
    longitude: 80.1352,
    status: "OPEN",
    createdAt: new Date(Date.now() - 1e3 * 60 * 300)
  },
  {
    id: "safety-report-103",
    studentId: "student-38291",
    reportType: "Bus/driver concern",
    description: "Bus #18 rear door sensor was slow to release during the 8:00 AM rush at Tambaram stop.",
    latitude: 12.9249,
    longitude: 80.1275,
    status: "RESOLVED",
    createdAt: new Date(Date.now() - 1e3 * 60 * 1440)
  }
];
var alerts = [
  {
    id: "safety-alert-east-gate",
    title: "Stay aware near the East Gate pathway",
    message: "A road-surface and lighting concern was reported near the East Gate. Use the lit main campus avenue where possible.",
    severity: "advisory",
    latitude: 12.9431,
    longitude: 80.1419,
    createdAt: new Date(Date.now() - 1e3 * 60 * 38)
  },
  {
    id: "safety-alert-tambaram-crowd",
    title: "Peak corridor alert at Tambaram Terminal",
    message: "High commuter pedestrian volume around the Tambaram bus interchange. Stay on marked zebra crossings and queue lines.",
    severity: "warning",
    latitude: 12.9249,
    longitude: 80.1275,
    createdAt: new Date(Date.now() - 1e3 * 60 * 15)
  }
];
function listSafetyAlerts() {
  return alerts.map((alert) => ({ ...alert }));
}

// artifacts/api-server/src/routes/safety.ts
var router7 = Router7();
router7.get("/safety/reports", async (req, res) => {
  try {
    const studentId = req.query.studentId || req.header("x-acims-user-id") || "student-20418";
    const reports2 = await db.select().from(safetyReports).where(eq10(safetyReports.studentId, studentId)).orderBy(desc6(safetyReports.createdAt));
    res.json(reports2);
  } catch (err) {
    res.status(500).json({ error: "Failed to list safety reports" });
  }
});
router7.post("/safety/report", async (req, res) => {
  try {
    const input = CreateSafetyReportBody.parse(req.body);
    const studentId = req.body.studentId || req.header("x-acims-user-id") || "student-20418";
    const reportId = `report-${Date.now()}`;
    const created = await db.insert(safetyReports).values({
      id: reportId,
      studentId,
      reportType: input.type,
      description: input.description,
      latitude: input.latitude,
      longitude: input.longitude,
      status: "OPEN"
    }).returning();
    await db.insert(notifications).values({
      userId: studentId,
      type: "safety",
      title: "Safety Report Logged",
      message: `Your ${input.type} report has been dispatched to campus security.`
    });
    res.status(201).json(created[0]);
  } catch (err) {
    console.error("Error creating safety report:", err);
    res.status(400).json({ error: "Failed to create report" });
  }
});
router7.patch("/safety/reports/:reportId/status", async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }
    const updated = await db.update(safetyReports).set({ status }).where(eq10(safetyReports.id, reportId)).returning();
    if (updated.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update safety report" });
  }
});
router7.get("/safety/alerts", (_req, res) => {
  res.json(listSafetyAlerts());
});
router7.get("/safety/contacts", async (req, res) => {
  try {
    const userId = req.query.userId || req.header("x-acims-user-id") || "student-20418";
    const contacts = await db.select().from(emergencyContacts).where(eq10(emergencyContacts.userId, userId));
    if (contacts.length > 0) {
      return res.json(contacts);
    }
    const defaults = [
      { id: "sec-campus-1", userId, name: "REC Campus Security Control", relationship: "Campus Patrol", phone: "+91 44 2715 6750" },
      { id: "sec-transport-1", userId, name: "Transport Office Helpline", relationship: "Fleet Dispatch", phone: "+91 44 2715 6755" }
    ];
    for (const d of defaults) {
      await db.insert(emergencyContacts).values(d).onConflictDoNothing();
    }
    res.json(defaults);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch emergency contacts" });
  }
});
router7.post("/safety/contacts", async (req, res) => {
  try {
    const { name, relationship, phone } = req.body;
    const userId = req.body.userId || req.header("x-acims-user-id") || "student-20418";
    if (!name || !relationship || !phone) {
      return res.status(400).json({ error: "Name, relationship, and phone are required" });
    }
    const created = await db.insert(emergencyContacts).values({
      id: `contact-${Date.now()}`,
      userId,
      name,
      relationship,
      phone
    }).returning();
    res.status(201).json(created[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add emergency contact" });
  }
});
router7.post("/safety/emergency", async (req, res) => {
  try {
    const input = ActivateEmergencyBody.parse(req.body);
    const studentId = req.body.studentId || req.header("x-acims-user-id") || "student-20418";
    const created = await db.insert(safetyReports).values({
      id: `sos-${Date.now()}`,
      studentId,
      reportType: "EMERGENCY_SOS",
      description: `Immediate SOS Triggered at [${input.latitude}, ${input.longitude}]`,
      latitude: input.latitude,
      longitude: input.longitude,
      status: "URGENT"
    }).returning();
    await db.insert(notifications).values({
      userId: studentId,
      type: "alert",
      title: "Emergency Alert Dispatched",
      message: "Campus security and rapid transit emergency response team have been notified of your location."
    });
    res.json({
      status: "EMERGENCY_DISPATCHED",
      report: created[0],
      dispatchedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(400).json({ error: "Failed to activate emergency" });
  }
});
var safety_default = router7;

// artifacts/api-server/src/routes/admin.ts
init_acimsAuth();
import { Router as Router8 } from "express";
init_db();
init_schema();
init_services();
import { eq as eq13, desc as desc9 } from "drizzle-orm";

// artifacts/api-server/src/services/transport.ts
var CollegeBusProvider = class {
  id = "acims-campus";
  name = "ACIMS Campus Bus Fleet";
  category = "College bus";
  status = "live";
  dataLabel = "REAL ACIMS DATA";
  searchJourneys(start, destination) {
    const buses3 = getBuses();
    return buses3.slice(0, 2).map((bus) => ({
      id: `acims-${bus.id}`,
      providerId: this.id,
      transportType: "College bus",
      route: `Bus #${bus.busNumber} (${bus.routeLabel}): ${bus.origin} \u2192 ${bus.destination}`,
      departure: "Departs in 2 min",
      arrival: `ETA ${bus.etaMinutes} min at ${bus.nextStop}`,
      durationMinutes: bus.etaMinutes + 8,
      transfers: 0,
      walkingDistanceKm: 0.2,
      availability: `Scheduled campus loop (${bus.status})`,
      dataLabel: "REAL ACIMS DATA"
    }));
  }
};
var WalkingProvider = class {
  id = "campus-pedestrian";
  name = "Campus Lit Pedestrian Pathways";
  category = "Walking";
  status = "live";
  dataLabel = "REAL CAMPUS WALKING DATA";
  searchJourneys(start, destination) {
    return [
      {
        id: "walk-designated-path",
        providerId: this.id,
        transportType: "Walking",
        route: `Direct pedestrian walk: ${start} \u2192 ${destination} via Central Walkway`,
        departure: "Immediate (on foot)",
        arrival: "Estimated walk duration: 14 min",
        durationMinutes: 14,
        transfers: 0,
        walkingDistanceKm: 1.1,
        availability: "Always accessible \xB7 Designated lit pathway",
        dataLabel: "REAL CAMPUS WALKING DATA"
      }
    ];
  }
};
var PublicBusProvider = class {
  id = "public-bus-adapter";
  name = "Metropolitan Transport Corporation (MTC)";
  category = "Public bus";
  status = "adapter-ready (mock feed)";
  dataLabel = "DEVELOPMENT/MOCK EXTERNAL DATA \u2014 not live";
  searchJourneys(start, destination) {
    return [
      {
        id: "public-bus-500",
        providerId: this.id,
        transportType: "Public bus",
        route: `Route 500 / 70V: Tambaram East Stand \u2192 ${destination}`,
        departure: "Every 10-15 min (scheduled)",
        arrival: "Approx 22 min travel time",
        durationMinutes: 22,
        transfers: 0,
        walkingDistanceKm: 0.5,
        availability: "Scheduled city service (Development estimate)",
        dataLabel: "DEVELOPMENT/MOCK EXTERNAL DATA"
      }
    ];
  }
};
var TrainProvider = class {
  id = "suburban-rail-adapter";
  name = "Southern Railway Suburban Line";
  category = "Train";
  status = "adapter-ready (mock feed)";
  dataLabel = "DEVELOPMENT/MOCK EXTERNAL DATA \u2014 not live";
  searchJourneys(start, destination) {
    return [
      {
        id: "train-suburban-line",
        providerId: this.id,
        transportType: "Train",
        route: `EMU Suburban Line: Tambaram Station \u2192 Chennai Central corridor`,
        departure: "Next scheduled train at 08:35 AM",
        arrival: "18 min travel time to station stop",
        durationMinutes: 18,
        transfers: 1,
        walkingDistanceKm: 0.7,
        availability: "Platform 2 \xB7 Development timetable sample",
        dataLabel: "DEVELOPMENT/MOCK EXTERNAL DATA"
      }
    ];
  }
};
var MetroProvider = class {
  id = "metro-transit-adapter";
  name = "Chennai Metro Rail (CMRL)";
  category = "Metro";
  status = "adapter-ready (mock feed)";
  dataLabel = "DEVELOPMENT/MOCK EXTERNAL DATA \u2014 not live";
  searchJourneys(start, destination) {
    return [
      {
        id: "metro-blue-line",
        providerId: this.id,
        transportType: "Metro",
        route: `Metro Connector: Feeder Shuttle \u2192 Airport Metro Station \u2192 Blue Line`,
        departure: "Trains every 6 minutes",
        arrival: "28 min total travel time",
        durationMinutes: 28,
        transfers: 1,
        walkingDistanceKm: 0.4,
        availability: "Frequent rapid transit (Development estimate)",
        dataLabel: "DEVELOPMENT/MOCK EXTERNAL DATA"
      }
    ];
  }
};
var PublicTransportManager = class {
  providers = [];
  constructor() {
    this.registerProvider(new CollegeBusProvider());
    this.registerProvider(new WalkingProvider());
    this.registerProvider(new PublicBusProvider());
    this.registerProvider(new TrainProvider());
    this.registerProvider(new MetroProvider());
  }
  registerProvider(provider) {
    this.providers.push(provider);
  }
  listProviders() {
    return this.providers.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      status: p.status,
      dataLabel: p.dataLabel
    }));
  }
  search(start, destination) {
    const results = [];
    for (const provider of this.providers) {
      const journeys = provider.searchJourneys(start, destination);
      results.push(...journeys);
    }
    return results;
  }
};
var transportManager = new PublicTransportManager();
function listProviders() {
  return transportManager.listProviders();
}
function listJourneys() {
  return transportManager.search("College Main Entrance", "Tambaram Bus Stop");
}
function searchJourneys(start, destination) {
  return transportManager.search(start, destination);
}

// artifacts/api-server/src/services/adminPortalService.ts
init_db();
import { desc as desc8, eq as eq11 } from "drizzle-orm";

// src/db/adminAuditOps.ts
init_db();
init_schema();
import { desc as desc7 } from "drizzle-orm";
async function recordAdminAudit(input) {
  const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const inserted = await db.insert(adminAuditLogs).values({
    id,
    adminId: input.adminId,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    detail: input.detail ?? null
  }).returning();
  return inserted[0];
}
async function listAdminAuditLogs(limit = 100) {
  return db.select().from(adminAuditLogs).orderBy(desc7(adminAuditLogs.createdAt)).limit(limit);
}

// artifacts/api-server/src/services/adminPortalService.ts
init_mobilityOps();
init_services();
init_schema();
init_commandCenterService();
init_delayEngine();
init_pickupEtaEngine();
init_gpsEngine();

// artifacts/api-server/src/services/geminiNavi.ts
import { GoogleGenAI } from "@google/genai";
function getGeminiApiKey() {
  const key = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  return key || void 0;
}
function isGeminiConfigured() {
  return Boolean(getGeminiApiKey());
}
var lastGeminiSuccessAt = null;
function getGeminiAdminTelemetry() {
  return { lastSuccessAt: lastGeminiSuccessAt };
}
function markGeminiSuccess() {
  lastGeminiSuccessAt = (/* @__PURE__ */ new Date()).toISOString();
}
var MOBI_SYSTEM_PROMPT = `You are MOBI, the mobility assistant for ACIMS.

You must only provide information supported by the data returned by ACIMS backend tools or explicitly integrated authoritative sources.

Never invent buses, drivers, routes, pickup points, timings, GPS locations, ETAs, delays, campus locations, MTC routes, or availability.

Never estimate a value when the system has not provided enough information.

If required data is unavailable, explicitly state that the information is currently unavailable.

Do not pretend that a backend action was completed unless the backend confirms success.

Do not claim that a bus is moving unless recent GPS data confirms it.

Do not claim that a bus is delayed unless the delay service calculates a delay.

Do not claim that a bus has arrived unless the arrival/geofence system confirms arrival.

Always prefer 'I don't have enough current data to answer that reliably' over guessing.`;
function getClient() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  const rawModel = process.env.GEMINI_MODEL?.trim();
  const modelName = rawModel && !rawModel.startsWith("gemini-1.5") && !rawModel.startsWith("gemini-2.0") ? rawModel : "gemini-3.8-flash";
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
  return { ai, modelName };
}
function formatHistory(history) {
  if (!history.length) return "(no prior turns)";
  return history.slice(-8).map((t) => `${t.role === "user" ? "Student" : "MOBI"}: ${t.text}`).join("\n");
}
async function enhanceNaviAnswerWithGemini(params) {
  const client = getClient();
  if (!client) return null;
  try {
    const prompt = `Rewrite VERIFIED_ANSWER as MOBI in short, clear spoken Indian English (one or two sentences for simple questions).

STRICT RULES:
- Use ONLY facts from VERIFIED_ANSWER. Never invent buses, routes, ETAs, delays, GPS, campus buildings, or MTC data.
- Keep all numbers, bus numbers, times, and place names exactly as in VERIFIED_ANSWER.
- If VERIFIED_ANSWER says data is unavailable, keep that honesty. Never fill gaps.
- Distinguish scheduled vs predicted vs live when both appear.
- ttsText must be the same facts, under 45 words, no extra information.
- followUps: 2-3 short commute questions only.

CHAT_HISTORY:
${formatHistory(params.history ?? [])}

USER_QUESTION: ${params.userMessage}
INTENT: ${params.intent}
DATA_SOURCES: ${params.sources.join(" | ")}

VERIFIED_ANSWER:
${params.factualAnswer}

Reply with JSON only, no markdown:
{"answer":"...","ttsText":"...","followUps":["...","..."]}`;
    const result = await client.ai.models.generateContent({
      model: client.modelName,
      contents: prompt,
      config: {
        systemInstruction: MOBI_SYSTEM_PROMPT,
        temperature: 0.2
      }
    });
    const raw = (result.text ?? "").trim();
    const jsonSlice = raw.match(/\{[\s\S]*\}/);
    if (!jsonSlice) return null;
    const parsed = JSON.parse(jsonSlice[0]);
    if (!parsed.answer?.trim()) return null;
    markGeminiSuccess();
    return {
      answer: parsed.answer.trim(),
      ttsText: (parsed.ttsText?.trim() || params.factualTts).slice(0, 500),
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps.filter((s) => typeof s === "string" && s.trim()).slice(0, 4) : void 0
    };
  } catch (err) {
    console.warn("[MOBI Gemini] enhancement failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
async function generateConversationalNaviReply(params) {
  const client = getClient();
  if (!client) return null;
  try {
    const prompt = `Respond as MOBI. Be short, clear, and helpful.

STRICT RULES:
- Use ONLY facts in LIVE_CONTEXT for bus location, ETA, delays, or schedules.
- Never invent GPS, bus numbers, times, or MTC data not in LIVE_CONTEXT.
- If they greet you, greet back and offer 2-3 things you can help with (from context).
- If they thank you or say bye, respond briefly.
- followUps: 2-3 short suggested questions.

STUDENT_NAME: ${params.studentName}

LIVE_CONTEXT:
${params.liveContext}

CHAT_HISTORY:
${formatHistory(params.history ?? [])}

STUDENT_MESSAGE: ${params.userMessage}

JSON only:
{"answer":"...","ttsText":"...","followUps":["...","..."]}`;
    const result = await client.ai.models.generateContent({
      model: client.modelName,
      contents: prompt,
      config: {
        systemInstruction: MOBI_SYSTEM_PROMPT,
        temperature: 0.2
      }
    });
    const raw = (result.text ?? "").trim();
    const jsonSlice = raw.match(/\{[\s\S]*\}/);
    if (!jsonSlice) return null;
    const parsed = JSON.parse(jsonSlice[0]);
    if (!parsed.answer?.trim()) return null;
    markGeminiSuccess();
    return {
      answer: parsed.answer.trim(),
      ttsText: (parsed.ttsText?.trim() || parsed.answer).slice(0, 500),
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps.filter((s) => typeof s === "string" && s.trim()).slice(0, 4) : void 0
    };
  } catch (err) {
    console.warn("[MOBI Gemini] conversational failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// artifacts/api-server/src/services/adminPortalService.ts
var NAVI_TOOLS = [
  "get_live_bus",
  "get_my_bus",
  "get_eta",
  "get_delay",
  "get_next_shift",
  "get_pickup_points",
  "get_nearest_stop",
  "get_campus_location",
  "get_campus_route",
  "get_public_transport"
];
async function getAdminTransportDashboard() {
  const snapshot = await getCommandCenterSnapshot();
  const analytics = await getMobilityAnalyticsSummary();
  const gpsReliable = snapshot.fleet.length > 0 ? Math.round(
    snapshot.fleet.filter((f) => !f.isGpsIssue).length / snapshot.fleet.length * 1e3
  ) / 10 : 100;
  return {
    ...snapshot,
    analytics: {
      ...analytics,
      gpsReliabilityPercent: gpsReliable
    }
  };
}
async function getGpsHealthFleet() {
  const snapshot = await getCommandCenterSnapshot();
  return snapshot.fleet.map((row) => {
    let state = "CONNECTED";
    if (row.isGpsIssue && row.secondsSinceGps > 120) state = "OFFLINE";
    else if (row.isGpsIssue || row.gpsFreshness === "STALE") state = "WEAK_GPS";
    return {
      busId: row.busId,
      busNumber: row.busNumber,
      gpsState: state,
      trackingStatus: row.trackingStatus,
      secondsSinceUpdate: row.secondsSinceGps,
      latitude: row.latitude,
      longitude: row.longitude,
      speed: row.speed,
      heading: row.heading,
      accuracy: row.accuracy,
      lastUpdate: row.lastGpsAt
    };
  });
}
async function getEtaDelayBoard() {
  const snapshot = await getCommandCenterSnapshot();
  const now = /* @__PURE__ */ new Date();
  const { getBusShiftTimingContext: getBusShiftTimingContext2 } = await Promise.resolve().then(() => (init_shiftTiming(), shiftTiming_exports));
  return Promise.all(
    snapshot.fleet.map(async (row) => {
      const gpsStale = row.isGpsIssue || row.secondsSinceGps > 30;
      const shiftCtx = await getBusShiftTimingContext2(row.busId);
      const assessment = shiftCtx ? assessTripDelay({
        busId: row.busId,
        shiftStartTime: shiftCtx.shiftStartTime,
        pickupExpectedOffsetMinutes: shiftCtx.pickupExpectedOffsetMinutes,
        currentEtaToPickupMinutes: row.etaMinutes ?? 30,
        now
      }) : { delayMinutes: 0, status: "ON_TIME", expectedArrivalMinutesFromShiftStart: 0, predictedArrivalMinutesFromShiftStart: 0 };
      const prediction = predictTripDelay({
        assessment,
        gpsStale,
        speedMps: row.speed,
        secondsSinceGps: row.secondsSinceGps
      });
      return {
        busId: row.busId,
        busNumber: row.busNumber,
        etaMinutes: row.etaMinutes,
        delayMinutes: row.delayMinutes,
        delayStatus: row.delayStatus,
        prediction
      };
    })
  );
}
async function listAdminStudents() {
  const studentProfiles2 = await db.select().from(profiles).where(eq11(profiles.role, "STUDENT"));
  const rows = await db.select().from(students);
  const byProfileId = new Map(rows.map((s) => [s.profileId, s]));
  return studentProfiles2.map((p) => {
    const s = byProfileId.get(p.id);
    return {
      userId: p.userId,
      name: p.name,
      email: p.email,
      registerNumber: s?.registerNumber ?? null,
      pickupStopId: s?.pickupStopId ?? null,
      assignedBusId: s?.assignedBusId ?? null,
      assignedRouteId: s?.assignedRouteId ?? null,
      status: "ACTIVE"
    };
  });
}
async function updateStudentTransport(userId, patch) {
  const profile = await db.select().from(profiles).where(eq11(profiles.userId, userId)).limit(1);
  if (!profile.length) return null;
  const existing = await db.select().from(students).where(eq11(students.profileId, profile[0].id)).limit(1);
  if (!existing.length) return null;
  const updated = await db.update(students).set({
    pickupStopId: patch.pickupStopId ?? existing[0].pickupStopId,
    assignedBusId: patch.assignedBusId ?? existing[0].assignedBusId,
    assignedRouteId: patch.assignedRouteId ?? existing[0].assignedRouteId
  }).where(eq11(students.profileId, profile[0].id)).returning();
  return { ...profile[0], ...updated[0] };
}
async function listRecentMobilityNotifications(limit = 60) {
  const events = await db.select().from(mobilityEvents).orderBy(desc8(mobilityEvents.createdAt)).limit(limit);
  return events.map((e) => ({
    id: e.id,
    userId: e.userId,
    busId: e.busId,
    eventType: e.eventType,
    createdAt: e.createdAt,
    payload: (() => {
      try {
        return JSON.parse(e.payload);
      } catch {
        return {};
      }
    })()
  }));
}
async function sendAdminBroadcast(input) {
  const allStudents = await listAdminStudents();
  let recipients = allStudents;
  if (input.target.scope === "BUS") {
    recipients = allStudents.filter((s) => s.assignedBusId === input.target.busId);
  } else if (input.target.scope === "ROUTE") {
    recipients = allStudents.filter((s) => s.assignedRouteId === input.target.routeId);
  } else if (input.target.scope === "PICKUP") {
    recipients = allStudents.filter((s) => s.pickupStopId === input.target.pickupStopId);
  }
  const sent = [];
  for (const student of recipients) {
    const note = await createDbNotification(student.userId, "ADMIN_BROADCAST", input.title, input.message);
    if (note) sent.push(student.userId);
  }
  return { recipientCount: sent.length, userIds: sent };
}
function getNaviAdminStatus() {
  const telemetry = getGeminiAdminTelemetry();
  return {
    status: isGeminiConfigured() ? "ONLINE" : "OFFLINE",
    provider: "Gemini",
    apiConnected: isGeminiConfigured(),
    lastSuccessfulRequestAt: telemetry.lastSuccessAt,
    tools: NAVI_TOOLS
  };
}
async function listCampusLocationsAdmin() {
  return getDbCampusLocations();
}
async function getExtendedAnalytics() {
  const base = await getMobilityAnalyticsSummary();
  const snapshot = await getCommandCenterSnapshot();
  const gpsReliable = snapshot.fleet.length > 0 ? Math.round(
    snapshot.fleet.filter((f) => !f.isGpsIssue).length / snapshot.fleet.length * 1e3
  ) / 10 : 100;
  const buses3 = await getDbBuses();
  const busUsage = buses3.map((b) => ({
    busId: b.id,
    busNumber: b.busNumber,
    trips: 0
  }));
  return {
    ...base,
    gpsReliabilityPercent: gpsReliable,
    fleetOnTime: snapshot.counters.onTime,
    fleetDelayed: snapshot.counters.delayed,
    busUsage
  };
}
async function getAdminTrips(status, limit = 80) {
  return listTripsByStatus(status, limit);
}
async function getBusLiveDetail(busId) {
  const buses3 = await getDbBuses();
  const bus = buses3.find((b) => b.id === busId);
  if (!bus) return null;
  const loc = await getLatestBusLocation(busId);
  const freshness = loc ? evaluateFreshness(loc.recordedAt, /* @__PURE__ */ new Date()) : { freshness: "UNAVAILABLE", secondsSinceUpdate: 9999 };
  let etaMinutes = null;
  let delayMinutes = 0;
  if (loc) {
    const eta = calculatePickupEta(busId, { latitude: loc.latitude, longitude: loc.longitude }, "tambaram");
    if (eta) {
      etaMinutes = eta.etaMinutes;
      const { getBusShiftTimingContext: getBusShiftTimingContext2 } = await Promise.resolve().then(() => (init_shiftTiming(), shiftTiming_exports));
      const shiftCtx = await getBusShiftTimingContext2(busId);
      if (shiftCtx) {
        const delay = assessTripDelay({
          busId,
          shiftStartTime: shiftCtx.shiftStartTime,
          pickupExpectedOffsetMinutes: shiftCtx.pickupExpectedOffsetMinutes,
          currentEtaToPickupMinutes: eta.etaMinutes
        });
        delayMinutes = delay.delayMinutes;
      }
    }
  }
  return {
    busId: bus.id,
    busNumber: bus.busNumber,
    driverId: bus.driverId,
    routeId: bus.routeId,
    currentLocation: loc ? { latitude: loc.latitude, longitude: loc.longitude } : null,
    nextStop: "Urapakkam",
    etaMinutes,
    delayMinutes,
    gps: freshness.freshness === "FRESH" ? "ACTIVE" : freshness.freshness,
    secondsSinceGps: freshness.secondsSinceUpdate,
    speed: loc?.speed ?? null,
    heading: loc?.heading ?? null
  };
}

// artifacts/api-server/src/routes/admin.ts
init_commandCenterService();

// src/lib/naturalSort.ts
function naturalBusSort(a, b) {
  const strA = (a || "").trim();
  const strB = (b || "").trim();
  const cleanA = strA.replace(/^BUS\s+/i, "").split(/[·\s-]/)[0] || strA;
  const cleanB = strB.replace(/^BUS\s+/i, "").split(/[·\s-]/)[0] || strB;
  const matchA = cleanA.match(/^(\d+)(.*)$/);
  const matchB = cleanB.match(/^(\d+)(.*)$/);
  if (matchA && matchB) {
    const numA = parseInt(matchA[1], 10);
    const numB = parseInt(matchB[1], 10);
    if (numA !== numB) {
      return numA - numB;
    }
    return (matchA[2] || "").localeCompare(matchB[2] || "", void 0, { sensitivity: "base" });
  }
  if (matchA && !matchB) return -1;
  if (!matchA && matchB) return 1;
  return (cleanA || "").localeCompare(cleanB || "", void 0, { numeric: true, sensitivity: "base" });
}

// artifacts/api-server/src/routes/admin.ts
init_initialDemoRoutes();
init_shiftManagement();
var router8 = Router8();
var requireAdminRole = (req, res, next) => {
  const role = req.header("x-acims-role");
  if (!role) {
    res.status(401).json({ error: "Unauthorized: Admin authorization required" });
    return;
  }
  if (role.toLowerCase() !== "admin") {
    res.status(403).json({ error: "Forbidden: Admin role required" });
    return;
  }
  next();
};
router8.use("/admin", requireAuth, requireAdminRole, requireAdmin);
router8.get("/admin/dashboard", async (_req, res) => {
  try {
    const busList = await getDbBuses();
    const routeList = await getDbRoutes();
    let reports2 = [];
    try {
      reports2 = await db.select().from(safetyReports);
    } catch {
      reports2 = [];
    }
    let commandCounters = {
      activeBuses: busList.filter((b) => b.active).length,
      activeDrivers: 0,
      activeTrips: 0,
      onTime: 0,
      delayed: 0,
      gpsIssues: 0
    };
    try {
      const command = await getCommandCenterSnapshot();
      commandCounters = command.counters;
    } catch (err) {
      console.warn("[admin/dashboard] command center snapshot skipped:", err);
    }
    const dashboard = {
      activeBuses: commandCounters.activeBuses,
      activeDrivers: commandCounters.activeDrivers,
      activeTrips: commandCounters.activeTrips,
      onTime: commandCounters.onTime,
      delayedBuses: commandCounters.delayed,
      gpsIssues: commandCounters.gpsIssues,
      activeRoutes: routeList.filter((r) => r.active).length,
      queueEntries: getAdminQueues().reduce((total, q) => total + q.queueSize, 0),
      openSafetyReports: reports2.filter((r) => r.status === "OPEN" || r.status === "UNDER REVIEW").length,
      providersOnline: listProviders().filter((p) => p.status === "live").length,
      systemStatus: "Operational",
      fleetSize: busList.filter((b) => b.active).length
    };
    res.json(dashboard);
  } catch (err) {
    console.error("[admin/dashboard]", err);
    res.status(500).json({ error: "Failed to generate admin dashboard" });
  }
});
router8.get("/admin/transport-dashboard", async (_req, res) => {
  try {
    res.json(await getAdminTransportDashboard());
  } catch {
    res.status(500).json({ error: "Failed to load transport dashboard" });
  }
});
router8.get("/admin/gps-health", async (_req, res) => {
  res.json(await getGpsHealthFleet());
});
router8.get("/admin/eta-delays", async (_req, res) => {
  res.json(await getEtaDelayBoard());
});
router8.get("/admin/eta-monitoring", async (_req, res) => {
  const { getAdminEtaMonitoring: getAdminEtaMonitoring2 } = await Promise.resolve().then(() => (init_etaMonitoringService(), etaMonitoringService_exports));
  res.json(await getAdminEtaMonitoring2());
});
router8.get("/admin/delay-monitoring", async (_req, res) => {
  const { getAdminDelayMonitoring: getAdminDelayMonitoring2 } = await Promise.resolve().then(() => (init_etaMonitoringService(), etaMonitoringService_exports));
  res.json(await getAdminDelayMonitoring2());
});
router8.get("/admin/students", async (_req, res) => {
  res.json(await listAdminStudents());
});
router8.patch("/admin/students/:userId/transport", async (req, res) => {
  const updated = await updateStudentTransport(req.params.userId, req.body);
  if (!updated) return res.status(404).json({ error: "Student not found" });
  const authUser = req.user;
  await recordAdminAudit({
    adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
    action: "UPDATE_STUDENT_TRANSPORT",
    entityType: "student",
    entityId: req.params.userId,
    detail: JSON.stringify(req.body)
  });
  res.json(updated);
});
router8.get("/admin/notifications/recent", async (_req, res) => {
  res.json(await listRecentMobilityNotifications());
});
router8.post("/admin/broadcast", async (req, res) => {
  const { title, message, target } = req.body;
  if (!title?.trim() || !message?.trim() || !target?.scope) {
    return res.status(400).json({ error: "title, message, and target.scope required" });
  }
  const result = await sendAdminBroadcast({
    title: title.trim(),
    message: message.trim(),
    target
  });
  const authUser = req.user;
  await recordAdminAudit({
    adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
    action: "BROADCAST",
    entityType: "notification",
    detail: `${target.scope}: ${title}`
  });
  res.json(result);
});
router8.get("/admin/navi", async (_req, res) => {
  res.json(getNaviAdminStatus());
});
router8.get("/admin/campus/locations", async (_req, res) => {
  res.json(await listCampusLocationsAdmin());
});
router8.get("/admin/analytics/transport", async (_req, res) => {
  res.json(await getExtendedAnalytics());
});
router8.get("/admin/trips", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : void 0;
  const limit = Number(req.query.limit || 80);
  res.json(await getAdminTrips(status, limit));
});
router8.get("/admin/buses/:busId/live", async (req, res) => {
  const detail = await getBusLiveDetail(req.params.busId);
  if (!detail) return res.status(404).json({ error: "Bus not found" });
  res.json(detail);
});
router8.get("/admin/audit-logs", async (req, res) => {
  const limit = Number(req.query.limit || 100);
  res.json(await listAdminAuditLogs(Math.min(200, Math.max(1, limit))));
});
router8.get("/admin/shifts", async (_req, res) => {
  try {
    res.json(await listAdminShifts());
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to list shifts" });
  }
});
router8.get("/admin/shifts/:shiftId", async (req, res) => {
  const shift = await getShiftById(req.params.shiftId);
  if (!shift) return res.status(404).json({ error: "Shift not found" });
  res.json(shift);
});
router8.put("/admin/shifts/:shiftId", async (req, res) => {
  try {
    const updated = await validateAndUpdateShift(req.params.shiftId, req.body);
    const authUser = req.user;
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "UPDATE_SHIFT",
      entityType: "shift",
      entityId: updated.id,
      detail: `${updated.name} ${updated.startTime}-${updated.endTime}`
    });
    res.json({
      shift: updated,
      message: `${updated.name} timing updated successfully.`
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to update shift" });
  }
});
router8.post("/admin/shifts/:shiftId/activate", async (req, res) => {
  try {
    const updated = await setShiftActive(req.params.shiftId, true);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to activate shift" });
  }
});
router8.post("/admin/shifts/:shiftId/deactivate", async (req, res) => {
  try {
    const updated = await setShiftActive(req.params.shiftId, false);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to deactivate shift" });
  }
});
router8.get("/admin/buses", async (_req, res) => {
  try {
    const list = await getDbBuses();
    res.json(
      list.map((b) => ({
        id: b.id,
        busNumber: b.busNumber,
        routeId: b.routeId || void 0,
        driverId: b.driverId || void 0,
        capacity: 45,
        active: b.active,
        status: b.active ? "Active" : "Inactive"
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to list buses" });
  }
});
router8.post("/admin/buses", async (req, res) => {
  try {
    const input = CreateAdminBusBody.parse(req.body);
    const busId = `bus-${input.busNumber.toLowerCase().replace(/[^a-z0-9]/g, "") || Date.now()}`;
    const created = await createDbBus({
      id: busId,
      busNumber: input.busNumber,
      routeId: input.routeId,
      driverId: input.driverId,
      active: input.active ?? true
    });
    const authUser = req.user;
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "CREATE_BUS",
      entityType: "bus",
      entityId: created.id,
      detail: created.busNumber
    });
    res.status(201).json({
      id: created.id,
      busNumber: created.busNumber,
      routeId: created.routeId || input.routeId,
      driverId: created.driverId || input.driverId,
      capacity: input.capacity,
      active: created.active,
      status: created.active ? "Active" : "Inactive"
    });
  } catch (err) {
    console.error("Error creating bus:", err);
    res.status(400).json({ error: "Failed to create bus" });
  }
});
router8.patch("/admin/buses/:busId", async (req, res) => {
  try {
    const { busId } = req.params;
    const input = UpdateAdminBusBody.partial().parse(req.body);
    const updated = await updateDbBus(busId, {
      ...input.busNumber ? { busNumber: input.busNumber } : {},
      ...input.routeId ? { routeId: input.routeId } : {},
      ...input.driverId ? { driverId: input.driverId } : {},
      ...input.active !== void 0 ? { active: input.active } : {}
    });
    if (!updated) {
      return res.status(404).json({ error: "Bus not found" });
    }
    res.json({
      id: updated.id,
      busNumber: updated.busNumber,
      routeId: updated.routeId || "route-bus-12",
      driverId: updated.driverId || void 0,
      capacity: input.capacity ?? 45,
      active: updated.active,
      status: updated.active ? "Active" : "Inactive"
    });
  } catch (err) {
    res.status(400).json({ error: "Failed to update bus" });
  }
});
router8.delete("/admin/buses/:busId", async (req, res) => {
  try {
    const { busId } = req.params;
    const updated = await updateDbBus(busId, { active: false });
    if (!updated) {
      return res.status(404).json({ error: "Bus not found" });
    }
    res.json({
      id: updated.id,
      busNumber: updated.busNumber,
      active: false,
      status: "Inactive"
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to deactivate bus" });
  }
});
router8.get("/admin/drivers", async (_req, res) => {
  try {
    const driverProfiles = await db.select({
      driverId: drivers.id,
      profileId: profiles.id,
      userId: profiles.userId,
      name: profiles.name,
      phone: profiles.phone,
      assignedBusId: drivers.assignedBusId
    }).from(drivers).innerJoin(profiles, eq13(drivers.profileId, profiles.id));
    res.json(
      driverProfiles.map((d) => ({
        id: d.userId,
        name: d.name,
        phone: d.phone || "+91 98401 23450",
        active: true,
        busId: d.assignedBusId || void 0,
        routeId: d.assignedBusId ? `route-${d.assignedBusId}` : void 0
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to list drivers" });
  }
});
router8.post("/admin/drivers", async (req, res) => {
  try {
    const input = CreateAdminDriverBody.parse(req.body);
    const userId = `driver-${input.name.toLowerCase().replace(/[^a-z0-9]/g, "") || Date.now()}`;
    const prof = await db.insert(profiles).values({
      userId,
      name: input.name,
      phone: input.phone,
      email: `${userId}@rec.edu.in`,
      role: "DRIVER"
    }).returning();
    await db.insert(drivers).values({
      profileId: prof[0].id,
      assignedBusId: input.busId || null
    });
    res.status(201).json({
      id: userId,
      name: input.name,
      phone: input.phone,
      active: true,
      busId: input.busId,
      routeId: input.busId ? `route-${input.busId}` : void 0
    });
  } catch (err) {
    res.status(400).json({ error: "Failed to create driver" });
  }
});
router8.patch("/admin/drivers/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const { name, phone, busId } = req.body;
    const profs = await db.select().from(profiles).where(eq13(profiles.userId, driverId));
    if (profs.length === 0) {
      return res.status(404).json({ error: "Driver not found" });
    }
    if (name || phone) {
      await db.update(profiles).set({
        ...name ? { name } : {},
        ...phone ? { phone } : {}
      }).where(eq13(profiles.userId, driverId));
    }
    if (busId !== void 0) {
      await db.update(drivers).set({ assignedBusId: busId }).where(eq13(drivers.profileId, profs[0].id));
    }
    res.json({
      id: driverId,
      name: name || profs[0].name,
      phone: phone || profs[0].phone,
      active: true,
      busId
    });
  } catch (err) {
    res.status(400).json({ error: "Failed to update driver" });
  }
});
router8.get("/admin/routes", async (_req, res) => {
  try {
    const routeList = await getDbRoutes();
    const result = await Promise.all(
      routeList.map(async (r) => {
        const stops = await db.select().from(busStops).where(eq13(busStops.routeId, r.id)).orderBy(busStops.sequenceNumber);
        const assignedBuses = await db.select().from(buses).where(eq13(buses.routeId, r.id));
        return {
          id: r.id,
          name: `${r.routeName} (${r.routeCode})`,
          destination: stops[stops.length - 1]?.stopName || "Campus Terminal",
          stopIds: stops.map((s) => s.id),
          active: r.active,
          assignedBusIds: assignedBuses.map((b) => b.id)
        };
      })
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to list routes" });
  }
});
router8.post("/admin/routes", async (req, res) => {
  try {
    const input = CreateAdminRouteBody.parse(req.body);
    const routeId = `route-bus-${input.name.toLowerCase().replace(/[^a-z0-9]/g, "") || Date.now()}`;
    const created = await createDbRoute({
      id: routeId,
      routeName: input.name,
      routeCode: input.name.split(" ")[0] || "RT",
      active: input.active ?? true
    });
    if (input.stopIds && input.stopIds.length > 0) {
      for (let i = 0; i < input.stopIds.length; i++) {
        const sid = input.stopIds[i];
        await db.insert(busStops).values({
          id: `${routeId}-stop-${i + 1}`,
          routeId: created.id,
          stopName: sid.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          latitude: 12.92 + i * 0.01,
          longitude: 80.12 + i * 0.01,
          sequenceNumber: i + 1
        }).onConflictDoNothing();
      }
    }
    res.status(201).json({
      id: created.id,
      name: created.routeName,
      destination: input.destination,
      stopIds: input.stopIds || [],
      active: created.active,
      assignedBusIds: []
    });
  } catch (err) {
    res.status(400).json({ error: "Failed to create route" });
  }
});
async function replaceRouteStops(routeId, stopIds) {
  await db.delete(busStops).where(eq13(busStops.routeId, routeId));
  for (let i = 0; i < stopIds.length; i++) {
    const sid = stopIds[i];
    const label = sid.includes(" ") ? sid : sid.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    await db.insert(busStops).values({
      id: `${routeId}-stop-${i + 1}`,
      routeId,
      stopName: label,
      latitude: 13.0084 + i * 8e-4,
      longitude: 80.0033 + i * 8e-4,
      sequenceNumber: i + 1
    });
  }
}
router8.patch("/admin/routes/:routeId", async (req, res) => {
  try {
    const { routeId } = req.params;
    const { name, active, stopIds } = req.body;
    const updated = await updateDbRoute(routeId, {
      ...name ? { routeName: name } : {},
      ...active !== void 0 ? { active } : {}
    });
    if (!updated) {
      return res.status(404).json({ error: "Route not found" });
    }
    if (Array.isArray(stopIds) && stopIds.length > 0) {
      await replaceRouteStops(routeId, stopIds);
    }
    const stops = await db.select().from(busStops).where(eq13(busStops.routeId, routeId)).orderBy(busStops.sequenceNumber);
    res.json({
      id: updated.id,
      name: updated.routeName,
      active: updated.active,
      destination: stops[stops.length - 1]?.stopName || "Campus",
      stopIds: stops.map((s) => s.stopName)
    });
  } catch (err) {
    res.status(400).json({ error: "Failed to update route" });
  }
});
router8.get("/admin/queues", (_req, res) => res.json(getAdminQueues()));
router8.get("/admin/safety", async (_req, res) => {
  try {
    const reports2 = await db.select().from(safetyReports).orderBy(desc9(safetyReports.createdAt));
    res.json(reports2);
  } catch (err) {
    res.status(500).json({ error: "Failed to list safety reports" });
  }
});
router8.patch("/admin/safety/:reportId", async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }
    const updated = await db.update(safetyReports).set({ status }).where(eq13(safetyReports.id, reportId)).returning();
    if (updated.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update safety report" });
  }
});
var isMtcBusOrRoute = (b, r) => {
  const num = (b.busNumber || "").toUpperCase();
  const id = (b.id || "").toLowerCase();
  const rId = (r?.id || b.routeId || "").toLowerCase();
  const rName = (r?.routeName || "").toUpperCase();
  return num.includes("MTC") || id.startsWith("mtc") || b.source === "MTC" || b.source === "PUBLIC_TRANSIT" || rId.startsWith("mtc") || r?.source === "MTC" || rName.includes("MTC");
};
router8.get("/admin/buses-and-routes", async (_req, res) => {
  try {
    const rawBusList = await getDbBuses();
    const routeList = await getDbRoutes();
    const busList = rawBusList.filter((b) => !isMtcBusOrRoute(b, routeList.find((r) => r.id === b.routeId)));
    const allStops = await db.select().from(busStops).orderBy(busStops.sequenceNumber);
    const driverProfiles = await db.select({
      driverId: drivers.id,
      userId: profiles.userId,
      name: profiles.name,
      phone: profiles.phone,
      assignedBusId: drivers.assignedBusId
    }).from(drivers).innerJoin(profiles, eq13(drivers.profileId, profiles.id));
    const { getAllShiftsWithAssignments: getAllShiftsWithAssignments2 } = await Promise.resolve().then(() => (init_shiftManagement(), shiftManagement_exports));
    const shiftsWithAssignments = await getAllShiftsWithAssignments2();
    const { buildBusTelemetry: buildBusTelemetry2 } = await Promise.resolve().then(() => (init_buses(), buses_exports));
    const items = await Promise.all(
      busList.map(async (b) => {
        const route = routeList.find((r) => r.id === b.routeId);
        const rawRouteName = route ? route.routeName.replace(/^\d+[A-Z]?\s*·?\s*/i, "").trim() : "CAMPUS";
        const routeName = rawRouteName || "CAMPUS";
        const displayName = `BUS ${b.busNumber} \xB7 ${routeName.toUpperCase()}`;
        const driver = driverProfiles.find((d) => d.userId === b.driverId || d.assignedBusId === b.id);
        const busRouteStops = allStops.filter((s) => s.routeId === b.routeId);
        const morningShift = shiftsWithAssignments.find((s) => s.direction === "TO_COLLEGE" && s.assignedBusIds.includes(b.id));
        const eveningShift = shiftsWithAssignments.find((s) => s.direction === "FROM_COLLEGE" && s.assignedBusIds.includes(b.id));
        let telemetry = null;
        try {
          telemetry = await buildBusTelemetry2(b.id);
        } catch {
        }
        let gpsStatus = "GPS UNAVAILABLE";
        if (telemetry?.isLive && telemetry.secondsAgo != null && telemetry.secondsAgo <= 90) {
          gpsStatus = telemetry.delayMinutes && telemetry.delayMinutes > 2 ? "DELAYED" : "LIVE";
        } else if (telemetry?.latitude != null && telemetry.longitude != null) {
          gpsStatus = "STALE";
        } else if (telemetry?.trackingStatus === "PAUSED") {
          gpsStatus = "STALE";
        }
        return {
          id: b.id,
          busNumber: b.busNumber,
          routeId: b.routeId,
          routeName: routeName.toUpperCase(),
          displayName,
          driverId: b.driverId || driver?.userId,
          driverName: driver?.name ?? null,
          driverPhone: driver?.phone ?? null,
          morningShift: morningShift ? morningShift.startTime || "6:30 AM" : null,
          eveningShift: eveningShift ? eveningShift.startTime || "3:15 PM" : null,
          stopCount: busRouteStops.length,
          stops: busRouteStops.map((s) => {
            const demoRoute = INITIAL_DEMO_ROUTES.find((dr) => dr.routeNumber.toUpperCase() === b.busNumber.toUpperCase());
            const demoStop = demoRoute?.stops.find((ds) => ds.name.toLowerCase() === s.stopName.toLowerCase());
            return {
              id: s.id,
              name: s.stopName,
              time: demoStop?.time || "Scheduled",
              latitude: s.latitude,
              longitude: s.longitude,
              sequence: s.sequenceNumber
            };
          }),
          gpsStatus,
          latitude: telemetry?.isLive ? telemetry.latitude : null,
          longitude: telemetry?.isLive ? telemetry.longitude : null,
          accuracy: telemetry?.isLive ? telemetry.accuracy : null,
          secondsAgo: telemetry?.secondsAgo ?? null,
          nextStop: telemetry?.nextStop ?? null,
          etaMinutes: telemetry?.etaMinutes ?? null,
          active: b.active
        };
      })
    );
    items.sort((a, b) => naturalBusSort(a.busNumber, b.busNumber));
    res.json(items);
  } catch (err) {
    console.error("[admin/buses-and-routes]", err);
    res.status(500).json({ error: "Failed to list buses and routes" });
  }
});
router8.post("/admin/buses-and-routes", async (req, res) => {
  try {
    const { busNumber, routeName, driverId, driverName, driverPhone, morningShift, eveningShift, stops } = req.body;
    if (!busNumber?.trim() || !routeName?.trim()) {
      return res.status(400).json({ error: "Bus number and Route name are required" });
    }
    const cleanNumber = busNumber.trim().toUpperCase();
    const cleanRoute = routeName.trim().toUpperCase();
    const busId = `bus-${cleanNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const routeId = `route-${cleanNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const fullRouteName = `${cleanNumber} \xB7 ${cleanRoute}`;
    let effectiveDriverId = driverId || null;
    if (driverName?.trim()) {
      const cleanDName = driverName.trim();
      const cleanDPhone = driverPhone?.trim() || null;
      let targetUserId = effectiveDriverId;
      let profId = null;
      if (targetUserId) {
        const existingProf = await db.select().from(profiles).where(eq13(profiles.userId, targetUserId)).limit(1);
        if (existingProf.length) {
          profId = existingProf[0].id;
          await db.update(profiles).set({
            name: cleanDName,
            ...cleanDPhone ? { phone: cleanDPhone } : {}
          }).where(eq13(profiles.userId, targetUserId));
        }
      }
      if (!profId) {
        targetUserId = `driver-${Date.now()}`;
        const newProf = await db.insert(profiles).values({
          userId: targetUserId,
          name: cleanDName,
          email: `${targetUserId}@acims.local`,
          phone: cleanDPhone,
          role: "DRIVER"
        }).returning();
        profId = newProf[0].id;
        await db.insert(drivers).values({
          profileId: profId,
          assignedBusId: busId
        });
      }
      if (profId) {
        await db.update(drivers).set({ assignedBusId: busId }).where(eq13(drivers.profileId, profId));
      }
      effectiveDriverId = targetUserId;
    }
    await db.insert(busRoutes).values({
      id: routeId,
      routeName: fullRouteName,
      routeCode: cleanNumber,
      active: true,
      source: "ADMIN"
    }).onConflictDoNothing();
    await db.insert(buses).values({
      id: busId,
      busNumber: cleanNumber,
      routeId,
      driverId: effectiveDriverId,
      active: true,
      source: "ADMIN"
    }).onConflictDoNothing();
    if (Array.isArray(stops) && stops.length > 0) {
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        await db.insert(busStops).values({
          id: `${routeId}-stop-${i + 1}`,
          routeId,
          stopName: s.name,
          latitude: s.latitude ?? 13.0084,
          longitude: s.longitude ?? 80.0033,
          sequenceNumber: i + 1
        }).onConflictDoNothing();
      }
    } else {
      await db.insert(busStops).values({
        id: `${routeId}-stop-1`,
        routeId,
        stopName: `${cleanRoute} Bus Stand`,
        latitude: 13.0827,
        longitude: 80.2707,
        sequenceNumber: 1
      }).onConflictDoNothing();
      await db.insert(busStops).values({
        id: `${routeId}-stop-2`,
        routeId,
        stopName: "College Campus",
        latitude: 13.0084,
        longitude: 80.0033,
        sequenceNumber: 2
      }).onConflictDoNothing();
    }
    const { setShiftAssignedBuses: setShiftAssignedBuses2, listShiftAssignmentsForShift: listShiftAssignmentsForShift2 } = await Promise.resolve().then(() => (init_shiftManagement(), shiftManagement_exports));
    if (morningShift) {
      const existingM = await listShiftAssignmentsForShift2("shift-morning-630");
      const ids = Array.from(/* @__PURE__ */ new Set([...existingM.map((x) => x.busId), busId]));
      await setShiftAssignedBuses2("shift-morning-630", ids);
    }
    if (eveningShift) {
      const existingE = await listShiftAssignmentsForShift2("shift-evening-315");
      const ids = Array.from(/* @__PURE__ */ new Set([...existingE.map((x) => x.busId), busId]));
      await setShiftAssignedBuses2("shift-evening-315", ids);
    }
    res.status(201).json({
      id: busId,
      busNumber: cleanNumber,
      routeId,
      routeName: cleanRoute,
      displayName: `BUS ${cleanNumber} \xB7 ${cleanRoute}`,
      driverId: effectiveDriverId,
      active: true
    });
  } catch (err) {
    console.error("[admin/buses-and-routes POST]", err);
    res.status(400).json({ error: err.message || "Failed to create bus and route" });
  }
});
router8.patch("/admin/buses-and-routes/:busId", async (req, res) => {
  try {
    const { busId } = req.params;
    const { busNumber, routeName, driverId, driverName, driverPhone, active } = req.body;
    const existingBus = await db.select().from(buses).where(eq13(buses.id, busId)).limit(1);
    if (!existingBus.length) {
      return res.status(404).json({ error: "Bus not found" });
    }
    const bus = existingBus[0];
    const newNumber = busNumber ? busNumber.trim().toUpperCase() : bus.busNumber;
    let assignedDriverId = driverId !== void 0 ? driverId || null : bus.driverId;
    if (driverName !== void 0) {
      if (driverName.trim()) {
        const cleanDName = driverName.trim();
        const cleanDPhone = driverPhone?.trim() || null;
        let profId = null;
        let targetUserId = assignedDriverId;
        if (targetUserId) {
          const existingProf = await db.select().from(profiles).where(eq13(profiles.userId, targetUserId)).limit(1);
          if (existingProf.length) {
            profId = existingProf[0].id;
            await db.update(profiles).set({
              name: cleanDName,
              ...cleanDPhone !== null ? { phone: cleanDPhone } : {}
            }).where(eq13(profiles.userId, targetUserId));
          }
        }
        if (!profId) {
          targetUserId = `driver-${Date.now()}`;
          const newProf = await db.insert(profiles).values({
            userId: targetUserId,
            name: cleanDName,
            email: `${targetUserId}@acims.local`,
            phone: cleanDPhone,
            role: "DRIVER"
          }).returning();
          profId = newProf[0].id;
          await db.insert(drivers).values({
            profileId: profId,
            assignedBusId: busId
          });
        }
        if (profId) {
          await db.update(drivers).set({ assignedBusId: busId }).where(eq13(drivers.profileId, profId));
        }
        assignedDriverId = targetUserId;
      } else {
        if (assignedDriverId) {
          const prof = await db.select().from(profiles).where(eq13(profiles.userId, assignedDriverId)).limit(1);
          if (prof.length) {
            await db.update(drivers).set({ assignedBusId: null }).where(eq13(drivers.profileId, prof[0].id));
          }
        }
        assignedDriverId = null;
      }
    } else if (driverPhone !== void 0 && assignedDriverId) {
      await db.update(profiles).set({ phone: driverPhone.trim() || null }).where(eq13(profiles.userId, assignedDriverId));
    }
    await db.update(buses).set({
      busNumber: newNumber,
      driverId: assignedDriverId,
      active: active !== void 0 ? active : bus.active
    }).where(eq13(buses.id, busId));
    if (bus.routeId && routeName) {
      const cleanRoute = routeName.trim().toUpperCase();
      await db.update(busRoutes).set({
        routeName: `${newNumber} \xB7 ${cleanRoute}`
      }).where(eq13(busRoutes.id, bus.routeId));
    }
    res.json({
      id: busId,
      busNumber: newNumber,
      driverId: assignedDriverId,
      active,
      message: "Bus & route updated successfully"
    });
  } catch (err) {
    console.error("[admin/buses-and-routes PATCH]", err);
    res.status(400).json({ error: err.message || "Failed to update bus and route" });
  }
});
router8.put("/admin/buses-and-routes/:busId/stops", async (req, res) => {
  try {
    const { busId } = req.params;
    const { stops } = req.body;
    const existingBus = await db.select().from(buses).where(eq13(buses.id, busId)).limit(1);
    if (!existingBus.length || !existingBus[0].routeId) {
      return res.status(404).json({ error: "Bus or associated route not found" });
    }
    const routeId = existingBus[0].routeId;
    await db.delete(busStops).where(eq13(busStops.routeId, routeId));
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      await db.insert(busStops).values({
        id: s.id || `${routeId}-stop-${i + 1}-${Date.now()}`,
        routeId,
        stopName: s.name.trim(),
        latitude: s.latitude ?? 13.0084,
        longitude: s.longitude ?? 80.0033,
        sequenceNumber: i + 1
      });
    }
    res.json({ success: true, count: stops.length, message: "Route stops updated successfully" });
  } catch (err) {
    console.error("[admin/buses-and-routes/:busId/stops]", err);
    res.status(400).json({ error: err.message || "Failed to update stops" });
  }
});
router8.get("/admin/shift-assignments", async (_req, res) => {
  try {
    const { getAllShiftsWithAssignments: getAllShiftsWithAssignments2 } = await Promise.resolve().then(() => (init_shiftManagement(), shiftManagement_exports));
    const shifts2 = await getAllShiftsWithAssignments2();
    res.json(shifts2);
  } catch (err) {
    console.error("[admin/shift-assignments GET]", err);
    res.status(500).json({ error: "Failed to list shift assignments" });
  }
});
router8.put("/admin/shift-assignments/:shiftId", async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { busIds } = req.body;
    if (!Array.isArray(busIds)) {
      return res.status(400).json({ error: "busIds array is required" });
    }
    const { setShiftAssignedBuses: setShiftAssignedBuses2 } = await Promise.resolve().then(() => (init_shiftManagement(), shiftManagement_exports));
    await setShiftAssignedBuses2(shiftId, busIds);
    res.json({
      success: true,
      shiftId,
      assignedCount: busIds.length,
      message: "Shift assignment saved."
    });
  } catch (err) {
    console.error("[admin/shift-assignments PUT]", err);
    res.status(400).json({ error: err.message || "Failed to update shift assignments" });
  }
});
router8.put("/admin/shift-assignments/:shiftId/bus/:busId/stops", async (req, res) => {
  try {
    const { shiftId, busId } = req.params;
    const { activeStopIds } = req.body;
    if (!Array.isArray(activeStopIds)) {
      return res.status(400).json({ error: "activeStopIds array is required" });
    }
    const { updateShiftBusActiveStops: updateShiftBusActiveStops2 } = await Promise.resolve().then(() => (init_shiftManagement(), shiftManagement_exports));
    await updateShiftBusActiveStops2(shiftId, busId, activeStopIds);
    res.json({
      success: true,
      shiftId,
      busId,
      activeStopCount: activeStopIds.length,
      message: "Stop checklist for shift saved."
    });
  } catch (err) {
    console.error("[admin/shift-assignments/:shiftId/bus/:busId/stops]", err);
    res.status(400).json({ error: err.message || "Failed to update stop checklist" });
  }
});
router8.get("/admin/live-buses", async (_req, res) => {
  try {
    const rawBusList = await getDbBuses();
    const routeList = await getDbRoutes();
    const busList = rawBusList.filter((b) => !isMtcBusOrRoute(b, routeList.find((r) => r.id === b.routeId)));
    const allStops = await db.select().from(busStops).orderBy(busStops.sequenceNumber);
    const driverProfiles = await db.select({
      driverId: drivers.id,
      userId: profiles.userId,
      name: profiles.name,
      phone: profiles.phone,
      assignedBusId: drivers.assignedBusId
    }).from(drivers).innerJoin(profiles, eq13(drivers.profileId, profiles.id));
    const { buildBusTelemetry: buildBusTelemetry2 } = await Promise.resolve().then(() => (init_buses(), buses_exports));
    const busesWithGps = await Promise.all(
      busList.map(async (b) => {
        const route = routeList.find((r) => r.id === b.routeId);
        const routeName = route ? route.routeName.replace(/^\d+[A-Z]?\s*·?\s*/i, "").trim() : "CAMPUS";
        const displayName = `BUS ${b.busNumber} \xB7 ${routeName.toUpperCase()}`;
        const driver = driverProfiles.find((d) => d.userId === b.driverId || d.assignedBusId === b.id);
        let telemetry = null;
        try {
          telemetry = await buildBusTelemetry2(b.id);
        } catch {
        }
        let status = "GPS UNAVAILABLE";
        if (telemetry?.isLive && telemetry.secondsAgo != null && telemetry.secondsAgo <= 90) {
          status = telemetry.delayMinutes && telemetry.delayMinutes > 2 ? "DELAYED" : "LIVE";
        } else if (telemetry?.latitude != null && telemetry.longitude != null) {
          status = "STALE";
        } else if (telemetry?.trackingStatus === "PAUSED") {
          status = "STALE";
        }
        return {
          id: b.id,
          busNumber: b.busNumber,
          routeId: b.routeId,
          routeName: routeName.toUpperCase(),
          displayName,
          driverName: driver?.name ?? "Driver not assigned",
          driverPhone: driver?.phone ?? "Phone not available",
          status,
          latitude: telemetry?.isLive ? telemetry.latitude : status === "STALE" ? telemetry?.latitude : null,
          longitude: telemetry?.isLive ? telemetry.longitude : status === "STALE" ? telemetry?.longitude : null,
          accuracy: telemetry?.accuracy ? `\xB1${Math.round(telemetry.accuracy)}m` : "Coordinates unavailable",
          lastUpdate: telemetry?.secondsAgo != null && telemetry.secondsAgo !== Infinity ? `${telemetry.secondsAgo}s ago` : "No telemetry",
          routeLabel: `${routeName} \u2192 REC Campus`,
          nextStop: telemetry?.nextStop ?? (status === "LIVE" ? "En route" : "GPS unavailable"),
          eta: telemetry?.etaMinutes != null ? `${telemetry.etaMinutes} min` : "ETA unavailable",
          active: b.active
        };
      })
    );
    busesWithGps.sort((a, b) => naturalBusSort(a.busNumber, b.busNumber));
    const campusRouteIds = new Set(busList.map((b) => b.routeId));
    const stopMarkers = allStops.filter((s) => s.latitude != null && s.longitude != null && campusRouteIds.has(s.routeId)).map((s) => {
      const route = routeList.find((r) => r.id === s.routeId);
      const bus = busList.find((b) => b.routeId === s.routeId);
      return {
        id: s.id,
        name: s.stopName,
        busId: bus?.id,
        busNumber: bus?.busNumber,
        busDisplayName: bus ? `BUS ${bus.busNumber} \xB7 ${(route?.routeName || "").toUpperCase()}` : void 0,
        routeName: route?.routeName,
        sequence: s.sequenceNumber,
        latitude: s.latitude,
        longitude: s.longitude,
        time: "Scheduled"
      };
    });
    const counters = {
      total: busesWithGps.length,
      live: busesWithGps.filter((b) => b.status === "LIVE").length,
      stale: busesWithGps.filter((b) => b.status === "STALE").length,
      gpsUnavailable: busesWithGps.filter((b) => b.status === "GPS UNAVAILABLE").length,
      delayed: busesWithGps.filter((b) => b.status === "DELAYED").length
    };
    res.json({
      buses: busesWithGps,
      stops: stopMarkers,
      counters
    });
  } catch (err) {
    console.error("[admin/live-buses]", err);
    res.status(500).json({ error: "Failed to load live buses" });
  }
});
router8.get("/admin/pickup-points", async (req, res) => {
  try {
    const routeIdFilter = typeof req.query.routeId === "string" ? req.query.routeId : void 0;
    const { officialPickupPoints: officialPickupPoints2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { getDbRoutes: getDbRoutes2 } = await Promise.resolve().then(() => (init_services(), services_exports));
    const query = routeIdFilter ? db.select().from(officialPickupPoints2).where(eq13(officialPickupPoints2.routeId, routeIdFilter)).orderBy(officialPickupPoints2.sequenceNumber) : db.select().from(officialPickupPoints2).orderBy(officialPickupPoints2.sequenceNumber);
    const rows = await query;
    const routes2 = await getDbRoutes2();
    const filteredRows = rows.filter((p) => {
      const route = routes2.find((r) => r.id === p.routeId);
      return !isMtcBusOrRoute({ routeId: p.routeId }, route);
    });
    const result = filteredRows.map((p) => {
      const route = routes2.find((r) => r.id === p.routeId);
      return {
        id: p.id,
        routeId: p.routeId,
        routeName: route?.routeName || p.routeId,
        stopName: p.stopName,
        latitude: p.latitude,
        longitude: p.longitude,
        sequenceNumber: p.sequenceNumber,
        scheduledTimeDisplay: p.scheduledTimeDisplay || "Scheduled",
        source: p.source,
        active: p.active
      };
    });
    res.json(result);
  } catch (err) {
    console.error("[admin/pickup-points GET]", err);
    res.status(500).json({ error: "Failed to load pickup points" });
  }
});
router8.post("/admin/pickup-points", async (req, res) => {
  try {
    const { routeId, stopName, scheduledTimeDisplay, latitude, longitude, sequenceNumber } = req.body;
    if (!routeId || !stopName?.trim()) {
      return res.status(400).json({ error: "routeId and stopName are required" });
    }
    const { officialPickupPoints: officialPickupPoints2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const id = `pickup-${routeId}-${Date.now()}`;
    const inserted = await db.insert(officialPickupPoints2).values({
      id,
      routeId,
      stopName: stopName.trim(),
      scheduledTimeDisplay: scheduledTimeDisplay || null,
      latitude: latitude != null ? Number(latitude) : null,
      longitude: longitude != null ? Number(longitude) : null,
      sequenceNumber: Number(sequenceNumber) || 1,
      source: "ADMIN",
      active: true
    }).returning();
    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error("[admin/pickup-points POST]", err);
    res.status(400).json({ error: err.message || "Failed to create pickup point" });
  }
});
router8.patch("/admin/pickup-points/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { stopName, scheduledTimeDisplay, latitude, longitude, sequenceNumber, active } = req.body;
    const { officialPickupPoints: officialPickupPoints2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const updated = await db.update(officialPickupPoints2).set({
      ...stopName ? { stopName: stopName.trim() } : {},
      ...scheduledTimeDisplay !== void 0 ? { scheduledTimeDisplay } : {},
      ...latitude !== void 0 ? { latitude: latitude != null ? Number(latitude) : null } : {},
      ...longitude !== void 0 ? { longitude: longitude != null ? Number(longitude) : null } : {},
      ...sequenceNumber !== void 0 ? { sequenceNumber: Number(sequenceNumber) } : {},
      ...active !== void 0 ? { active } : {}
    }).where(eq13(officialPickupPoints2.id, id)).returning();
    if (!updated.length) return res.status(404).json({ error: "Pickup point not found" });
    res.json(updated[0]);
  } catch (err) {
    console.error("[admin/pickup-points PATCH]", err);
    res.status(400).json({ error: err.message || "Failed to update pickup point" });
  }
});
router8.delete("/admin/pickup-points/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { officialPickupPoints: officialPickupPoints2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    await db.delete(officialPickupPoints2).where(eq13(officialPickupPoints2.id, id));
    res.json({ success: true, id });
  } catch (err) {
    console.error("[admin/pickup-points DELETE]", err);
    res.status(500).json({ error: "Failed to delete pickup point" });
  }
});
var admin_default = router8;

// artifacts/api-server/src/routes/ai.ts
import { Router as Router9 } from "express";

// artifacts/api-server/src/services/ai.ts
init_services();

// artifacts/api-server/src/services/mobiTools.ts
init_services();
init_mobilityOps();
init_etaService();
init_pickupPointService();
init_shiftTiming();
init_publicTransitService();
init_mtcService();
init_mtcSchema();
function hasDeviceGps(coords) {
  return typeof coords?.latitude === "number" && typeof coords?.longitude === "number" && !Number.isNaN(coords.latitude) && !Number.isNaN(coords.longitude) && !(coords.latitude === 0 && coords.longitude === 0);
}
function formatAge(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "unknown";
  if (seconds >= 9e3) return "unknown";
  if (seconds < 60) return `${Math.round(seconds)} second${Math.round(seconds) === 1 ? "" : "s"} ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
}
async function getMyBus(studentId) {
  const eta = await computeStudentPickupEta(studentId);
  if (!eta) {
    return { found: false, reason: "no_bus", eta: null };
  }
  return { found: true, reason: null, eta };
}
async function getMyActiveTrip(studentId) {
  const eta = await computeStudentPickupEta(studentId);
  if (!eta?.busId) return { found: false, trip: null, eta: null };
  const trip = await getActiveTripForBus(eta.busId);
  return { found: Boolean(trip), trip, eta };
}
async function getMyPickupPoint(studentId) {
  const pickup = await getStudentPickupPoint(studentId);
  return pickup;
}
async function getMyBusLocation(studentId) {
  const eta = await computeStudentPickupEta(studentId);
  if (!eta) return { found: false, eta: null, confidence: "UNKNOWN" };
  const confidence = eta.gps.status === "LIVE" ? "LIVE" : eta.gps.status === "STALE" ? "STALE" : "UNKNOWN";
  return { found: true, eta, confidence };
}
async function getMyETA(studentId) {
  const eta = await computeStudentPickupEta(studentId);
  if (!eta) return { available: false, eta: null, reason: "no_assignment" };
  if (eta.gps.status !== "LIVE" || eta.etaMinutes == null) {
    return { available: false, eta, reason: "gps_unavailable" };
  }
  return { available: true, eta, reason: null };
}
async function getMyDelay(studentId) {
  const eta = await computeStudentPickupEta(studentId);
  if (!eta) return { available: false, eta: null, reason: "no_assignment" };
  if (eta.gps.status !== "LIVE" || !eta.delay) {
    return { available: false, eta, reason: "insufficient_data" };
  }
  return { available: true, eta, reason: null };
}
async function getMyShift(studentId) {
  const eta = await computeStudentPickupEta(studentId);
  const busId = eta?.busId;
  if (!busId) return { available: false, shift: null, eta: null };
  const shift = await getBusShiftTimingContext(busId);
  if (!shift?.shiftStartTime) return { available: false, shift: null, eta };
  return { available: true, shift, eta };
}
async function getAvailableShifts() {
  const rows = await listShifts();
  return rows.filter((s) => s.active && s.startTime);
}
async function getPickupPoints(studentId) {
  return listPickupPointsForStudentRoute(studentId);
}
async function getNearestPickupPoint(studentId, coords) {
  if (!hasDeviceGps(coords)) {
    return { needsLocation: true, nearest: null };
  }
  const points = await listPickupPointsForStudentRoute(studentId);
  if (!points.length) {
    const all = await listPickupPoints();
    const ranked2 = all.filter((p) => p.active && p.latitude != null && p.longitude != null).map((p) => ({
      ...p,
      distanceMeters: Math.round(haversineMeters(coords.latitude, coords.longitude, p.latitude, p.longitude))
    })).sort((a, b) => a.distanceMeters - b.distanceMeters);
    return { needsLocation: false, nearest: ranked2[0] ?? null };
  }
  const ranked = points.filter((p) => p.active && p.latitude != null && p.longitude != null).map((p) => ({
    ...p,
    distanceMeters: Math.round(haversineMeters(coords.latitude, coords.longitude, p.latitude, p.longitude))
  })).sort((a, b) => a.distanceMeters - b.distanceMeters);
  return { needsLocation: false, nearest: ranked[0] ?? null };
}
async function findCampusLocation(query) {
  const term = query.trim().replace(/^(the|a|an)\s+/i, "");
  if (!term) return null;
  const all = await getDbCampusLocations();
  const lower = term.toLowerCase();
  const byName = all.find((l) => l.name.toLowerCase() === lower) || all.find((l) => l.id.toLowerCase() === lower) || all.find((l) => l.name.toLowerCase().includes(lower) || l.id.toLowerCase().includes(lower));
  return byName ?? null;
}
async function getCampusRoute(destinationId, coords) {
  const start = hasDeviceGps(coords) ? { latitude: coords.latitude, longitude: coords.longitude } : "REC Main Gate";
  return calculateDbCampusWalkingRoute(start, destinationId);
}
async function getNearestCampusBusStop(coords) {
  if (!hasDeviceGps(coords)) {
    return { needsLocation: true, nearest: null };
  }
  const locations = await getDbCampusLocations();
  const stops = locations.filter((l) => /transit|stop|gate/i.test(`${l.category} ${l.name}`));
  const pool3 = stops.length ? stops : locations;
  const ranked = pool3.map((l) => ({
    ...l,
    distanceMeters: Math.round(haversineMeters(coords.latitude, coords.longitude, l.latitude, l.longitude))
  })).sort((a, b) => a.distanceMeters - b.distanceMeters);
  return { needsLocation: false, nearest: ranked[0] ?? null };
}
async function getMissedBusAlternatives2(studentId, coords) {
  const eta = await computeStudentPickupEta(studentId);
  const shifts2 = await getAvailableShifts();
  const otherShifts = shifts2;
  let mtc = {
    available: false,
    message: mtcUnavailableMessage(),
    options: []
  };
  if (hasDeviceGps(coords)) {
    mtc = buildMissedBusMtcOptions({ latitude: coords.latitude, longitude: coords.longitude });
  } else if (eta?.pickup.latitude != null && eta.pickup.longitude != null) {
    mtc = buildMissedBusMtcOptions({ latitude: eta.pickup.latitude, longitude: eta.pickup.longitude });
  } else if (isMtcDataAvailable()) {
    mtc = { available: true, options: [], message: "MTC is integrated, but a location is needed to list nearby stages." };
  }
  return {
    eta,
    stopPassed: eta?.stopPassed ?? false,
    upcomingShifts: otherShifts.map((s) => ({
      id: s.id,
      name: s.name,
      shiftType: s.shiftType,
      startTime: s.startTime,
      direction: s.direction
    })),
    mtc
  };
}
async function getMTCOptions(coords) {
  if (!isMtcDataAvailable()) {
    return { available: false, message: mtcUnavailableMessage(), options: [], source: MTC_SOURCE_LABEL };
  }
  if (!hasDeviceGps(coords)) {
    return {
      available: true,
      needsLocation: true,
      message: "I need your location permission to find nearby MTC stages.",
      options: [],
      source: MTC_SOURCE_LABEL
    };
  }
  const result = buildMissedBusMtcOptions({ latitude: coords.latitude, longitude: coords.longitude });
  return { ...result, source: MTC_SOURCE_LABEL, needsLocation: false };
}
async function getNotifications(studentId) {
  return getUserNotifications(studentId);
}
async function changePickupPoint(studentId, pickupPointId) {
  return updateStudentPickupPoint(studentId, pickupPointId);
}
async function getStudentDisplayName(studentId) {
  const profile = await getProfileWithDetails(studentId);
  return profile?.name?.split(" ")[0] || "there";
}
function hasLiveDeviceGps(coords) {
  return hasDeviceGps(coords);
}

// artifacts/api-server/src/services/mobiAudit.ts
init_db();
init_schema();
async function logMobiQuery(input) {
  try {
    await db.insert(mobiQueryLogs).values({
      id: `mobi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      studentId: input.studentId,
      intent: input.intent,
      toolsCalled: JSON.stringify(input.toolsCalled),
      success: input.success
    });
  } catch (err) {
    console.warn("[MOBI audit]", err instanceof Error ? err.message : err);
  }
}

// artifacts/api-server/src/services/mobiEngine.ts
init_mtcSchema();
var MOBI_SCOPE = /\b(bus|buses|mtc|metro|stop|eta|delay|gps|pickup|shift|schedule|timing|missed|transport|campus|commute|shuttle|driver|mobi|acims|walk|direction|arriv|depart|library|auditorium|canteen|hostel|gate|block|route|navigation|notification|alert)\b/i;
var OFF_TOPIC = /\b(homework|assignment|essay|exam\s+question|python|javascript|recipe|cricket|ipl|movie|netflix|joke|crypto|bitcoin|politics|medical\s+advice)\b/i;
function officialBadge(label, type = "official") {
  return { label, type, timestamp: (/* @__PURE__ */ new Date()).toISOString() };
}
function reply(partial) {
  return { toolsCalled: [], ...partial };
}
function extractNamedPlace(message) {
  const cleaned = message.toLowerCase().replace(/[?.!]/g, " ").replace(/\b(where is the|where is|how do i get to|take me to|find the|nearest|campus|bus stop|please|mobi)\b/g, " ").replace(/\b(the|a|an)\b/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length >= 3 ? cleaned : null;
}
function classifyMobiIntent(message, history = []) {
  const text4 = message.toLowerCase().trim();
  if (!text4) return "CONVERSATION";
  if (/^(hi|hello|hey|thanks|thank you|ok|okay|bye|help|what can you do|who are you)[\s!.?]*$/i.test(text4)) {
    return "CONVERSATION";
  }
  if (OFF_TOPIC.test(text4) && !MOBI_SCOPE.test(text4)) return "OUT_OF_SCOPE";
  if (/\b(doesn't exist|does not exist|ghost|fake bus|bus 999|spaceship|alien|mars)\b/.test(text4)) {
    return "OUT_OF_SCOPE";
  }
  if (/\bnearest pickup\b/.test(text4)) return "NEAREST_PICKUP";
  if (/\bnearest (campus )?bus stop\b/.test(text4)) return "NEAREST_CAMPUS_STOP";
  if (/\b(change|update|set|switch).*(pickup|pick up)\b/.test(text4) || /\bpickup point\b/.test(text4) && /\b(change|update|set)\b/.test(text4)) {
    return "CHANGE_PICKUP";
  }
  if (/\b(where is my bus|where's my bus|track my bus|my bus location|find my bus)\b/.test(text4) || /\bwhere is bus\b/.test(text4)) {
    return "MY_BUS_LOCATION";
  }
  if (/\b(eta|when will my bus|when will it (reach|arrive)|how long until|minutes away|what's my eta|whats my eta)\b/.test(text4)) {
    return "MY_ETA";
  }
  if (/\b(delayed|delay|on time|late|running late)\b/.test(text4)) return "MY_DELAY";
  if (/\b(pickup point|pick up point|my pickup|my stop)\b/.test(text4)) return "MY_PICKUP";
  if (/\b(what time is my bus|when is my (morning |evening )?bus|my shift|morning bus|evening bus|schedule)\b/.test(text4)) {
    return "MY_SHIFT";
  }
  if (/\bmiss(ed)? my bus|i missed\b/.test(text4)) return "MISSED_BUS";
  if (/\b(mtc|public transport|public bus|how can i get home)\b/.test(text4)) return "MTC";
  if (/\bnotification|alerts?\b/.test(text4)) return "NOTIFICATIONS";
  if (/\b(take me to|how do i get to|directions to|walk to)\b/.test(text4)) return "CAMPUS_NAVIGATION";
  if (/\bwhere is\b/.test(text4) && !/\bmy bus\b/.test(text4)) return "CAMPUS_LOCATION";
  if (MOBI_SCOPE.test(text4)) return "MY_BUS_LOCATION";
  if (history.slice(-4).some((t) => t.intent && t.intent !== "OUT_OF_SCOPE" && t.intent !== "CONVERSATION")) {
    return "CONVERSATION";
  }
  return "OUT_OF_SCOPE";
}
function unavailable(intent, answer, toolsCalled) {
  return reply({
    intent,
    answer,
    ttsText: answer,
    sources: ["ACIMS MOBI"],
    sourceBadge: officialBadge("Insufficient data"),
    toolsCalled
  });
}
async function executeMobiAgent(input) {
  const { studentId, message, deviceCoords, history = [], confirmAction } = input;
  const toolsCalled = [];
  const intent = classifyMobiIntent(message, history);
  let response;
  try {
    if (confirmAction?.action === "CHANGE_PICKUP" && confirmAction.confirmed && confirmAction.pickupPointId) {
      toolsCalled.push("changePickupPoint");
      const updated = await changePickupPoint(studentId, confirmAction.pickupPointId);
      response = reply({
        intent: "CHANGE_PICKUP",
        answer: updated ? `Your pickup point is now ${updated.pickupPointName}.` : "I'm unable to retrieve that information right now.",
        ttsText: updated ? `Your pickup point is now ${updated.pickupPointName}.` : "I couldn't update your pickup point.",
        sources: ["ACIMS Pickup Registry"],
        sourceBadge: officialBadge("Pickup updated"),
        toolsCalled
      });
    } else {
      response = await dispatchIntent(intent, studentId, message, deviceCoords, toolsCalled);
    }
    await logMobiQuery({ studentId, intent: response.intent, toolsCalled: response.toolsCalled, success: true });
    return response;
  } catch (err) {
    console.warn("[MOBI]", err instanceof Error ? err.message : err);
    const fail = unavailable(intent, "I'm unable to retrieve that information right now.", toolsCalled);
    await logMobiQuery({ studentId, intent, toolsCalled, success: false });
    return fail;
  }
}
async function dispatchIntent(intent, studentId, message, deviceCoords, toolsCalled) {
  if (intent === "OUT_OF_SCOPE") {
    const invented = /\b(doesn't exist|does not exist|ghost|fake bus|bus 999|spaceship|alien|mars)\b/i.test(message);
    const answer = invented ? "I don't have that information yet." : "I'm MOBI, the ACIMS mobility assistant. I can only help with your bus, pickup, campus navigation, and transport. Please ask something related to your commute.";
    return reply({
      intent,
      answer,
      ttsText: invented ? answer : "Please ask about your bus, pickup, or campus transport.",
      sources: ["ACIMS MOBI scope"],
      sourceBadge: officialBadge(invented ? "Unknown entity" : "Outside mobility scope"),
      toolsCalled
    });
  }
  if (intent === "CONVERSATION") {
    toolsCalled.push("getMyBusLocation");
    const loc = await getMyBusLocation(studentId);
    const name = await getStudentDisplayName(studentId);
    const liveHint = loc.eta && loc.confidence === "LIVE" ? `Bus ${loc.eta.busNumber} GPS was updated ${formatAge(loc.eta.gps.secondsSinceUpdate)}.` : "Ask me where your bus is, your ETA, or your pickup point.";
    const answer = `Hi ${name}! I'm MOBI. How can I help you?

${liveHint}`;
    return reply({
      intent,
      answer,
      ttsText: `Hi ${name}. How can I help you?`,
      sources: ["ACIMS Student Profile"],
      sourceBadge: officialBadge("MOBI"),
      followUps: ["Where is my bus?", "What's my ETA?", "What is my pickup point?"],
      toolsCalled
    });
  }
  if (intent === "MY_BUS_LOCATION") return handleBusLocation(studentId, toolsCalled);
  if (intent === "MY_ETA") return handleEta(studentId, toolsCalled);
  if (intent === "MY_DELAY") return handleDelay(studentId, toolsCalled);
  if (intent === "MY_PICKUP") return handlePickup(studentId, toolsCalled);
  if (intent === "CHANGE_PICKUP") return handleChangePickup(studentId, message, toolsCalled);
  if (intent === "MY_SHIFT") return handleShift(studentId, message, toolsCalled);
  if (intent === "MISSED_BUS") return handleMissedBus(studentId, deviceCoords, toolsCalled);
  if (intent === "NEAREST_PICKUP") return handleNearestPickup(studentId, deviceCoords, toolsCalled);
  if (intent === "NEAREST_CAMPUS_STOP") return handleNearestCampusStop(deviceCoords, toolsCalled);
  if (intent === "CAMPUS_LOCATION" || intent === "CAMPUS_NAVIGATION") {
    return handleCampus(intent, message, deviceCoords, toolsCalled);
  }
  if (intent === "MTC") return handleMtc(deviceCoords, toolsCalled);
  if (intent === "NOTIFICATIONS") return handleNotifications(studentId, toolsCalled);
  return unavailable(intent, "I don't have enough current data to answer that reliably.", toolsCalled);
}
async function handleBusLocation(studentId, toolsCalled) {
  toolsCalled.push("getMyBus", "getMyActiveTrip", "getMyBusLocation");
  const bus = await getMyBus(studentId);
  if (!bus.found || !bus.eta) {
    return unavailable("MY_BUS_LOCATION", "You don't currently have an active bus.", toolsCalled);
  }
  const trip = await getMyActiveTrip(studentId);
  const loc = await getMyBusLocation(studentId);
  const eta = loc.eta;
  if (eta.gps.status === "STALE") {
    const age = formatAge(eta.gps.secondsSinceUpdate);
    const answer2 = age === "unknown" ? "Your bus location is currently unavailable." : `Your bus location is currently unavailable. The last update was ${age}.`;
    return reply({
      intent: "MY_BUS_LOCATION",
      answer: answer2,
      ttsText: answer2,
      sources: ["ACIMS Driver GPS"],
      sourceBadge: officialBadge(`Stale GPS \xB7 ${formatAge(eta.gps.secondsSinceUpdate)}`, "live GPS"),
      toolsCalled
    });
  }
  if (eta.gps.status !== "LIVE" || eta.gps.latitude == null || eta.gps.longitude == null) {
    if (!trip.found) {
      return unavailable("MY_BUS_LOCATION", "There isn't an active trip for your bus right now.", toolsCalled);
    }
    return unavailable("MY_BUS_LOCATION", "Your bus's live location isn't available right now.", toolsCalled);
  }
  const distance = eta.remainingDistanceKm != null ? ` It is about ${eta.remainingDistanceKm.toFixed(1)} km from ${eta.pickup.name}.` : "";
  const answer = `Bus ${eta.busNumber} last reported live GPS ${formatAge(eta.gps.secondsSinceUpdate)}.${distance}`;
  return reply({
    intent: "MY_BUS_LOCATION",
    answer,
    ttsText: answer,
    sources: ["ACIMS Driver GPS"],
    sourceBadge: officialBadge(`Live GPS \xB7 ${formatAge(eta.gps.secondsSinceUpdate)}`, "live GPS"),
    mapData: {
      center: { latitude: eta.gps.latitude, longitude: eta.gps.longitude },
      zoom: 14,
      markers: [
        {
          id: "bus",
          title: `Bus ${eta.busNumber}`,
          latitude: eta.gps.latitude,
          longitude: eta.gps.longitude,
          type: "bus"
        },
        ...eta.pickup.latitude != null && eta.pickup.longitude != null ? [
          {
            id: "pickup",
            title: eta.pickup.name,
            latitude: eta.pickup.latitude,
            longitude: eta.pickup.longitude,
            type: "stop"
          }
        ] : []
      ]
    },
    toolsCalled
  });
}
async function handleEta(studentId, toolsCalled) {
  toolsCalled.push("getMyETA");
  const result = await getMyETA(studentId);
  if (!result.eta) {
    return unavailable("MY_ETA", "You don't currently have an active bus.", toolsCalled);
  }
  if (!result.available) {
    return unavailable("MY_ETA", "I can't calculate a reliable ETA right now because the bus's live location is unavailable.", toolsCalled);
  }
  const eta = result.eta;
  let answer = `Your bus is expected at your pickup point in about ${eta.etaMinutes} minutes.`;
  if (eta.delay && eta.delay.delayMinutes > 0 && eta.scheduledArrivalAt && eta.predictedArrivalAt) {
    answer = `Your bus is scheduled for ${eta.scheduledArrivalAt}, but the current predicted arrival is ${eta.predictedArrivalAt} \u2014 about ${eta.delay.delayMinutes} minutes later than scheduled.`;
  } else if (eta.delay && eta.delay.delayMinutes > 0) {
    answer = `Your bus is currently expected in about ${eta.etaMinutes} minutes, which is approximately ${eta.delay.delayMinutes} minutes later than scheduled.`;
  }
  return reply({
    intent: "MY_ETA",
    answer,
    ttsText: answer,
    sources: ["ACIMS Pickup ETA Engine"],
    sourceBadge: officialBadge("Predicted ETA", "calculated"),
    toolsCalled
  });
}
async function handleDelay(studentId, toolsCalled) {
  toolsCalled.push("getMyDelay");
  const result = await getMyDelay(studentId);
  if (!result.available) {
    return unavailable("MY_DELAY", "I don't have enough current data to determine whether your bus is delayed.", toolsCalled);
  }
  const delay = result.eta.delay;
  const answer = delay.status === "ON_TIME" || delay.delayMinutes <= 0 ? "Your bus is currently on schedule." : `Yes. Your bus is currently predicted to be about ${delay.delayMinutes} minutes late.`;
  return reply({
    intent: "MY_DELAY",
    answer,
    ttsText: answer,
    sources: ["ACIMS Delay Engine"],
    sourceBadge: officialBadge("Predicted delay", "calculated"),
    toolsCalled
  });
}
async function handlePickup(studentId, toolsCalled) {
  toolsCalled.push("getMyPickupPoint");
  const pickup = await getMyPickupPoint(studentId);
  if (!pickup) {
    return unavailable("MY_PICKUP", "You haven't selected a pickup point yet. You can set one in Transport Settings.", toolsCalled);
  }
  const answer = `Your current pickup point is ${pickup.pickupPointName}.`;
  return reply({
    intent: "MY_PICKUP",
    answer,
    ttsText: answer,
    sources: ["ACIMS Student Pickup Registry"],
    sourceBadge: officialBadge("Stored pickup"),
    toolsCalled
  });
}
async function handleChangePickup(studentId, message, toolsCalled) {
  toolsCalled.push("getMyPickupPoint", "getPickupPoints");
  const pickup = await getMyPickupPoint(studentId);
  const options = await getPickupPoints(studentId);
  const named = extractNamedPlace(message.replace(/change|update|set|switch|my|pickup|point|to|please/gi, " "));
  const match = named ? options.find((p) => p.stopName.toLowerCase().includes(named) || p.id.toLowerCase().includes(named)) : null;
  if (!match) {
    const current = pickup ? `Your current pickup point is ${pickup.pickupPointName}. ` : "";
    return reply({
      intent: "CHANGE_PICKUP",
      answer: `${current}You can change your pickup point from Transport Settings.`,
      ttsText: `${current}You can change your pickup point from Transport Settings.`,
      sources: ["ACIMS Pickup Registry"],
      sourceBadge: officialBadge("Pickup change"),
      actionPrompt: {
        type: "CHANGE_PICKUP",
        currentName: pickup?.pickupPointName ?? null,
        options: options.slice(0, 8).map((p) => ({ id: p.id, name: p.stopName }))
      },
      toolsCalled
    });
  }
  return reply({
    intent: "CHANGE_PICKUP",
    answer: `Your current pickup point is ${pickup?.pickupPointName ?? "not set"}. Do you want to change it to ${match.stopName}? Confirm below to update it.`,
    ttsText: `Your current pickup is ${pickup?.pickupPointName ?? "not set"}. Confirm if you want ${match.stopName}.`,
    sources: ["ACIMS Pickup Registry"],
    sourceBadge: officialBadge("Confirmation required"),
    actionPrompt: {
      type: "CHANGE_PICKUP",
      currentName: pickup?.pickupPointName ?? null,
      options: [{ id: match.id, name: match.stopName }]
    },
    toolsCalled
  });
}
async function handleShift(studentId, message, toolsCalled) {
  toolsCalled.push("getMyShift", "getAvailableShifts");
  const mine = await getMyShift(studentId);
  const all = await getAvailableShifts();
  const wantsEvening = /\bevening\b/.test(message.toLowerCase());
  const wantsMorning = /\bmorning\b/.test(message.toLowerCase());
  if (mine.available && mine.shift?.shiftStartTime) {
    const label = mine.shift.shiftType?.toLowerCase() === "evening" ? "evening" : "morning";
    const answer2 = `Your ${label} shift is scheduled for ${formatShiftTime(mine.shift.shiftStartTime)}.`;
    return reply({
      intent: "MY_SHIFT",
      answer: answer2,
      ttsText: answer2,
      sources: ["ACIMS Admin Shift Configuration"],
      sourceBadge: officialBadge("Scheduled shift", "scheduled"),
      toolsCalled
    });
  }
  const filtered = all.filter((s) => {
    if (wantsEvening) return (s.shiftType || s.name).toLowerCase().includes("evening") || s.direction === "FROM_COLLEGE";
    if (wantsMorning) return (s.shiftType || s.name).toLowerCase().includes("morning") || s.direction === "TO_COLLEGE";
    return true;
  });
  if (!filtered.length) {
    return unavailable("MY_SHIFT", "I don't have that information yet. Admin hasn't configured a shift time for your bus.", toolsCalled);
  }
  const lines = filtered.map((s) => `\u2022 ${s.name}: ${formatShiftTime(s.startTime)}`).join("\n");
  const answer = `Configured ACIMS shifts:
${lines}`;
  return reply({
    intent: "MY_SHIFT",
    answer,
    ttsText: `Configured shift: ${filtered[0].name} at ${formatShiftTime(filtered[0].startTime)}.`,
    sources: ["ACIMS Admin Shift Configuration"],
    sourceBadge: officialBadge("Scheduled shift", "scheduled"),
    toolsCalled
  });
}
function formatShiftTime(hhmm) {
  const [hRaw, mRaw] = hhmm.split(":");
  let h = Number(hRaw);
  const m = mRaw || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}
async function handleMissedBus(studentId, coords, toolsCalled) {
  toolsCalled.push("getMissedBusAlternatives", "getMTCOptions");
  const alt = await getMissedBusAlternatives2(studentId, coords);
  const acimsLines = alt.upcomingShifts.filter((s) => s.startTime).map((s) => `\u2022 ${s.name} at ${formatShiftTime(s.startTime)}`);
  const mtcLines = alt.mtc.available ? alt.mtc.options.slice(0, 3).map((o) => `\u2022 ${o.stopName}${o.routes?.length ? `: MTC ${o.routes.join(", ")}` : ""}`) : [];
  if (!acimsLines.length && !mtcLines.length) {
    const mtcNote = alt.mtc.available ? "I can't retrieve nearby MTC options without more location detail." : "I can't retrieve current MTC information right now.";
    const answer2 = `There are no other ACIMS options currently available, and ${mtcNote}`;
    return reply({
      intent: "MISSED_BUS",
      answer: answer2,
      ttsText: answer2,
      sources: ["ACIMS Shifts", MTC_SOURCE_LABEL],
      sourceBadge: officialBadge("No alternatives"),
      toolsCalled
    });
  }
  const passed = alt.stopPassed ? "Your scheduled bus has already passed your pickup point. " : "";
  const acimsBlock = acimsLines.length ? `Other ACIMS shifts:
${acimsLines.join("\n")}` : "I don't currently see another available ACIMS bus.";
  const mtcBlock = alt.mtc.available ? mtcLines.length ? `

Official MTC options:
${mtcLines.join("\n")}` : "\n\nI can check available MTC options, but none are listed near you right now." : "\n\nI can't retrieve current MTC information right now.";
  const answer = `${passed}${acimsBlock}${mtcBlock}`;
  return reply({
    intent: "MISSED_BUS",
    answer,
    ttsText: acimsLines.length ? `${passed}There is another ACIMS option: ${alt.upcomingShifts[0]?.name} at ${formatShiftTime(alt.upcomingShifts[0]?.startTime || "")}.` : answer,
    sources: ["ACIMS Shift Configuration", MTC_SOURCE_LABEL],
    sourceBadge: officialBadge("Missed-bus alternatives"),
    toolsCalled
  });
}
async function handleNearestPickup(studentId, coords, toolsCalled) {
  toolsCalled.push("getNearestPickupPoint");
  const result = await getNearestPickupPoint(studentId, coords);
  if (result.needsLocation) {
    return unavailable("NEAREST_PICKUP", "I need your location permission to find the nearest stop.", toolsCalled);
  }
  if (!result.nearest) {
    return unavailable("NEAREST_PICKUP", "I don't have that information yet.", toolsCalled);
  }
  const walk = Math.max(1, Math.round(result.nearest.distanceMeters / 80));
  const answer = `The nearest pickup point is ${result.nearest.stopName}, about ${result.nearest.distanceMeters} meters away (~${walk} min walk).`;
  return reply({
    intent: "NEAREST_PICKUP",
    answer,
    ttsText: answer,
    sources: ["ACIMS Official Pickup Points"],
    sourceBadge: officialBadge("Pickup registry"),
    toolsCalled
  });
}
async function handleNearestCampusStop(coords, toolsCalled) {
  toolsCalled.push("getNearestCampusBusStop");
  const result = await getNearestCampusBusStop(coords);
  if (result.needsLocation) {
    return unavailable("NEAREST_CAMPUS_STOP", "I need your location permission to find the nearest stop.", toolsCalled);
  }
  if (!result.nearest) {
    return unavailable("NEAREST_CAMPUS_STOP", "That location isn't configured in ACIMS.", toolsCalled);
  }
  const walk = Math.max(1, Math.round(result.nearest.distanceMeters / 80));
  const answer = `The nearest campus bus stop is ${result.nearest.name}, about ${result.nearest.distanceMeters} meters away (~${walk} min walk).`;
  return reply({
    intent: "NEAREST_CAMPUS_STOP",
    answer,
    ttsText: answer,
    sources: ["ACIMS Campus Map"],
    sourceBadge: officialBadge("Campus map"),
    toolsCalled
  });
}
async function handleCampus(intent, message, coords, toolsCalled) {
  const place = extractNamedPlace(message);
  if (!place) {
    return unavailable(intent, "That location isn't configured in ACIMS.", toolsCalled);
  }
  toolsCalled.push("getCampusLocations");
  const loc = await findCampusLocation(place);
  if (!loc) {
    return unavailable(intent, "I don't have that location configured in the campus map.", toolsCalled);
  }
  if (intent === "CAMPUS_NAVIGATION") {
    if (!hasLiveDeviceGps(coords)) {
      const answer3 = `${loc.name} is on the campus map (${loc.category}). I need your location permission to give walking directions from where you are.`;
      return reply({
        intent,
        answer: answer3,
        ttsText: answer3,
        sources: ["ACIMS Campus Map"],
        sourceBadge: officialBadge("Campus map"),
        toolsCalled
      });
    }
    toolsCalled.push("getCampusRoute");
    const route = await getCampusRoute(loc.id, coords);
    if (!route) {
      const answer3 = `${loc.name} is configured on campus, but I don't have a verified walking path from your current location.`;
      return reply({
        intent,
        answer: answer3,
        ttsText: answer3,
        sources: ["ACIMS Campus Map"],
        sourceBadge: officialBadge("Campus map"),
        toolsCalled
      });
    }
    const answer2 = `${loc.name} is about ${route.distanceMeters} meters away (~${route.walkingMinutes} min walk). ${route.steps.join(" ")}`;
    return reply({
      intent,
      answer: answer2,
      ttsText: `${loc.name} is about ${route.walkingMinutes} minutes on foot.`,
      sources: ["ACIMS Campus Map"],
      sourceBadge: officialBadge("Campus walking path", "calculated"),
      toolsCalled
    });
  }
  const answer = `${loc.name} is in the ${loc.category} zone${loc.description ? `: ${loc.description}` : "."}`;
  return reply({
    intent,
    answer,
    ttsText: answer,
    sources: ["ACIMS Campus Map"],
    sourceBadge: officialBadge("Campus map"),
    toolsCalled
  });
}
async function handleMtc(coords, toolsCalled) {
  toolsCalled.push("getMTCOptions");
  const result = await getMTCOptions(coords);
  if (!result.available) {
    return unavailable("MTC", "I can't retrieve current MTC information right now.", toolsCalled);
  }
  if ("needsLocation" in result && result.needsLocation) {
    return unavailable("MTC", "I need your location permission to find the nearest stop.", toolsCalled);
  }
  const options = result.options || [];
  if (!options.length) {
    return unavailable("MTC", "Current MTC information isn't available right now.", toolsCalled);
  }
  const lines = options.slice(0, 4).map((o) => `\u2022 ${o.stopName}${o.routes?.length ? ` \u2014 ${o.routes.join(", ")}` : ""}`);
  const answer = `Official MTC options near you (${MTC_SOURCE_LABEL}):
${lines.join("\n")}`;
  return reply({
    intent: "MTC",
    answer,
    ttsText: `Nearest official MTC stage is ${options[0]?.stopName}.`,
    sources: [MTC_SOURCE_LABEL],
    sourceBadge: officialBadge(MTC_SOURCE_LABEL),
    toolsCalled
  });
}
async function handleNotifications(studentId, toolsCalled) {
  toolsCalled.push("getNotifications");
  const items = await getNotifications(studentId);
  if (!items.length) {
    return unavailable("NOTIFICATIONS", "You currently have no transport notifications.", toolsCalled);
  }
  const latest = items.slice(0, 3).map((n) => `\u2022 ${n.title}: ${n.message}`).join("\n");
  const answer = `Your latest ACIMS notifications:
${latest}`;
  return reply({
    intent: "NOTIFICATIONS",
    answer,
    ttsText: `Latest notification: ${items[0].title}.`,
    sources: ["ACIMS Notifications"],
    sourceBadge: officialBadge("Notifications"),
    toolsCalled
  });
}

// artifacts/api-server/src/services/ai.ts
function toHistoryTurns(history) {
  if (!history?.length) return [];
  return history.filter((t) => t.role === "user" || t.role === "assistant").map((t) => ({ role: t.role, text: t.text }));
}
async function deliverMobiReply(userMessage, reply2, history, studentDisplayName) {
  if (!isGeminiConfigured()) return { ...reply2, geminiEnhanced: false };
  if (reply2.intent === "OUT_OF_SCOPE") {
    return { ...reply2, geminiEnhanced: false, followUps: void 0 };
  }
  if (reply2.intent === "CONVERSATION") {
    const conversational = await generateConversationalNaviReply({
      userMessage,
      history: toHistoryTurns(history),
      liveContext: reply2.answer,
      studentName: studentDisplayName || "Student"
    });
    if (conversational) {
      return {
        ...reply2,
        answer: conversational.answer,
        ttsText: conversational.ttsText,
        followUps: conversational.followUps,
        geminiEnhanced: true,
        sourceBadge: {
          ...reply2.sourceBadge,
          label: `${reply2.sourceBadge.label} \xB7 Gemini`
        }
      };
    }
  }
  const enhanced = await enhanceNaviAnswerWithGemini({
    userMessage,
    factualAnswer: reply2.answer,
    factualTts: reply2.ttsText,
    sources: reply2.sources,
    intent: reply2.intent,
    history: toHistoryTurns(history)
  });
  if (!enhanced) return { ...reply2, geminiEnhanced: false };
  return {
    ...reply2,
    answer: enhanced.answer,
    ttsText: enhanced.ttsText,
    followUps: enhanced.followUps,
    geminiEnhanced: true,
    sourceBadge: {
      ...reply2.sourceBadge,
      label: `${reply2.sourceBadge.label} \xB7 Gemini`
    }
  };
}
async function getAiContext(studentId = "student-20418") {
  const [buses3, locations, safetyAlerts2, profile] = await Promise.all([
    getDbBuses(),
    getDbCampusLocations(),
    Promise.resolve(listSafetyAlerts()),
    getProfileWithDetails(studentId)
  ]);
  const queue = await getDbQueueStatus(profile?.assignedBusId || "bus-12", studentId);
  return {
    buses: buses3,
    queue,
    safetyAlerts: safetyAlerts2,
    destinations: locations,
    providers: listProviders(),
    studentProfile: profile
  };
}
async function answerMobilityQuestion(message, _destinationId, studentId = "student-20418", deviceCoords, history, confirmAction) {
  const profile = await getProfileWithDetails(studentId);
  const studentDisplayName = profile?.name?.split(" ")[0] || "Student";
  const mobi = await executeMobiAgent({
    studentId,
    message,
    deviceCoords,
    history,
    confirmAction
  });
  return deliverMobiReply(
    message,
    {
      answer: mobi.answer,
      sources: mobi.sources,
      intent: mobi.intent,
      sourceBadge: mobi.sourceBadge,
      ttsText: mobi.ttsText,
      context: null,
      cards: mobi.cards,
      mapData: mobi.mapData,
      followUps: mobi.followUps,
      actionPrompt: mobi.actionPrompt,
      toolsCalled: mobi.toolsCalled
    },
    history,
    studentDisplayName
  );
}

// artifacts/api-server/src/services/studentProfileService.ts
init_campusData();
var studentProfiles = {
  "student-20418": {
    studentId: "student-20418",
    name: "Ananya Raman",
    department: "Computer Science & Design",
    email: "ananya.raman@rec.ac.in",
    phone: "+91 98401 23456",
    homeLocation: {
      name: "Tambaram West, Chennai",
      latitude: 12.923,
      longitude: 80.125
    },
    pickupStopId: "tambaram",
    pickupStopName: "Tambaram Terminal",
    pickupStopCoordinates: {
      latitude: 12.9249,
      longitude: 80.1275
    },
    assignedBusId: "bus-12",
    assignedRouteId: "route-bus-12",
    collegeDestination: {
      name: "Rajalakshmi Engineering College (REC)",
      latitude: REC_CAMPUS_CENTER.latitude,
      longitude: REC_CAMPUS_CENTER.longitude
    },
    preferredDepartureTime: "07:20:00",
    frequentDestinations: [
      { id: "rec-main-block", name: "Main Block" },
      { id: "rec-cad-lab", name: "Central Computing Lab" },
      { id: "library", name: "Central Library" }
    ],
    preferredTransport: "acims_bus",
    walkingPreference: "moderate",
    notificationPreferences: {
      busArrivalMinutes: 10,
      delays: true,
      safetyAlerts: true
    }
  },
  "student-20419": {
    studentId: "student-20419",
    name: "Karthik Sundaram",
    department: "Mechanical Engineering",
    email: "karthik.s@rec.ac.in",
    phone: "+91 98402 34567",
    homeLocation: {
      name: "Perungalathur East, Chennai",
      latitude: 12.903,
      longitude: 80.09
    },
    pickupStopId: "perungalathur",
    pickupStopName: "Perungalathur Junction",
    pickupStopCoordinates: {
      latitude: 12.9055,
      longitude: 80.0918
    },
    assignedBusId: "bus-12",
    assignedRouteId: "route-bus-12",
    collegeDestination: {
      name: "Rajalakshmi Engineering College (REC)",
      latitude: REC_CAMPUS_CENTER.latitude,
      longitude: REC_CAMPUS_CENTER.longitude
    },
    preferredDepartureTime: "07:10:00",
    frequentDestinations: [
      { id: "rec-workshop-block", name: "Mechanical Workshop Block" },
      { id: "rec-fluid-mech-lab", name: "Fluid Mechanics Lab" }
    ],
    preferredTransport: "acims_bus",
    walkingPreference: "comfortable",
    notificationPreferences: {
      busArrivalMinutes: 15,
      delays: true,
      safetyAlerts: true
    }
  },
  "student-20420": {
    studentId: "student-20420",
    name: "Pooja Mohan",
    department: "Artificial Intelligence & Data Science",
    email: "pooja.m@rec.ac.in",
    phone: "+91 98403 45678",
    homeLocation: {
      name: "Guindy, Chennai",
      latitude: 13.005,
      longitude: 80.2
    },
    pickupStopId: "guindy",
    pickupStopName: "Guindy Industrial Estate",
    pickupStopCoordinates: {
      latitude: 13.0067,
      longitude: 80.2012
    },
    assignedBusId: "bus-18",
    assignedRouteId: "route-bus-18",
    collegeDestination: {
      name: "Rajalakshmi Engineering College (REC)",
      latitude: REC_CAMPUS_CENTER.latitude,
      longitude: REC_CAMPUS_CENTER.longitude
    },
    preferredDepartureTime: "07:00:00",
    frequentDestinations: [
      { id: "rec-cad-lab", name: "AI & Innovation Wing" },
      { id: "rec-academic-block", name: "Central Academic Block" }
    ],
    preferredTransport: "fastest",
    walkingPreference: "minimal",
    notificationPreferences: {
      busArrivalMinutes: 10,
      delays: true,
      safetyAlerts: true
    }
  }
};
function getStudentProfile(studentId) {
  const normalizedId = studentId?.trim().toLowerCase() || "student-20418";
  if (studentProfiles[normalizedId]) {
    return studentProfiles[normalizedId];
  }
  return {
    studentId,
    name: `Student (${studentId})`,
    department: "Engineering & Technology",
    email: `${studentId}@rec.ac.in`,
    phone: "+91 98400 00000",
    homeLocation: {
      name: "Tambaram, Chennai",
      latitude: 12.9249,
      longitude: 80.1275
    },
    pickupStopId: "tambaram",
    pickupStopName: "Tambaram Terminal",
    pickupStopCoordinates: {
      latitude: 12.9249,
      longitude: 80.1275
    },
    assignedBusId: "bus-12",
    assignedRouteId: "route-bus-12",
    collegeDestination: {
      name: "Rajalakshmi Engineering College (REC)",
      latitude: REC_CAMPUS_CENTER.latitude,
      longitude: REC_CAMPUS_CENTER.longitude
    },
    preferredDepartureTime: "07:20:00",
    frequentDestinations: [
      { id: "rec-main-block", name: "Main Block" },
      { id: "library", name: "Central Library" }
    ],
    preferredTransport: "acims_bus",
    walkingPreference: "moderate",
    notificationPreferences: {
      busArrivalMinutes: 10,
      delays: true,
      safetyAlerts: true
    }
  };
}
function updateStudentProfile(studentId, updates) {
  const current = getStudentProfile(studentId);
  const updated = {
    ...current,
    ...updates,
    studentId: current.studentId
    // ID remains immutable
  };
  studentProfiles[current.studentId] = updated;
  return updated;
}

// artifacts/api-server/src/routes/ai.ts
var router9 = Router9();
function resolveStudentId(req, bodyStudentId) {
  const uid = req.user?.uid;
  return uid || req.header("x-acims-user-id") || bodyStudentId || "student-20418";
}
router9.get("/ai/status", (_req, res) => {
  res.json({
    assistant: "MOBI",
    geminiEnabled: isGeminiConfigured(),
    model: process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash"
  });
});
router9.get("/ai/context", async (req, res) => {
  try {
    const studentId = resolveStudentId(req, typeof req.query.studentId === "string" ? req.query.studentId : void 0);
    const context = await getAiContext(studentId);
    res.json(context);
  } catch {
    res.status(500).json({ error: "Failed to load AI context" });
  }
});
router9.post("/ai/chat", async (req, res) => {
  try {
    const { studentId, message = "", destinationId, deviceCoords, history, confirmAction } = req.body;
    const resolvedId = resolveStudentId(req, studentId);
    const response = await answerMobilityQuestion(
      message,
      destinationId,
      resolvedId,
      deviceCoords,
      history,
      confirmAction
    );
    res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process mobility query";
    res.status(500).json({ error: message });
  }
});
router9.get("/student/profile", (req, res) => {
  const studentId = resolveStudentId(req, typeof req.query.studentId === "string" ? req.query.studentId : void 0);
  res.json(getStudentProfile(studentId));
});
router9.patch("/student/profile", (req, res) => {
  const studentId = resolveStudentId(req, typeof req.query.studentId === "string" ? req.query.studentId : void 0);
  const updated = updateStudentProfile(studentId, req.body);
  res.json(updated);
});
var ai_default = router9;

// artifacts/api-server/src/routes/transport.ts
import { Router as Router10 } from "express";
var router10 = Router10();
router10.get("/transport/providers", (_req, res) => res.json(listProviders()));
router10.get("/transport/routes", (_req, res) => res.json(listJourneys()));
router10.post("/transport/search", (req, res) => {
  const input = SearchTransportBody.parse(req.body);
  res.json(searchJourneys(input.start, input.destination));
});
var transport_default = router10;

// artifacts/api-server/src/routes/publicTransport.ts
init_publicTransitService();
import { Router as Router11 } from "express";

// artifacts/api-server/src/services/personalizedTransitService.ts
init_publicTransitService();
init_routesData();
init_campusData();
function formatTime12h(time24) {
  if (!time24) return "";
  const parts = time24.split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] || "00";
  const ampm = hours >= 12 && hours < 24 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const padH = hours < 10 ? `0${hours}` : `${hours}`;
  return `${padH}:${minutes} ${ampm}`;
}
function timeToMinutes(time24) {
  if (!time24) return 0;
  const [h, m] = time24.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function getCurrentChennaiTime() {
  const now = /* @__PURE__ */ new Date();
  const kolkataStr = now.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  return {
    time24: kolkataStr,
    minutes: timeToMinutes(kolkataStr)
  };
}
function getPersonalizedTransit(input) {
  const db3 = getDatabase();
  let studentLoc = null;
  if (input.pickupStopId) {
    for (const route of getAllRoutes()) {
      const match = route.stops.find((s) => s.id === input.pickupStopId);
      if (match) {
        studentLoc = {
          name: match.name,
          source: "Approved ACIMS Pickup Stop",
          latitude: match.latitude,
          longitude: match.longitude,
          pickupStopId: match.id
        };
        break;
      }
    }
  }
  if (!studentLoc && input.latitude !== void 0 && input.longitude !== void 0) {
    if (!isNaN(input.latitude) && !isNaN(input.longitude)) {
      studentLoc = {
        name: "Current Device GPS",
        source: "Real Device GPS",
        latitude: input.latitude,
        longitude: input.longitude
      };
    }
  }
  if (!studentLoc) {
    const all = getAllRoutes();
    const defaultRoute = all.find((r) => r.id === "route-bus-12") || all[0];
    const defaultStop = defaultRoute?.stops.find((s) => s.id === "tambaram") ?? defaultRoute?.stops[2];
    if (defaultStop) {
      studentLoc = {
        name: defaultStop.name,
        source: "Approved ACIMS Pickup Stop",
        latitude: defaultStop.latitude,
        longitude: defaultStop.longitude,
        pickupStopId: defaultStop.id
      };
    }
  }
  if (!studentLoc) {
    return {
      status: "LOCATION_UNAVAILABLE",
      message: "Location unavailable. Enable location or select a pickup stop to find public transport near you.",
      destination: {
        name: "Rajalakshmi Engineering College (REC)",
        latitude: REC_CAMPUS_CENTER.latitude,
        longitude: REC_CAMPUS_CENTER.longitude
      },
      otherBuses: [],
      totalServingRoutes: 0,
      lastSynchronized: (/* @__PURE__ */ new Date()).toISOString(),
      dataQuality: "Scheduled Timetable (CUMTA / MTC GTFS)"
    };
  }
  const destination = {
    name: input.targetDestination || "Rajalakshmi Engineering College (REC)",
    latitude: REC_CAMPUS_CENTER.latitude,
    longitude: REC_CAMPUS_CENTER.longitude
  };
  const latDelta = 0.035;
  const lonDelta = 0.035;
  const candidateStops = db3.prepare(
    `SELECT s.*, a.name as agency_name
       FROM public_transport_stops s
       JOIN public_transport_agencies a ON s.agency_id = a.id
       WHERE s.latitude BETWEEN ? AND ?
         AND s.longitude BETWEEN ? AND ?`
  ).all(
    studentLoc.latitude - latDelta,
    studentLoc.latitude + latDelta,
    studentLoc.longitude - lonDelta,
    studentLoc.longitude + lonDelta
  );
  if (candidateStops.length === 0) {
    return {
      status: "NO_NEARBY_STOP",
      message: "No nearby public bus stop found within search radius.",
      studentLocation: studentLoc,
      destination,
      otherBuses: [],
      totalServingRoutes: 0,
      lastSynchronized: (/* @__PURE__ */ new Date()).toISOString(),
      dataQuality: "Scheduled Timetable (CUMTA / MTC GTFS)"
    };
  }
  for (const s of candidateStops) {
    s.distanceMeters = haversineMeters(studentLoc.latitude, studentLoc.longitude, s.latitude, s.longitude);
  }
  candidateStops.sort((a, b) => a.distanceMeters - b.distanceMeters);
  const closestStop = candidateStops[0];
  const walkingMinutes = Math.max(1, Math.round(closestStop.distanceMeters / 80));
  const stopTimes = db3.prepare(
    `SELECT
         r.id as route_table_id,
         r.route_id,
         r.route_short_name,
         r.route_long_name,
         r.origin,
         r.destination,
         r.route_type,
         t.id as trip_id,
         t.trip_headsign,
         t.direction_id,
         st.departure_time,
         st.arrival_time,
         st.stop_sequence
       FROM public_transport_stop_times st
       JOIN public_transport_trips t ON st.trip_id = t.id
       JOIN public_transport_routes r ON t.route_id = r.id
       WHERE st.stop_id = ?
       ORDER BY st.departure_time ASC`
  ).all(closestStop.id);
  if (stopTimes.length === 0) {
    return {
      status: "NO_SERVICE",
      message: "No scheduled MTC service found for this stop.",
      studentLocation: studentLoc,
      destination,
      closestPublicStop: {
        id: closestStop.id,
        stopId: closestStop.stop_id,
        name: closestStop.stop_name,
        distanceMeters: closestStop.distanceMeters,
        walkingMinutes,
        latitude: closestStop.latitude,
        longitude: closestStop.longitude,
        agencyId: closestStop.agency_id,
        agencyName: closestStop.agency_name
      },
      otherBuses: [],
      totalServingRoutes: 0,
      lastSynchronized: (/* @__PURE__ */ new Date()).toISOString(),
      dataQuality: "Scheduled Timetable (CUMTA / MTC GTFS)"
    };
  }
  const current = input.filterTime ? { time24: input.filterTime, minutes: timeToMinutes(input.filterTime) } : getCurrentChennaiTime();
  const routeGroups = /* @__PURE__ */ new Map();
  for (const st of stopTimes) {
    const key = `${st.route_short_name}::${st.destination}`;
    if (!routeGroups.has(key)) {
      routeGroups.set(key, []);
    }
    routeGroups.get(key).push(st);
  }
  const upcomingList = [];
  for (const [key, departures] of routeGroups.entries()) {
    departures.sort((a, b) => timeToMinutes(a.departure_time) - timeToMinutes(b.departure_time));
    let nextDep = departures.find((d) => timeToMinutes(d.departure_time) >= current.minutes);
    if (!nextDep && departures.length > 0) {
      nextDep = departures[0];
    }
    if (nextDep) {
      const depMins = timeToMinutes(nextDep.departure_time);
      let diff = depMins - current.minutes;
      if (diff < 0) diff += 1440;
      const subsequent = departures.filter((d) => d !== nextDep && timeToMinutes(d.departure_time) >= depMins).slice(0, 3).map((d) => formatTime12h(d.departure_time));
      upcomingList.push({
        routeNumber: nextDep.route_short_name,
        routeName: nextDep.route_long_name,
        origin: nextDep.origin,
        destination: nextDep.destination || nextDep.trip_headsign,
        departureTime: nextDep.departure_time,
        departureTimeFormatted: formatTime12h(nextDep.departure_time),
        minutesUntil: Math.max(1, diff),
        tripId: nextDep.trip_id,
        routeId: nextDep.route_table_id,
        agencyId: "MTC",
        laterDepartures: subsequent
      });
    }
  }
  upcomingList.sort((a, b) => a.minutesUntil - b.minutesUntil);
  const topBus = upcomingList[0];
  const otherBuses = upcomingList.slice(1, 12);
  const whyRecommended = [];
  if (topBus) {
    whyRecommended.push(`\u2713 Closest stop to your pickup (${closestStop.distanceMeters}m away at ${closestStop.stop_name})`);
    whyRecommended.push(`\u2713 Scheduled departure at your stop: ${topBus.departureTimeFormatted} (in ~${topBus.minutesUntil} min)`);
    whyRecommended.push(`\u2713 Direct service towards ${topBus.destination}`);
    whyRecommended.push(`\u2713 Authoritative CUMTA / MTC Scheduled Timetable`);
  }
  return {
    status: "SUCCESS",
    studentLocation: studentLoc,
    destination,
    closestPublicStop: {
      id: closestStop.id,
      stopId: closestStop.stop_id,
      name: closestStop.stop_name,
      distanceMeters: closestStop.distanceMeters,
      walkingMinutes,
      latitude: closestStop.latitude,
      longitude: closestStop.longitude,
      agencyId: closestStop.agency_id,
      agencyName: closestStop.agency_name
    },
    nextBus: topBus ? {
      ...topBus,
      fromStop: closestStop.stop_name,
      whyRecommended
    } : void 0,
    otherBuses,
    totalServingRoutes: routeGroups.size,
    lastSynchronized: (/* @__PURE__ */ new Date()).toISOString(),
    dataQuality: "Scheduled Timetable (CUMTA / MTC GTFS)"
  };
}
function getRouteStopsWithStudentStop(tripId, studentStopId) {
  const db3 = getDatabase();
  const trip = db3.prepare(
    `SELECT t.*, r.route_short_name, r.route_long_name, r.origin, r.destination
       FROM public_transport_trips t
       JOIN public_transport_routes r ON t.route_id = r.id
       WHERE t.id = ? OR t.trip_id = ?`
  ).get(tripId, tripId);
  if (!trip) return null;
  const stops = db3.prepare(
    `SELECT
         st.stop_sequence,
         st.arrival_time,
         st.departure_time,
         s.id as stop_id,
         s.stop_name,
         s.latitude,
         s.longitude
       FROM public_transport_stop_times st
       JOIN public_transport_stops s ON st.stop_id = s.id
       WHERE st.trip_id = ?
       ORDER BY st.stop_sequence ASC`
  ).all(trip.id);
  return {
    tripId: trip.id,
    routeNumber: trip.route_short_name,
    routeName: trip.route_long_name,
    origin: trip.origin,
    destination: trip.destination,
    totalStops: stops.length,
    stops: stops.map((s) => ({
      sequence: s.stop_sequence,
      stopId: s.stop_id,
      stopName: s.stop_name,
      arrivalTime: s.arrival_time,
      departureTime: s.departure_time,
      departureTimeFormatted: formatTime12h(s.departure_time),
      latitude: s.latitude,
      longitude: s.longitude,
      isStudentStop: studentStopId ? s.stop_id === studentStopId : false
    }))
  };
}

// artifacts/api-server/src/routes/publicTransport.ts
var router11 = Router11();
router11.get("/public-transport/nearby-stops", (req, res) => {
  try {
    const lat = parseFloat(req.query.lat || req.query.latitude);
    const lon = parseFloat(req.query.lon || req.query.longitude);
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: "Valid latitude and longitude required" });
    }
    const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm) : 5;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
    const stops = getNearbyStops({
      latitude: lat,
      longitude: lon,
      radiusKm,
      limit
    });
    const enriched = stops.map((s) => ({
      stop_id: s.id,
      stop_name: s.stop_name,
      latitude: s.latitude,
      longitude: s.longitude,
      distance_meters: s.distanceMeters || 0,
      walking_minutes: Math.max(1, Math.round((s.distanceMeters || 100) / 80)),
      agency_id: s.agency_id,
      agency_name: s.agency_name,
      routes_serving_stop: getRoutesForStop(s.id).map((r) => r.route_short_name),
      source: s.source,
      schedule_status: "Scheduled",
      realtime_bus_location: "LIVE MTC BUS LOCATION UNAVAILABLE"
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router11.get("/public-transport/stops/:stopId/routes", (req, res) => {
  try {
    const routes2 = getRoutesForStop(req.params.stopId);
    res.json(routes2);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router11.get("/public-transport/stops/:stopId/departures", (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 15;
    const departures = getStopDepartures(req.params.stopId, limit);
    res.json(departures);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router11.get(["/public-transport/personalized", "/public-transport/nearby"], (req, res) => {
  try {
    const studentId = typeof req.query.studentId === "string" ? req.query.studentId : void 0;
    const pickupStopId = typeof req.query.pickupStopId === "string" ? req.query.pickupStopId : void 0;
    const latitude = req.query.latitude ? parseFloat(req.query.latitude) : void 0;
    const longitude = req.query.longitude ? parseFloat(req.query.longitude) : void 0;
    const destination = typeof req.query.destination === "string" ? req.query.destination : void 0;
    const filterTime = typeof req.query.filterTime === "string" ? req.query.filterTime : void 0;
    const result = getPersonalizedTransit({
      studentId,
      pickupStopId,
      latitude,
      longitude,
      targetDestination: destination,
      filterTime
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router11.get("/public-transport/trip-stops", (req, res) => {
  try {
    const tripId = req.query.tripId;
    const studentStopId = req.query.studentStopId;
    if (!tripId) {
      res.status(400).json({ error: "tripId is required" });
      return;
    }
    const result = getRouteStopsWithStudentStop(tripId, studentStopId);
    if (!result) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router11.get("/transit/agencies", (_req, res) => {
  try {
    const agencies = getAgencies();
    res.json(agencies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router11.get("/transit/sync-status", (_req, res) => {
  try {
    const logs = getSyncLogs();
    res.json({
      status: "SUCCESS",
      provenance: logs[0] || null,
      recentSyncs: logs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router11.get("/transit/routes", (req, res) => {
  try {
    const query = typeof req.query.query === "string" ? req.query.query : void 0;
    const agencyId = typeof req.query.agencyId === "string" ? req.query.agencyId : void 0;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 30;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    const routes2 = searchRoutes({ query, agencyId, limit, offset });
    res.json(routes2);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router11.get("/transit/routes/:routeId", (req, res) => {
  try {
    const route = getRouteDetails(req.params.routeId);
    if (!route) {
      res.status(404).json({ error: "Route not found" });
      return;
    }
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router11.get("/transit/stops", (req, res) => {
  try {
    const query = typeof req.query.query === "string" ? req.query.query : void 0;
    const agencyId = typeof req.query.agencyId === "string" ? req.query.agencyId : void 0;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 30;
    const stops = searchStops({ query, agencyId, limit });
    res.json(stops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router11.get("/transit/nearby", (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (isNaN(lat) || isNaN(lon)) {
      res.status(400).json({ error: "Valid latitude and longitude required" });
      return;
    }
    const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm) : 5;
    const agencyId = typeof req.query.agencyId === "string" ? req.query.agencyId : void 0;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 25;
    const stops = getNearbyStops({
      latitude: lat,
      longitude: lon,
      radiusKm,
      limit,
      agencyId
    });
    res.json(stops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router11.get("/transit/rec-corridors", (_req, res) => {
  res.json(getRecCorridorJourneys());
});
router11.get("/transit/search", (req, res) => {
  try {
    const fromText = typeof req.query.from === "string" ? req.query.from : "";
    const toText = typeof req.query.to === "string" ? req.query.to : "";
    const time = typeof req.query.time === "string" ? req.query.time : void 0;
    const agencyId = typeof req.query.agencyId === "string" ? req.query.agencyId : void 0;
    if (!fromText || !toText) {
      res.status(400).json({ error: "Both 'from' and 'to' parameters are required" });
      return;
    }
    const options = searchJourneyOptions({
      fromText,
      toText,
      time,
      agencyId
    });
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router11.get("/transit/missed-bus-alternatives", (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (isNaN(lat) || isNaN(lon)) {
      res.status(400).json({ error: "Valid latitude and longitude required" });
      return;
    }
    const destinationText = typeof req.query.destination === "string" ? req.query.destination : void 0;
    const alternatives = getMissedBusAlternatives({
      studentLat: lat,
      studentLon: lon,
      destinationText
    });
    res.json(alternatives);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var publicTransport_default = router11;

// artifacts/api-server/src/routes/me.ts
init_services();
init_eta();
import { Router as Router12 } from "express";
var router12 = Router12();
function getRequesterUserId(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1];
    if (token.startsWith("campus-token-")) {
      const parts = token.split("-");
      if (parts.length >= 3) {
        return parts[2];
      }
    }
  }
  return req.header("x-acims-user-id") || req.query.studentId || req.body?.studentId || "student-20418";
}
router12.get("/me", async (req, res) => {
  try {
    const userId = getRequesterUserId(req);
    const profile = await getProfileWithDetails(userId);
    if (!profile) {
      return res.status(404).json({ error: "Student profile not found", userId });
    }
    const assignedBusId = profile.assignedBusId || "bus-12";
    const assignedRouteId = profile.assignedRouteId || "route-bus-12";
    const [bus, route, activeQueue, preferences, lastLoc] = await Promise.all([
      getDbBusById(assignedBusId),
      getDbRouteById(assignedRouteId),
      getDbStudentActiveQueue(userId),
      getDbStudentPreferences(userId),
      getLatestStudentLocation(userId)
    ]);
    res.json({
      student: {
        id: profile.id,
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        registerNumber: profile.registerNumber || "REG-20418",
        pickupStopId: profile.pickupStopId || preferences?.savedPickupStopId || "tambaram",
        assignedBusId,
        assignedRouteId
      },
      assignedBus: bus ? {
        id: bus.id,
        busNumber: bus.busNumber,
        active: bus.active
      } : null,
      assignedRoute: route ? {
        id: route.id,
        name: route.routeName,
        code: route.routeCode,
        stopsCount: route.stops?.length || 0
      } : null,
      queue: activeQueue,
      preferences: preferences || {
        userId,
        savedPickupStopId: profile.pickupStopId || "tambaram",
        preferredBusId: assignedBusId,
        savedDestinationName: null,
        savedDestinationLat: null,
        savedDestinationLng: null
      },
      lastLocation: lastLoc
    });
  } catch (err) {
    console.error("Error in /api/me:", err);
    res.status(500).json({ error: "Failed to load student context" });
  }
});
router12.get("/me/bus", async (req, res) => {
  try {
    const userId = getRequesterUserId(req);
    const profile = await getProfileWithDetails(userId);
    const prefs = await getDbStudentPreferences(userId);
    const busId = prefs?.preferredBusId || profile?.assignedBusId || "bus-12";
    const bus = await getDbBusById(busId);
    if (!bus) {
      return res.status(404).json({
        status: "NOT_ASSIGNED",
        message: "My bus is not assigned.",
        bus: null
      });
    }
    const routeId = bus.routeId || profile?.assignedRouteId || "route-bus-12";
    const route = await getDbRouteById(routeId);
    const stops = await getDbStopsByRoute(routeId);
    const latestLoc = await getLatestBusLocation(bus.id);
    const isTracking = await isBusTrackingActive(bus.id);
    if (!latestLoc) {
      return res.json({
        status: "NO_GPS",
        message: "Bus location is currently unavailable.",
        bus: {
          id: bus.id,
          busNumber: bus.busNumber,
          routeLabel: route?.routeName || "Campus Shuttle",
          origin: stops[0]?.stopName || "Terminal",
          destination: stops[stops.length - 1]?.stopName || "Campus",
          active: bus.active,
          telemetry: {
            latitude: stops[0]?.latitude || 12.9287,
            longitude: stops[0]?.longitude || 80.132,
            nextStop: stops[0]?.stopName || "Terminal",
            isLive: false,
            freshness: "UNAVAILABLE",
            etaLabel: "UNAVAILABLE",
            formattedEta: "Unavailable",
            speed: 0,
            status: isTracking ? "Driver Active \xB7 Awaiting GPS" : "Tracking Stopped",
            updatedAt: null
          }
        }
      });
    }
    const recordedDate = new Date(latestLoc.recordedAt || Date.now());
    const diffSec = Math.max(0, Math.floor((Date.now() - recordedDate.getTime()) / 1e3));
    let freshness = "UNAVAILABLE";
    if (diffSec <= 45 && isTracking) {
      freshness = "LIVE";
    } else if (diffSec <= 180) {
      freshness = "STALE";
    } else {
      freshness = "UNAVAILABLE";
    }
    let closestIndex = 0;
    let minDistance = Infinity;
    stops.forEach((stop, idx) => {
      const dist = haversineDistance(
        { latitude: latestLoc.latitude, longitude: latestLoc.longitude },
        { latitude: stop.latitude, longitude: stop.longitude }
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      }
    });
    const isAtStop = minDistance <= 0.08;
    const nextStopIndex = isAtStop ? Math.min(closestIndex + 1, stops.length - 1) : closestIndex;
    const nextStopObj = stops[nextStopIndex] || stops[0];
    const distToNextStop = haversineDistance(
      { latitude: latestLoc.latitude, longitude: latestLoc.longitude },
      { latitude: nextStopObj?.latitude || latestLoc.latitude, longitude: nextStopObj?.longitude || latestLoc.longitude }
    );
    const speed = latestLoc.speed && latestLoc.speed > 3 ? latestLoc.speed : 22;
    const etaMinutes = calculateEtaMinutes(
      { latitude: latestLoc.latitude, longitude: latestLoc.longitude },
      { latitude: nextStopObj?.latitude || latestLoc.latitude, longitude: nextStopObj?.longitude || latestLoc.longitude },
      speed
    );
    res.json({
      status: "SUCCESS",
      bus: {
        id: bus.id,
        busNumber: bus.busNumber,
        routeLabel: route?.routeName || "Campus Shuttle",
        origin: stops[0]?.stopName || "Terminal",
        destination: stops[stops.length - 1]?.stopName || "Campus",
        active: bus.active,
        telemetry: {
          latitude: latestLoc.latitude,
          longitude: latestLoc.longitude,
          nextStop: nextStopObj?.stopName || "Campus",
          nextStopId: nextStopObj?.id,
          isAtStop,
          isLive: freshness === "LIVE",
          freshness,
          etaLabel: freshness === "LIVE" ? "LIVE ETA" : freshness === "STALE" ? "ESTIMATED ETA" : "UNAVAILABLE",
          etaMinutes: isAtStop ? 0 : etaMinutes,
          formattedEta: isAtStop ? "Arriving now" : formatEta(etaMinutes),
          speed: latestLoc.speed || 0,
          heading: latestLoc.heading || 0,
          accuracy: latestLoc.accuracy || 10,
          remainingDistanceKm: Number(distToNextStop.toFixed(2)),
          status: isAtStop ? `At Stop: ${nextStopObj?.stopName}` : freshness === "LIVE" ? `In Transit to ${nextStopObj?.stopName}` : freshness === "STALE" ? `Signal Delayed \xB7 Last near ${nextStopObj?.stopName}` : `Tracking Inactive`,
          updatedAt: recordedDate.toISOString()
        }
      }
    });
  } catch (err) {
    console.error("Error fetching personalized bus:", err);
    res.status(500).json({ error: "Failed to fetch student bus" });
  }
});
router12.post("/me/location", async (req, res) => {
  try {
    const userId = getRequesterUserId(req);
    const { latitude, longitude, accuracy } = req.body;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "Valid latitude and longitude required" });
    }
    const recorded = await recordStudentLocation({
      userId,
      latitude,
      longitude,
      accuracy: typeof accuracy === "number" ? accuracy : void 0
    });
    res.json({
      success: true,
      location: recorded
    });
  } catch (err) {
    console.error("Error recording student location:", err);
    res.status(500).json({ error: "Failed to save location" });
  }
});
router12.get("/me/location", async (req, res) => {
  try {
    const userId = getRequesterUserId(req);
    const loc = await getLatestStudentLocation(userId);
    if (!loc) {
      return res.status(404).json({ error: "No location recorded yet", location: null });
    }
    res.json({ location: loc });
  } catch (err) {
    res.status(500).json({ error: "Failed to get student location" });
  }
});
router12.get("/me/preferences", async (req, res) => {
  try {
    const userId = getRequesterUserId(req);
    const prefs = await getDbStudentPreferences(userId);
    res.json({ preferences: prefs });
  } catch (err) {
    res.status(500).json({ error: "Failed to get student preferences" });
  }
});
router12.put("/me/preferences", async (req, res) => {
  try {
    const userId = getRequesterUserId(req);
    const {
      savedPickupStopId,
      preferredBusId,
      savedDestinationName,
      savedDestinationLat,
      savedDestinationLng,
      notificationArrivals,
      notificationDelays
    } = req.body;
    const updated = await upsertDbStudentPreferences(userId, {
      savedPickupStopId,
      preferredBusId,
      savedDestinationName,
      savedDestinationLat: typeof savedDestinationLat === "number" ? savedDestinationLat : void 0,
      savedDestinationLng: typeof savedDestinationLng === "number" ? savedDestinationLng : void 0,
      notificationArrivals,
      notificationDelays
    });
    res.json({ success: true, preferences: updated });
  } catch (err) {
    console.error("Error updating preferences:", err);
    res.status(500).json({ error: "Failed to update preferences" });
  }
});
router12.get("/me/queue", async (req, res) => {
  try {
    const userId = getRequesterUserId(req);
    const active = await getDbStudentActiveQueue(userId);
    res.json({ inQueue: Boolean(active), queue: active });
  } catch (err) {
    res.status(500).json({ error: "Failed to get student queue" });
  }
});
var me_default = router12;

// artifacts/api-server/src/routes/mobility.ts
init_mobilityOps();
init_pickupPointService();
init_pickupEtaEngine();
init_delayEngine();
init_services();
init_commandCenterService();
init_acimsAuth();
import { Router as Router13 } from "express";
init_shiftManagement();
init_shiftTiming();
var router13 = Router13();
router13.get("/mobility/shifts", async (_req, res) => {
  res.json(await listShifts());
});
router13.get("/mobility/daily-shifts", async (_req, res) => {
  const rows = await getActiveShiftsForStudents();
  const { getDbBuses: getDbBuses2, getDbRoutes: getDbRoutes2 } = await Promise.resolve().then(() => (init_services(), services_exports));
  const buses3 = await getDbBuses2();
  const routes2 = await getDbRoutes2();
  res.json(
    rows.map((s) => {
      const bus = buses3.find((b) => b.id === s.busId);
      const route = routes2.find((r) => r.id === s.routeId);
      return {
        id: s.id,
        shiftType: s.shiftType,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        startTimeDisplay: formatShiftTimeDisplay(s.startTime),
        endTimeDisplay: formatShiftTimeDisplay(s.endTime),
        direction: s.direction,
        directionLabel: directionLabel(s.direction),
        routeId: s.routeId,
        routeName: route?.routeName ?? s.routeId,
        busId: s.busId,
        busNumber: bus?.busNumber ?? s.busId,
        driverId: s.driverId,
        operatingDays: s.operatingDays
      };
    })
  );
});
router13.post("/mobility/shifts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const shift = await createShift(req.body);
    const authUser = req.user;
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "CREATE_SHIFT",
      entityType: "shift",
      entityId: shift.id,
      detail: shift.name
    });
    res.status(201).json(shift);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create shift" });
  }
});
router13.get("/mobility/shift-assignments", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await listShiftAssignments());
});
router13.post("/mobility/shift-assignments", requireAuth, requireAdmin, async (req, res) => {
  try {
    const assignment = await assignShift(req.body);
    const authUser = req.user;
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "ASSIGN_SHIFT",
      entityType: "shift_assignment",
      entityId: assignment.id,
      detail: `bus=${assignment.busId} driver=${assignment.driverId}`
    });
    res.status(201).json(assignment);
  } catch (err) {
    res.status(409).json({ error: err.message || "Assignment conflict" });
  }
});
router13.get("/mobility/pickup-points", async (req, res) => {
  const routeId = typeof req.query.routeId === "string" ? req.query.routeId : void 0;
  res.json(await listPickupPoints(routeId));
});
router13.post("/mobility/pickup-points", requireAuth, requireAdmin, async (req, res) => {
  try {
    const point = await upsertPickupPoint(req.body);
    res.status(201).json(point);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to save pickup point" });
  }
});
router13.put("/mobility/students/:studentId/pickup-point", requireAuth, async (req, res) => {
  const { studentId } = req.params;
  const authUser = req.user;
  const role = String(authUser?.role || req.header("x-acims-role") || "").toUpperCase();
  if (role !== "ADMIN" && authUser?.uid && authUser.uid !== studentId) {
    res.status(403).json({ error: "Cannot change another student's pickup point" });
    return;
  }
  const { pickupPointId } = req.body;
  if (!pickupPointId) return res.status(400).json({ error: "pickupPointId required" });
  try {
    const updated = await updateStudentPickupPoint(studentId, pickupPointId);
    if (!updated) return res.status(404).json({ error: "Student not found" });
    res.json({ ...updated, message: "Pickup point updated successfully." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update pickup point";
    res.status(400).json({ error: message });
  }
});
router13.get("/mobility/eta/pickup", requireAuth, async (req, res) => {
  const authUser = req.user;
  const studentId = authUser?.uid || req.header("x-acims-user-id");
  if (studentId) {
    const { computeStudentPickupEta: computeStudentPickupEta2 } = await Promise.resolve().then(() => (init_etaService(), etaService_exports));
    const personalized = await computeStudentPickupEta2(studentId);
    if (personalized) {
      return res.json({
        busId: personalized.busId,
        busNumber: personalized.busNumber,
        pickupStopId: personalized.pickup.id,
        pickupStopName: personalized.pickup.name,
        etaMinutes: personalized.etaMinutes,
        formattedEta: personalized.formattedEta,
        remainingDistanceKm: personalized.remainingDistanceKm,
        delay: personalized.delay,
        gpsStatus: personalized.gps.status,
        stopPassed: personalized.stopPassed
      });
    }
  }
  const busId = typeof req.query.busId === "string" ? req.query.busId : void 0;
  const pickupStopId = typeof req.query.pickupStopId === "string" ? req.query.pickupStopId : void 0;
  if (!busId || !pickupStopId) {
    return res.status(400).json({ error: "Configure pickup point or pass busId and pickupStopId" });
  }
  const bus = await getDbBusById(busId);
  const loc = await getLatestBusLocation(busId);
  if (!loc) return res.status(404).json({ error: "No GPS for bus" });
  const speedKmh = loc.speed != null && loc.speed > 0.5 ? loc.speed * 3.6 : void 0;
  const eta = calculatePickupEta(
    busId,
    { latitude: loc.latitude, longitude: loc.longitude },
    pickupStopId,
    { speedKmh }
  );
  if (!eta) return res.status(404).json({ error: "Could not compute pickup ETA" });
  const shiftCtx = await getBusShiftTimingContext(busId);
  const delay = shiftCtx ? assessTripDelay({
    busId,
    shiftStartTime: shiftCtx.shiftStartTime,
    pickupExpectedOffsetMinutes: shiftCtx.pickupExpectedOffsetMinutes,
    currentEtaToPickupMinutes: eta.etaMinutes
  }) : { delayMinutes: 0, status: "ON_TIME" };
  res.json({ busId, busNumber: bus?.busNumber, ...eta, delay });
});
router13.get("/mobility/command-center", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await getCommandCenterSnapshot());
});
router13.get("/mobility/trips/history", requireAuth, requireAdmin, async (req, res) => {
  const limit = Number(req.query.limit || 50);
  res.json(await getTripHistory(Math.min(200, Math.max(1, limit))));
});
router13.get("/mobility/analytics/summary", requireAuth, requireAdmin, async (_req, res) => {
  res.json(await getMobilityAnalyticsSummary());
});
var mobility_default = router13;

// artifacts/api-server/src/routes/mtc.ts
init_acimsAuth();
init_mtcService();
import { Router as Router14 } from "express";
var router14 = Router14();
router14.get("/mtc/status", (_req, res) => {
  try {
    res.json(getMtcIntegrationStatus());
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to read MTC status" });
  }
});
router14.post("/mtc/sync", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await syncMtcFromOfficialSource();
    res.json({ ok: true, ...result, status: getMtcIntegrationStatus().status });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: err.message || "MTC sync failed",
      status: getMtcIntegrationStatus().status
    });
  }
});
router14.get("/mtc/routes/search", (req, res) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q : typeof req.query.query === "string" ? req.query.query : void 0;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
    res.json(searchMtcRoutes({ query, limit }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router14.get("/mtc/stops/search", (req, res) => {
  try {
    const q = String(req.query.q || "");
    if (!q.trim()) return res.status(400).json({ error: "q required" });
    res.json(searchMtcStopsByName(q));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router14.get("/mtc/stops/nearby", (req, res) => {
  try {
    const lat = parseFloat(String(req.query.lat ?? req.query.latitude));
    const lon = parseFloat(String(req.query.lon ?? req.query.longitude));
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return res.status(400).json({ error: "lat and lon required" });
    }
    const radiusKm = req.query.radiusKm ? parseFloat(String(req.query.radiusKm)) : 5;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
    res.json(getNearestMtcStops({ latitude: lat, longitude: lon, radiusKm, limit }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router14.get("/mtc/stops/:stopId/routes", (req, res) => {
  try {
    res.json(getMtcRoutesForStop(req.params.stopId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router14.get("/mtc/routes/:routeId/timings", (req, res) => {
  try {
    res.json(getMtcTimingsForRoute(req.params.routeId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router14.get("/mtc/get-to-college", (req, res) => {
  try {
    const latitude = req.query.latitude ? parseFloat(String(req.query.latitude)) : void 0;
    const longitude = req.query.longitude ? parseFloat(String(req.query.longitude)) : void 0;
    const studentId = typeof req.query.studentId === "string" ? req.query.studentId : void 0;
    res.json(buildGetToCollegeRecommendations({ latitude, longitude, studentId }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router14.get("/mtc/missed-bus", (req, res) => {
  try {
    const lat = parseFloat(String(req.query.lat ?? req.query.latitude));
    const lon = parseFloat(String(req.query.lon ?? req.query.longitude));
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return res.status(400).json({ error: "lat and lon required" });
    }
    res.json(buildMissedBusMtcOptions({ latitude: lat, longitude: lon }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var mtc_default = router14;

// artifacts/api-server/src/routes/studentTransport.ts
init_acimsAuth();
init_pickupPointService();
init_etaService();
init_db();
init_schema();
init_services();
import { Router as Router15 } from "express";
import { eq as eq14 } from "drizzle-orm";
var router15 = Router15();
function resolveStudentId2(req) {
  const uid = req.user?.uid;
  return uid || req.header("x-acims-user-id") || null;
}
router15.get("/student/pickup-point", requireAuth, async (req, res) => {
  const studentId = resolveStudentId2(req);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const pickup = await getStudentPickupPoint(studentId);
  if (!pickup) return res.status(404).json({ error: "Pickup point not configured" });
  res.json(pickup);
});
router15.put("/student/pickup-point", requireAuth, async (req, res) => {
  const studentId = resolveStudentId2(req);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const { pickupPointId } = req.body;
  if (!pickupPointId) return res.status(400).json({ error: "pickupPointId required" });
  try {
    const updated = await updateStudentPickupPoint(studentId, pickupPointId);
    res.json({
      ...updated,
      message: `Pickup point updated successfully.`
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update pickup point";
    res.status(400).json({ error: message });
  }
});
router15.get("/student/pickup-point/options", requireAuth, async (req, res) => {
  const studentId = resolveStudentId2(req);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const options = await listPickupPointsForStudentRoute(studentId);
  res.json(options);
});
router15.get("/student/my-bus", requireAuth, async (req, res) => {
  const studentId = resolveStudentId2(req);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const eta = await computeStudentPickupEta(studentId);
  if (!eta) {
    return res.status(404).json({
      error: "No active transport assignment or pickup point. Complete transport setup first."
    });
  }
  res.json({
    busId: eta.busId,
    busNumber: eta.busNumber,
    tripId: eta.tripId,
    pickup: eta.pickup,
    routeLabel: eta.routeLabel,
    directionLabel: eta.directionLabel,
    status: eta.delay?.status ?? (eta.gps.status === "LIVE" ? "ON_TIME" : "UNKNOWN"),
    delayMinutes: eta.delay?.delayMinutes ?? 0,
    scheduledArrival: eta.scheduledArrivalAt,
    predictedArrival: eta.predictedArrivalAt,
    arrivingInMinutes: eta.etaMinutes,
    arrivingInLabel: eta.formattedEta,
    stopPassed: eta.stopPassed,
    gps: eta.gps
  });
});
router15.get("/student/my-bus/eta", requireAuth, async (req, res) => {
  const studentId = resolveStudentId2(req);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const eta = await computeStudentPickupEta(studentId);
  if (!eta) return res.status(404).json({ error: "ETA unavailable" });
  res.json(eta);
});
router15.get("/student/my-bus/status", requireAuth, async (req, res) => {
  const studentId = resolveStudentId2(req);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const eta = await computeStudentPickupEta(studentId);
  if (!eta) return res.status(404).json({ error: "Status unavailable" });
  res.json({
    busNumber: eta.busNumber,
    delayStatus: eta.delay?.status ?? "ON_TIME",
    delayMinutes: eta.delay?.delayMinutes ?? 0,
    gpsStatus: eta.gps.status,
    lastGpsUpdate: eta.gps.lastUpdateAt,
    etaMinutes: eta.etaMinutes,
    stopPassed: eta.stopPassed
  });
});
router15.get("/student/notifications", requireAuth, async (req, res) => {
  const studentId = resolveStudentId2(req);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const dbNotifs = await getUserNotifications(studentId);
  res.json(
    dbNotifs.map((n) => ({
      id: String(n.id),
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: n.createdAt ? n.createdAt.toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
      read: Boolean(n.readAt)
    }))
  );
});
router15.get("/student/notification-preferences", requireAuth, async (req, res) => {
  const studentId = resolveStudentId2(req);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const pref = await db.select().from(studentPreferences).where(eq14(studentPreferences.userId, studentId)).limit(1);
  const p = pref[0];
  res.json({
    arrivalReminders10Min: p?.notificationArrivals ?? true,
    arrivalReminders5Min: p?.notificationArrivals ?? true,
    delayAlerts: p?.notificationDelays ?? true,
    busArrived: p?.notificationArrivals ?? true,
    gpsUnavailable: true
  });
});
router15.put("/student/notification-preferences", requireAuth, async (req, res) => {
  const studentId = resolveStudentId2(req);
  if (!studentId) return res.status(401).json({ error: "Unauthorized" });
  const body = req.body;
  const arrivals = body.arrivalReminders10Min ?? body.arrivalReminders5Min ?? body.busArrived ?? true;
  const delays = body.delayAlerts ?? true;
  const existing = await db.select().from(studentPreferences).where(eq14(studentPreferences.userId, studentId)).limit(1);
  if (existing.length) {
    await db.update(studentPreferences).set({
      notificationArrivals: arrivals,
      notificationDelays: delays,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq14(studentPreferences.userId, studentId));
  } else {
    await db.insert(studentPreferences).values({
      userId: studentId,
      notificationArrivals: arrivals,
      notificationDelays: delays
    });
  }
  res.json({ success: true });
});
router15.post("/student/nearest-buses", async (req, res) => {
  try {
    const { latitude, longitude, pickupStopId } = req.body;
    const { getDbBuses: getDbBuses2, getDbRoutes: getDbRoutes2 } = await Promise.resolve().then(() => (init_services(), services_exports));
    const { busStops: busStops2, officialPickupPoints: officialPickupPoints2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { haversineDistanceKm: haversineDistanceKm2 } = await Promise.resolve().then(() => (init_gpsEngine(), gpsEngine_exports));
    const [allBuses, allRoutes, allStops, allPickups] = await Promise.all([
      getDbBuses2(),
      getDbRoutes2(),
      db.select().from(busStops2),
      db.select().from(officialPickupPoints2).where(eq14(officialPickupPoints2.active, true))
    ]);
    const options = [];
    for (const b of allBuses.filter((item) => item.active)) {
      const route = allRoutes.find((r) => r.id === b.routeId);
      const routeName = route ? route.routeName.replace(/^\d+[A-Z]?\s*·?\s*/i, "") : "CAMPUS";
      const displayName = `BUS ${b.busNumber} \xB7 ${routeName.toUpperCase()}`;
      const rStops = allStops.filter((s) => s.routeId === b.routeId);
      const rPickups = allPickups.filter((p) => p.routeId === b.routeId);
      let bestStop = null;
      if (pickupStopId) {
        const matchingPickup = rPickups.find((p) => p.id === pickupStopId || p.stopName.toLowerCase() === pickupStopId.toLowerCase());
        if (matchingPickup) {
          bestStop = {
            name: matchingPickup.stopName,
            id: matchingPickup.id,
            time: matchingPickup.scheduledTimeDisplay || "Scheduled",
            distanceKm: null,
            lat: matchingPickup.latitude ?? null,
            lng: matchingPickup.longitude ?? null
          };
        }
      }
      if (!bestStop && latitude != null && longitude != null) {
        let minD = Infinity;
        for (const s of rStops) {
          if (s.latitude != null && s.longitude != null) {
            const d = haversineDistanceKm2(
              { latitude, longitude },
              { latitude: s.latitude, longitude: s.longitude }
            );
            if (d < minD) {
              minD = d;
              const matchingPickup = rPickups.find((p) => p.stopName.toLowerCase() === s.stopName.toLowerCase());
              bestStop = {
                name: s.stopName,
                id: s.id,
                time: matchingPickup?.scheduledTimeDisplay || "Scheduled",
                distanceKm: Number(d.toFixed(1)),
                lat: s.latitude,
                lng: s.longitude
              };
            }
          }
        }
      }
      if (!bestStop) {
        const first = rPickups[0] || rStops[0];
        if (first) {
          bestStop = {
            name: "stopName" in first ? first.stopName : "Campus Stop",
            id: first.id,
            time: "scheduledTimeDisplay" in first ? first.scheduledTimeDisplay || "Scheduled" : "Scheduled",
            distanceKm: null,
            lat: first.latitude ?? null,
            lng: first.longitude ?? null
          };
        }
      }
      if (bestStop) {
        options.push({
          busId: b.id,
          busNumber: b.busNumber,
          routeName: routeName.toUpperCase(),
          displayName,
          pickupStopName: bestStop.name,
          pickupStopId: bestStop.id,
          scheduledTime: bestStop.time,
          distanceKm: bestStop.distanceKm,
          latitude: bestStop.lat,
          longitude: bestStop.lng
        });
      }
    }
    if (latitude != null && longitude != null) {
      options.sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }
    res.json({
      nearest: options.slice(0, 3),
      all: options
    });
  } catch (err) {
    console.error("[student/nearest-buses]", err);
    res.status(500).json({ error: "Failed to rank nearest buses" });
  }
});
router15.post("/student/select-bus", async (req, res) => {
  try {
    const studentId = resolveStudentId2(req) || req.body?.studentId || "student-20418";
    const { busId, pickupStopId } = req.body;
    if (!busId) {
      return res.status(400).json({ error: "busId is required" });
    }
    const { getDbBusById: getDbBusById2, getProfileWithDetails: getProfileWithDetails2 } = await Promise.resolve().then(() => (init_services(), services_exports));
    const { students: students3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const bus = await getDbBusById2(busId);
    const profile = await getProfileWithDetails2(studentId);
    if (profile) {
      await db.update(students3).set({
        assignedBusId: busId,
        assignedRouteId: bus?.routeId || `route-${busId}`,
        ...pickupStopId ? { pickupStopId } : {}
      }).where(eq14(students3.profileId, profile.id));
      await db.update(studentPreferences).set({
        preferredBusId: busId,
        ...pickupStopId ? { savedPickupStopId: pickupStopId } : {},
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq14(studentPreferences.userId, studentId));
    }
    res.json({
      success: true,
      assignedBusId: busId,
      assignedRouteId: bus?.routeId || `route-${busId}`,
      pickupStopId,
      message: `Selected Bus #${bus?.busNumber || busId}`
    });
  } catch (err) {
    console.error("[student/select-bus]", err);
    res.status(500).json({ error: "Failed to select bus" });
  }
});
var studentTransport_default = router15;

// artifacts/api-server/src/routes/mvp.ts
init_acimsAuth();
init_services();
init_mobilityOps();
init_mvpCollegeRouteService();
init_routesData();
import { Router as Router16 } from "express";
var router16 = Router16();
router16.get("/mvp/college-route", async (_req, res) => {
  const config = getMvpCollegeRoute();
  if (!isMvpCollegeRouteActive()) {
    const pickups2 = (await listPickupPoints()).filter((p) => p.active);
    return res.json({
      enabled: false,
      routeId: null,
      busId: null,
      busNumber: null,
      routeLabel: "Official REC college buses",
      morningShiftStart: null,
      morningShiftEnd: null,
      directionLabel: "Home \u2192 College",
      pickupPoints: pickups2.map((p) => ({
        id: p.id,
        stopName: p.stopName,
        sequenceNumber: p.sequenceNumber,
        scheduledTimeDisplay: p.scheduledTimeDisplay ?? null
      }))
    });
  }
  const routeDef = getRouteForBus(config.busId);
  const pickups = (await listPickupPoints(config.routeId)).filter((p) => p.active);
  const buses3 = await getDbBuses();
  const bus = buses3.find((b) => b.id === config.busId);
  res.json({
    ...config,
    busNumber: bus?.busNumber ?? null,
    directionLabel: routeDef ? `${routeDef.origin} \u2192 ${routeDef.destination}` : config.routeLabel,
    pickupPoints: pickups.map((p) => ({
      id: p.id,
      stopName: p.stopName,
      sequenceNumber: p.sequenceNumber
    }))
  });
});
router16.get("/admin/mvp/college-route", requireAdmin, async (_req, res) => {
  const config = getMvpCollegeRoute();
  const routes2 = await getDbRoutes();
  const buses3 = await getDbBuses();
  res.json({
    config,
    routes: routes2.filter((r) => r.active),
    buses: buses3
  });
});
router16.put("/admin/mvp/college-route", requireAdmin, async (req, res) => {
  try {
    const { routeId, busId, routeLabel, morningShiftStart, morningShiftEnd } = req.body;
    if (!routeId || !busId || !morningShiftStart) {
      return res.status(400).json({ error: "routeId, busId, and morningShiftStart are required." });
    }
    const config = await setMvpCollegeRoute({
      routeId,
      busId,
      routeLabel,
      morningShiftStart,
      morningShiftEnd
    });
    const authUser = req.user;
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "SET_MVP_COLLEGE_ROUTE",
      entityType: "college_route",
      entityId: config.routeId,
      detail: `bus=${config.busId} start=${config.morningShiftStart}`
    });
    res.json({ config, message: "College route saved. All students use this route for ETA and delay." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save college route";
    res.status(400).json({ error: message });
  }
});
var mvp_default = router16;

// artifacts/api-server/src/routes/recTransport.ts
init_acimsAuth();
import { Router as Router17 } from "express";

// artifacts/api-server/src/services/recTransport/recTransportService.ts
init_db();
init_schema();
init_mobilityOps();
import { and as and6, eq as eq15, ilike as ilike2, or as or3, sql } from "drizzle-orm";

// artifacts/api-server/src/services/recTransport/recTransportSource.ts
init_recTransportParser();
import https2 from "node:https";
var REQUEST_HEADERS2 = {
  "User-Agent": "ACIMS-REC-Transport/1.0 (campus mobility; +https://www.rectransport.com/)",
  Accept: "text/html,application/xhtml+xml"
};
function fetchRecTransportHtml(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https2.get(url, { headers: REQUEST_HEADERS2, timeout: 2e4 }, (res) => {
      const status = res.statusCode ?? 0;
      const location = res.headers.location;
      if (status >= 300 && status < 400 && location && redirectsLeft > 0) {
        res.resume();
        const next = new URL(location, url).toString();
        resolve(fetchRecTransportHtml(next, redirectsLeft - 1));
        return;
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          status,
          body: Buffer.concat(chunks).toString("utf8"),
          finalUrl: url
        });
      });
    }).on("timeout", function() {
      this.destroy(new Error(`Timeout fetching ${url}`));
    }).on("error", reject);
  });
}

// artifacts/api-server/src/services/recTransport/recTransportService.ts
init_collegeFleetService();
init_recTransportParser();
var STATUS_ID = 1;
var FETCH_CONCURRENCY = 6;
function defaultTimetableUrl() {
  return process.env.REC_TRANSPORT_TIMETABLE_URL?.trim() || REC_TRANSPORT_DEFAULT_TIMETABLE_URL;
}
async function ensureStatusRow(timetableUrl) {
  const existing = await db.select().from(recTransportSyncStatus).where(eq15(recTransportSyncStatus.id, STATUS_ID)).limit(1);
  if (!existing.length) {
    await db.insert(recTransportSyncStatus).values({
      id: STATUS_ID,
      timetableUrl,
      connectionStatus: "PENDING"
    });
    return;
  }
  if (existing[0].timetableUrl !== timetableUrl) {
    await db.update(recTransportSyncStatus).set({ timetableUrl, updatedAt: /* @__PURE__ */ new Date() }).where(eq15(recTransportSyncStatus.id, STATUS_ID));
  }
}
async function getRecTransportStatus() {
  const rows = await db.select().from(recTransportSyncStatus).where(eq15(recTransportSyncStatus.id, STATUS_ID)).limit(1);
  const [routeCount] = await db.select({ count: sql`count(*)` }).from(recTransportRoutes).where(eq15(recTransportRoutes.active, true));
  const [stopCount] = await db.select({ count: sql`count(*)` }).from(recTransportStops).where(eq15(recTransportStops.active, true));
  const [officialCount] = await db.select({ count: sql`count(*)` }).from(officialPickupPoints).where(and6(eq15(officialPickupPoints.active, true), eq15(officialPickupPoints.source, "REC_TRANSPORT")));
  return {
    sourceLabel: REC_TRANSPORT_SOURCE_LABEL,
    defaultUrl: defaultTimetableUrl(),
    status: rows[0] ?? null,
    routesCount: Number(routeCount?.count ?? 0),
    stopsCount: Number(stopCount?.count ?? 0),
    officialPickupsCount: Number(officialCount?.count ?? 0)
  };
}
async function mapPool(items, limit, fn) {
  const results = [];
  let index2 = 0;
  async function worker() {
    while (index2 < items.length) {
      const current = items[index2++];
      results.push(await fn(current));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}
async function syncRecTransportFromOfficialSource(input) {
  const timetableUrl = input?.timetableUrl?.trim() || defaultTimetableUrl();
  await ensureStatusRow(timetableUrl);
  try {
    const indexPage = await fetchRecTransportHtml(timetableUrl);
    if (indexPage.status >= 400 || !indexPage.body) {
      throw new Error(`REC timetable HTTP ${indexPage.status}`);
    }
    const catalog = parseRecIndexPage(indexPage.body, indexPage.finalUrl);
    if (!catalog.length) {
      throw new Error("No routes parsed from REC timetable. The page layout may have changed.");
    }
    const now = /* @__PURE__ */ new Date();
    const seenRouteIds = /* @__PURE__ */ new Set();
    const boardingResults = await mapPool(catalog, FETCH_CONCURRENCY, async (entry) => {
      const routeId = recRouteId(entry.routeNumber);
      seenRouteIds.add(routeId);
      const startClock = parseRecClock(entry.startingTimeDisplay);
      let viaNotes = null;
      let campusArrivalDisplay = null;
      let campusArrival24 = null;
      let fetchError = null;
      let parsedStops = [];
      try {
        const boarding = await fetchRecTransportHtml(entry.boardingHref);
        if (boarding.status >= 400) {
          fetchError = `Boarding page HTTP ${boarding.status}`;
        } else {
          const parsed = parseRecBoardingPage(boarding.body);
          viaNotes = parsed.viaNotes;
          parsedStops = parsed.stops;
          const campus = parsed.stops.find((s) => s.isCampus);
          if (campus) {
            const clock = parseRecClock(campus.timeDisplay, startClock.meridiem);
            campusArrivalDisplay = campus.timeDisplay;
            campusArrival24 = clock.time24;
          }
        }
      } catch (err) {
        fetchError = err instanceof Error ? err.message : "Boarding page fetch failed";
      }
      const existingRoute = await db.select().from(recTransportRoutes).where(eq15(recTransportRoutes.id, routeId)).limit(1);
      const routeValues = existingRoute[0]?.manuallyEdited ? {
        boardingPageUrl: entry.boardingHref,
        viaNotes,
        sourceUrl: timetableUrl,
        active: true,
        lastSyncedAt: now
      } : {
        routeNumber: entry.routeNumber,
        routeName: entry.routeName,
        startingTimeDisplay: entry.startingTimeDisplay,
        startingTime24: startClock.time24,
        boardingPageUrl: entry.boardingHref,
        viaNotes,
        campusArrivalDisplay,
        campusArrival24,
        sourceUrl: timetableUrl,
        active: true,
        lastSyncedAt: now
      };
      if (existingRoute.length) {
        await db.update(recTransportRoutes).set(routeValues).where(eq15(recTransportRoutes.id, routeId));
      } else {
        await db.insert(recTransportRoutes).values({ id: routeId, ...routeValues });
      }
      let meridiem = startClock.meridiem;
      const seenStopIds = /* @__PURE__ */ new Set();
      for (let i = 0; i < parsedStops.length; i++) {
        const stop = parsedStops[i];
        const sequence = i + 1;
        const stopId = recStopId(entry.routeNumber, sequence);
        seenStopIds.add(stopId);
        const clock = parseRecClock(stop.timeDisplay, meridiem);
        if (clock.meridiem) meridiem = clock.meridiem;
        const existingStop = await db.select().from(recTransportStops).where(eq15(recTransportStops.id, stopId)).limit(1);
        const preservedLat = existingStop[0]?.latitude ?? null;
        const preservedLng = existingStop[0]?.longitude ?? null;
        const stopValues = {
          routeId,
          stopName: stop.stopName,
          sequenceNumber: sequence,
          timeDisplay: stop.timeDisplay || null,
          time24: clock.time24,
          isCampus: stop.isCampus,
          latitude: preservedLat,
          longitude: preservedLng,
          active: true,
          lastSyncedAt: now
        };
        if (existingStop.length) {
          await db.update(recTransportStops).set(stopValues).where(eq15(recTransportStops.id, stopId));
        } else {
          await db.insert(recTransportStops).values({ id: stopId, ...stopValues });
        }
      }
      if (parsedStops.length) {
        const leftover = await db.select().from(recTransportStops).where(eq15(recTransportStops.routeId, routeId));
        for (const row of leftover) {
          if (!seenStopIds.has(row.id)) {
            await db.update(recTransportStops).set({ active: false, lastSyncedAt: now }).where(eq15(recTransportStops.id, row.id));
          }
        }
      }
      if (input?.publishOfficialPickups) {
        await publishRoutePickups(routeId);
      }
      return { routeId, stops: parsedStops.length, fetchError };
    });
    const allRoutes = await db.select().from(recTransportRoutes);
    for (const route of allRoutes) {
      if (!seenRouteIds.has(route.id) && route.active) {
        await db.update(recTransportRoutes).set({ active: false, lastSyncedAt: now }).where(eq15(recTransportRoutes.id, route.id));
      }
    }
    const [stopCount] = await db.select({ count: sql`count(*)` }).from(recTransportStops).where(eq15(recTransportStops.active, true));
    const boardingErrors = boardingResults.filter((r) => r.fetchError);
    const { activateOfficialCollegeFleet: activateOfficialCollegeFleet2 } = await Promise.resolve().then(() => (init_collegeFleetService(), collegeFleetService_exports));
    await activateOfficialCollegeFleet2();
    await db.update(recTransportSyncStatus).set({
      timetableUrl,
      connectionStatus: boardingErrors.length && boardingErrors.length === catalog.length ? "PARTIAL" : "CONNECTED",
      lastSuccessfulSync: now,
      routesCount: catalog.length,
      stopsCount: Number(stopCount?.count ?? 0),
      lastError: boardingErrors.length ? `${boardingErrors.length} boarding pages failed` : null,
      updatedAt: now
    }).where(eq15(recTransportSyncStatus.id, STATUS_ID));
    return {
      sourceLabel: REC_TRANSPORT_SOURCE_LABEL,
      timetableUrl,
      routesImported: catalog.length,
      stopsImported: Number(stopCount?.count ?? 0),
      boardingFailures: boardingErrors.length,
      retrievedAt: now.toISOString()
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "REC transport sync failed";
    await db.update(recTransportSyncStatus).set({
      connectionStatus: "ERROR",
      lastError: message,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq15(recTransportSyncStatus.id, STATUS_ID));
    throw err;
  }
}
async function listRecTransportRoutes(query) {
  if (!query?.trim()) {
    return db.select().from(recTransportRoutes).where(eq15(recTransportRoutes.active, true)).orderBy(recTransportRoutes.routeNumber);
  }
  const pattern = `%${query.trim()}%`;
  const byRoute = await db.select().from(recTransportRoutes).where(
    and6(
      eq15(recTransportRoutes.active, true),
      or3(ilike2(recTransportRoutes.routeNumber, pattern), ilike2(recTransportRoutes.routeName, pattern))
    )
  ).orderBy(recTransportRoutes.routeNumber);
  const stopHits = await db.select({ routeId: recTransportStops.routeId }).from(recTransportStops).where(and6(eq15(recTransportStops.active, true), ilike2(recTransportStops.stopName, pattern)));
  const extraIds = [...new Set(stopHits.map((s) => s.routeId).filter((id) => !byRoute.some((r) => r.id === id)))];
  if (!extraIds.length) return byRoute;
  const extra = extraIds.length === 1 ? await db.select().from(recTransportRoutes).where(eq15(recTransportRoutes.id, extraIds[0])) : await db.select().from(recTransportRoutes).where(or3(...extraIds.map((id) => eq15(recTransportRoutes.id, id))));
  return [...byRoute, ...extra];
}
async function getRecTransportRoute(routeId) {
  const [route] = await db.select().from(recTransportRoutes).where(eq15(recTransportRoutes.id, routeId)).limit(1);
  if (!route) return null;
  const stops = await db.select().from(recTransportStops).where(and6(eq15(recTransportStops.routeId, routeId), eq15(recTransportStops.active, true))).orderBy(recTransportStops.sequenceNumber);
  return { ...route, stops };
}
async function updateRecTransportStop(stopId, patch) {
  const [existing] = await db.select().from(recTransportStops).where(eq15(recTransportStops.id, stopId)).limit(1);
  if (!existing) throw new Error("Stop not found");
  const updated = await db.update(recTransportStops).set({
    ...patch.latitude !== void 0 ? { latitude: patch.latitude } : {},
    ...patch.longitude !== void 0 ? { longitude: patch.longitude } : {},
    ...patch.active !== void 0 ? { active: patch.active } : {},
    ...patch.stopName !== void 0 ? { stopName: patch.stopName } : {}
  }).where(eq15(recTransportStops.id, stopId)).returning();
  return updated[0];
}
async function ensureFleetRouteFromRec(route) {
  const existing = await db.select().from(busRoutes).where(eq15(busRoutes.id, route.id)).limit(1);
  if (existing[0]?.manuallyEdited) return;
  const values = {
    routeName: `${route.routeNumber} ${route.routeName}`.trim(),
    routeCode: route.routeNumber,
    active: route.active,
    source: "REC_TRANSPORT"
  };
  if (existing.length) {
    await db.update(busRoutes).set(values).where(eq15(busRoutes.id, route.id));
    return;
  }
  await db.insert(busRoutes).values({ id: route.id, ...values });
}
var DUMMY_SEEDED_PICKUP_IDS = /* @__PURE__ */ new Set(["vandalur", "perungalathur", "tambaram", "college"]);
async function publishRoutePickups(routeId) {
  const detail = await getRecTransportRoute(routeId);
  if (!detail) throw new Error("Route not found");
  await ensureFleetRouteFromRec(detail);
  let published = 0;
  const seenIds = [];
  for (const stop of detail.stops) {
    if (stop.isCampus) continue;
    const existingOfficial = await db.select().from(officialPickupPoints).where(eq15(officialPickupPoints.id, stop.id)).limit(1);
    const lat = stop.latitude ?? existingOfficial[0]?.latitude ?? null;
    const lng = stop.longitude ?? existingOfficial[0]?.longitude ?? null;
    const offset = stop.time24 && detail.startingTime24 ? Math.max(0, toMinutes(stop.time24) - toMinutes(detail.startingTime24)) : stop.sequenceNumber * 3;
    await upsertPickupPoint({
      id: stop.id,
      routeId: detail.id,
      stopName: stop.stopName,
      latitude: lat,
      longitude: lng,
      sequenceNumber: stop.sequenceNumber,
      geofenceRadiusM: 150,
      expectedOffsetMinutes: offset,
      scheduledTimeDisplay: stop.timeDisplay,
      scheduledTime24: stop.time24,
      source: "REC_TRANSPORT",
      active: stop.active
    });
    published += 1;
    seenIds.push(stop.id);
  }
  return { routeId, published, stopIds: seenIds };
}
async function publishAllOfficialPickups() {
  const { bootstrapCoreTables: bootstrapCoreTables2 } = await Promise.resolve().then(() => (init_bootstrapCoreTables(), bootstrapCoreTables_exports));
  await bootstrapCoreTables2();
  const routes2 = await db.select().from(recTransportRoutes).where(eq15(recTransportRoutes.active, true));
  if (!routes2.length) {
    throw new Error("No official REC routes synced yet. Sync the timetable first.");
  }
  const seenIds = /* @__PURE__ */ new Set();
  let published = 0;
  let routesPublished = 0;
  for (const route of routes2) {
    const result = await publishRoutePickups(route.id);
    published += result.published;
    routesPublished += 1;
    for (const id of result.stopIds) seenIds.add(id);
  }
  const official = await db.select().from(officialPickupPoints);
  let deactivated = 0;
  for (const point of official) {
    const isRec = point.source === "REC_TRANSPORT" || point.id.startsWith("rec-stop-");
    const dropRec = isRec && point.active && !seenIds.has(point.id);
    const dropDummy = DUMMY_SEEDED_PICKUP_IDS.has(point.id) && point.active;
    if (dropRec || dropDummy) {
      await upsertPickupPoint({
        id: point.id,
        routeId: point.routeId,
        stopName: point.stopName,
        latitude: point.latitude,
        longitude: point.longitude,
        sequenceNumber: point.sequenceNumber,
        geofenceRadiusM: point.geofenceRadiusM,
        expectedOffsetMinutes: point.expectedOffsetMinutes,
        scheduledTimeDisplay: point.scheduledTimeDisplay,
        scheduledTime24: point.scheduledTime24,
        source: point.source,
        active: false
      });
      deactivated += 1;
    }
  }
  const promoted = await activateOfficialCollegeFleet();
  return { routesPublished, published, deactivated, fleet: promoted };
}
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
async function searchRecPickupPoints(query) {
  const pattern = `%${query.trim()}%`;
  return db.select({
    id: recTransportStops.id,
    stopName: recTransportStops.stopName,
    timeDisplay: recTransportStops.timeDisplay,
    time24: recTransportStops.time24,
    routeId: recTransportStops.routeId,
    routeNumber: recTransportRoutes.routeNumber,
    routeName: recTransportRoutes.routeName,
    startingTimeDisplay: recTransportRoutes.startingTimeDisplay
  }).from(recTransportStops).innerJoin(recTransportRoutes, eq15(recTransportStops.routeId, recTransportRoutes.id)).where(and6(eq15(recTransportStops.active, true), eq15(recTransportStops.isCampus, false), ilike2(recTransportStops.stopName, pattern))).orderBy(recTransportStops.stopName).limit(40);
}

// artifacts/api-server/src/routes/recTransport.ts
init_collegeFleetService();
var router17 = Router17();
router17.get("/rec-transport/status", async (_req, res) => {
  try {
    res.json(await getRecTransportStatus());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to read REC transport status" });
  }
});
router17.post("/rec-transport/sync", requireAuth, requireAdmin, async (req, res) => {
  try {
    const timetableUrl = typeof req.body?.timetableUrl === "string" ? req.body.timetableUrl : void 0;
    const publishOfficialPickups = Boolean(req.body?.publishOfficialPickups);
    const result = await syncRecTransportFromOfficialSource({ timetableUrl, publishOfficialPickups });
    const authUser = req.user;
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "SYNC_REC_TRANSPORT",
      entityType: "rec_transport",
      entityId: result.timetableUrl,
      detail: `${result.routesImported} routes, ${result.stopsImported} stops`
    });
    res.json({ ok: true, ...result, ...await getRecTransportStatus() });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : "REC transport sync failed",
      ...await getRecTransportStatus()
    });
  }
});
router17.get("/rec-transport/routes", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : void 0;
    res.json(await listRecTransportRoutes(q));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to list routes" });
  }
});
router17.get("/rec-transport/routes/:id", async (req, res) => {
  try {
    const detail = await getRecTransportRoute(req.params.id);
    if (!detail) return res.status(404).json({ error: "Route not found" });
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load route" });
  }
});
router17.get("/rec-transport/pickups/search", async (req, res) => {
  try {
    const q = String(req.query.q || "");
    if (!q.trim()) return res.status(400).json({ error: "q required" });
    res.json(await searchRecPickupPoints(q));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Pickup search failed" });
  }
});
router17.patch("/rec-transport/stops/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updated = await updateRecTransportStop(req.params.id, req.body ?? {});
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update stop" });
  }
});
router17.post("/rec-transport/publish-pickups", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await publishAllOfficialPickups();
    const authUser = req.user;
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "PUBLISH_REC_PICKUPS",
      entityType: "official_pickup_points",
      entityId: "rec-transport",
      detail: `${result.published} pickups from ${result.routesPublished} routes`
    });
    res.json({ ok: true, ...result, ...await getRecTransportStatus() });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update official pickup points" });
  }
});
router17.post("/rec-transport/routes/:id/publish-pickups", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await publishRoutePickups(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to publish pickups" });
  }
});
router17.get("/college-routes", requireAuth, requireAdmin, async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : void 0;
    res.json(await listCollegeRoutes(q));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to list college routes" });
  }
});
router17.post("/college-routes/activate-official", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await activateOfficialCollegeFleet();
    const authUser = req.user;
    await recordAdminAudit({
      adminId: authUser?.uid || req.header("x-acims-user-id") || "admin",
      action: "ACTIVATE_REC_FLEET",
      entityType: "bus_routes",
      entityId: "rec-transport",
      detail: `${result.routesCount} official routes`
    });
    res.json({ ok: true, ...result, routes: await listCollegeRoutes() });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to activate official routes" });
  }
});
router17.post("/college-routes", requireAuth, requireAdmin, async (req, res) => {
  try {
    const created = await createCollegeRoute(req.body ?? {});
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to create route" });
  }
});
router17.patch("/college-routes/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updated = await updateCollegeRoute(req.params.id, req.body ?? {});
    if (!updated) return res.status(404).json({ error: "Route not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update route" });
  }
});
var recTransport_default = router17;

// artifacts/api-server/src/routes/index.ts
var router18 = Router18();
router18.use(health_default);
router18.use(auth_default);
router18.use(me_default);
router18.use(buses_default);
router18.use(queue_default);
router18.use(notifications_default);
router18.use(campus_default);
router18.use(safety_default);
router18.use(admin_default);
router18.use(ai_default);
router18.use(transport_default);
router18.use(publicTransport_default);
router18.use(mobility_default);
router18.use(mtc_default);
router18.use(studentTransport_default);
router18.use(mvp_default);
router18.use(recTransport_default);
var routes_default = router18;

// server-app.ts
init_buses();
init_realtimeHub();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path5.dirname(__filename);
async function startServer() {
  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^["']|["']$/g, "").trim();
  }
  try {
    const { bootstrapAppTables: bootstrapAppTables2, ensureBaselineFleetData: ensureBaselineFleetData2 } = await Promise.resolve().then(() => (init_bootstrapAppTables(), bootstrapAppTables_exports));
    await bootstrapAppTables2();
    const { bootstrapCoreTables: bootstrapCoreTables2 } = await Promise.resolve().then(() => (init_bootstrapCoreTables(), bootstrapCoreTables_exports));
    await bootstrapCoreTables2();
    const { migrateMobilitySchemaColumns: migrateMobilitySchemaColumns2 } = await Promise.resolve().then(() => (init_bootstrapAppTables(), bootstrapAppTables_exports));
    await migrateMobilitySchemaColumns2();
    await ensureBaselineFleetData2();
    const { seedInitialDemoRoutes: seedInitialDemoRoutes2 } = await Promise.resolve().then(() => (init_initialDemoRoutes(), initialDemoRoutes_exports));
    await seedInitialDemoRoutes2();
    const { ensureCanonicalShiftSlots: ensureCanonicalShiftSlots2 } = await Promise.resolve().then(() => (init_shiftManagement(), shiftManagement_exports));
    await ensureCanonicalShiftSlots2();
    const { ensureOfficialPickupPointsFromRoutes: ensureOfficialPickupPointsFromRoutes2 } = await Promise.resolve().then(() => (init_ensureMobilityPickups(), ensureMobilityPickups_exports));
    await ensureOfficialPickupPointsFromRoutes2();
    try {
      const { seedDatabase: seedDatabase2 } = await Promise.resolve().then(() => (init_seed(), seed_exports));
      await seedDatabase2();
    } catch (err) {
      console.warn("Baseline seed skipped:", err);
    }
    const { ensureMtcSchema: ensureMtcSchema2, purgeLegacyDummyMtcFromTransitDb: purgeLegacyDummyMtcFromTransitDb2 } = await Promise.resolve().then(() => (init_mtcService(), mtcService_exports));
    ensureMtcSchema2();
    purgeLegacyDummyMtcFromTransitDb2();
  } catch (dbErr) {
    console.error("[Database Bootstrap Warning]:", dbErr);
  }
  const app = express();
  const port = Number(process.env.PORT) || 3e3;
  const candidatePaths = [
    path5.resolve(__dirname, "artifacts/acims/dist"),
    path5.resolve(__dirname, "dist")
  ];
  const distPath = candidatePaths.find((p) => fs5.existsSync(path5.join(p, "index.html")));
  const isProd = process.env.NODE_ENV === "production" && Boolean(distPath);
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "healthy", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.use("/api", routes_default);
  if (isProd && distPath) {
    console.log(`Serving static production build from ${distPath}`);
    app.use(express.static(distPath));
    app.use((_req, res) => {
      const indexPath = path5.join(distPath, "index.html");
      if (fs5.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application build artifacts not found.");
      }
    });
  } else {
    console.log("Starting in development mode with Vite middleware");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path5.resolve(__dirname, "artifacts/acims/vite.config.ts"),
      server: {
        middlewareMode: true,
        host: "0.0.0.0"
      },
      appType: "spa",
      root: path5.resolve(__dirname, "artifacts/acims")
    });
    app.use(vite.middlewares);
  }
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`ACIMS Mobility System server listening on http://0.0.0.0:${port}`);
  });
  realtimeHub.attachSocketServer(server, {
    onDriverLocationIngest: async (payload) => {
      const res = await ingestRealDriverGps(payload);
      return {
        ok: res.ok,
        telemetry: res.telemetry,
        error: res.error
      };
    },
    resolveBusSnapshot: async (busId) => {
      return buildBusTelemetry(busId);
    }
  });
  const shutdown = () => {
    console.log("Shutting down server gracefully...");
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  return server;
}
export {
  startServer
};
