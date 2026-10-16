import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { researchQueries } from "@/db/schema";
import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { canEdit, requireNotebookAccess } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { researchMessages } from "@/lib/ai/prompts";
import { completeAndLog, extractJson } from "@/lib/ai/provider";
import { researchQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

export type GroundedAnswer = {
  answer: string;
  keySources: { title: string; url: string }[];
  evidenceStrength: string;
  gaps: string[];
  nextSearches: string[];
};

function asStringList(value: unknown, cap = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : JSON.stringify(entry)))
    .filter((entry) => entry.length > 0)
    .slice(0, cap);
}

function asSources(value: unknown): { title: string; url: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return { title: entry, url: "" };
      if (entry && typeof entry === "object") {
        const record = entry as { title?: string; url?: string; source?: string };
        return { title: record.title ?? record.source ?? "", url: record.url ?? "" };
      }
      return null;
    })
    .filter((entry): entry is { title: string; url: string } => Boolean(entry && entry.title))
    .slice(0, 12);
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    await requireNotebookAccess(id, user.id);

    const rows = await db
      .select()
      .from(researchQueries)
      .where(eq(researchQueries.notebookId, id))
      .orderBy(desc(researchQueries.createdAt))
      .limit(80);

    return ok({ queries: rows });
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

    const body = researchQuerySchema.parse(await readJson(request));

    const result = await completeAndLog(
      {
        tier: "research",
        temperature: 0.2,
        maxTokens: 1600,
        messages: researchMessages({ notebook, question: body.question, intent: body.intent }),
      },
      { userId: user.id, notebookId: id, feature: "research" },
    );

    const parsed = extractJson<Record<string, unknown>>(result.text);
    const answer: GroundedAnswer = parsed
      ? {
          answer: String(parsed.answer ?? result.text).slice(0, 40000),
          keySources: asSources(parsed.keySources),
          evidenceStrength: String(parsed.evidenceStrength ?? "").slice(0, 400),
          gaps: asStringList(parsed.gaps),
          nextSearches: asStringList(parsed.nextSearches, 6),
        }
      : {
          answer: result.text.slice(0, 40000),
          keySources: result.citations,
          evidenceStrength: "",
          gaps: [],
          nextSearches: [],
        };

    if (answer.keySources.length === 0 && result.citations.length > 0) {
      answer.keySources = result.citations;
    }

    const inserted = await db
      .insert(researchQueries)
      .values({
        notebookId: id,
        userId: user.id,
        intent: body.intent,
        question: body.question,
        answer: answer.answer,
        citations: answer.keySources,
        model: result.model,
        provider: result.provider,
      })
      .returning();

    return ok({ entry: inserted[0], result: answer, model: result.model, usage: result.usage }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { role } = await requireNotebookAccess(id, user.id);
    if (!canEdit(role)) return fail("You have read-only access to this notebook.", 403);

    const body = await readJson<{ queryId?: string }>(request);
    if (!body.queryId) return fail("A queryId is required.", 422);

    await db.delete(researchQueries).where(eq(researchQueries.id, body.queryId));
    return ok({ deleted: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
