import { eq } from "drizzle-orm";

import { db } from "@/db";
import { manuscriptSections, manuscripts } from "@/db/schema";
import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { canEdit } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { loadSectionContext } from "@/lib/manuscripts";
import { countWords } from "@/lib/utils";
import { sectionUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; sectionId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id, sectionId } = await params;
    const { section, role } = await loadSectionContext(id, sectionId, user.id);
    if (!canEdit(role)) return fail("You have read-only access to this notebook.", 403);

    const body = sectionUpdateSchema.parse(await readJson(request));
    const content = body.content ?? section.content;
    const status =
      body.status ??
      (content.trim().length === 0 ? "empty" : section.status === "empty" ? "drafting" : section.status);

    const updated = await db
      .update(manuscriptSections)
      .set({
        content,
        status,
        checklistState: body.checklistState ?? section.checklistState,
        updatedAt: new Date(),
      })
      .where(eq(manuscriptSections.id, sectionId))
      .returning();

    await db.update(manuscripts).set({ updatedAt: new Date() }).where(eq(manuscripts.id, id));

    return ok({ section: updated[0], words: countWords(content) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
