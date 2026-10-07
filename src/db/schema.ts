import { boolean, doublePrecision, integer, pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

// PROFILES
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(), // Firebase Auth UID
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("STUDENT"), // STUDENT, DRIVER, ADMIN, PARENT
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// STUDENTS
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => profiles.id).notNull(),
  registerNumber: text("register_number"),
  pickupStopId: text("pickup_stop_id"),
  assignedBusId: text("assigned_bus_id"),
  assignedRouteId: text("assigned_route_id"),
});

// DRIVERS
export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => profiles.id).notNull(),
  assignedBusId: text("assigned_bus_id"),
});

// BUSES
export const buses = pgTable("buses", {
  id: text("id").primaryKey(), // e.g., 'bus-18'
  busNumber: text("bus_number").notNull(),
  registrationNumber: text("registration_number"),
  routeId: text("route_id"),
  driverId: text("driver_id"),
  active: boolean("active").notNull().default(true),
  source: text("source").notNull().default("ADMIN"),
  manuallyEdited: boolean("manually_edited").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// BUS ROUTES
export const busRoutes = pgTable("bus_routes", {
  id: text("id").primaryKey(), // e.g. 'route-bus-18'
  routeName: text("route_name").notNull(),
  routeCode: text("route_code").notNull(),
  startingTimeDisplay: text("starting_time_display"),
  startingTime24: text("starting_time_24"),
  campusArrivalDisplay: text("campus_arrival_display"),
  campusArrival24: text("campus_arrival_24"),
  source: text("source").notNull().default("ADMIN"),
  manuallyEdited: boolean("manually_edited").notNull().default(false),
  active: boolean("active").notNull().default(true),
});

// BUS STOPS
export const busStops = pgTable("bus_stops", {
  id: text("id").primaryKey(),
  routeId: text("route_id").notNull(),
  stopName: text("stop_name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  sequenceNumber: integer("sequence_number").notNull(),
});

/** Official student pickup points (geofenced stops on a route). */
export const officialPickupPoints = pgTable("official_pickup_points", {
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
  active: boolean("active").notNull().default(true),
});

/** Configurable operating shift (morning/evening slots; timings set by admin). */
export const shifts = pgTable("shifts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shiftType: text("shift_type"), // MORNING | EVENING (canonical slots)
  startTime: text("start_time"), // HH:MM 24h — unset until admin configures
  endTime: text("end_time"),
  direction: text("direction").notNull().default("TO_COLLEGE"), // TO_COLLEGE | FROM_COLLEGE
  routeId: text("route_id"),
  busId: text("bus_id"),
  driverId: text("driver_id"),
  operatingDays: text("operating_days").notNull().default("MON,TUE,WED,THU,FRI"),
  active: boolean("active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const shiftAssignments = pgTable("shift_assignments", {
  id: text("id").primaryKey(),
  shiftId: text("shift_id").notNull(),
  busId: text("bus_id").notNull(),
  driverId: text("driver_id").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/** Executed trip (shift instance) with lifecycle. */
export const trips = pgTable(
  "trips",
  {
    id: text("id").primaryKey(),
    shiftId: text("shift_id"),
    busId: text("bus_id").notNull(),
    driverId: text("driver_id").notNull(),
    routeId: text("route_id").notNull(),
    trackingSessionId: text("tracking_session_id"),
    status: text("status").notNull().default("SCHEDULED"), // SCHEDULED | STARTED | ACTIVE | COMPLETED | CANCELLED
    scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    delayMinutes: integer("delay_minutes").notNull().default(0),
    /** Snapshot of shift window when trip was scheduled/started (immutable for history). */
    shiftStartSnapshot: text("shift_start_snapshot"),
    shiftEndSnapshot: text("shift_end_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("trips_bus_id_idx").on(table.busId),
    index("trips_status_idx").on(table.status),
    index("trips_shift_id_idx").on(table.shiftId),
  ],
);

/** Administrative configuration and assignment audit trail. */
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: text("id").primaryKey(),
    adminId: text("admin_id").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("admin_audit_logs_created_at_idx").on(table.createdAt)],
);

/** Per-trip notification deduplication and audit (ETA, delay, arrival). */
export const tripNotificationEvents = pgTable(
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
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (table) => [
    index("trip_notif_student_idx").on(table.studentId),
    index("trip_notif_trip_idx").on(table.tripId),
  ],
);

/** Deduped mobility notification events per student/trip. */
export const mobilityEvents = pgTable("mobility_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  busId: text("bus_id").notNull(),
  tripId: text("trip_id"),
  pickupPointId: text("pickup_point_id"),
  eventType: text("event_type").notNull(),
  payload: text("payload").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// STUDENT PICKUP POINTS
export const studentPickupPoints = pgTable("student_pickup_points", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  stopId: text("stop_id").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  isPrimary: boolean("is_primary").notNull().default(true),
});

// BUS LOCATIONS
export const busLocations = pgTable(
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("bus_locations_bus_id_idx").on(table.busId),
    index("bus_locations_recorded_at_idx").on(table.recordedAt),
    index("bus_locations_driver_id_idx").on(table.driverId),
  ]
);

// TRACKING SESSIONS
export const trackingSessions = pgTable(
  "tracking_sessions",
  {
    id: text("id").primaryKey(),
    busId: text("bus_id").notNull(),
    driverId: text("driver_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    lastLocationAt: timestamp("last_location_at", { withTimezone: true }),
    status: text("status").notNull().default("ACTIVE"), // ACTIVE, PAUSED, ENDED
  },
  (table) => [
    index("tracking_sessions_bus_id_idx").on(table.busId),
    index("tracking_sessions_driver_id_idx").on(table.driverId),
    index("tracking_sessions_status_idx").on(table.status),
  ]
);

// NOTIFICATIONS
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

// NOTIFICATION PREFERENCES
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  preferences: text("preferences").notNull().default("{}"),
});

// CAMPUS LOCATIONS
export const campusLocations = pgTable("campus_locations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  description: text("description"),
});

// CAMPUS PATHS
export const campusPaths = pgTable("campus_paths", {
  id: text("id").primaryKey(),
  fromLocationId: text("from_location_id").notNull(),
  toLocationId: text("to_location_id").notNull(),
  distanceMeters: doublePrecision("distance_meters").notNull(),
  pathPoints: text("path_points").notNull(), // JSON array of [lat, lng]
});

// SAFETY REPORTS
export const safetyReports = pgTable("safety_reports", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  reportType: text("report_type").notNull(),
  description: text("description").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  status: text("status").notNull().default("OPEN"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// EMERGENCY CONTACTS
export const emergencyContacts = pgTable("emergency_contacts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  relationship: text("relationship").notNull(),
  phone: text("phone").notNull(),
});

// PUBLIC TRANSPORT STOPS
export const publicTransportStops = pgTable("public_transport_stops", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  routesServed: text("routes_served").notNull(),
});

// PUBLIC TRANSPORT DEPARTURES
export const publicTransportDepartures = pgTable("public_transport_departures", {
  id: text("id").primaryKey(),
  stopId: text("stop_id").notNull(),
  routeNumber: text("route_number").notNull(),
  destination: text("destination").notNull(),
  departureTime: text("departure_time").notNull(), // HH:MM
  serviceDays: text("service_days").notNull().default("MON,TUE,WED,THU,FRI,SAT"),
  isLive: boolean("is_live").notNull().default(false),
});

// BOARDING QUEUE (Database-backed queue replacing in-memory fleetState)
export const boardingQueue = pgTable("boarding_queue", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull(),
  busId: text("bus_id").notNull(),
  boardingStop: text("boarding_stop").notNull(),
  status: text("status").notNull().default("WAITING"), // WAITING, BOARDED, CANCELLED
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// STUDENT PREFERENCES & SAVED DESTINATIONS
export const studentPreferences = pgTable("student_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  savedPickupStopId: text("saved_pickup_stop_id"),
  preferredBusId: text("preferred_bus_id"),
  savedDestinationName: text("saved_destination_name"),
  savedDestinationLat: doublePrecision("saved_destination_lat"),
  savedDestinationLng: doublePrecision("saved_destination_lng"),
  notificationArrivals: boolean("notification_arrivals").default(true),
  notificationDelays: boolean("notification_delays").default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// STUDENT LOCATIONS (Real device GPS history)
export const studentLocations = pgTable("student_locations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  accuracy: doublePrecision("accuracy"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow(),
});

/** MOBI assistant query audit (no voice recordings). */
export const mobiQueryLogs = pgTable(
  "mobi_query_logs",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull(),
    intent: text("intent").notNull(),
    toolsCalled: text("tools_called").notNull().default("[]"),
    success: boolean("success").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("mobi_query_logs_student_idx").on(table.studentId), index("mobi_query_logs_created_at_idx").on(table.createdAt)],
);

/** Official REC college-bus catalog from rectransport.com (updateable by re-sync). */
export const recTransportRoutes = pgTable(
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
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  },
  (table) => [index("rec_transport_routes_number_idx").on(table.routeNumber)],
);

export const recTransportStops = pgTable(
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
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  },
  (table) => [index("rec_transport_stops_route_idx").on(table.routeId, table.sequenceNumber)],
);

export const recTransportSyncStatus = pgTable("rec_transport_sync_status", {
  id: integer("id").primaryKey(),
  timetableUrl: text("timetable_url").notNull(),
  connectionStatus: text("connection_status").notNull().default("PENDING"),
  lastSuccessfulSync: timestamp("last_successful_sync", { withTimezone: true }),
  routesCount: integer("routes_count").notNull().default(0),
  stopsCount: integer("stops_count").notNull().default(0),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});


