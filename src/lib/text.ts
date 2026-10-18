/**
 * Text clean-up shared by the server-side extractor, the browser-side PDF
 * reader, and manuscript drafting. Kept in its own module so importing it
 * never drags `unpdf` or `mammoth` into a client bundle.
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

/** Case- and punctuation-insensitive form, for matching a heading to its text. */
function squash(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Rewrites the markdown a model reaches for into the plain prose a manuscript
 * section holds. Emphasis markers and heading hashes are dropped; list markers,
 * which some template sections explicitly ask for, are left alone.
 *
 * When the section's own heading leads the text it is removed, since the
 * section already carries that heading.
 */
export function toPlainProse(markdown: string, sectionHeading?: string): string {
  let text = markdown
    .replace(/\r\n?/g, "\n")
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<![A-Za-z0-9_])_([^_\n]+)_(?![A-Za-z0-9_])/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (sectionHeading) {
    const [first, ...rest] = text.split("\n");
    if (first && squash(first) === squash(sectionHeading)) {
      text = rest.join("\n").replace(/^\n+/, "").trim();
    }
  }

  return text;
}
