import { and, count, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import { aiRuns } from "@/db/schema";
import { fail, ok, toErrorResponse } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/** Cost and usage ledger — keeps the researcher honest about what the AI spend is. */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const days = Math.min(180, Math.max(1, Number(new URL(request.url).searchParams.get("days") ?? 30)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totals, byFeature, byModel, recent] = await Promise.all([
      db
        .select({
          runs: count(),
          cost: sql<number>`coalesce(sum(${aiRuns.costUsd}), 0)`,
          promptTokens: sql<number>`coalesce(sum(${aiRuns.promptTokens}), 0)`,
          completionTokens: sql<number>`coalesce(sum(${aiRuns.completionTokens}), 0)`,
          failures: sql<number>`coalesce(sum(case when ${aiRuns.ok} then 0 else 1 end), 0)`,
        })
        .from(aiRuns)
        .where(and(eq(aiRuns.userId, user.id), gte(aiRuns.createdAt, since))),
      db
        .select({
          feature: aiRuns.feature,
          runs: count(),
          cost: sql<number>`coalesce(sum(${aiRuns.costUsd}), 0)`,
        })
        .from(aiRuns)
        .where(and(eq(aiRuns.userId, user.id), gte(aiRuns.createdAt, since)))
        .groupBy(aiRuns.feature)
        .orderBy(desc(sql`sum(${aiRuns.costUsd})`)),
      db
        .select({
          model: aiRuns.model,
          provider: aiRuns.provider,
          runs: count(),
          cost: sql<number>`coalesce(sum(${aiRuns.costUsd}), 0)`,
        })
        .from(aiRuns)
        .where(and(eq(aiRuns.userId, user.id), gte(aiRuns.createdAt, since)))
        .groupBy(aiRuns.model, aiRuns.provider)
        .orderBy(desc(count())),
      db
        .select({
          id: aiRuns.id,
          feature: aiRuns.feature,
          model: aiRuns.model,
          costUsd: aiRuns.costUsd,
          latencyMs: aiRuns.latencyMs,
          ok: aiRuns.ok,
          errorText: aiRuns.errorText,
          createdAt: aiRuns.createdAt,
          notebookId: aiRuns.notebookId,
        })
        .from(aiRuns)
        .where(eq(aiRuns.userId, user.id))
        .orderBy(desc(aiRuns.createdAt))
        .limit(40),
    ]);

    return ok({
      window: { days, since },
      totals: {
        runs: Number(totals[0]?.runs ?? 0),
        costUsd: Number(totals[0]?.cost ?? 0),
        promptTokens: Number(totals[0]?.promptTokens ?? 0),
        completionTokens: Number(totals[0]?.completionTokens ?? 0),
        failures: Number(totals[0]?.failures ?? 0),
      },
      byFeature: byFeature.map((row) => ({ ...row, runs: Number(row.runs), cost: Number(row.cost) })),
      byModel: byModel.map((row) => ({ ...row, runs: Number(row.runs), cost: Number(row.cost) })),
      recent,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
