import { cleanText } from "@/lib/text";

export type ExtractedDocument = {
  text: string;
  kind: "pdf" | "docx" | "text";
  pages?: number;
  filename: string;
};

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractionError";
  }
}

function detectKind(filename: string, mimeType: string): "pdf" | "docx" | "text" {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf") || mimeType === "application/pdf") return "pdf";
  if (lower.endsWith(".docx") || mimeType.includes("officedocument.wordprocessingml")) return "docx";
  return "text";
}

async function extractPdf(buffer: Buffer): Promise<{ text: string; pages?: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  const merged = Array.isArray(text) ? text.join("\n\n") : text;
  return { text: merged, pages: totalPages };
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/** Turns an uploaded PDF, DOCX or plain-text file into reviewable text. */
export async function extractDocument(file: {
  name: string;
  type: string;
  buffer: Buffer;
}): Promise<ExtractedDocument> {
  if (file.buffer.byteLength === 0) {
    throw new ExtractionError(`"${file.name}" is empty.`);
  }
  if (file.buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new ExtractionError(
      `"${file.name}" is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB. Upload the article text or split the file.`,
    );
  }

  const kind = detectKind(file.name, file.type);

  if (kind === "pdf") {
    try {
      const { text, pages } = await extractPdf(file.buffer);
      const cleaned = cleanText(text);
      if (cleaned.length < 200) {
        throw new ExtractionError(
          `"${file.name}" appears to be a scanned image PDF — no selectable text was found. Run OCR first, or paste the text manually.`,
        );
      }
      return { text: cleaned, kind, pages, filename: file.name };
    } catch (error) {
      if (error instanceof ExtractionError) throw error;
      throw new ExtractionError(
        `Could not read the PDF "${file.name}": ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  if (kind === "docx") {
    try {
      const text = cleanText(await extractDocx(file.buffer));
      if (text.length < 100) {
        throw new ExtractionError(`"${file.name}" contained almost no readable text.`);
      }
      return { text, kind, filename: file.name };
    } catch (error) {
      if (error instanceof ExtractionError) throw error;
      throw new ExtractionError(
        `Could not read the Word file "${file.name}": ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  const text = cleanText(file.buffer.toString("utf8"));
  if (text.length < 50) {
    throw new ExtractionError(`"${file.name}" does not look like readable text.`);
  }
  return { text, kind: "text", filename: file.name };
}
