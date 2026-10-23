import { eq } from "drizzle-orm";

import { db } from "@/db";
import { manuscripts, reviews } from "@/db/schema";
import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { canEdit } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { getSections } from "@/lib/guideline";
import {
  loadManuscriptContext,
  loadSections,
  sectionProgress,
  selectEvidence,
  syncSections,
  uncitedAnchors,
} from "@/lib/manuscripts";
import { manuscriptUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { manuscript, notebook, role } = await loadManuscriptContext(id, user.id);
    const sections = await loadSections(id);

    const evidence = await db.select().from(reviews).where(eq(reviews.notebookId, manuscript.notebookId));
    const cited = selectEvidence(evidence, manuscript.evidenceIds);
    const anchors = cited.map((review) => `${review.author}${review.year ? ` (${review.year})` : ""}`);

    const template = getSections(manuscript.kind as never, manuscript.studyType as never);

    return ok({
      manuscript,
      notebook,
      role,
      sections,
      progress: sectionProgress(sections),
      evidence: evidence.map((review) => ({
        id: review.id,
        author: review.author,
        year: review.year,
        title: review.title,
        verdict: review.verdict,
      })),
      uncited: uncitedAnchors(
        sections.map((section) => section.content).join("\n\n"),
        anchors,
      ),
      template: Object.fromEntries(
        template.map((section) => [
          section.key,
          {
            heading: section.heading,
            checklist: section.checklist,
            guidance: section.guidance,
            tables: section.tables ?? [],
          },
        ]),
      ),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { manuscript, role } = await loadManuscriptContext(id, user.id);
    if (!canEdit(role)) return fail("You have read-only access to this notebook.", 403);

    const body = manuscriptUpdateSchema.parse(await readJson(request));
    const kind = body.kind ?? (manuscript.kind as never);
    const studyType = body.studyType ?? (manuscript.studyType as never);

    const updated = await db
      .update(manuscripts)
      .set({
        title: body.title ?? manuscript.title,
        kind,
        researchType: body.researchType ?? manuscript.researchType,
        studyType,
        evidenceIds: body.evidenceIds ?? manuscript.evidenceIds,
        targetJournal: body.targetJournal === undefined ? manuscript.targetJournal : body.targetJournal,
        status: body.status ?? manuscript.status,
        abstract: body.abstract === undefined ? manuscript.abstract : body.abstract,
        keywords: body.keywords ?? manuscript.keywords,
        updatedAt: new Date(),
      })
      .where(eq(manuscripts.id, id))
      .returning();

    if (kind !== manuscript.kind || studyType !== manuscript.studyType) {
      await syncSections(id, kind, studyType);
    }

    const sections = await loadSections(id);
    return ok({ manuscript: updated[0], sections, progress: sectionProgress(sections) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { role } = await loadManuscriptContext(id, user.id);
    if (!canEdit(role)) return fail("You have read-only access to this notebook.", 403);

    await db.delete(manuscripts).where(eq(manuscripts.id, id));
    return ok({ deleted: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
