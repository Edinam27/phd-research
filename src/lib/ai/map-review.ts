import { REFERENCE_ROLES, type CitedReference, type ReferenceRole } from "@/db/schema";
import { referenceKey } from "@/lib/references";
import { averageAppraisal } from "@/lib/taxonomy";

/** Shape returned to the client after an AI pass over an article. */
export type ReviewDraft = {
  author: string;
  year: number | null;
  title: string;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  citation: string | null;
  problemsGaps: string | null;
  objectives: string | null;
  theory: string | null;
  empiricalFindings: string | null;
  methodology: string | null;
  keyFindings: string | null;
  limitations: string | null;
  methodType: string | null;
  sampleSize: string | null;
  country: string | null;
  context: string | null;
  dataAnalysis: string | null;
  keyVariables: string[];
  hypotheses: string[];
  gapTags: string[];
  useInManuscript: string | null;
  citedReferences: CitedReference[];
  scoreRigour: number | null;
  scoreRelevance: number | null;
  scoreNovelty: number | null;
  scoreClarity: number | null;
  overallScore: number | null;
  verdict: "include" | "borderline" | "exclude";
  strengths: string | null;
  weaknesses: string | null;
};

const CAPS = {
  short: 400,
  medium: 1200,
  long: 4000,
} as const;

const VERDICTS = new Set(["include", "borderline", "exclude"]);

function str(value: unknown, cap: number = CAPS.long): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const joined = value.map((entry) => String(entry).trim()).filter(Boolean).join("; ");
    return joined ? joined.slice(0, cap) : null;
  }
  const text = String(value).replace(/\s+\n/g, "\n").trim();
  return text ? text.slice(0, cap) : null;
}

function strList(value: unknown, cap: number = CAPS.short): string[] {
  if (!Array.isArray(value)) {
    if (typeof value === "string" && value.trim()) {
      return value
        .split(/[;\n]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .slice(0, 40);
    }
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : JSON.stringify(entry)))
    .filter((entry) => entry.length > 0)
    .map((entry) => entry.slice(0, cap))
    .slice(0, 40);
}

function score(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) return null;
  return Math.min(10, Math.max(1, Math.round(parsed)));
}

function pick(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return null;
}

/** Model wordings for a reference's role, folded onto the five we store. */
const ROLE_ALIASES: Record<string, ReferenceRole> = {
  theory: "theory",
  theoretical: "theory",
  model: "theory",
  framework: "theory",
  concept: "concept",
  conceptual: "concept",
  definition: "concept",
  construct: "concept",
  "prior-evidence": "prior-evidence",
  prior: "prior-evidence",
  evidence: "prior-evidence",
  empirical: "prior-evidence",
  literature: "prior-evidence",
  comparison: "prior-evidence",
  method: "method",
  methodology: "method",
  instrument: "method",
  measurement: "method",
  scale: "method",
  context: "context",
  background: "context",
  setting: "context",
};

function asRole(value: unknown): ReferenceRole {
  const key = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  if ((REFERENCE_ROLES as readonly string[]).includes(key)) return key as ReferenceRole;
  return ROLE_ALIASES[key] ?? "prior-evidence";
}

/** A plausible publication year, or null. */
function asYear(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 1400 && parsed < 2200 ? parsed : null;
}

/**
 * Normalises the model's cited-works list. It tolerates a bare
 * "Smith (2019)" string as well as the object shape, drops entries with no
 * identity at all, and dedupes on the same key the library uses.
 */
