import type { CitedReference, ReferenceRole } from "@/db/schema";
import { REFERENCE_ROLE_LABELS } from "@/lib/reference-labels";

export { REFERENCE_ROLE_LABELS };

/**
 * The notebook's reference library.
 *
 * Each reviewed article names works of its own — the theory it adopts, the
 * concepts it defines, the studies it argues with. `reviews.cited_references`
 * holds the ones the article actually leans on. This module dedupes those
 * across the whole matrix, so a work cited by eight of your articles surfaces
 * as one entry with a count of eight — which is exactly the signal for "this
 * is a core concept in my field".
 */

/** A reviewed article, as far as the library cares about it. */
export type LibrarySource = {
  reviewId: string;
  author: string;
  year: number | null;
  title: string;
};

/** One row of `reviews`, as far as the library cares about it. */
export type LibraryRow = {
  id: string;
  author: string;
  year: number | null;
  title: string;
  verdict: string;
  citedReferences: CitedReference[] | null;
  /** Whether this article's stored source text is long enough to re-read for cited works. */
  hasSource: boolean;
};

export type LibraryEntry = {
  key: string;
  authors: string;
  year: number | null;
  title: string;
  source: string | null;
  /** Every role the work plays across the articles that cite it. */
  roles: ReferenceRole[];
  /** One line, taken from the article that first named it. */
  note: string | null;
  /** Which of your articles cite this work. */
  citedBy: LibrarySource[];
};

