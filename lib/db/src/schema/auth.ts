import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// 1. User Profiles table (source of truth for identity and role)
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  role: text("role").notNull(), // 'student' | 'driver' | 'admin'
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 2. Students table (student-specific roll, department, and profile link)
export const students = pgTable("students", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  studentId: text("student_id").notNull().unique(), // e.g. Roll number or registration ID
  department: text("department").notNull(),
  batch: text("batch"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 3. Drivers table (fleet driver records)
export const drivers = pgTable("drivers", {
  id: text("id").primaryKey(),
  profileId: text("profile_id"),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  busId: text("bus_id"),
  routeId: text("route_id"),
  active: boolean("active").notNull().default(true),
  licenseNumber: text("license_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 4. Buses table (campus fleet bus records)
export const buses = pgTable("buses", {
  id: text("id").primaryKey(),
  busNumber: text("bus_number").notNull(),
  routeId: text("route_id").notNull(),
  driverId: text("driver_id"),
  capacity: integer("capacity").notNull().default(40),
  active: boolean("active").notNull().default(true),
  status: text("status").notNull().default("ON ROUTE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 5. Sessions table (cryptographically secure server-authoritative sessions)
export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  profileId: text("profile_id").notNull(),
  role: text("role").notNull(), // 'student' | 'driver' | 'admin'
  entityId: text("entity_id").notNull(), // student ID, driver ID, or admin username
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles);
export const insertStudentSchema = createInsertSchema(students);
export const insertDriverSchema = createInsertSchema(drivers);
export const insertBusSchema = createInsertSchema(buses);
export const insertSessionSchema = createInsertSchema(sessions);

export type ProfileRecord = typeof profiles.$inferSelect;
export type StudentRecord = typeof students.$inferSelect;
export type DriverRecord = typeof drivers.$inferSelect;
export type BusRecord = typeof buses.$inferSelect;
export type SessionRecord = typeof sessions.$inferSelect;
