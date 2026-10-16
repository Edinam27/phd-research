import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { reviews } from "@/db/schema";
import { fail, readJson, toErrorResponse } from "@/lib/api";
import { canEdit, requireNotebookAccess } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { assistantMessages } from "@/lib/ai/prompts";
import { sseResponse, streamCompletion } from "@/lib/ai/provider";
import { assistantSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

/** Notebook-scoped supervisor. Streams markdown back over SSE. */
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { notebook, role } = await requireNotebookAccess(id, user.id);
    if (!canEdit(role)) return fail("You have read-only access to this notebook.", 403);

    const body = assistantSchema.parse(await readJson(request));

    const evidence = await db
      .select()
      .from(reviews)
      .where(eq(reviews.notebookId, id))
      .orderBy(desc(reviews.createdAt))
      .limit(80);

    const stream = streamCompletion(
      {
        tier: "reasoning",
        temperature: 0.4,
        maxTokens: 2200,
        messages: assistantMessages({
          notebook,
          reviews: evidence,
          history: body.history,
          question: body.question,
        }),
      },
      { userId: user.id, notebookId: id, feature: "chat" },
    );

    return sseResponse(stream);
  } catch (error) {
    return toErrorResponse(error);
  }
}
