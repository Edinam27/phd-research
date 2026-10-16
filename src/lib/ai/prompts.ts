import type { ChatMessage } from "./provider";
import { TAXONOMY_COLUMNS } from "@/lib/taxonomy";
import type { GuidelineSection, StudyType } from "@/lib/guideline";
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

export const MAX_SOURCE_CHARS = Number(process.env.AI_MAX_INPUT_CHARS ?? 60000);

const ACADEMIC_RULES = `Non-negotiable rules:
- Write in formal academic English. No bullet points unless the section explicitly calls for a list.
- Never fabricate a finding, statistic, sample size, quotation or citation. If something is not in the supplied evidence, either omit it or mark it as [NEEDS SOURCE] and state what must be found.
- Cite only works that appear in the supplied evidence matrix, in the form Author (Year) or (Author, Year). Never invent an author, year, journal or DOI.
- Be specific. Prefer numbers, constructs, theory names and contexts over generic filler.
- Never use the words "delve", "tapestry", "landscape of", "in today's world" or "it is worth noting".`;

/** Compact, token-efficient rendering of the notebook's study design. */
export function notebookContext(notebook: NotebookLike): string {
  const lines = [
    `Study title: ${notebook.title}`,
    notebook.researchArea ? `Research area: ${notebook.researchArea}` : null,
    notebook.description ? `Scope: ${notebook.description}` : null,
    `Methodological orientation: ${notebook.studyType}`,
    notebook.context ? `Study context: ${notebook.context}` : null,
    notebook.keyVariables?.length ? `Key variables: ${notebook.keyVariables.join(", ")}` : null,
    notebook.theory ? `Adopted theory: ${notebook.theory}` : null,
    notebook.researchProblem ? `Research problem: ${notebook.researchProblem}` : null,
    notebook.researchObjectives?.length
      ? `Specific objectives:\n${notebook.researchObjectives.map((objective, index) => `  ${index + 1}. ${objective}`).join("\n")}`
      : null,
    notebook.targetJournal ? `Target journal: ${notebook.targetJournal}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

/** The literature matrix, rendered for the model. Keeps author-year anchors intact. */
export function renderEvidence(reviews: Review[]): string {
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
        review.empiricalFindings ? `  Prior empirical evidence reported: ${review.empiricalFindings}` : null,
        review.methodology ? `  Methodology: ${review.methodology}` : null,
        review.keyFindings ? `  Key findings: ${review.keyFindings}` : null,
        review.limitations ? `  Limitations: ${review.limitations}` : null,
        review.keyVariables?.length ? `  Variables: ${review.keyVariables.join(", ")}` : null,
        review.hypotheses?.length ? `  Hypotheses tested: ${review.hypotheses.join(" ; ")}` : null,
        review.country ? `  Context: ${review.country}${review.context ? ` — ${review.context}` : ""}` : null,
        review.overallScore ? `  Reviewer quality score: ${review.overallScore}/10 (${review.verdict})` : null,
        review.useInManuscript ? `  How it will be used in the manuscript: ${review.useInManuscript}` : null,
      ].filter(Boolean);
      return parts.join("\n");
    })
    .join("\n\n");
}

export function taxonomyFieldGuide(): string {
  return TAXONOMY_COLUMNS.map(
    (column) => `  - "${column.field}": ${column.label}. ${column.hint}${column.kind === "long" ? " (write 2-5 sentences, dense and specific)" : ""}`,
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
  const truncated = input.sourceText.slice(0, MAX_SOURCE_CHARS);
  const wasTruncated = input.sourceText.length > MAX_SOURCE_CHARS;

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
  "useInManuscript": "e.g. 'Literature review, hypothesis 2 on the mediating role of X'"
}

Field guide for the matrix columns:
${taxonomyFieldGuide()}

Scoring calibration: 1-3 weak or unusable; 4-5 usable with caution; 6-7 solid; 8-9 strong, cite with confidence; 10 field-defining. Do not give everything 7. Relevance must be judged against the candidate's specific objectives, not general interest.

Transcription rule — you are transcribing this article's own metadata, NOT recalling it from memory:
- Fill authors, year, title, journal, volume, issue, pages, doi and citation ONLY from what the supplied text states.
- If the supplied text does not state a field, return an empty string (and null for year). Do not infer it, do not reconstruct it from the title, and do not supply a plausible-looking DOI, journal, volume or year.
- Authors are the field most often invented. If the supplied text has no author line or byline — for example a bare abstract — then "authors" MUST be "" and the citation MUST be a placeholder such as "[Author]. [Title]." A name that "sounds like" the work is a fabrication, even if the first author of a real paper on this topic would fit.
- A blank field is correct and useful; a fabricated reference is a serious error that invalidates the candidate's matrix. A short extract such as an abstract will legitimately leave several of these fields blank.

${ACADEMIC_RULES}`,
    },
    {
      role: "user",
      content: `Notebook study design:
${notebookContext(input.notebook)}

${input.focusNote ? `The candidate has asked you to pay particular attention to: ${input.focusNote}\n` : ""}
Article to review${input.filename ? ` (file: ${input.filename})` : ""}:
"""
${truncated}
"""
${wasTruncated ? "\nNote: the document was truncated because of its length. Base every field only on what is visible above, and say so inside the relevant field if a section appears cut off." : ""}

Return the JSON object now.`,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Manuscript sections                                                 */
/* ------------------------------------------------------------------ */

export function manuscriptSectionMessages(input: {
  notebook: NotebookLike;
  manuscript: Pick<Manuscript, "title" | "kind" | "studyType" | "targetJournal" | "abstract" | "keywords">;
  section: GuidelineSection;
  existingContent: string;
  evidence: Review[];
  instruction?: string | null;
  neighbouringSections?: { heading: string; content: string }[];
}): ChatMessage[] {
  const { section } = input;
  const budget =
    section.wordMax > 0 ? `${section.wordMin}-${section.wordMax} words` : "as long as the content requires";

  const neighbours = (input.neighbouringSections ?? [])
    .filter((neighbour) => neighbour.content.trim().length > 0)
    .map((neighbour) => `### ${neighbour.heading}\n${neighbour.content.slice(0, 3500)}`)
    .join("\n\n");

  return [
    {
      role: "system",
      content: `You are ghost-writing a PhD ${input.manuscript.kind === "proposal" ? "research proposal" : "journal manuscript"} to a fixed journal template. You write polished, publishable academic prose that a supervisor would accept with light editing.

Section to write: "${section.heading}"
Hard word budget: ${budget}

The journal template requires that this section does ALL of the following (treat every item as a minimum requirement):
${section.checklist.map((item, index) => `  ${index + 1}. ${item}`).join("\n")}

Section-specific instruction from the template:
${section.guidance}
${section.tables?.length ? `\nTables expected in this section: ${section.tables.join("; ")}. Write them as "INSERT TABLE n HERE ABOUT" callouts exactly where the template asks, and describe in one sentence what the table contains.` : ""}

Output the section body only. No section heading, no preamble such as "Here is the section", no explanation of what you did. Markdown headings are permitted only for sub-sections listed in the template requirements (for example one sub-section per hypothesis pairing).

${ACADEMIC_RULES}`,
    },
    {
      role: "user",
      content: `Study design:
${notebookContext(input.notebook)}

Manuscript: ${input.manuscript.title}${input.manuscript.targetJournal ? ` (target: ${input.manuscript.targetJournal})` : ""}
${input.manuscript.abstract ? `\nCurrent abstract:\n${input.manuscript.abstract}` : ""}
${input.manuscript.keywords?.length ? `\nKeywords: ${input.manuscript.keywords.join(", ")}` : ""}

Evidence matrix — the only literature you may cite:
${renderEvidence(input.evidence)}
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
  reviews: Review[];
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
  research: "Find current, citable evidence relevant to the question. Prioritise peer-reviewed journal articles from the last five years, and name the journals and years.",
  theory: "Identify the theories and models used in this area, who propounded each one, and how recent studies have applied them.",
  methodology: "Identify the standard designs, validated measurement scales, sample sizes and analysis techniques used for this kind of study, with sources.",
  gap: "Identify what the literature has NOT yet examined — the open gaps, under-studied contexts and contradictions that remain unresolved.",
  question: "Draft candidate research questions and hypotheses, and cite the evidence that makes each one defensible.",
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
  reviews: Review[];
  history: ChatMessage[];
  question: string;
}): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are the research assistant inside one PhD notebook. You know this notebook's study design and its literature matrix, and you answer only from them plus your general academic knowledge. You never invent citations. When a claim needs a source that is not in the matrix, say "[NEEDS SOURCE]" and describe what to look for.

Be direct and practical. Answer as a supervisor would: short paragraphs, concrete next actions. Use markdown.

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
