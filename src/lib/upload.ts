/**
 * Browser-side article preparation.
 *
 * A journal PDF is heavy because of its embedded figures — the text inside it is
 * a small fraction of the file. Rebuilding that text in the browser keeps the
 * upload inside every host's request-body cap (serverless platforms cut off
 * around 4.5 MB), uploads faster, and sends the reviewer only what it reads.
 * Word and plain-text files are small enough to keep going to the server as-is.
 */

import { cleanText } from "@/lib/text";

export type PreparedArticle =
  | { transport: "text"; text: string; filename: string; kind: "pdf" }
  | { transport: "file"; file: File };

/** Below this, a PDF has no usable text layer and is almost certainly a scan. */
const MIN_TEXT_CHARS = 200;

export class ArticleReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArticleReadError";
  }
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/** Rebuilds a PDF's text in the browser so the binary never has to be uploaded. */
export async function extractPdfText(file: File): Promise<{ text: string; pages: number }> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }

  const data = new Uint8Array(await file.arrayBuffer());

  const task = pdfjs.getDocument({ data });
  const doc = await task.promise.catch((error: unknown) => {
    throw new ArticleReadError(
      `Could not open "${file.name}": ${error instanceof Error ? error.message : "unknown error"}`,
    );
  });

  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item) => ("str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : ""))
          .join(""),
      );
      page.cleanup();
    }

    const text = cleanText(pages.join("\n\n"));
    if (text.length < MIN_TEXT_CHARS) {
      throw new ArticleReadError(
        `"${file.name}" holds no selectable text — it looks like a scanned image. Run OCR on it first, or paste the text.`,
      );
    }

    return { text, pages: doc.numPages };
  } finally {
    await task.destroy();
  }
}

/**
 * Decides how an article should reach the server: PDFs are rebuilt as text
 * here, everything else is passed through untouched.
 */
export async function prepareArticleFile(file: File): Promise<PreparedArticle> {
  if (!isPdf(file)) return { transport: "file", file };

  const { text } = await extractPdfText(file);
  return { transport: "text", text, filename: file.name, kind: "pdf" };
}
