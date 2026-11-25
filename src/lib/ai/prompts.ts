import type { ChatMessage } from "./provider";
import { manuscriptStyleBlock, PROSE_STYLE_COMPACT } from "./style";
import {
  renderBibliography,
  renderLibrary,
  type LibraryEntry,
} from "@/lib/references";
import { TAXONOMY_COLUMNS } from "@/lib/taxonomy";
import type { GuidelineSection, StudyType } from "@/lib/guideline";
import type { EvidenceReview } from "@/lib/manuscripts";
import type { Manuscript, Notebook, Review } from "@/db/schema";

type NotebookLike = Pick<
  Notebook,
  | "title"
  | "description"
  | "researchArea"
  | "studyType"
  | "targetJournal"
  | "keyVariables"
  | "researchProblem"
  | "researchObjectives"
  | "theory"
  | "context"
>;

/** Total source-text budget handed to the model for one article. */
export const MAX_SOURCE_CHARS = Number(process.env.AI_MAX_INPUT_CHARS ?? 60000);

/**
 * How much of that budget is reserved for the END of the document. A journal
 * article keeps its reference list — and its conclusion — at the back, so
 * truncating purely from the front discarded exactly the material that shows
 * which works the article leans on.
 */
export const MAX_SOURCE_TAIL_CHARS = Number(
  process.env.AI_MAX_TAIL_CHARS ?? 20000,
);

/** Head plus tail of an over-long document, with the omitted middle marked. */
export function windowSource(text: string): { text: string; elided: boolean } {
  const tailChars = Math.max(
    0,
    Math.min(MAX_SOURCE_TAIL_CHARS, Math.floor(MAX_SOURCE_CHARS / 2)),
  );
  if (text.length <= MAX_SOURCE_CHARS || tailChars === 0) {
    return {
      text: text.slice(0, MAX_SOURCE_CHARS),
      elided: text.length > MAX_SOURCE_CHARS,
    };
  }
  const headChars = Math.max(0, MAX_SOURCE_CHARS - tailChars);
  return {
    text: `${text.slice(0, headChars)}\n\n[... the middle of this document is omitted for length ...]\n\n${text.slice(-tailChars)}`,
    elided: true,
  };
}

/** Shared extraction contract for the cited works of an article. */
const CITED_REFERENCE_SHAPE = `"citedReferences": [
    {
      "authors": "Surname(s) as they should read in an anchor: 'Smith' or 'Smith and Jones'",
      "year": 2018,
      "title": "Title of the cited work",
      "source": "Journal, book or publisher it appeared in, or an empty string",
      "role": "theory | concept | prior-evidence | method | context",
      "note": "one line on how the article uses this work"
    }
  ]`;

const CITED_REFERENCE_RULES = `Extracting the works the article leans on:
- Name ONLY works the article genuinely uses: the theory it adopts, the concepts it defines or borrows, the studies it reports, argues with, or builds its hypotheses from, and the sources of its instruments or methods. Skip incidental names dropped into a list of examples.
- Read both the running text and the article's reference list at the end. The reference list confirms the full titles, years and outlets.
- "role" is the part that work plays IN THIS ARTICLE: theory, concept, prior-evidence, method or context.
- Give 5 to 15 entries — the works that would appear in a literature review of this topic. Fewer, precise entries beat a long list.
- Never invent a work, an author, a year or a title. If the article's reference list is not visible in the supplied text, return an empty array rather than guessing.
- Prefer a work the article names in its own argument over one that only appears in the reference list and nowhere in the text.`;

