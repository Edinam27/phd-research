import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { notebooks, reviews } from "@/db/schema";
import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { requireNotebookAccess, canEdit } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { averageAppraisal } from "@/lib/taxonomy";
import { reviewSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    await requireNotebookAccess(id, user.id);

    const url = new URL(request.url);
    const search = url.searchParams.get("q")?.trim();
    const verdict = url.searchParams.get("verdict")?.trim();

    const filters = [eq(reviews.notebookId, id)];
    if (search) {
      const pattern = `%${search}%`;
      const searchFilter = or(
        ilike(reviews.title, pattern),
        ilike(reviews.author, pattern),
        ilike(reviews.journal, pattern),
        ilike(reviews.keyFindings, pattern),
        // gapTags is jsonb, which has no `ilike` operator — cast it to text first.
        sql`${reviews.gapTags}::text ilike ${pattern}`,
      );
      if (searchFilter) filters.push(searchFilter);
    }
    if (verdict && verdict !== "all") filters.push(eq(reviews.verdict, verdict));

    // The manuscript picker only needs enough of each row to render a title,
    // so it never pulls the stored source text across the wire.
    if (url.searchParams.get("fields") === "compact") {
      const compact = await db
        .select({
          id: reviews.id,
          author: reviews.author,
          year: reviews.year,
          title: reviews.title,
          verdict: reviews.verdict,
        })
        .from(reviews)
        .where(and(...filters))
        .orderBy(desc(reviews.createdAt));

      return ok({ reviews: compact });
    }

    const rows = await db
      .select()
      .from(reviews)
      .where(and(...filters))
      .orderBy(desc(reviews.createdAt));

    return ok({ reviews: rows });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { role } = await requireNotebookAccess(id, user.id);
    if (!canEdit(role)) return fail("You have read-only access to this notebook.", 403);

    const body = reviewSchema.parse(await readJson(request));
    if (!body.title.trim() && !body.author.trim()) {
      return fail("A review needs at least a title or an author.", 422);
    }

    const overall =
      body.overallScore ??
      averageAppraisal({
        scoreRigour: body.scoreRigour ?? null,
        scoreRelevance: body.scoreRelevance ?? null,
        scoreNovelty: body.scoreNovelty ?? null,
        scoreClarity: body.scoreClarity ?? null,
      });

    const inserted = await db
      .insert(reviews)
      .values({
        notebookId: id,
        createdById: user.id,
        author: body.author,
        year: body.year ?? null,
        title: body.title,
        journal: body.journal ?? null,
        volume: body.volume ?? null,
        issue: body.issue ?? null,
        pages: body.pages ?? null,
        doi: body.doi ?? null,
        url: body.url ?? null,
        citation: body.citation ?? null,
        problemsGaps: body.problemsGaps ?? null,
        objectives: body.objectives ?? null,
        theory: body.theory ?? null,
        empiricalFindings: body.empiricalFindings ?? null,
        methodology: body.methodology ?? null,
        keyFindings: body.keyFindings ?? null,
        limitations: body.limitations ?? null,
        methodType: body.methodType ?? null,
        sampleSize: body.sampleSize ?? null,
        country: body.country ?? null,
        context: body.context ?? null,
        dataAnalysis: body.dataAnalysis ?? null,
        keyVariables: body.keyVariables,
        hypotheses: body.hypotheses,
        gapTags: body.gapTags,
        useInManuscript: body.useInManuscript ?? null,
        scoreRigour: body.scoreRigour ?? null,
        scoreRelevance: body.scoreRelevance ?? null,
        scoreNovelty: body.scoreNovelty ?? null,
        scoreClarity: body.scoreClarity ?? null,
        overallScore: overall ?? null,
        verdict: body.verdict,
        strengths: body.strengths ?? null,
        weaknesses: body.weaknesses ?? null,
        reviewerNotes: body.reviewerNotes ?? null,
        status: body.status,
        sourceKind: body.sourceKind,
        sourceFilename: body.sourceFilename ?? null,
        sourceText: body.sourceText ? body.sourceText.slice(0, 400000) : null,
        sourceChars: body.sourceChars ?? (body.sourceText ? body.sourceText.length : null),
        aiModel: body.aiModel ?? null,
        aiReviewedAt: body.aiModel ? new Date() : null,
      })
      .returning();

    await db.update(notebooks).set({ updatedAt: new Date() }).where(eq(notebooks.id, id));

    return ok({ review: inserted[0] }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { role } = await requireNotebookAccess(id, user.id);
    if (!canEdit(role)) return fail("You have read-only access to this notebook.", 403);

    const body = await readJson<{ reviewIds?: string[] }>(request);
    if (!body.reviewIds?.length) return fail("Select at least one review to delete.", 422);

    const deleted = await db
      .delete(reviews)
      .where(and(eq(reviews.notebookId, id), inArray(reviews.id, body.reviewIds)))
      .returning({ id: reviews.id });

    return ok({ deleted: deleted.length });
  } catch (error) {
    return toErrorResponse(error);
  }
}
