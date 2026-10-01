import crypto from "node:crypto";
import { executeQuery } from "@workspace/db";

export interface AuthSessionUser {
  token: string;
  profileId: string;
  role: "student" | "driver" | "admin";
  entityId: string;
  name: string;
  studentId?: string;
  department?: string;
  driverId?: string;
  phone?: string;
}

/**
 * Student Login/Register
 * Creates a new student & profile in PostgreSQL if not found,
 * or retrieves the existing record if already registered.
 * Never creates duplicate accounts.
 */
export async function loginOrCreateStudent(studentIdRaw: string, departmentRaw: string): Promise<AuthSessionUser> {
  const studentId = studentIdRaw.trim();
  const department = departmentRaw.trim() || "General Engineering";

  if (!studentId) {
    const error: any = new Error("Student ID is required");
    error.status = 400;
    throw error;
  }

  // 1. Check if student already exists in PostgreSQL
  const existingRes = await executeQuery<{
    id: string;
    profile_id: string;
    student_id: string;
    department: string;
    full_name: string;
  }>(
    `SELECT s.id, s.profile_id, s.student_id, s.department, p.full_name
     FROM students s
     JOIN profiles p ON s.profile_id = p.id
     WHERE LOWER(s.student_id) = LOWER($1)
     LIMIT 1;`,
    [studentId]
  );

  let profileId: string;
  let studentPk: string;
  let studentName: string;

  if (existingRes.rows.length > 0) {
    // Existing student found: retrieve record (NO duplicates)
    const existing = existingRes.rows[0];
    profileId = existing.profile_id;
    studentPk = existing.id;
    studentName = existing.full_name;

    // Update department if changed
    await executeQuery(
      `UPDATE students SET department = $1 WHERE id = $2;`,
      [department, studentPk]
    );
    await executeQuery(
      `UPDATE profiles SET updated_at = NOW() WHERE id = $1;`,
      [profileId]
    );
  } else {
    // New student: create in PostgreSQL profiles and students
    profileId = `prof_${crypto.randomUUID()}`;
    studentPk = `stu_${crypto.randomUUID()}`;
    studentName = studentId;

    await executeQuery(
      `INSERT INTO profiles (id, role, full_name, created_at, updated_at)
       VALUES ($1, 'student', $2, NOW(), NOW());`,
      [profileId, studentName]
    );

    await executeQuery(
      `INSERT INTO students (id, profile_id, student_id, department, created_at)
       VALUES ($1, $2, $3, $4, NOW());`,
      [studentPk, profileId, studentId, department]
    );
  }

  // 2. Create server-side session token
  const token = `acims_sess_${crypto.randomBytes(32).toString("hex")}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await executeQuery(
    `INSERT INTO sessions (token, profile_id, role, entity_id, expires_at, created_at)
     VALUES ($1, $2, 'student', $3, $4, NOW());`,
    [token, profileId, studentId, expiresAt.toISOString()]
  );

  return {
    token,
    profileId,
    role: "student",
    entityId: studentId,
    name: studentName,
    studentId,
    department,
  };
}

/**
 * Driver Login
 * Requires an existing persisted driver in PostgreSQL.
 * Does NOT auto-create drivers. Returns honest 404 / 403 errors.
 */
export async function loginDriver(identifierRaw: string): Promise<AuthSessionUser> {
  const identifier = identifierRaw.trim();
  if (!identifier) {
    const error: any = new Error("Driver phone number or ID is required");
    error.status = 400;
    throw error;
  }

  const res = await executeQuery<{
    id: string;
    profile_id: string | null;
    name: string;
    phone: string;
    bus_id: string | null;
    route_id: string | null;
    active: boolean;
  }>(
    `SELECT id, profile_id, name, phone, bus_id, route_id, active
     FROM drivers
     WHERE LOWER(phone) = LOWER($1) OR LOWER(id) = LOWER($1)
     LIMIT 1;`,
    [identifier]
  );

  if (res.rows.length === 0) {
    const error: any = new Error("Driver account not found. Drivers must be provisioned by a campus administrator.");
    error.status = 404;
    throw error;
  }

  const driver = res.rows[0];
  if (!driver.active) {
    const error: any = new Error("Driver account is currently inactive. Contact transit dispatch.");
    error.status = 403;
    throw error;
  }

  let profileId = driver.profile_id;
  if (!profileId) {
    profileId = `prof_driver_${driver.id}`;
    await executeQuery(
      `INSERT INTO profiles (id, role, full_name, phone, created_at, updated_at)
       VALUES ($1, 'driver', $2, $3, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING;`,
      [profileId, driver.name, driver.phone]
    );
    await executeQuery(
      `UPDATE drivers SET profile_id = $1 WHERE id = $2;`,
      [profileId, driver.id]
    );
  }

  // Create session
  const token = `acims_sess_${crypto.randomBytes(32).toString("hex")}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await executeQuery(
    `INSERT INTO sessions (token, profile_id, role, entity_id, expires_at, created_at)
     VALUES ($1, $2, 'driver', $3, $4, NOW());`,
    [token, profileId, driver.id, expiresAt.toISOString()]
  );

  return {
    token,
    profileId,
    role: "driver",
    entityId: driver.id,
    driverId: driver.id,
    name: driver.name,
    phone: driver.phone,
  };
}

/**
 * Admin Login
 * Verifies credentials server-side without exposing secrets to client bundles.
 */
export async function loginAdmin(usernameRaw: string, passwordRaw: string): Promise<AuthSessionUser> {
  const username = usernameRaw.trim();
  const password = passwordRaw;

  const expectedUser = process.env.ADMIN_USERNAME || "admin";
  const expectedPass = process.env.ADMIN_PASSWORD || "acmis123";

  if (!username || !password || username !== expectedUser || password !== expectedPass) {
    const error: any = new Error("Invalid staff credentials");
    error.status = 401;
    throw error;
  }

  const profileId = "admin_master";
  await executeQuery(
    `INSERT INTO profiles (id, role, full_name, email, created_at, updated_at)
     VALUES ($1, 'admin', 'Transit Operations Administrator', 'transit-admin@rajalakshmi.edu.in', NOW(), NOW())
     ON CONFLICT (id) DO NOTHING;`,
    [profileId]
  );

  const token = `acims_sess_${crypto.randomBytes(32).toString("hex")}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await executeQuery(
    `INSERT INTO sessions (token, profile_id, role, entity_id, expires_at, created_at)
     VALUES ($1, $2, 'admin', $3, $4, NOW());`,
    [token, profileId, username, expiresAt.toISOString()]
  );

  return {
    token,
    profileId,
    role: "admin",
    entityId: username,
    name: "Transit Operations Administrator",
  };
}

/**
 * Verify Session Token
 * Server-side source of truth: looks up token in PostgreSQL sessions table.
 */
export async function verifySession(tokenRaw: string): Promise<AuthSessionUser | null> {
  if (!tokenRaw) return null;
  const token = tokenRaw.trim();

  const res = await executeQuery<{
    token: string;
    profile_id: string;
    role: "student" | "driver" | "admin";
    entity_id: string;
    full_name: string;
    expires_at: string;
  }>(
    `SELECT s.token, s.profile_id, s.role, s.entity_id, s.expires_at, p.full_name
     FROM sessions s
     JOIN profiles p ON s.profile_id = p.id
     WHERE s.token = $1 AND s.expires_at > NOW()
     LIMIT 1;`,
    [token]
  );

  if (res.rows.length === 0) return null;
  const row = res.rows[0];

  const user: AuthSessionUser = {
    token: row.token,
    profileId: row.profile_id,
    role: row.role,
    entityId: row.entity_id,
    name: row.full_name,
  };

  if (row.role === "student") {
    user.studentId = row.entity_id;
    const stuRes = await executeQuery<{ department: string }>(
      `SELECT department FROM students WHERE LOWER(student_id) = LOWER($1) LIMIT 1;`,
      [row.entity_id]
    );
    if (stuRes.rows.length > 0) {
      user.department = stuRes.rows[0].department;
    }
  } else if (row.role === "driver") {
    user.driverId = row.entity_id;
    const drvRes = await executeQuery<{ phone: string }>(
      `SELECT phone FROM drivers WHERE id = $1 LIMIT 1;`,
      [row.entity_id]
    );
    if (drvRes.rows.length > 0) {
      user.phone = drvRes.rows[0].phone;
    }
  }

  return user;
}

/**
 * Logout
 * Deletes session from PostgreSQL
 */
export async function logoutSession(tokenRaw: string): Promise<void> {
  if (!tokenRaw) return;
  await executeQuery(`DELETE FROM sessions WHERE token = $1;`, [tokenRaw.trim()]);
}
