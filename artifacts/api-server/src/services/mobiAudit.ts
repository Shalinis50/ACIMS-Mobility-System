import { db } from "../../../../src/db/index.ts";
import { mobiQueryLogs } from "../../../../src/db/schema.ts";

export async function logMobiQuery(input: {
  studentId: string;
  intent: string;
  toolsCalled: string[];
  success: boolean;
}) {
  try {
    await db.insert(mobiQueryLogs).values({
      id: `mobi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      studentId: input.studentId,
      intent: input.intent,
      toolsCalled: JSON.stringify(input.toolsCalled),
      success: input.success,
    });
  } catch (err) {
    console.warn("[MOBI audit]", err instanceof Error ? err.message : err);
  }
}
