import { createInsertSchema } from "drizzle-zod";
import { boolean, doublePrecision, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const campusLocations = pgTable("campus_locations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
});

export const navigationRoutes = pgTable("navigation_routes", {
  id: text("id").primaryKey(),
  startLocationId: text("start_location_id").notNull(),
  destinationLocationId: text("destination_location_id").notNull(),
  mode: text("mode").notNull(),
  distanceKm: doublePrecision("distance_km").notNull(),
  walkingMinutes: integer("walking_minutes").notNull(),
});

export const safetyReports = pgTable("safety_reports", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  reportType: text("report_type").notNull(),
  description: text("description").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  status: text("status").notNull().default("OPEN"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emergencyContacts = pgTable("emergency_contacts", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  name: text("name").notNull(),
  relationship: text("relationship").notNull(),
  phone: text("phone").notNull(),
});

export const safetyAlerts = pgTable("safety_alerts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  severity: text("severity").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  active: boolean("active").notNull().default(true),
});

export const transportProviders = pgTable("transport_providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull(),
  dataLabel: text("data_label").notNull(),
});

export const publicTransportRoutes = pgTable("public_transport_routes", {
  id: text("id").primaryKey(),
  providerId: text("provider_id").notNull(),
  route: text("route").notNull(),
  transportType: text("transport_type").notNull(),
});

export const publicTransportStops = pgTable("public_transport_stops", {
  id: text("id").primaryKey(),
  providerId: text("provider_id").notNull(),
  name: text("name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
});

export const publicTransportJourneys = pgTable("public_transport_journeys", {
  id: text("id").primaryKey(),
  providerId: text("provider_id").notNull(),
  transportType: text("transport_type").notNull(),
  route: text("route").notNull(),
  departure: text("departure").notNull(),
  arrival: text("arrival").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  transfers: integer("transfers").notNull().default(0),
  walkingDistanceKm: doublePrecision("walking_distance_km").notNull(),
  availability: text("availability").notNull(),
  dataLabel: text("data_label").notNull(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiMessages = pgTable("ai_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCampusLocationSchema = createInsertSchema(campusLocations);
export const insertNavigationRouteSchema = createInsertSchema(navigationRoutes);
export const insertSafetyReportSchema = createInsertSchema(safetyReports);
export const insertEmergencyContactSchema = createInsertSchema(emergencyContacts);
export const insertSafetyAlertSchema = createInsertSchema(safetyAlerts);
export const insertAdminUserSchema = createInsertSchema(adminUsers);
export const insertTransportProviderSchema = createInsertSchema(transportProviders);
export const insertPublicTransportRouteSchema = createInsertSchema(publicTransportRoutes);
export const insertPublicTransportStopSchema = createInsertSchema(publicTransportStops);
export const insertPublicTransportJourneySchema = createInsertSchema(publicTransportJourneys);
export const insertAiConversationSchema = createInsertSchema(aiConversations);
export const insertAiMessageSchema = createInsertSchema(aiMessages);

export type CampusLocationRecord = z.infer<typeof insertCampusLocationSchema>;
export type SafetyReportRecord = z.infer<typeof insertSafetyReportSchema>;
export type PublicTransportJourneyRecord = z.infer<typeof insertPublicTransportJourneySchema>;