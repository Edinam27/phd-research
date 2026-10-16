import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { requireNotebookAccess, canEdit } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { completeAndLog, extractJson } from "@/lib/ai/provider";
import { articleReviewMessages } from "@/lib/ai/prompts";
import { draftIsUsable, mapReviewDraft } from "@/lib/ai/map-review";
import { extractDocument, ExtractionError, MAX_UPLOAD_BYTES } from "@/lib/extract";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

type Source = {
  text: string;
  filename: string | null;
  kind: "pdf" | "docx" | "text" | "pasted";
};

async function resolveSource(request: Request): Promise<{ source: Source; focusNote: string | null }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const pasted = form.get("text");
    const focusNote = form.get("focusNote");

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new ExtractionError(
          `"${file.name}" is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`,
        );
      }
      const extracted = await extractDocument({
        name: file.name,
        type: file.type,
        buffer: Buffer.from(await file.arrayBuffer()),
      });
      return {
        source: { text: extracted.text, filename: extracted.filename, kind: extracted.kind },
        focusNote: typeof focusNote === "string" && focusNote.trim() ? focusNote.trim() : null,
      };
    }

    if (typeof pasted === "string" && pasted.trim().length > 200) {
      return {
        source: { text: pasted.trim(), filename: null, kind: "pasted" },
        focusNote: typeof focusNote === "string" && focusNote.trim() ? focusNote.trim() : null,
      };
    }

    throw new ExtractionError("Attach a PDF or DOCX, or paste at least a paragraph of the article.");
  }

  const body = await readJson<{ text?: string; filename?: string; focusNote?: string }>(request);
  if (!body.text || body.text.trim().length < 200) {
    throw new ExtractionError(
      "Paste at least a few paragraphs of the article (200+ characters) so the reviewer has something to work with.",
    );
  }
  return {
    source: { text: body.text.trim(), filename: body.filename ?? null, kind: "pasted" },
    focusNote: body.focusNote?.trim() || null,
  };
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { notebook, role } = await requireNotebookAccess(id, user.id);
    if (!canEdit(role)) return fail("You have read-only access to this notebook.", 403);

    const { source, focusNote } = await resolveSource(request);

    const result = await completeAndLog(
      {
        tier: "reasoning",
        temperature: 0.2,
        maxTokens: 4000,
        messages: articleReviewMessages({
          notebook,
          sourceText: source.text,
          filename: source.filename,
          focusNote,
        }),
      },
      { userId: user.id, notebookId: id, feature: "article-review" },
    );

    const parsed = extractJson<Record<string, unknown>>(result.text);
    if (!parsed) {
      return fail(
        "The reviewing model did not return usable JSON. Try again, or switch the reasoning model in .env.local.",
        502,
        { raw: result.text.slice(0, 1200) },
      );
    }

    const draft = mapReviewDraft(parsed);
    if (!draftIsUsable(draft)) {
      return fail(
        "The model read the document but could not extract a usable taxonomy row — the file may be an incomplete extract. Check the text and try again.",
        502,
        { draft },
      );
    }

    return ok({
      draft,
      source: {
        filename: source.filename,
        kind: source.kind,
        chars: source.text.length,
      },
      model: result.model,
      usage: result.usage,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
