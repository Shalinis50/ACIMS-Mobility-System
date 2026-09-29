import { pgTable, text, doublePrecision, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("student"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Students with pickup_stop_id relationship
export const students = pgTable("students", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  regNumber: text("reg_number").notNull(),
  department: text("department").notNull(),
  pickupStopId: text("pickup_stop_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Drivers
export const drivers = pgTable("drivers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  licenseNumber: text("license_number"),
  active: boolean("active").notNull().default(true),
  assignedBusId: text("assigned_bus_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Buses (Strictly NO occupancy or passenger capacity fields)
export const buses = pgTable("buses", {
  id: text("id").primaryKey(),
  busNumber: text("bus_number").notNull().unique(),
  plateNumber: text("plate_number").notNull(),
  active: boolean("active").notNull().default(true),
  status: text("status").notNull().default("Standby"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Registered Bus Stops
export const stops = pgTable("stops", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  sequenceOrder: integer("sequence_order").notNull().default(0),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Routes
export const routes = pgTable("routes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Route Stops (linking routes to stops)
export const routeStops = pgTable("route_stops", {
  id: text("id").primaryKey(),
  routeId: text("route_id").notNull(),
  stopId: text("stop_id").notNull(),
  stopSequence: integer("stop_sequence").notNull(),
  scheduledMinutesFromStart: integer("scheduled_minutes_from_start").notNull().default(0),
});

// Trips (linking routes, buses, and drivers)
export const trips = pgTable("trips", {
  id: text("id").primaryKey(),
  routeId: text("route_id").notNull(),
  busId: text("bus_id").notNull(),
  driverId: text("driver_id"),
  tripDate: text("trip_date").notNull(),
  scheduledStartTime: text("scheduled_start_time").notNull(),
  status: text("status").notNull().default("Scheduled"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Trip Stop Times
export const tripStopTimes = pgTable("trip_stop_times", {
  id: text("id").primaryKey(),
  tripId: text("trip_id").notNull(),
  stopId: text("stop_id").notNull(),
  scheduledArrivalTime: text("scheduled_arrival_time").notNull(),
  actualArrivalTime: text("actual_arrival_time"),
  status: text("status").notNull().default("Scheduled"),
});

// Live Bus Locations (Actual driver GPS broadcasts)
export const liveLocations = pgTable("live_locations", {
  id: text("id").primaryKey(),
  busId: text("bus_id").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  speed: doublePrecision("speed").notNull().default(0),
  heading: doublePrecision("heading").notNull().default(0),
  source: text("source").notNull().default("driver-device"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  busId: text("bus_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Disruption Events
export const disruptionEvents = pgTable("disruption_events", {
  id: text("id").primaryKey(),
  routeId: text("route_id"),
  stopId: text("stop_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Campus Paths
export const campusPaths = pgTable("campus_paths", {
  id: text("id").primaryKey(),
  fromLocationId: text("from_location_id").notNull(),
  toLocationId: text("to_location_id").notNull(),
  distanceMeters: integer("distance_meters").notNull(),
  walkingMinutes: integer("walking_minutes").notNull(),
  accessible: boolean("accessible").notNull().default(true),
});

export const insertStudentSchema = createInsertSchema(students);
export const insertStopSchema = createInsertSchema(stops);
export const insertRouteSchema = createInsertSchema(routes);
export const insertBusSchema = createInsertSchema(buses);
export const insertLiveLocationSchema = createInsertSchema(liveLocations);
export const insertTripSchema = createInsertSchema(trips);

export type StudentRecord = typeof students.$inferSelect;
export type StopRecord = typeof stops.$inferSelect;
export type RouteRecord = typeof routes.$inferSelect;
export type BusRecord = typeof buses.$inferSelect;
export type LiveLocationRecord = typeof liveLocations.$inferSelect;
export type TripRecord = typeof trips.$inferSelect;
