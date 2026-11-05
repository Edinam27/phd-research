import { count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  aiRuns,
  manuscriptSections,
  manuscripts,
  notebookMembers,
  notebooks,
  researchQueries,
  reviews,
  users,
} from "@/db/schema";
import { fail, ok, toErrorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/access";
import { getCurrentUser, isAdministrator } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * The studio owner's control room: every account and every workspace in one
 * payload. Guarded by requireAdmin, and deliberately read-only — an
 * administrator opens other people's notebooks as a viewer.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);
    requireAdmin(user);

    const [
      userTotals,
      notebookTotals,
      reviewTotals,
      manuscriptTotals,
      researchTotals,
      aiTotals,
      accounts,
      ownedNotebooks,
      sharedNotebooks,
      authoredReviews,
      authoredManuscripts,
      userSpend,
      workspaces,
      workspaceReviews,
      workspaceManuscripts,
      workspaceCollaborators,
      workspaceSpend,
      drafts,
      draftSections,
    ] = await Promise.all([
      db
        .select({ total: count() })
        .from(users),
      db.select({ total: count() }).from(notebooks),
      db.select({ total: count() }).from(reviews),
      db.select({ total: count() }).from(manuscripts),
      db.select({ total: count() }).from(researchQueries),
      db
        .select({
          total: count(),
          cost: sql<number>`coalesce(sum(${aiRuns.costUsd}), 0)`,
          failures: sql<number>`coalesce(sum(case when ${aiRuns.ok} then 0 else 1 end), 0)`,
        })
        .from(aiRuns),

      // Everyone who has an account, newest first, with what they carry.
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          institution: users.institution,
          discipline: users.discipline,
          academicRole: users.academicRole,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt)),
      db
        .select({ userId: notebooks.ownerId, total: count() })
        .from(notebooks)
        .groupBy(notebooks.ownerId),
      db
        .select({ userId: notebookMembers.userId, total: count() })
        .from(notebookMembers)
        .groupBy(notebookMembers.userId),
      db
        .select({ userId: reviews.createdById, total: count() })
        .from(reviews)
        .groupBy(reviews.createdById),
      db
        .select({ userId: manuscripts.createdById, total: count() })
        .from(manuscripts)
        .groupBy(manuscripts.createdById),
      db
        .select({
          userId: aiRuns.userId,
          runs: count(),
          cost: sql<number>`coalesce(sum(${aiRuns.costUsd}), 0)`,
        })
        .from(aiRuns)
        .groupBy(aiRuns.userId),

      // Every workspace, with its owner and its shape.
      db
        .select({
          id: notebooks.id,
          title: notebooks.title,
          researchArea: notebooks.researchArea,
          researchType: notebooks.researchType,
          studyType: notebooks.studyType,
          status: notebooks.status,
          targetJournal: notebooks.targetJournal,
          ownerName: users.name,
          ownerEmail: users.email,
          createdAt: notebooks.createdAt,
          updatedAt: notebooks.updatedAt,
        })
        .from(notebooks)
        .innerJoin(users, eq(users.id, notebooks.ownerId))
        .orderBy(desc(notebooks.updatedAt)),
      db
        .select({ notebookId: reviews.notebookId, total: count() })
        .from(reviews)
        .groupBy(reviews.notebookId),
      db
        .select({ notebookId: manuscripts.notebookId, total: count() })
        .from(manuscripts)
        .groupBy(manuscripts.notebookId),
      db
        .select({ notebookId: notebookMembers.notebookId, total: count() })
        .from(notebookMembers)
        .groupBy(notebookMembers.notebookId),
      db
        .select({
          notebookId: aiRuns.notebookId,
          cost: sql<number>`coalesce(sum(${aiRuns.costUsd}), 0)`,
        })
        .from(aiRuns)
        .groupBy(aiRuns.notebookId),

      // Every draft in the studio, newest first.
      db
        .select({
          id: manuscripts.id,
          title: manuscripts.title,
          kind: manuscripts.kind,
          researchType: manuscripts.researchType,
          studyType: manuscripts.studyType,
          status: manuscripts.status,
          updatedAt: manuscripts.updatedAt,
          notebookId: manuscripts.notebookId,
          notebookTitle: notebooks.title,
          createdByName: users.name,
        })
        .from(manuscripts)
        .innerJoin(notebooks, eq(notebooks.id, manuscripts.notebookId))
        .innerJoin(users, eq(users.id, manuscripts.createdById))
        .orderBy(desc(manuscripts.updatedAt)),
      db
        .select({
          manuscriptId: manuscriptSections.manuscriptId,
          total: count(),
          complete: sql<number>`coalesce(sum(case when ${manuscriptSections.status} = 'complete' then 1 else 0 end), 0)`,
          words: sql<number>`coalesce(sum(case when btrim(${manuscriptSections.content}) = '' then 0 else array_length(regexp_split_to_array(btrim(${manuscriptSections.content}), '\\s+'), 1) end), 0)`,
        })
        .from(manuscriptSections)
        .groupBy(manuscriptSections.manuscriptId),
    ]);

    const total = (rows: { total: unknown }[]): number => Number(rows[0]?.total ?? 0);

    // The flag lives in the database; the environment allowlist is the bootstrap,
    // so an administrator is whoever either of them says is one.
    const accountsWithAccess = accounts.map((account) => ({
      ...account,
      isAdmin: isAdministrator(account),
    }));

    return ok({
      generatedAt: new Date().toISOString(),
      viewer: { id: user.id, name: user.name, email: user.email },
      totals: {
        users: total(userTotals),
        admins: accountsWithAccess.filter((account) => account.isAdmin).length,
        notebooks: total(notebookTotals),
        reviews: total(reviewTotals),
        manuscripts: total(manuscriptTotals),
        researchQueries: total(researchTotals),
        aiRuns: total(aiTotals),
        aiCostUsd: Number(aiTotals[0]?.cost ?? 0),
        aiFailures: Number(aiTotals[0]?.failures ?? 0),
      },
      users: accountsWithAccess.map((account) => ({
        ...account,
        notebooksOwned: Number(ownedNotebooks.find((row) => row.userId === account.id)?.total ?? 0),
        sharedInto: Number(sharedNotebooks.find((row) => row.userId === account.id)?.total ?? 0),
        reviews: Number(authoredReviews.find((row) => row.userId === account.id)?.total ?? 0),
        manuscripts: Number(authoredManuscripts.find((row) => row.userId === account.id)?.total ?? 0),
        aiRuns: Number(userSpend.find((row) => row.userId === account.id)?.runs ?? 0),
        aiCostUsd: Number(userSpend.find((row) => row.userId === account.id)?.cost ?? 0),
      })),
      notebooks: workspaces.map((workspace) => ({
        ...workspace,
        reviews: Number(workspaceReviews.find((row) => row.notebookId === workspace.id)?.total ?? 0),
        manuscripts: Number(workspaceManuscripts.find((row) => row.notebookId === workspace.id)?.total ?? 0),
        collaborators: Number(
          workspaceCollaborators.find((row) => row.notebookId === workspace.id)?.total ?? 0,
        ),
        spendUsd: Number(workspaceSpend.find((row) => row.notebookId === workspace.id)?.cost ?? 0),
      })),
      manuscripts: drafts.map((draft) => {
        const sections = draftSections.find((row) => row.manuscriptId === draft.id);
        return {
          ...draft,
          sections: Number(sections?.total ?? 0),
          sectionsComplete: Number(sections?.complete ?? 0),
          words: Number(sections?.words ?? 0),
        };
      }),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
