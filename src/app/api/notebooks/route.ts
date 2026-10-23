import { and, count, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { aiRuns, manuscripts, notebooks, reviews } from "@/db/schema";
import { ok, readJson, toErrorResponse } from "@/lib/api";
import { listNotebooksForUser } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { fail } from "@/lib/api";
import { notebookSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const rows = await listNotebooksForUser(user.id);
    if (rows.length === 0) return ok({ notebooks: [] });

    const ids = rows.map((row) => row.notebook.id);

    const [reviewCounts, manuscriptCounts, spend] = await Promise.all([
      db
        .select({ notebookId: reviews.notebookId, total: count() })
        .from(reviews)
        .where(inArray(reviews.notebookId, ids))
        .groupBy(reviews.notebookId),
      db
        .select({ notebookId: manuscripts.notebookId, total: count() })
        .from(manuscripts)
        .where(inArray(manuscripts.notebookId, ids))
        .groupBy(manuscripts.notebookId),
      db
        .select({ notebookId: aiRuns.notebookId, cost: sql<number>`coalesce(sum(${aiRuns.costUsd}), 0)` })
        .from(aiRuns)
        .where(and(inArray(aiRuns.notebookId, ids), eq(aiRuns.ok, true)))
        .groupBy(aiRuns.notebookId),
    ]);

    const reviewMap = new Map(reviewCounts.map((row) => [row.notebookId, Number(row.total)]));
    const manuscriptMap = new Map(manuscriptCounts.map((row) => [row.notebookId, Number(row.total)]));
    const spendMap = new Map(spend.map((row) => [row.notebookId, Number(row.cost)]));

    return ok({
      notebooks: rows.map((row) => ({
        ...row.notebook,
        role: row.role,
        reviewCount: reviewMap.get(row.notebook.id) ?? 0,
        manuscriptCount: manuscriptMap.get(row.notebook.id) ?? 0,
        spendUsd: spendMap.get(row.notebook.id) ?? 0,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const body = notebookSchema.parse(await readJson(request));

    const inserted = await db
      .insert(notebooks)
      .values({
        ownerId: user.id,
        title: body.title,
        description: body.description ?? null,
        researchArea: body.researchArea ?? null,
        researchType: body.researchType,
        studyType: body.studyType,
        status: body.status,
        targetJournal: body.targetJournal ?? null,
        keyVariables: body.keyVariables,
        researchProblem: body.researchProblem ?? null,
        researchObjectives: body.researchObjectives,
        theory: body.theory ?? null,
        context: body.context ?? null,
        accent: body.accent,
      })
      .returning();

    return ok({ notebook: inserted[0] }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
