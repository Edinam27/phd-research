import { and, desc, eq, or } from "drizzle-orm";

import { db } from "@/db";
import { notebookMembers, notebooks, type Notebook } from "@/db/schema";

export type NotebookRole = "owner" | "editor" | "viewer";

export type NotebookAccess = {
  notebook: Notebook;
  role: NotebookRole;
};

export class AccessError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = "AccessError";
    this.status = status;
  }
}

/** Every notebook the user owns or has been invited into. */
export async function listNotebooksForUser(userId: string): Promise<
  { notebook: Notebook; role: NotebookRole }[]
> {
  const rows = await db
    .select({ notebook: notebooks, memberRole: notebookMembers.role })
    .from(notebooks)
    .leftJoin(
      notebookMembers,
      and(eq(notebookMembers.notebookId, notebooks.id), eq(notebookMembers.userId, userId)),
    )
    .where(or(eq(notebooks.ownerId, userId), eq(notebookMembers.userId, userId)))
    .orderBy(desc(notebooks.updatedAt));

  return rows.map((row) => ({
    notebook: row.notebook,
    role: (row.notebook.ownerId === userId ? "owner" : (row.memberRole as NotebookRole)) ?? "viewer",
  }));
}

export async function getNotebookAccess(
  notebookId: string,
  userId: string,
  isAdmin = false,
): Promise<NotebookAccess | null> {
  if (!isUuid(notebookId)) return null;

  const rows = await db
    .select({ notebook: notebooks, memberRole: notebookMembers.role })
    .from(notebooks)
    .leftJoin(
      notebookMembers,
      and(eq(notebookMembers.notebookId, notebooks.id), eq(notebookMembers.userId, userId)),
    )
    .where(eq(notebooks.id, notebookId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.notebook.ownerId === userId) return { notebook: row.notebook, role: "owner" };
  if (row.memberRole) return { notebook: row.notebook, role: row.memberRole as NotebookRole };
  // An administrator may open any workspace, but only ever as a viewer, so
  // every write path keeps turning them away.
  if (isAdmin) return { notebook: row.notebook, role: "viewer" };
  return null;
}

/** Throws when the notebook is missing from the user's workspace. */
export async function requireNotebookAccess(
  notebookId: string,
  userId: string,
  isAdmin = false,
): Promise<NotebookAccess> {
  const access = await getNotebookAccess(notebookId, userId, isAdmin);
  if (!access) throw new AccessError("Notebook not found, or you do not have access to it.", 404);
  return access;
}

/** Guards the cross-workspace administrator area. */
export function requireAdmin(user: { isAdmin: boolean }): void {
  if (!user.isAdmin) throw new AccessError("This area is for studio administrators.", 403);
}

export function canEdit(role: NotebookRole): boolean {
  return role === "owner" || role === "editor";
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