function surnameOf(authors: string): string {
  const first = authors.split(/[;,]|\band\b|\b&\b|\bet al\b/i)[0] ?? authors;
  return first.replace(/[^A-Za-z'’-]/g, "").toLowerCase();
}

function titleTokenOf(title: string): string {
  const word = title.replace(/[^A-Za-z\s]/g, " ").split(/\s+/).find((entry) => entry.length > 3);
  return (word ?? "").toLowerCase();
}

/**
 * Identity for dedupe: first surname, year, and the first substantial word of
 * the title. Loose enough to merge "Smith, J. (2019)" with "Smith and others
 * (2019)", tight enough to keep two different 2019 Smith papers apart.
 */
export function referenceKey(reference: {
  authors: string;
  year: number | null;
  title: string;
}): string {
  const surname = surnameOf(reference.authors) || "unknown";
  return `${surname}|${reference.year ?? "nd"}|${titleTokenOf(reference.title)}`;
}

/** "Smith and Jones (2019)" — how this work reads in the running text. */
export function referenceAnchor(entry: { authors: string; year: number | null }): string {
  const authors = entry.authors.trim() || "Unknown author";
  return `${authors} (${entry.year ?? "n.d."})`;
}

/** "Smith (2019)" — the container article, for the "as cited in" clause. */
export function containerAnchor(source: Pick<LibrarySource, "author" | "year">): string {
  const author = source.author.trim() || "Unknown author";
  return `${author}, ${source.year ?? "n.d."}`;
}

/**
 * The honest form for a work the candidate has not read: the anchor names the
 * work, the parenthetical names the article it was found in.
 */
export function secondaryAnchor(
  entry: { authors: string; year: number | null },
  source: Pick<LibrarySource, "author" | "year">,
): string {
  const authors = entry.authors.trim() || "Unknown author";
  return `${authors} (${entry.year ?? "n.d."}, as cited in ${containerAnchor(source)})`;
}

/** Best-effort APA 7 entry from what the extraction captured. */
export function referenceEntry(entry: LibraryEntry): string {
  const source = entry.source?.trim();
  const parts = [
    `${entry.authors.trim() || "[Author]"} (${entry.year ?? "n.d."}). ${entry.title.trim() || "[Title]"}.`,
    source ? `${source}${/[.!?]$/.test(source) ? "" : "."}` : "",
  ].filter(Boolean);
  return parts.join(" ");
}

function collectRoles(existing: ReferenceRole[], incoming: CitedReference[]): ReferenceRole[] {
  const seen = new Set<ReferenceRole>(existing);
  for (const reference of incoming) seen.add(reference.role);
  return Array.from(seen);
}

/**
 * Merges every row's cited works into one ranked library. Entries cited by more
 * of your articles come first — that ordering is the core-concept signal.
 * Articles the reviewer excluded contribute nothing, matching the rule the
 * evidence matrix already follows.
 */
export function buildReferenceLibrary(rows: LibraryRow[]): LibraryEntry[] {
  const byKey = new Map<string, LibraryEntry>();

  for (const row of rows) {
    if (row.verdict === "exclude") continue;

    const source: LibrarySource = {
      reviewId: row.id,
      author: row.author,
      year: row.year,
      title: row.title,
    };

    for (const reference of row.citedReferences ?? []) {
      if (!reference?.title?.trim() && !reference?.authors?.trim()) continue;
      const key = referenceKey(reference);

      const existing = byKey.get(key);
      if (existing) {
        if (!existing.citedBy.some((entry) => entry.reviewId === row.id)) {
          existing.citedBy.push(source);
        }
        existing.roles = collectRoles(existing.roles, [reference]);
        existing.source = existing.source ?? reference.source ?? null;
        existing.note = existing.note ?? reference.note ?? null;
        continue;
      }

      byKey.set(key, {
        key,
        authors: reference.authors?.trim() || "Unknown author",
        year: reference.year ?? null,
        title: reference.title?.trim() || "[Untitled]",
        source: reference.source?.trim() || null,
        roles: [reference.role],
        note: reference.note?.trim() || null,
        citedBy: [source],
      });
    }
  }

  return Array.from(byKey.values()).sort(
    (a, b) => b.citedBy.length - a.citedBy.length || (b.year ?? 0) - (a.year ?? 0) || a.authors.localeCompare(b.authors),
  );
}

/** The entries a manuscript may draw on: its own selection, or the whole library. */
export function selectLibrary(entries: LibraryEntry[], keys: string[]): LibraryEntry[] {
  if (keys.length === 0) return entries;
  const wanted = new Set(keys);
  return entries.filter((entry) => wanted.has(entry.key));
}

/** Renders the library for a drafting prompt. */
export function renderLibrary(entries: LibraryEntry[], limit = 80): string {
  if (entries.length === 0) {
    return "(No secondary sources have been extracted yet. Cite only the evidence matrix.)";
  }

  return entries
    .slice(0, limit)
    .map((entry) => {
      const roles = entry.roles.map((role) => REFERENCE_ROLE_LABELS[role]).join(", ");
      const containers = entry.citedBy
        .slice(0, 4)
        .map((source) => referenceAnchor({ authors: source.author, year: source.year }))
        .join("; ");
      const more = entry.citedBy.length > 4 ? ` +${entry.citedBy.length - 4} more` : "";
      const lines = [
        `- ${referenceAnchor(entry)}. ${entry.title}${entry.source ? `. ${entry.source}` : ""}`,
        `  Roles: ${roles}. Cited by ${entry.citedBy.length} of your articles: ${containers}${more}`,
        entry.note ? `  ${entry.note}` : null,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n");
}

/**
 * The bibliography block for the References section: the primary sources the
 * manuscript quotes directly, then the secondary works with the article each
 * was found in.
 */
export function renderBibliography(input: {
  evidence: { author: string; year: number | null; title: string; citation: string | null }[];
  library: LibraryEntry[];
}): string {
  const primary = input.evidence.map((review) => {
    const anchor = referenceAnchor({ authors: review.author, year: review.year });
    const entry = review.citation?.trim() || `${review.author} (${review.year ?? "n.d."}). ${review.title}.`;
    return `- ${anchor} — PRIMARY SOURCE, read in full. ${entry}`;
  });

  const secondary = input.library.map((entry) => {
    const container = entry.citedBy[0];
    const attribution = container
      ? `  Found in: ${referenceAnchor({ authors: container.author, year: container.year })}`
      : "";
    return `- ${referenceAnchor(entry)} — SECONDARY SOURCE, cite as "${secondaryAnchor(entry, container ?? { author: "?", year: null })}".\n  ${referenceEntry(entry)}${attribution}`;
  });

  const sections = [
    primary.length ? `Primary sources (reviewed in the matrix):\n${primary.join("\n")}` : null,
    secondary.length ? `Secondary sources (named inside those articles):\n${secondary.join("\n")}` : null,
  ].filter(Boolean);

  return sections.join("\n\n") || "(No references available yet.)";
}
