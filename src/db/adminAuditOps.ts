import { desc } from "drizzle-orm";
import { db } from "./index.ts";
import { adminAuditLogs } from "./schema.ts";

export async function recordAdminAudit(input: {
  adminId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: string;
}) {
  const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const inserted = await db
    .insert(adminAuditLogs)
    .values({
      id,
      adminId: input.adminId,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      detail: input.detail ?? null,
    })
    .returning();
  return inserted[0];
}

export async function listAdminAuditLogs(limit = 100) {
  return db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(limit);
}