const ACADEMIC_RULES = `Non-negotiable rules:
- Write in formal academic English. No bullet points unless the section explicitly calls for a list.
- Never fabricate a finding, statistic, sample size, quotation or citation. If something is not in the supplied evidence, either omit it or mark it as [NEEDS SOURCE] and state what must be found.
- Cite directly only works that appear in the supplied evidence matrix, in the form Author (Year) or (Author, Year). Never invent an author, year, journal or DOI.
- A work you have not read yourself may only be cited as a secondary source — "Smith (2019, as cited in Jones, 2021)" — naming the article from the evidence matrix it was found in. Never present a secondary source as though you had read it.
- Be specific. Prefer numbers, constructs, theory names and contexts over generic filler.
- Never use the words "delve", "tapestry", "landscape of", "in today's world" or "it is worth noting". Never write "plays a crucial role", "plays a pivotal role", "a testament to" or "underscores the importance of", and never stack three adjectives ("significant, meaningful, and substantial").`;

/** Compact, token-efficient rendering of the notebook's study design. */
export function notebookContext(notebook: NotebookLike): string {
  const lines = [
    `Study title: ${notebook.title}`,
    notebook.researchArea ? `Research area: ${notebook.researchArea}` : null,
    notebook.description ? `Scope: ${notebook.description}` : null,
    `Methodological orientation: ${notebook.studyType}`,
    notebook.context ? `Study context: ${notebook.context}` : null,
    notebook.keyVariables?.length
      ? `Key variables: ${notebook.keyVariables.join(", ")}`
      : null,
    notebook.theory ? `Adopted theory: ${notebook.theory}` : null,
    notebook.researchProblem
      ? `Research problem: ${notebook.researchProblem}`
      : null,
    notebook.researchObjectives?.length
      ? `Specific objectives:\n${notebook.researchObjectives.map((objective, index) => `  ${index + 1}. ${objective}`).join("\n")}`
      : null,
    notebook.targetJournal ? `Target journal: ${notebook.targetJournal}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

/** The literature matrix, rendered for the model. Keeps author-year anchors intact. */
export function renderEvidence(reviews: EvidenceReview[]): string {
  if (reviews.length === 0) {
    return "(The evidence matrix is empty. Write only from the study design above and mark every external claim as [NEEDS SOURCE].)";
  }

  return reviews
    .map((review, index) => {
      const anchor = `${review.author}${review.year ? ` (${review.year})` : ""}`;
      const parts = [
        `[${index + 1}] ${anchor} — ${review.title}${review.journal ? `. ${review.journal}` : ""}${review.doi ? `. doi:${review.doi}` : ""}`,
        review.problemsGaps ? `  Problems/gaps: ${review.problemsGaps}` : null,
        review.objectives ? `  Objectives: ${review.objectives}` : null,
        review.theory ? `  Theory: ${review.theory}` : null,
        review.empiricalFindings
          ? `  Prior empirical evidence reported: ${review.empiricalFindings}`
          : null,
        review.methodology ? `  Methodology: ${review.methodology}` : null,
        review.keyFindings ? `  Key findings: ${review.keyFindings}` : null,
        review.limitations ? `  Limitations: ${review.limitations}` : null,
        review.keyVariables?.length
          ? `  Variables: ${review.keyVariables.join(", ")}`
          : null,
        review.hypotheses?.length
          ? `  Hypotheses tested: ${review.hypotheses.join(" ; ")}`
          : null,
        review.country
          ? `  Context: ${review.country}${review.context ? ` — ${review.context}` : ""}`
          : null,
        review.overallScore
          ? `  Reviewer quality score: ${review.overallScore}/10 (${review.verdict})`
          : null,
        review.useInManuscript
          ? `  How it will be used in the manuscript: ${review.useInManuscript}`
          : null,
      ].filter(Boolean);
      return parts.join("\n");
    })
    .join("\n\n");
}

export function taxonomyFieldGuide(): string {
  return TAXONOMY_COLUMNS.map(
    (column) =>
      `  - "${column.field}": ${column.label}. ${column.hint}${column.kind === "long" ? " (write 2-5 sentences, dense and specific)" : ""}`,
  ).join("\n");
}

/* ------------------------------------------------------------------ */
/* Article review                                                      */
/* ------------------------------------------------------------------ */

export function articleReviewMessages(input: {
  notebook: NotebookLike;
  sourceText: string;
  filename?: string | null;
  focusNote?: string | null;
}): ChatMessage[] {
  const windowed = windowSource(input.sourceText);

  return [
    {
      role: "system",
      content: `You are a doctoral supervisor and journal reviewer who completes a structured literature matrix for a PhD candidate. You read an article and return one row of a review taxonomy, plus a critical appraisal.

Return STRICT JSON only — no prose before or after, no markdown fences. Shape:
{
  "authors": "Surname, Initials; Surname, Initials",
  "year": 2024,
  "title": "Full article title",
  "journal": "Journal name, volume(issue), pages, indexing if visible",
  "volume": "12", "issue": "3", "pages": "45-67", "doi": "10.1000/xyz",
  "problemsGaps": "The problem addressed AND the specific gap claimed. Distinguish contextual, theoretical, methodological and empirical gaps.",
  "objectives": "The aim and the numbered specific objectives / research questions, verbatim in substance.",
  "theory": "The theory or model used, who propounded it, and how this article applied it. If none, say so explicitly.",
  "empiricalFindings": "Findings of EARLIER empirical research as reported by this article — not this article's own results. Include effect directions and contradictions.",
  "methodology": "Design, population, sampling technique, sample size, instrument, data analysis technique, software. Include N and response rate if stated.",
  "keyFindings": "THIS article's own results, per hypothesis or objective, with statistics (beta, p, r, t, f2) where reported.",
  "limitations": "Stated limitations first, then limitations you identify yourself (design, sample, context, measurement, causality).",
  "methodType": "quantitative | qualitative | mixed | conceptual | review",
  "sampleSize": "e.g. '312 usable responses from 450 distributed'",
  "country": "Country or region of the empirical setting",
  "context": "Industry / sector / institutional setting",
  "dataAnalysis": "e.g. 'PLS-SEM on SmartPLS 4, bootstrapped 5000 subsamples'",
  "keyVariables": ["independent, mediating and dependent constructs as separate strings"],
  "hypotheses": ["H1: X1 -> Y1", "H2: ..."],
  "gapTags": ["3-6 short tags, lowercase, e.g. 'developing-economy', 'hospitality', 'mediating-role', 'cross-sectional'"],
  "citation": "Full APA 7th edition reference for this article",
  "scores": { "rigour": 1-10, "relevance": 1-10, "novelty": 1-10, "clarity": 1-10 },
  "verdict": "include | borderline | exclude",
  "strengths": "Two to three sentences, methodological and conceptual strengths.",
  "weaknesses": "Two to three sentences, the weaknesses that create an opening for this PhD study.",
  "relevanceNote": "Precisely how this article serves the candidate's objectives: which variable, which section of the manuscript, and which gap.",
  "useInManuscript": "e.g. 'Literature review, hypothesis 2 on the mediating role of X'",
  ${CITED_REFERENCE_SHAPE}
}

Field guide for the matrix columns:
${taxonomyFieldGuide()}

Scoring calibration: 1-3 weak or unusable; 4-5 usable with caution; 6-7 solid; 8-9 strong, cite with confidence; 10 field-defining. Do not give everything 7. Relevance must be judged against the candidate's specific objectives, not general interest.

Transcription rule — you are transcribing this article's own metadata, NOT recalling it from memory:
- Fill authors, year, title, journal, volume, issue, pages, doi and citation ONLY from what the supplied text states.
- If the supplied text does not state a field, return an empty string (and null for year). Do not infer it, do not reconstruct it from the title, and do not supply a plausible-looking DOI, journal, volume or year.
- Authors are the field most often invented. If the supplied text has no author line or byline — for example a bare abstract — then "authors" MUST be "" and the citation MUST be a placeholder such as "[Author]. [Title]." A name that "sounds like" the work is a fabrication, even if the first author of a real paper on this topic would fit.
- A blank field is correct and useful; a fabricated reference is a serious error that invalidates the candidate's matrix. A short extract such as an abstract will legitimately leave several of these fields blank.

${CITED_REFERENCE_RULES}

${ACADEMIC_RULES}`,
    },
    {
      role: "user",
      content: `Notebook study design:
${notebookContext(input.notebook)}

${input.focusNote ? `The candidate has asked you to pay particular attention to: ${input.focusNote}\n` : ""}
Article to review${input.filename ? ` (file: ${input.filename})` : ""}:
"""
${windowed.text}
"""
${windowed.elided ? "\nNote: the document was reduced to its beginning and its end because of its length; the middle is missing. Base every field only on what is visible above, and say so inside the relevant field if a section appears cut off." : ""}

Return the JSON object now.`,
    },
  ];
}

/**
 * Focused re-read of one article for its cited works only. Used to backfill
 * articles reviewed before reference extraction existed, from the source text
 * already stored on the row — no re-upload needed.
 */
export function referenceExtractionMessages(input: {
  notebook: NotebookLike;
  sourceText: string;
  articleAnchor: string;
}): ChatMessage[] {
  const windowed = windowSource(input.sourceText);

  return [
    {
      role: "system",
      content: `You extract the works a journal article leans on — its theory, the concepts it defines or borrows, the studies it reports and argues with, and the sources of its methods — so that a PhD candidate can cite them as secondary sources.

The article being read: ${input.articleAnchor}

Return STRICT JSON only — no prose before or after, no markdown fences. Shape:
{
  ${CITED_REFERENCE_SHAPE}
}

${CITED_REFERENCE_RULES}

${ACADEMIC_RULES}`,
    },
    {
      role: "user",
      content: `Notebook study design:
${notebookContext(input.notebook)}

Article text:
"""
${windowed.text}
"""
${windowed.elided ? "\nNote: the middle of the document was omitted for length; its beginning and its reference list are intact above." : ""}

Return the JSON object now.`,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Manuscript sections                                                 */
/* ------------------------------------------------------------------ */

export function manuscriptSectionMessages(input: {
  notebook: NotebookLike;
  manuscript: Pick<
    Manuscript,
    | "id"
    | "title"
    | "kind"
    | "studyType"
    | "targetJournal"
    | "abstract"
    | "keywords"
  >;
  section: GuidelineSection;
  existingContent: string;
  evidence: EvidenceReview[];
  library?: LibraryEntry[];
  instruction?: string | null;
  neighbouringSections?: { heading: string; content: string }[];
}): ChatMessage[] {
  const { section } = input;
  const budget =
    section.wordMax > 0
      ? `${section.wordMin}-${section.wordMax} words`
      : "as long as the content requires";
  const library = input.library ?? [];
  const isReferences = section.key === "references";

  const neighbours = (input.neighbouringSections ?? [])
    .filter((neighbour) => neighbour.content.trim().length > 0)
    .map(
      (neighbour) =>
        `### ${neighbour.heading}\n${neighbour.content.slice(0, 3500)}`,
    )
    .join("\n\n");

  const literature = isReferences
    ? `Bibliography material — every source this manuscript may list:
${renderBibliography({ evidence: input.evidence, library })}`
    : `Evidence matrix — the only literature you may cite directly:
${renderEvidence(input.evidence)}${
        library.length
          ? `\n\nSecondary sources — works named inside those articles. You have NOT read the originals, so cite one only in the "as cited in" form, naming the matrix article it came from:
${renderLibrary(library)}`
          : ""
      }`;

  const referencesRule = isReferences
    ? `\nThis is the reference list. Write it as a numbered or alphabetical list, PLAIN TEXT, one entry per line, in one consistent style (APA 7 unless the target journal implies otherwise). Two parts:\n  1. "References" — the primary sources only. Every work in the evidence matrix that the manuscript cites anywhere gets a full entry here, built from the citation already recorded for it. List nothing that is not in the bibliography material.\n  2. "Named within the reviewed articles" — the secondary sources, each with the article it was found in, so the candidate can chase the original. Keep these out of the numbered reference list itself.`
    : "";

  return [
    {
      role: "system",
      content: `You are ghost-writing a PhD ${input.manuscript.kind === "proposal" ? "research proposal" : "journal manuscript"} to a fixed journal template. You write polished, publishable academic prose that a supervisor would accept with light editing.

${manuscriptStyleBlock(input.manuscript.id)}

Section to write: "${section.heading}"
Hard word budget: ${budget}

The journal template requires that this section does ALL of the following (treat every item as a minimum requirement):
${section.checklist.map((item, index) => `  ${index + 1}. ${item}`).join("\n")}

Section-specific instruction from the template:
${section.guidance}
${section.tables?.length ? `\nTables expected in this section: ${section.tables.join("; ")}. Write them as "INSERT TABLE n HERE ABOUT" callouts exactly where the template asks, and describe in one sentence what the table contains.` : ""}${referencesRule}

Output the section body only. No section heading, no preamble such as "Here is the section", no explanation of what you did. Write plain prose, with no markdown at all: no # headings, no **bold** or *italic* markers, no backticks. Give a structured abstract's paragraphs an unadorned label and colon, like "Purpose: ...". Where the template asks for sub-sections, put the sub-section title on its own line as plain text.

${ACADEMIC_RULES}`,
    },
    {
      role: "user",
      content: `Study design:
${notebookContext(input.notebook)}

Manuscript: ${input.manuscript.title}${input.manuscript.targetJournal ? ` (target: ${input.manuscript.targetJournal})` : ""}
${input.manuscript.abstract ? `\nCurrent abstract:\n${input.manuscript.abstract}` : ""}
${input.manuscript.keywords?.length ? `\nKeywords: ${input.manuscript.keywords.join(", ")}` : ""}

${literature}
${neighbours ? `\nAlready-written neighbouring sections, for continuity of voice and to avoid repetition:\n${neighbours}` : ""}
${input.existingContent.trim() ? `\nCurrent draft of this section (improve and extend it rather than discarding anything correct):\n"""\n${input.existingContent.slice(0, 12000)}\n"""` : "\nThis section is still empty."}
${input.instruction ? `\nAuthor's instruction for this pass: ${input.instruction}` : ""}

Write the "${section.heading}" section now, within ${budget}.`,
    },
  ];
}

export function complianceMessages(input: {
  notebook: NotebookLike;
  manuscriptTitle: string;
  section: GuidelineSection;
  content: string;
}): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You audit a PhD manuscript section against its journal template checklist. Be exacting; a supervisor will act on your report.

Return STRICT JSON only:
{
  "score": 0-100,
  "verdict": "one sentence naming the single biggest problem",
  "satisfied": ["checklist items that are genuinely covered, quoted briefly"],
  "missing": ["checklist items that are absent or only gestured at"],
  "unsupportedClaims": ["statements that assert a finding or statistic with no citation in the evidence matrix"],
  "recommendations": ["3-6 concrete, actionable edits, each naming what to add or cut and where"],
  "wordCountAssessment": "under | on target | over, with the number"
}

${ACADEMIC_RULES}`,
    },
    {
      role: "user",
      content: `Study design:
${notebookContext(input.notebook)}

Manuscript: ${input.manuscriptTitle}
Section under audit: ${input.section.heading}
Word budget: ${input.section.wordMin}-${input.section.wordMax}

Template checklist for this section:
${input.section.checklist.map((item, index) => `  ${index + 1}. ${item}`).join("\n")}

Section text:
"""
${input.content.slice(0, 24000)}
"""

Report the JSON now.`,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Synthesis of the whole matrix                                       */
/* ------------------------------------------------------------------ */

export function synthesisMessages(input: {
  notebook: NotebookLike;
  reviews: EvidenceReview[];
  focus?: string | null;
}): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a systematic-review methodologist. You are handed one notebook's completed literature matrix and must convert it into the analytical backbone of a PhD proposal.

Return STRICT JSON only:
{
  "overview": "120-200 word state-of-the-field synthesis",
  "themes": [{ "name": string, "summary": string, "authors": string[] }],
  "theoryUsage": [{ "theory": string, "count": number, "authors": string[] }],
  "methodDistribution": [{ "method": string, "count": number, "notes": string }],
  "contexts": [{ "context": string, "count": number }],
  "consensus": [{ "statement": string, "authors": string[] }],
  "contradictions": [{ "statement": string, "sideA": string[], "sideB": string[], "explanation": string }],
  "gaps": [{ "gap": string, "type": "contextual | theoretical | methodological | empirical", "evidence": string, "opportunity": string }],
  "researchQuestions": string[],
  "hypotheses": [{ "label": "H1", "statement": "X1 positively influences Y", "independent": string, "dependent": string, "rationale": string, "authors": string[] }],
  "recommendedOutline": [{ "section": string, "keyPoints": string[] }]
}

Ground every statement in the supplied matrix. Where the matrix is too thin to support a claim, say so in the relevant field instead of inventing it. Use author-year anchors. Hypothesis labels must be sequential and each hypothesis directional.

${PROSE_STYLE_COMPACT}

Keep the whole object inside a tight budget: at most 8 themes, 6 theories, 6 methods, 6 contexts, 6 consensus points, 5 contradictions, 8 gaps, 6 research questions, 6 hypotheses and 8 outline entries — the strongest ones, not every candidate. Two or three sentences per summary. Never put a literal line break inside a string. Finish the object: an answer that stops part-way through is discarded, so prefer a shorter complete answer over a longer unfinished one.

${ACADEMIC_RULES}`,
    },
    {
      role: "user",
      content: `Study design:
${notebookContext(input.notebook)}

Evidence matrix (${input.reviews.length} article${input.reviews.length === 1 ? "" : "s"}):
${renderEvidence(input.reviews)}

${input.focus ? `The candidate wants the synthesis angled towards: ${input.focus}` : ""}

Return the JSON now.`,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Grounded research                                                   */
/* ------------------------------------------------------------------ */

const RESEARCH_INTENTS: Record<string, string> = {
  research:
    "Find current, citable evidence relevant to the question. Prioritise peer-reviewed journal articles from the last five years, and name the journals and years.",
  theory:
    "Identify the theories and models used in this area, who propounded each one, and how recent studies have applied them.",
  methodology:
    "Identify the standard designs, validated measurement scales, sample sizes and analysis techniques used for this kind of study, with sources.",
  gap: "Identify what the literature has NOT yet examined — the open gaps, under-studied contexts and contradictions that remain unresolved.",
  question:
    "Draft candidate research questions and hypotheses, and cite the evidence that makes each one defensible.",
};

export function researchMessages(input: {
  notebook: NotebookLike;
  question: string;
  intent: string;
}): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a research librarian for a PhD candidate. You answer with grounded, verifiable evidence and you are explicit about uncertainty. Today's date matters: prefer recent work and say when the evidence base is dated.

${RESEARCH_INTENTS[input.intent] ?? RESEARCH_INTENTS.research}

Return STRICT JSON only:
{
  "answer": "Markdown. 250-450 words. Author (Year) anchors inline. Include specific numbers, effect sizes, samples and contexts.",
  "keySources": [{ "title": "Author (Year). Title. Journal", "url": "https://..." }],
  "evidenceStrength": "strong | moderate | thin, with one sentence of justification",
  "gaps": ["2-4 open gaps the candidate could own"],
  "nextSearches": ["2-3 more precise queries worth running"]
}

Only list a source in keySources when you are confident it exists. If you are unsure of a citation's details, describe the finding without fabricating the reference and add it to the gaps field as a verification task.

${PROSE_STYLE_COMPACT}

${ACADEMIC_RULES}`,
    },
    {
      role: "user",
      content: `Study design:
${notebookContext(input.notebook)}

Question: ${input.question}`,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Notebook assistant                                                  */
/* ------------------------------------------------------------------ */

export function assistantMessages(input: {
  notebook: NotebookLike;
  reviews: EvidenceReview[];
  history: ChatMessage[];
  question: string;
}): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are the research assistant inside one PhD notebook. You know this notebook's study design and its literature matrix, and you answer only from them plus your general academic knowledge. You never invent citations. When a claim needs a source that is not in the matrix, say "[NEEDS SOURCE]" and describe what to look for.

Be direct and practical. Answer as a supervisor would: short paragraphs, concrete next actions. Use markdown. Keep the studio's prose voice — concrete and specific, never generic filler: no "delve", "It is worth noting", "plays a crucial role" or strings of praise adjectives, and a memorable formulation is welcome where it earns its place.

Study design:
${notebookContext(input.notebook)}

Literature matrix (${input.reviews.length} rows):
${renderEvidence(input.reviews).slice(0, 30000)}`,
    },
    ...input.history.slice(-8),
    { role: "user", content: input.question },
  ];
}

export function studyTypeLabel(studyType: StudyType): string {
  return studyType.charAt(0).toUpperCase() + studyType.slice(1);
}

/* ------------------------------------------------------------------ */
/* Notebook-from-draft — inferring a study design from a manuscript    */
/* ------------------------------------------------------------------ */

/**
 * One call reads an existing draft and infers the notebook design around it:
 * the fields the rest of the studio injects into every review and answer.
 * Returned before any rows exist, so the notebook can be created first.
 */
export function draftDesignMessages(input: {
  draftText: string;
  filename?: string | null;
}): ChatMessage[] {
  const windowed = windowSource(input.draftText);

  return [
    {
      role: "system",
      content: `You are a doctoral supervisor reading a paper a candidate has already been working on. Infer the study design from the draft itself so a research notebook can be set up around it.

Return STRICT JSON only — no prose before or after, no markdown fences. Shape:
{
  "title": "Short notebook title for this study, not the paper's own title",
  "description": "Two sentences: what the study examines and why it matters",
  "researchArea": "Broad field, e.g. 'Tourism marketing'",
  "researchType": "empirical | conceptual | systematic-review | narrative-review | case-study | editorial",
  "studyType": "quantitative | qualitative | mixed",
  "targetJournal": "Journal the draft seems aimed at, if evident, else null",
  "keyVariables": ["core constructs, 2-6 strings"],
  "researchProblem": "The problem the draft addresses, stated as a defensible gap",
  "researchObjectives": ["objective one", "objective two"],
  "theory": "Theory or model the draft leans on, with propounder if stated",
  "context": "Empirical setting: country, sector, institutions",
  "manuscriptTitle": "The draft's own full title, verbatim"
}
Every string in English. Where the draft does not say, infer the most reasonable value from the text rather than writing null except for targetJournal, which may be null.`,
    },
    {
      role: "user",
      content: `Filename: ${input.filename ?? "unknown"}

Draft text:
${windowed.text}`,
    },
  ];
}

/**
 * Second call maps the draft's own prose onto the publication guideline's
 * sections, verbatim, so the author continues from where they stopped
 * instead of redrafting. Sections absent from the draft come back empty.
 */
export function draftSectionMapMessages(input: {
  draftText: string;
  sections: { key: string; heading: string; guidance: string }[];
}): ChatMessage[] {
  const windowed = windowSource(input.draftText);
  const sectionList = input.sections
    .map(
      (section) => `- ${section.key}: ${section.heading} — ${section.guidance}`,
    )
    .join("\n");

  return [
    {
      role: "system",
      content: `You are mapping an existing paper draft onto a journal's section template. For every section key listed, copy the draft's own prose that belongs there, VERBATIM — do not rewrite, polish or summarize the author's words. Where the draft has no material for a section, return an empty string.

Return STRICT JSON only — no prose before or after, no markdown fences. Shape:
{"sections":[{"key":"the section key","content":"the copied prose or an empty string"}]}
Every listed key must appear exactly once. Long content is fine; completeness matters more than brevity.

Section template:
${sectionList}`,
    },
    {
      role: "user",
      content: `Draft text:
${windowed.text}`,
    },
  ];
}
