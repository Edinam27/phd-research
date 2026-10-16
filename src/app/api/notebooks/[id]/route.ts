import { and, count, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { aiRuns, manuscripts, notebookMembers, notebooks, researchQueries, reviews, users } from "@/db/schema";
import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { requireNotebookAccess } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { memberSchema, notebookUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { notebook, role } = await requireNotebookAccess(id, user.id);

    const [reviewCount, manuscriptCount, researchCount, spend, members] = await Promise.all([
      db.select({ total: count() }).from(reviews).where(eq(reviews.notebookId, id)),
      db.select({ total: count() }).from(manuscripts).where(eq(manuscripts.notebookId, id)),
      db.select({ total: count() }).from(researchQueries).where(eq(researchQueries.notebookId, id)),
      db
        .select({ cost: sql<number>`coalesce(sum(${aiRuns.costUsd}), 0)`, runs: count() })
        .from(aiRuns)
        .where(and(eq(aiRuns.notebookId, id), eq(aiRuns.ok, true))),
      db
        .select({ id: users.id, name: users.name, email: users.email, role: notebookMembers.role })
        .from(notebookMembers)
        .innerJoin(users, eq(users.id, notebookMembers.userId))
        .where(eq(notebookMembers.notebookId, id)),
    ]);

    return ok({
      notebook,
      role,
      members,
      stats: {
        reviews: Number(reviewCount[0]?.total ?? 0),
        manuscripts: Number(manuscriptCount[0]?.total ?? 0),
        researchQueries: Number(researchCount[0]?.total ?? 0),
        spendUsd: Number(spend[0]?.cost ?? 0),
        aiRuns: Number(spend[0]?.runs ?? 0),
      },
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
    const { notebook, role } = await requireNotebookAccess(id, user.id);
    if (role === "viewer") return fail("You have read-only access to this notebook.", 403);

    const body = notebookUpdateSchema.parse(await readJson(request));

    const updated = await db
      .update(notebooks)
      .set({
        title: body.title ?? notebook.title,
        description: body.description === undefined ? notebook.description : body.description,
        researchArea: body.researchArea === undefined ? notebook.researchArea : body.researchArea,
        studyType: body.studyType ?? notebook.studyType,
        status: body.status ?? notebook.status,
        targetJournal: body.targetJournal === undefined ? notebook.targetJournal : body.targetJournal,
        keyVariables: body.keyVariables ?? notebook.keyVariables,
        researchProblem: body.researchProblem === undefined ? notebook.researchProblem : body.researchProblem,
        researchObjectives: body.researchObjectives ?? notebook.researchObjectives,
        theory: body.theory === undefined ? notebook.theory : body.theory,
        context: body.context === undefined ? notebook.context : body.context,
        accent: body.accent ?? notebook.accent,
        updatedAt: new Date(),
      })
      .where(eq(notebooks.id, id))
      .returning();

    return ok({ notebook: updated[0] });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { notebook } = await requireNotebookAccess(id, user.id);
    if (notebook.ownerId !== user.id) return fail("Only the notebook owner can delete it.", 403);

    await db.delete(notebooks).where(eq(notebooks.id, id));
    return ok({ deleted: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Collaborators: invite a supervisor or co-author by email. */
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { notebook } = await requireNotebookAccess(id, user.id);
    if (notebook.ownerId !== user.id) return fail("Only the notebook owner can add collaborators.", 403);

    const body = memberSchema.parse(await readJson(request));

    const found = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    const invitee = found[0];
    if (!invitee) {
      return fail(
        "No account uses that email yet. Ask your collaborator to register first, then add them.",
        404,
      );
    }
    if (invitee.id === user.id) return fail("You already own this notebook.", 409);

    await db
      .insert(notebookMembers)
      .values({ notebookId: id, userId: invitee.id, role: body.role })
      .onConflictDoUpdate({
        target: [notebookMembers.notebookId, notebookMembers.userId],
        set: { role: body.role },
      });

    return ok({ member: invitee, role: body.role }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { notebook } = await requireNotebookAccess(id, user.id);
    if (notebook.ownerId !== user.id) return fail("Only the notebook owner can manage collaborators.", 403);

    const body = await readJson<{ userId?: string }>(request);
    if (!body.userId) return fail("A userId is required.", 422);

    await db
      .delete(notebookMembers)
      .where(and(eq(notebookMembers.notebookId, id), eq(notebookMembers.userId, body.userId)));

    return ok({ removed: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
