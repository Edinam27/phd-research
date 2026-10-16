import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { researchQueries, reviews } from "@/db/schema";
import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { canEdit, requireNotebookAccess } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { synthesisMessages } from "@/lib/ai/prompts";
import { completeAndLog, extractJson } from "@/lib/ai/provider";
import { synthesisSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

function list(value: unknown, cap = 24): unknown[] {
  return Array.isArray(value) ? value.slice(0, cap) : [];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value === null || value === undefined ? fallback : String(value);
}

function normalise(parsed: Record<string, unknown>) {
  return {
    overview: text(parsed.overview).slice(0, 8000),
    themes: list(parsed.themes).map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      return {
        name: text(record.name ?? record.theme).slice(0, 240),
        summary: text(record.summary).slice(0, 2000),
        authors: (Array.isArray(record.authors) ? record.authors : []).map((a) => text(a)).slice(0, 30),
      };
    }),
    theoryUsage: list(parsed.theoryUsage).map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      return {
        theory: text(record.theory).slice(0, 240),
        count: Number(record.count ?? 0) || 0,
        authors: (Array.isArray(record.authors) ? record.authors : []).map((a) => text(a)).slice(0, 30),
      };
    }),
    methodDistribution: list(parsed.methodDistribution).map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      return {
        method: text(record.method).slice(0, 200),
        count: Number(record.count ?? 0) || 0,
        notes: text(record.notes).slice(0, 1200),
      };
    }),
    contexts: list(parsed.contexts).map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      return { context: text(record.context).slice(0, 200), count: Number(record.count ?? 0) || 0 };
    }),
    consensus: list(parsed.consensus).map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      return {
        statement: text(record.statement).slice(0, 1200),
        authors: (Array.isArray(record.authors) ? record.authors : []).map((a) => text(a)).slice(0, 30),
      };
    }),
    contradictions: list(parsed.contradictions).map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      return {
        statement: text(record.statement).slice(0, 1200),
        sideA: (Array.isArray(record.sideA) ? record.sideA : []).map((a) => text(a)).slice(0, 30),
        sideB: (Array.isArray(record.sideB) ? record.sideB : []).map((a) => text(a)).slice(0, 30),
        explanation: text(record.explanation).slice(0, 1200),
      };
    }),
    gaps: list(parsed.gaps).map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      return {
        gap: text(record.gap).slice(0, 1200),
        type: text(record.type, "empirical").slice(0, 60),
        evidence: text(record.evidence).slice(0, 1200),
        opportunity: text(record.opportunity).slice(0, 1600),
      };
    }),
    researchQuestions: (Array.isArray(parsed.researchQuestions) ? parsed.researchQuestions : [])
      .map((entry) => text(entry).slice(0, 800))
      .slice(0, 12),
    hypotheses: list(parsed.hypotheses).map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      return {
        label: text(record.label ?? "H").slice(0, 20),
        statement: text(record.statement).slice(0, 800),
        independent: text(record.independent).slice(0, 200),
        dependent: text(record.dependent).slice(0, 200),
        rationale: text(record.rationale).slice(0, 1600),
        authors: (Array.isArray(record.authors) ? record.authors : []).map((a) => text(a)).slice(0, 30),
      };
    }),
    recommendedOutline: list(parsed.recommendedOutline).map((entry) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      return {
        section: text(record.section).slice(0, 240),
        keyPoints: (Array.isArray(record.keyPoints) ? record.keyPoints : []).map((p) => text(p)).slice(0, 20),
      };
    }),
  };
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { notebook, role } = await requireNotebookAccess(id, user.id);
    if (!canEdit(role)) return fail("You have read-only access to this notebook.", 403);

    let body: { focus?: string | null } = {};
    try {
      body = synthesisSchema.parse(await readJson(request));
    } catch {
      body = {};
    }

    const evidence = await db
      .select()
      .from(reviews)
      .where(eq(reviews.notebookId, id))
      .orderBy(desc(reviews.createdAt));

    if (evidence.length < 2) {
      return fail(
        "Synthesis needs at least two completed article reviews in this notebook. Add more rows to the matrix first.",
        422,
      );
    }

    const result = await completeAndLog(
      {
        tier: "reasoning",
        temperature: 0.25,
        maxTokens: 6000,
        messages: synthesisMessages({ notebook, reviews: evidence, focus: body.focus ?? null }),
      },
      { userId: user.id, notebookId: id, feature: "synthesis" },
    );

    const parsed = extractJson<Record<string, unknown>>(result.text);
    if (!parsed) {
      return fail("The synthesis model did not return usable JSON. Try again.", 502, {
        raw: result.text.slice(0, 1500),
      });
    }

    const synthesis = normalise(parsed);

    const inserted = await db
      .insert(researchQueries)
      .values({
        notebookId: id,
        userId: user.id,
        intent: "synthesis",
        question: body.focus?.trim() || `Synthesis of ${evidence.length} reviewed articles`,
        answer: JSON.stringify(synthesis),
        citations: [],
        model: result.model,
        provider: result.provider,
      })
      .returning();

    return ok({ entry: inserted[0], synthesis, model: result.model, usage: result.usage }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
