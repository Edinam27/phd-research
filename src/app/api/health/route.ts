import { sql } from "drizzle-orm";

import { db } from "@/db";
import { ok, toErrorResponse } from "@/lib/api";
import { aiStatus } from "@/lib/ai/provider";

export const runtime = "nodejs";

/** Used by the setup screen to confirm Neon and the model provider are reachable. */
export async function GET() {
  try {
    let database = { ok: false, message: "DATABASE_URL is not set." };
    try {
      await db.execute(sql`select 1`);
      database = { ok: true, message: "Neon connection is live." };
    } catch (error) {
      database = {
        ok: false,
        message: error instanceof Error ? error.message : "Could not reach the database.",
      };
    }

    const ai = aiStatus();

    return ok({
      database,
      ai: { ...ai, ok: ai.configured },
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
