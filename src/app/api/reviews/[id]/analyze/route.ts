import { eq } from "drizzle-orm";

import { db } from "@/db";
import { reviews } from "@/db/schema";
import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { canEdit, requireNotebookAccess } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { articleReviewMessages } from "@/lib/ai/prompts";
import { draftIsUsable, mapReviewDraft } from "@/lib/ai/map-review";
import { completeAndLog, extractJson } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

/**
 * Re-runs the AI reviewer against text already stored on the record — used when
 * the author pastes extra material or asks for a second opinion with a focus.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const rows = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    const review = rows[0];
    if (!review) return fail("Review not found.", 404);

    const { notebook, role } = await requireNotebookAccess(review.notebookId, user.id);
    if (!canEdit(role)) return fail("You have read-only access to this notebook.", 403);

    let body: { text?: string; focusNote?: string; save?: boolean } = {};
    try {
      body = await readJson<typeof body>(request);
    } catch {
      body = {};
    }

    const text = (body.text ?? review.sourceText ?? "").trim();
    if (text.length < 200) {
      return fail(
        "There is no stored article text for this record. Paste the article text first, or upload the file again.",
        422,
      );
    }

    const result = await completeAndLog(
      {
        tier: "reasoning",
        temperature: 0.2,
        maxTokens: 4000,
        messages: articleReviewMessages({
          notebook,
          sourceText: text,
          filename: review.sourceFilename,
          focusNote: body.focusNote ?? null,
        }),
      },
      { userId: user.id, notebookId: review.notebookId, feature: "article-review" },
    );

    const parsed = extractJson<Record<string, unknown>>(result.text);
    if (!parsed) {
      return fail("The model did not return usable JSON on this attempt.", 502, {
        raw: result.text.slice(0, 1200),
      });
    }

    const draft = mapReviewDraft(parsed);
    if (!draftIsUsable(draft)) {
      return fail("The model could not produce a usable taxonomy row from that text.", 502, { draft });
    }

    if (body.save) {
      const updated = await db
        .update(reviews)
        .set({
          author: draft.author || review.author,
          year: draft.year ?? review.year,
          title: draft.title || review.title,
          journal: draft.journal ?? review.journal,
          volume: draft.volume ?? review.volume,
          issue: draft.issue ?? review.issue,
          pages: draft.pages ?? review.pages,
          doi: draft.doi ?? review.doi,
          url: draft.url ?? review.url,
          citation: draft.citation ?? review.citation,
          problemsGaps: draft.problemsGaps ?? review.problemsGaps,
          objectives: draft.objectives ?? review.objectives,
          theory: draft.theory ?? review.theory,
          empiricalFindings: draft.empiricalFindings ?? review.empiricalFindings,
          methodology: draft.methodology ?? review.methodology,
          keyFindings: draft.keyFindings ?? review.keyFindings,
          limitations: draft.limitations ?? review.limitations,
          methodType: draft.methodType ?? review.methodType,
          sampleSize: draft.sampleSize ?? review.sampleSize,
          country: draft.country ?? review.country,
          context: draft.context ?? review.context,
          dataAnalysis: draft.dataAnalysis ?? review.dataAnalysis,
          keyVariables: draft.keyVariables.length ? draft.keyVariables : review.keyVariables,
          hypotheses: draft.hypotheses.length ? draft.hypotheses : review.hypotheses,
          gapTags: draft.gapTags.length ? draft.gapTags : review.gapTags,
          useInManuscript: draft.useInManuscript ?? review.useInManuscript,
          scoreRigour: draft.scoreRigour ?? review.scoreRigour,
          scoreRelevance: draft.scoreRelevance ?? review.scoreRelevance,
          scoreNovelty: draft.scoreNovelty ?? review.scoreNovelty,
          scoreClarity: draft.scoreClarity ?? review.scoreClarity,
          overallScore: draft.overallScore ?? review.overallScore,
          verdict: draft.verdict,
          strengths: draft.strengths ?? review.strengths,
          weaknesses: draft.weaknesses ?? review.weaknesses,
          status: review.status === "draft" ? "ai-drafted" : review.status,
          aiModel: result.model,
          aiReviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, id))
        .returning();

      return ok({ draft, saved: true, review: updated[0], model: result.model, usage: result.usage });
    }

    return ok({ draft, saved: false, model: result.model, usage: result.usage });
  } catch (error) {
    return toErrorResponse(error);
  }
}
