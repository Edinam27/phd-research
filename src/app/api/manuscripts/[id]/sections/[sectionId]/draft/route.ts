import { eq } from "drizzle-orm";

import { db } from "@/db";
import { manuscriptSections, manuscripts } from "@/db/schema";
import { fail, readJson, toErrorResponse } from "@/lib/api";
import { canEdit } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { manuscriptSectionMessages } from "@/lib/ai/prompts";
import { sseResponse, streamCompletion } from "@/lib/ai/provider";
import { loadSectionContext, neighboursOf } from "@/lib/manuscripts";
import { countWords } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string; sectionId: string }> };

type DraftBody = {
  /** write = rewrite the section, append = continue the draft, refine = tighten what exists */
  mode?: "write" | "append" | "refine";
  instruction?: string | null;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id, sectionId } = await params;
    const context = await loadSectionContext(id, sectionId, user.id);
    const { section, manuscript, notebook, role, siblings, evidence, template } = context;

    if (!canEdit(role)) return fail("You have read-only access to this notebook.", 403);

    let body: DraftBody = {};
    try {
      body = await readJson<DraftBody>(request);
    } catch {
      body = {};
    }

    const mode = body.mode ?? "write";
    const baseContent = mode === "append" ? "" : section.content;

    const instruction = [body.instruction?.trim(), mode === "append"
      ? "Output ONLY the continuation, starting exactly where the existing draft stops. Do not restate or summarise what is already written."
      : null, mode === "refine"
      ? "Tighten the existing draft: remove repetition and hedging, keep every citation, and bring it inside the word budget."
      : null]
      .filter(Boolean)
      .join(" ");

    const existingForModel = mode === "append" ? section.content : baseContent;

    const stream = streamCompletion(
      {
        tier: "reasoning",
        temperature: mode === "refine" ? 0.25 : 0.45,
        maxTokens: Math.min(8000, Math.max(1400, template.wordMax * 3 || 2200)),
        messages: manuscriptSectionMessages({
          notebook,
          manuscript,
          section: template,
          existingContent: existingForModel,
          evidence,
          instruction: instruction || null,
          neighbouringSections: neighboursOf(siblings, section.sectionKey),
        }),
      },
      { userId: user.id, notebookId: manuscript.notebookId, feature: "manuscript-section" },
      {
        onFinish: async (text) => {
          const produced = text.trim();
          let finalContent: string;
          if (mode === "append") {
            finalContent = `${section.content.trimEnd()}\n\n${produced}`.trim();
          } else {
            finalContent = produced;
          }

          await db
            .update(manuscriptSections)
            .set({
              content: finalContent,
              status: "drafting",
              updatedAt: new Date(),
            })
            .where(eq(manuscriptSections.id, sectionId));

          await db.update(manuscripts).set({ updatedAt: new Date() }).where(eq(manuscripts.id, id));

          console.info(
            `[draft] section=${section.sectionKey} mode=${mode} words=${countWords(finalContent)}`,
          );
        },
      },
    );

    return sseResponse(stream);
  } catch (error) {
    return toErrorResponse(error);
  }
}
