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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// BUS ROUTES
export const busRoutes = pgTable("bus_routes", {
  id: text("id").primaryKey(), // e.g. 'route-bus-18'
  routeName: text("route_name").notNull(),
  routeCode: text("route_code").notNull(),
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

