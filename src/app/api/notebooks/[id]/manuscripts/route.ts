import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { manuscripts, notebooks } from "@/db/schema";
import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { canEdit, requireNotebookAccess } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { createManuscriptWithSections, loadSections, sectionProgress } from "@/lib/manuscripts";
import { getSections } from "@/lib/guideline";
import { manuscriptSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    await requireNotebookAccess(id, user.id);

    const rows = await db
      .select()
      .from(manuscripts)
      .where(eq(manuscripts.notebookId, id))
      .orderBy(desc(manuscripts.updatedAt));

    const withProgress = await Promise.all(
      rows.map(async (manuscript) => {
        const sections = await loadSections(manuscript.id);
        return { ...manuscript, progress: sectionProgress(sections) };
      }),
    );

    return ok({ manuscripts: withProgress });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { notebook, role } = await requireNotebookAccess(id, user.id);
    if (!canEdit(role)) return fail("You have read-only access to this notebook.", 403);

    const body = manuscriptSchema.parse(await readJson(request));
    const studyType = body.studyType ?? (notebook.studyType as never);
    const researchType = body.researchType ?? (notebook.researchType as never);

    const manuscript = await createManuscriptWithSections({
      notebookId: id,
      createdById: user.id,
      title: body.title,
      kind: body.kind,
      studyType,
      researchType,
      evidenceIds: body.evidenceIds,
      targetJournal: body.targetJournal ?? notebook.targetJournal,
      status: body.status,
      abstract: body.abstract ?? null,
      keywords: body.keywords,
    });

    const sections = await loadSections(manuscript.id);

    return ok(
      {
        manuscript,
        sections,
        template: getSections(manuscript.kind as never, manuscript.studyType as never).map(
          (section) => ({
            key: section.key,
            heading: section.heading,
            checklist: section.checklist,
            guidance: section.guidance,
            tables: section.tables ?? [],
          }),
        ),
      },
      201,
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { role } = await requireNotebookAccess(id, user.id);
    if (!canEdit(role)) return fail("You have read-only access to this notebook.", 403);

    await db.delete(manuscripts).where(eq(manuscripts.notebookId, id));
    await db.update(notebooks).set({ updatedAt: new Date() }).where(eq(notebooks.id, id));
    return ok({ deleted: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
