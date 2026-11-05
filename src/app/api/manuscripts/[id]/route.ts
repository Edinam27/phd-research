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
    // The sections only need the URL's id, so they load alongside the access
    // check instead of queueing behind it — one less trip to Neon per page view.
    const [{ manuscript, notebook, role }, sections] = await Promise.all([
      loadManuscriptContext(id, user.id, user.isAdmin),
      loadSections(id),
    ]);

    // Just enough of each row for the evidence picker and the citation anchors.
    // The stored article text stays in the database.
    const evidence = await db
      .select({
        id: reviews.id,
        author: reviews.author,
        year: reviews.year,
        title: reviews.title,
        verdict: reviews.verdict,
      })
      .from(reviews)
      .where(eq(reviews.notebookId, manuscript.notebookId));
    const cited = selectEvidence(evidence, manuscript.evidenceIds);
    const anchors = cited.map((review) => `${review.author}${review.year ? ` (${review.year})` : ""}`);

    const template = getSections(manuscript.kind as never, manuscript.studyType as never);

    return ok({
      manuscript,
      notebook,
      role,
      sections,
      progress: sectionProgress(sections),
      evidence,
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
