import { db } from "@/db";
import { manuscriptSections, manuscripts, notebooks } from "@/db/schema";
import { fail, ok, toErrorResponse } from "@/lib/api";
import { AiRequestError } from "@/lib/ai/provider";
import { completeAndLog, extractJson, publicUsage } from "@/lib/ai/provider";
import { draftDesignMessages, draftSectionMapMessages } from "@/lib/ai/prompts";
import { extractDocument, ExtractionError } from "@/lib/extract";
import { getSections } from "@/lib/guideline";
import { getCurrentUser } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import type { StudyType } from "@/lib/guideline";

export const runtime = "nodejs";
export const maxDuration = 300;

const STUDY_TYPES: StudyType[] = ["quantitative", "qualitative", "mixed"];
const RESEARCH_TYPES = [
  "empirical",
  "conceptual",
  "systematic-review",
  "narrative-review",
  "case-study",
  "editorial",
] as const;

type DraftDesign = {
  title: string;
  description: string | null;
  researchArea: string | null;
  researchType: string;
  studyType: string;
  targetJournal: string | null;
  keyVariables: string[];
  researchProblem: string | null;
  researchObjectives: string[];
  theory: string | null;
  context: string | null;
  manuscriptTitle: string;
};

type SectionMapEntry = { key: string; content: string };

/**
 * Second entry point for "new notebook": the user uploads a paper they are
 * already writing. The draft is read once, a model infers the notebook
 * design from it, and a second pass maps the draft's own prose onto the
 * publication guideline's sections — verbatim — so the author continues
 * from where they stopped instead of starting over.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const limit = rateLimit(clientKey(request, "from-draft"), 10, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail(`Too many imports. Try again in ${limit.retryAfter} seconds.`, 429);
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return fail("Attach the draft as a PDF, DOCX or text file.", 422);
    }

    const extracted = await extractDocument({
      name: file.name,
      type: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
    });

    /* ---- Pass 1: infer the notebook design ---- */
    const designResult = await completeAndLog(
      {
        tier: "reasoning",
        temperature: 0.2,
        maxTokens: 2000,
        messages: draftDesignMessages({ draftText: extracted.text, filename: extracted.filename }),
      },
      { userId: user.id, feature: "draft-import" },
    );

    const designRaw = extractJson<DraftDesign>(designResult.text);
    if (!designRaw?.title) {
      throw new AiRequestError(
        "The draft was read, but the study design could not be inferred from it. Try a more complete draft.",
        422,
      );
    }

    const studyType: StudyType = STUDY_TYPES.includes(designRaw.studyType as StudyType)
      ? (designRaw.studyType as StudyType)
      : "quantitative";
    const researchType = (RESEARCH_TYPES as readonly string[]).includes(designRaw.researchType)
      ? designRaw.researchType
      : "empirical";

    const insertedNotebook = await db
      .insert(notebooks)
      .values({
        ownerId: user.id,
        title: designRaw.title.slice(0, 200),
        description: designRaw.description?.slice(0, 2000) ?? null,
        researchArea: designRaw.researchArea?.slice(0, 200) ?? null,
        researchType,
        studyType,
        status: "writing",
        targetJournal: designRaw.targetJournal?.slice(0, 200) ?? null,
        keyVariables: (designRaw.keyVariables ?? []).slice(0, 30).map((v) => String(v).slice(0, 160)),
        researchProblem: designRaw.researchProblem?.slice(0, 4000) ?? null,
        researchObjectives: (designRaw.researchObjectives ?? [])
          .slice(0, 20)
          .map((o) => String(o).slice(0, 600)),
        theory: designRaw.theory?.slice(0, 300) ?? null,
        context: designRaw.context?.slice(0, 600) ?? null,
      })
      .returning();
    const notebook = insertedNotebook[0];

    /* ---- Pass 2: map the draft onto the guideline's sections ---- */
    const template = getSections("article", studyType);
    let mapped: SectionMapEntry[] = [];
    try {
      const mapResult = await completeAndLog(
        {
          tier: "reasoning",
          temperature: 0.1,
          maxTokens: 16000,
          messages: draftSectionMapMessages({
            draftText: extracted.text,
            sections: template.map((section) => ({
              key: section.key,
              heading: section.heading,
              guidance: section.guidance,
            })),
          }),
        },
        { userId: user.id, feature: "draft-import", notebookId: notebook.id },
      );
      const parsed = extractJson<{ sections?: SectionMapEntry[] }>(mapResult.text);
      mapped = (parsed?.sections ?? []).filter(
        (entry): entry is SectionMapEntry =>
          typeof entry?.key === "string" && typeof entry?.content === "string",
      );
    } catch {
      // A failed mapping pass must not throw away the notebook we just made;
      // the author simply starts from empty sections.
      mapped = [];
    }

    const contentByKey = new Map(mapped.map((entry) => [entry.key, entry.content.trim()]));

    const insertedManuscript = await db
      .insert(manuscripts)
      .values({
        notebookId: notebook.id,
        createdById: user.id,
        kind: "article",
        title: (designRaw.manuscriptTitle || designRaw.title).slice(0, 300),
        targetJournal: notebook.targetJournal,
        researchType,
        studyType,
        status: "draft",
      })
      .returning();
    const manuscript = insertedManuscript[0];

    await db.insert(manuscriptSections).values(
      template.map((section, index) => {
        const content = contentByKey.get(section.key) ?? "";
        return {
          manuscriptId: manuscript.id,
          sectionKey: section.key,
          heading: section.heading,
          content,
          wordMin: section.wordMin,
          wordMax: section.wordMax,
          position: index,
          status: content.length > 0 ? ("drafting" as const) : ("empty" as const),
          checklistState: {},
        };
      }),
    );

    const filled = template.filter((section) => (contentByKey.get(section.key) ?? "").length > 0).length;

    return ok(
      {
        notebook: { id: notebook.id, title: notebook.title },
        manuscript: { id: manuscript.id, title: manuscript.title },
        imported: { filename: extracted.filename, chars: extracted.text.length, sectionsFilled: filled, sections: template.length },
        usage: publicUsage(designResult.usage),
      },
      201,
    );
  } catch (error) {
    if (error instanceof ExtractionError) return fail(error.message, 422);
    return toErrorResponse(error);
  }
}
