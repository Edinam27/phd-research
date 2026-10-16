import { eq } from "drizzle-orm";

import { db } from "@/db";
import { notebooks, reviews } from "@/db/schema";
import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { AccessError, canEdit, requireNotebookAccess } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { averageAppraisal } from "@/lib/taxonomy";
import { reviewUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function loadReview(reviewId: string, userId: string) {
  const rows = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
  const review = rows[0];
  if (!review) throw new AccessError("Review not found.", 404);
  const access = await requireNotebookAccess(review.notebookId, userId);
  return { review, access };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { review, access } = await loadReview(id, user.id);
    return ok({ review, notebook: access.notebook, role: access.role });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { review, access } = await loadReview(id, user.id);
    if (!canEdit(access.role)) return fail("You have read-only access to this notebook.", 403);

    const body = reviewUpdateSchema.parse(await readJson(request));

    const nextScores = {
      scoreRigour: body.scoreRigour === undefined ? review.scoreRigour : body.scoreRigour,
      scoreRelevance: body.scoreRelevance === undefined ? review.scoreRelevance : body.scoreRelevance,
      scoreNovelty: body.scoreNovelty === undefined ? review.scoreNovelty : body.scoreNovelty,
      scoreClarity: body.scoreClarity === undefined ? review.scoreClarity : body.scoreClarity,
    };

    const clearsScores =
      body.scoreRigour === null &&
      body.scoreRelevance === null &&
      body.scoreNovelty === null &&
      body.scoreClarity === null;

    const overall =
      body.overallScore !== undefined
        ? body.overallScore
        : clearsScores
          ? null
          : (averageAppraisal(nextScores) ?? review.overallScore);

    const updated = await db
      .update(reviews)
      .set({
        ...body,
        overallScore: overall,
        updatedAt: new Date(),
        sourceText:
          body.sourceText === undefined
            ? review.sourceText
            : body.sourceText === null
              ? null
              : body.sourceText.slice(0, 400000),
      })
      .where(eq(reviews.id, id))
      .returning();

    await db.update(notebooks).set({ updatedAt: new Date() }).where(eq(notebooks.id, review.notebookId));

    return ok({ review: updated[0] });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { review, access } = await loadReview(id, user.id);
    if (!canEdit(access.role)) return fail("You have read-only access to this notebook.", 403);

    await db.delete(reviews).where(eq(reviews.id, id));
    return ok({ deleted: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
