import { and, count, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import { aiRuns } from "@/db/schema";
import { fail, ok, toErrorResponse } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Usage ledger for the signed-in researcher, denominated in studio tokens.
 * The underlying USD model cost is internal — it appears only in the admin
 * profitability view, never here.
 */
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
          tokens: sql<number>`coalesce(sum(${aiRuns.promptTokens} + ${aiRuns.completionTokens}), 0)`,
          failures: sql<number>`coalesce(sum(case when ${aiRuns.ok} then 0 else 1 end), 0)`,
        })
        .from(aiRuns)
        .where(and(eq(aiRuns.userId, user.id), eq(aiRuns.ok, true), gte(aiRuns.createdAt, since))),
      db
        .select({
          feature: aiRuns.feature,
          runs: count(),
          tokens: sql<number>`coalesce(sum(${aiRuns.promptTokens} + ${aiRuns.completionTokens}), 0)`,
        })
        .from(aiRuns)
        .where(and(eq(aiRuns.userId, user.id), eq(aiRuns.ok, true), gte(aiRuns.createdAt, since)))
        .groupBy(aiRuns.feature)
        .orderBy(desc(sql`sum(${aiRuns.promptTokens} + ${aiRuns.completionTokens})`)),
      db
        .select({
          model: aiRuns.model,
          provider: aiRuns.provider,
          runs: count(),
          tokens: sql<number>`coalesce(sum(${aiRuns.promptTokens} + ${aiRuns.completionTokens}), 0)`,
        })
        .from(aiRuns)
        .where(and(eq(aiRuns.userId, user.id), eq(aiRuns.ok, true), gte(aiRuns.createdAt, since)))
        .groupBy(aiRuns.model, aiRuns.provider)
        .orderBy(desc(count())),
      db
        .select({
          id: aiRuns.id,
          feature: aiRuns.feature,
          model: aiRuns.model,
          promptTokens: aiRuns.promptTokens,
          completionTokens: aiRuns.completionTokens,
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
        tokensSpent: Number(totals[0]?.tokens ?? 0),
        failures: Number(totals[0]?.failures ?? 0),
      },
      byFeature: byFeature.map((row) => ({ ...row, runs: Number(row.runs), tokens: Number(row.tokens) })),
      byModel: byModel.map((row) => ({ ...row, runs: Number(row.runs), tokens: Number(row.tokens) })),
      recent: recent.map((run) => ({ ...run, tokens: run.promptTokens + run.completionTokens })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