export function mapCitedReferences(value: unknown, cap = 20): CitedReference[] {
  if (!Array.isArray(value)) return [];

  const out: CitedReference[] = [];
  const seen = new Set<string>();

  for (const raw of value) {
    const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;

    const entry: CitedReference | null = record
      ? {
          authors: str(pick(record, ["authors", "author", "names"]), CAPS.short) ?? "",
          year: asYear(pick(record, ["year", "publicationYear", "publication_year"])),
          title: str(pick(record, ["title", "work", "name"]), CAPS.short) ?? "",
          source: str(pick(record, ["source", "journal", "outlet", "publisher"]), CAPS.short),
          role: asRole(pick(record, ["role", "kind", "type", "usage", "usedFor"])),
          note: str(pick(record, ["note", "howUsed", "how_used", "use", "annotation"]), CAPS.short),
        }
      : (() => {
          const text = String(raw ?? "").trim();
          if (text.length < 3) return null;
          const year = text.match(/\((\d{4})[a-z]?\)/);
          return {
            authors: text.split(/\(\d{4}/)[0].trim().replace(/[,;]$/, ""),
            year: asYear(year?.[1]),
            title: "",
            source: null,
            role: "prior-evidence" as ReferenceRole,
            note: null,
          };
        })();

    if (!entry) continue;
    if (!entry.authors.trim() && !entry.title.trim()) continue;

    const key = referenceKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
    if (out.length >= cap) break;
  }

  return out;
}

/**
 * Normalises whatever the model returned into a review row the API accepts.
 * Models occasionally flatten or nest the appraisal block, so both shapes are handled.
 */
export function mapReviewDraft(raw: unknown): ReviewDraft {
  const record = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const scores = (record.scores && typeof record.scores === "object" ? record.scores : {}) as Record<
    string,
    unknown
  >;

  const yearRaw = pick(record, ["year", "publicationYear", "publication_year"]);
  const parsedYear = yearRaw === null ? null : Number.parseInt(String(yearRaw), 10);

  const verdictRaw = String(pick(record, ["verdict", "decision", "recommendation"]) ?? "include").toLowerCase();
  const verdict = (VERDICTS.has(verdictRaw) ? verdictRaw : "include") as ReviewDraft["verdict"];

  const draft: ReviewDraft = {
    author: str(pick(record, ["authors", "author"]), CAPS.short) ?? "",
    year: Number.isFinite(parsedYear as number) && parsedYear! > 1400 && parsedYear! < 2200 ? parsedYear : null,
    title: str(pick(record, ["title"]), CAPS.short) ?? "",
    journal: str(pick(record, ["journal", "outlet", "sourceTitle"]), CAPS.short),
    volume: str(pick(record, ["volume"]), 40),
    issue: str(pick(record, ["issue"]), 40),
    pages: str(pick(record, ["pages", "pageRange"]), 60),
    doi: str(pick(record, ["doi"]), 200),
    url: str(pick(record, ["url", "link"]), 500),
    citation: str(pick(record, ["citation", "apaReference", "reference"]), CAPS.medium),
    problemsGaps: str(pick(record, ["problemsGaps", "problems_gaps", "problemAndGap", "gap"])),
    objectives: str(pick(record, ["objectives", "aim", "purpose"])),
    theory: str(pick(record, ["theory", "theoreticalFramework", "theoretical_framework"])),
    empiricalFindings: str(
      pick(record, ["empiricalFindings", "empirical_findings", "priorEvidence", "pastResearchFindings"]),
    ),
    methodology: str(pick(record, ["methodology", "methods", "design"])),
    keyFindings: str(pick(record, ["keyFindings", "key_findings", "findings", "results"])),
    limitations: str(pick(record, ["limitations", "limitationsAndFutureResearch"])),
    methodType: str(pick(record, ["methodType", "method_type", "approach"]), 60),
    sampleSize: str(pick(record, ["sampleSize", "sample_size", "sample"]), 200),
    country: str(pick(record, ["country", "setting"]), 120),
    context: str(pick(record, ["context", "industry", "sector"]), 400),
    dataAnalysis: str(pick(record, ["dataAnalysis", "data_analysis", "analysisTechnique"]), 400),
    keyVariables: strList(pick(record, ["keyVariables", "key_variables", "constructs", "variables"])),
    hypotheses: strList(pick(record, ["hypotheses", "hypothesis"]), 400),
    gapTags: strList(pick(record, ["gapTags", "gap_tags", "tags"]), 80),
    useInManuscript: str(pick(record, ["useInManuscript", "use_in_manuscript", "relevanceNote"])),
    citedReferences: mapCitedReferences(
      pick(record, ["citedReferences", "cited_references", "citedWorks", "references"]),
    ),
    scoreRigour: score(pick(record, ["scoreRigour", "rigour", "rigor"]) ?? scores.rigour ?? scores.rigor),
    scoreRelevance: score(pick(record, ["scoreRelevance", "relevance"]) ?? scores.relevance),
    scoreNovelty: score(pick(record, ["scoreNovelty", "novelty"]) ?? scores.novelty),
    scoreClarity: score(pick(record, ["scoreClarity", "clarity"]) ?? scores.clarity),
    overallScore: null,
    verdict,
    strengths: str(pick(record, ["strengths", "strengthsAndContributions"])),
    weaknesses: str(pick(record, ["weaknesses", "weaknessesAndGaps"])),
  };

  const explicitOverall = score(pick(record, ["overallScore", "overall"]) ?? scores.overall);
  draft.overallScore =
    explicitOverall ??
    averageAppraisal({
      scoreRigour: draft.scoreRigour,
      scoreRelevance: draft.scoreRelevance,
      scoreNovelty: draft.scoreNovelty,
      scoreClarity: draft.scoreClarity,
    });

  return draft;
}

/** True when the model returned something usable rather than an empty shell. */
export function draftIsUsable(draft: ReviewDraft): boolean {
  const contentFields = [
    draft.problemsGaps,
    draft.objectives,
    draft.theory,
    draft.empiricalFindings,
    draft.methodology,
    draft.keyFindings,
    draft.limitations,
  ];
  const filled = contentFields.filter((value) => value && value.length > 30).length;
  return Boolean(draft.title) && filled >= 3;
}
