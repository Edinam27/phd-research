/**
 * The review taxonomy, transcribed from TAXONOMY.xlsx.
 *
 * Sheet1 headers (A1:K1):
 *   Author | Year | Title | Journal | Problems/Gaps | Objectives | Theory |
 *   Empirical findings of past research | Methodology | Key Findings | Limitations
 *
 * Every literature review captured in this application fills these eleven
 * columns, so a notebook's matrix can be exported back out in exactly the
 * spreadsheet layout the supervisor expects.
 */

export const TAXONOMY_FIELDS = [
  "author",
  "year",
  "title",
  "journal",
  "problemsGaps",
  "objectives",
  "theory",
  "empiricalFindings",
  "methodology",
  "keyFindings",
  "limitations",
] as const;

export type TaxonomyField = (typeof TAXONOMY_FIELDS)[number];

export type TaxonomyColumn = {
  field: TaxonomyField;
  /** Exact header text used in TAXONOMY.xlsx */
  header: string;
  /** Label shown in the UI */
  label: string;
  hint: string;
  kind: "short" | "long";
  /** Character budget before the column is flagged as thin */
  minChars: number;
  promptKey: string;
};

export const TAXONOMY_COLUMNS: TaxonomyColumn[] = [
  {
    field: "author",
    header: "Author",
    label: "Author(s)",
    hint: "Surname and initials of all authors, as they appear in the reference list.",
    kind: "short",
    minChars: 3,
    promptKey: "authors",
  },
  {
    field: "year",
    header: "Year",
    label: "Year",
    hint: "Year of publication of the version you actually read.",
    kind: "short",
    minChars: 4,
    promptKey: "year",
  },
  {
    field: "title",
    header: "Title",
    label: "Title",
    hint: "Full article title, sentence case.",
    kind: "short",
    minChars: 10,
    promptKey: "title",
  },
  {
    field: "journal",
    header: "Journal",
    label: "Journal",
    hint: "Journal name, volume(issue), pages — plus indexing (Scopus, WoS, ABDC).",
    kind: "short",
    minChars: 3,
    promptKey: "journal",
  },
  {
    field: "problemsGaps",
    header: "Problems/Gaps",
    label: "Problems / Gaps",
    hint: "The problem the study tackles AND the specific gap in the literature it claims to fill (contextual, theoretical, methodological or empirical).",
    kind: "long",
    minChars: 120,
    promptKey: "problemsGaps",
  },
  {
    field: "objectives",
    header: "Objectives",
    label: "Objectives",
    hint: "The study's aim and its numbered specific objectives or research questions.",
    kind: "long",
    minChars: 100,
    promptKey: "objectives",
  },
  {
    field: "theory",
    header: "Theory",
    label: "Theory / Model",
    hint: "The theory or model used, who propounded it, and how the article applied it.",
    kind: "long",
    minChars: 80,
    promptKey: "theory",
  },
  {
    field: "empiricalFindings",
    header: "Empirical findings of past research",
    label: "Empirical findings of past research",
    hint: "What earlier empirical work (as reported by this article) already established — the cumulative evidence base, with effect directions.",
    kind: "long",
    minChars: 120,
    promptKey: "empiricalFindings",
  },
  {
    field: "methodology",
    header: "Methodology",
    label: "Methodology",
    hint: "Design, population, sampling technique, sample size, instrument, data analysis technique.",
    kind: "long",
    minChars: 120,
    promptKey: "methodology",
  },
  {
    field: "keyFindings",
    header: "Key Findings",
    label: "Key Findings",
    hint: "This article's own results — support/reject for each hypothesis, with statistics.",
    kind: "long",
    minChars: 120,
    promptKey: "keyFindings",
  },
  {
    field: "limitations",
    header: "Limitations",
    label: "Limitations",
    hint: "Stated and unstated limitations you identify — these are where your contribution lives.",
    kind: "long",
    minChars: 80,
    promptKey: "limitations",
  },
];

/** Columns beyond the spreadsheet: the reviewer's own critical appraisal. */
export const APPRAISAL_FIELDS = [
  { field: "scoreRigour", label: "Rigour", hint: "Design, sampling, measurement and analysis handled credibly?" },
  { field: "scoreRelevance", label: "Relevance to my study", hint: "How directly does this inform my variables or objectives?" },
  { field: "scoreNovelty", label: "Novelty / currency", hint: "Does it add something new, or is it dated?" },
  { field: "scoreClarity", label: "Clarity & reporting", hint: "Is method and result reporting transparent and reproducible?" },
] as const;

export type AppraisalField = (typeof APPRAISAL_FIELDS)[number]["field"];

export const VERDICTS = ["include", "borderline", "exclude"] as const;
export type Verdict = (typeof VERDICTS)[number];

export const REVIEW_STATUSES = ["draft", "ai-drafted", "reviewed", "verified"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/**
 * Boolean-text scoring: a column counts as "substantiated" when it carries
 * enough evidence to survive a supervisor's read.
 */
export function scoreReviewCompleteness(review: Record<string, unknown>): {
  filled: number;
  total: number;
  percent: number;
  thin: TaxonomyField[];
} {
  const thin: TaxonomyField[] = [];
  let filled = 0;
  for (const column of TAXONOMY_COLUMNS) {
    const raw = review[column.field];
    const text = raw === null || raw === undefined ? "" : String(raw).trim();
    if (text.length === 0) {
      thin.push(column.field);
      continue;
    }
    if (column.kind === "long" && text.length < Math.round(column.minChars * 0.5)) {
      thin.push(column.field);
      continue;
    }
    filled += 1;
  }
  return {
    filled,
    total: TAXONOMY_COLUMNS.length,
    percent: Math.round((filled / TAXONOMY_COLUMNS.length) * 100),
    thin,
  };
}

export function averageAppraisal(review: {
  scoreRigour?: number | null;
  scoreRelevance?: number | null;
  scoreNovelty?: number | null;
  scoreClarity?: number | null;
}): number | null {
  const values = [review.scoreRigour, review.scoreRelevance, review.scoreNovelty, review.scoreClarity].filter(
    (value): value is number => typeof value === "number",
  );
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}
