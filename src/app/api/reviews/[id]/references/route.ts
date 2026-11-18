import { eq } from "drizzle-orm";

import { db } from "@/db";
import { reviews } from "@/db/schema";
import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { canEdit, requireNotebookAccess } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { mapCitedReferences } from "@/lib/ai/map-review";
import { referenceExtractionMessages } from "@/lib/ai/prompts";
import { completeAndLog, extractJson, publicUsage } from "@/lib/ai/provider";
import { referenceAnchor } from "@/lib/references";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

/** Below this, there is not enough text to find a reference list in. */
const MIN_SOURCE_CHARS = 400;

/**
 * Reads one reviewed article again — this time only for the works it leans on —
 * from the source text already stored on the row. Articles reviewed before
 * reference extraction existed can be backfilled without re-uploading anything.
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

    const body = await readJson<{ force?: boolean }>(request).catch(() => ({ force: false }));

    const sourceText = review.sourceText?.trim() ?? "";
    if (sourceText.length < MIN_SOURCE_CHARS) {
      return fail(
        "This article has no stored text to read, so its reference list cannot be extracted. Re-run the article review with the source attached.",
        422,
      );
    }

    if (!body?.force && review.citedReferences.length > 0) {
      return ok({ references: review.citedReferences, reused: true });
    }

    const result = await completeAndLog(
      {
        tier: "reasoning",
        temperature: 0.1,
        maxTokens: 2500,
        messages: referenceExtractionMessages({
          notebook,
          sourceText,
          articleAnchor: referenceAnchor({ authors: review.author, year: review.year }),
        }),
      },
      { userId: user.id, notebookId: review.notebookId, feature: "reference-extraction" },
    );

    const parsed = extractJson<Record<string, unknown>>(result.text);
    if (!parsed) {
      return fail("The model did not return usable JSON for the reference list. Try again.", 502, {
        raw: result.text.slice(0, 1200),
      });
    }

    const references = mapCitedReferences(parsed.citedReferences ?? parsed.references ?? parsed);

    const updated = await db
      .update(reviews)
      .set({ citedReferences: references, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();

    return ok({
      references,
      referencedCount: references.length,
      reviewedCount: updated[0]?.citedReferences.length ?? references.length,
      model: result.model,
      usage: publicUsage(result.usage),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
