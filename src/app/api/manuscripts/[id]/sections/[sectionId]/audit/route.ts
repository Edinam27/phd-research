import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { canEdit } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { complianceMessages } from "@/lib/ai/prompts";
import { completeAndLog, extractJson } from "@/lib/ai/provider";
import { loadSectionContext } from "@/lib/manuscripts";
import { countWords } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string; sectionId: string }> };

export type ComplianceReport = {
  score: number;
  verdict: string;
  satisfied: string[];
  missing: string[];
  unsupportedClaims: string[];
  recommendations: string[];
  wordCountAssessment: string;
};

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : JSON.stringify(entry)))
    .filter((entry) => entry.length > 0)
    .slice(0, 20);
}

/** Audits one written section against the guideline checklist that governs it. */
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id, sectionId } = await params;
    const { section, manuscript, notebook, role, template } = await loadSectionContext(id, sectionId, user.id);
    if (!canEdit(role)) return fail("You have read-only access to this notebook.", 403);

    let body: { content?: string } = {};
    try {
      body = await readJson<typeof body>(request);
    } catch {
      body = {};
    }

    const content = (body.content ?? section.content).trim();
    if (content.length < 120) {
      return fail("Write something first — this section is too short to audit.", 422);
    }

    const result = await completeAndLog(
      {
        tier: "reasoning",
        temperature: 0.1,
        maxTokens: 2000,
        messages: complianceMessages({
          notebook,
          manuscriptTitle: manuscript.title,
          section: template,
          content,
        }),
      },
      { userId: user.id, notebookId: manuscript.notebookId, feature: "compliance" },
    );

    const parsed = extractJson<Record<string, unknown>>(result.text);
    if (!parsed) {
      return fail("The auditor did not return usable JSON. Try again.", 502, {
        raw: result.text.slice(0, 1200),
      });
    }

    const rawScore = Number(parsed.score ?? 0);
    const report: ComplianceReport = {
      score: Number.isFinite(rawScore) ? Math.min(100, Math.max(0, Math.round(rawScore))) : 0,
      verdict: String(parsed.verdict ?? "").slice(0, 600),
      satisfied: asStringList(parsed.satisfied),
      missing: asStringList(parsed.missing),
      unsupportedClaims: asStringList(parsed.unsupportedClaims),
      recommendations: asStringList(parsed.recommendations),
      wordCountAssessment: String(
        parsed.wordCountAssessment ?? `${countWords(content)} words written`,
      ).slice(0, 300),
    };

    return ok({ report, model: result.model, usage: result.usage, words: countWords(content) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
