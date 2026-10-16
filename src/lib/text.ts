/**
 * Text clean-up shared by the server-side extractor and the browser-side PDF
 * reader. Kept in its own module so importing it never drags `unpdf` or
 * `mammoth` into a client bundle.
 */

/** Collapses PDF extraction artefacts without losing paragraph structure. */
export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u00ad/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}
