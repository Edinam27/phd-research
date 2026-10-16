/**
 * Publication guideline, transcribed from `guideline_for_publications1.docx`.
 *
 * The document is a journal checklist. It fixes, in order:
 *   Full manuscript (5000-8000) -> Introduction (450-550) -> Theory ->
 *   Literature (Theory/Model 300; global perspective 300; contextual
 *   background 300; hypothesis pairings 150-200 each, or 300 per variable for
 *   qualitative work) -> Methodology (Data Collection 200-400; Instrumentation
 *   and Analysis 200-300) -> Analysis and Results (quantitative diagnostics and
 *   Tables 1-4, or qualitative coding and themes) -> Discussion (250-500) ->
 *   Conclusion and implications (250-300) -> Limitations (100) -> References.
 *
 * Those numbers are enforced as word budgets and as per-section checklists, and
 * are injected verbatim into the drafting prompts.
 */

export const FULL_MANUSCRIPT = { wordMin: 5000, wordMax: 8000 } as const;

export type StudyType = "quantitative" | "qualitative" | "mixed" | "conceptual" | "systematic-review";
export type ManuscriptKind = "article" | "proposal" | "abstract";

export type GuidelineSection = {
  /** Stable key, also used as the DB `section_key`. */
  key: string;
  heading: string;
  wordMin: number;
  wordMax: number;
  /** Whether the section appears in a quantitative, qualitative or any study. */
  appliesTo: "all" | "quantitative" | "qualitative";
  /** Verbatim requirements from the guideline, used as the compliance checklist. */
  checklist: string[];
  /** Writing instruction handed to the drafting model. */
  guidance: string;
  /** Tables the guideline expects to be inserted here. */
  tables?: string[];
};

export const ARTICLE_SECTIONS: GuidelineSection[] = [
  {
    key: "introduction",
    heading: "Introduction",
    wordMin: 450,
    wordMax: 550,
    appliesTo: "all",
    checklist: [
      "Global understanding of your main variables, with arguments for and against in the literature, focused on the importance of those variables",
      "Conceptualisation of your key variable based on earlier definitions (where necessary)",
      "The aim or purpose of your study",
      "Research problem identified, and the gap stated",
      "Motivation for this study",
      "Specific objectives of the study",
      "Potential contributions of this study (policy-makers, managers, businesses, practitioners)",
      "Structure of the paper",
    ],
    guidance:
      "Open on the global significance of the main variables, then narrow to the context. Define and conceptualise each key variable from earlier definitions. State the research problem and the precise gap, the aim/purpose, the motivation, the numbered specific objectives, the expected contributions to policy-makers, managers, businesses and practitioners, and close with a paragraph mapping the structure of the paper. Cite as you go.",
  },
  {
    key: "theory-model",
    heading: "Theory or Model to be Used",
    wordMin: 250,
    wordMax: 350,
    appliesTo: "all",
    checklist: [
      "What the theory stands for, and who propounded it",
      "How you are using the theory in context — how you contextualise it in the current study",
      "Evidence of the theory being applied in similar studies",
      "Challenges associated with the theory, and how they were overcome",
      "Strength of the theory in this context and its relevance to the current study",
    ],
    guidance:
      "Name the theory and its proponent(s), state what it claims, then justify the choice. Show prior studies that used it, acknowledge the criticisms or weaknesses of applying it in this context, explain how you overcome them, and defend its relevance. End by stating which constructs your study takes from the theory.",
  },
  {
    key: "global-perspective",
    heading: "Global Perspective of the Key Variable(s)",
    wordMin: 250,
    wordMax: 350,
    appliesTo: "all",
    checklist: [
      "Global, cross-country evidence on each key variable",
      "How the variable is understood and measured internationally",
      "Contradictions between studies resolved or explained",
    ],
    guidance:
      "Review the international literature on each key variable, moving across countries and sectors. Report how each variable is operationalised, what findings recur, and where evidence conflicts, then explain the likely reason for the conflict.",
  },
  {
    key: "contextual-background",
    heading: "Contextual Background",
    wordMin: 250,
    wordMax: 350,
    appliesTo: "all",
    checklist: [
      "Contextual background of what you are writing about",
      "Sector, country and policy setting with current figures",
      "Why this context makes the problem materially different from the global evidence",
    ],
    guidance:
      "Describe the specific context: sector, country, institutions and policy environment, with current statistics. Make the case that the global evidence reviewed above does not simply transfer to this setting, which is why the study is needed here.",
  },
  {
    key: "hypotheses",
    heading: "Variable Combinations and Hypothesis Formulation",
    wordMin: 150,
    wordMax: 200,
    appliesTo: "quantitative",
    checklist: [
      "Each pairing of one independent variable against the dependent variable is treated in its own sub-section (150-200 words each)",
      "Each sub-section reviews the literature linking the two variables",
      "Each sub-section ends with an explicitly labelled numbered hypothesis, e.g. \"H1: X1 and Y1\"",
      "Hypotheses are directional and testable",
    ],
    guidance:
      "Work through the specific objectives one pairing at a time: variable 1 against the dependent variable, then variable 2 against the dependent variable, and so on. For each pairing write 150-200 words of literature that logically links the predictor to the outcome, then close the sub-section with a labelled hypothesis in the guideline's form (H1: X1 and Y1). Keep the numbering sequential and make every hypothesis directional.",
  },
  {
    key: "variable-review",
    heading: "Literature Review on Each Main Variable",
    wordMin: 250,
    wordMax: 350,
    appliesTo: "qualitative",
    checklist: [
      "A dedicated review of each main variable stated in the specific objectives",
      "Approximately 300 words per variable",
      "Concepts, meanings and debates rather than hypotheses",
      "Ends by stating the research question each review informs",
    ],
    guidance:
      "For a qualitative study, devote a separate sub-section of roughly 300 words to each main variable named in the specific objectives. Explore the concepts, contested meanings and debates rather than testing relationships, and close each sub-section by stating the research question it informs.",
  },
  {
    key: "data-collection",
    heading: "Methodology — Data Collection and Sampling",
    wordMin: 200,
    wordMax: 400,
    appliesTo: "all",
    checklist: [
      "Research philosophy and design, and the reason for choosing it",
      "Population, sampling frame, sampling technique and justification",
      "Sample size and how it was determined (e.g. Krejcie and Morgan, power analysis, saturation)",
      "Data source, administration mode and period of collection",
      "Ethical clearance and consent procedures",
    ],
    guidance:
      "State the research philosophy, approach and design, then justify them. Define the population and sampling frame, name the sampling technique, and justify the sample size with a citation (Krejcie and Morgan, G*Power, saturation). Describe how data were collected, over what period, and how ethics and consent were handled.",
  },
  {
    key: "instrumentation-analysis",
    heading: "Methodology — Instrumentation and Analysis",
    wordMin: 200,
    wordMax: 300,
    appliesTo: "all",
    checklist: [
      "Measurement instrument, sources of items and scale formats",
      "Validity: content validity, expert review, pilot study",
      "Reliability: Cronbach's alpha / composite reliability from the pilot",
      "Data analysis strategy mapped to each objective",
      "Software used (SPSS, AMOS, SmartPLS, NVivo, Stata, R)",
    ],
    guidance:
      "Describe the questionnaire or interview protocol, the source of every construct's items, and the response scale. Report validity and reliability evidence from the pilot study. Then map the analysis strategy to each specific objective, naming the technique (EFA, CFA, SEM/PLS-SEM, regression, thematic analysis) and the software used.",
  },
  {
    key: "results",
    heading: "Analysis and Results (Quantitative)",
    wordMin: 600,
    wordMax: 800,
    appliesTo: "quantitative",
    checklist: [
      "Descriptive results on demographics with mean or frequency values (Table 1)",
      "Diagnostic tests reported: normality, common method variance, D-test / Mahalanobis distance, Durbin-Watson, collinearity (VIF, tolerance)",
      "Descriptive statistics for all constructs: mean values, loadings, AVE, individual reliability, composite reliability (Table 2), covering EFA and CFA",
      "Inter-factor correlation matrix testing discriminant validity (Table 3)",
      "CFA results showing fitness indices for the measurement and structural models",
      "Results showing all the tested hypotheses (Table 4)",
      "Factor analysis commentary (~100 words)",
      "Measurement model indices commentary (~100 words)",
      "Structural equation modelling commentary (~150 words)",
    ],
    tables: ["Table 1 — Demographics", "Table 2 — Construct descriptives, loadings, AVE, reliability", "Table 3 — Inter-factor correlation / discriminant validity", "Table 4 — Hypothesis test results"],
    guidance:
      "Follow the guideline's running order exactly: (1) demographics with frequencies or means, flagged as INSERT TABLE 1 HERE ABOUT; (2) the diagnostic battery — normality, common method variance, Mahalanobis D-test, Durbin-Watson, and collinearity via VIF and tolerance; (3) construct descriptives with means, loadings, AVE, individual item reliability and composite reliability from EFA and CFA, flagged as INSERT TABLE 2 HERE ABOUT; (4) the inter-factor correlation matrix and discriminant validity (HTMT or Fornell-Larcker), flagged as INSERT TABLE 3 HERE ABOUT; (5) measurement and structural model fit indices (chi-square/df, CFI, TLI, RMSEA, SRMR); (6) every hypothesis with its coefficient, t/p value and support decision, flagged as INSERT TABLE 4 HERE ABOUT. Keep the four commentary blocks at roughly 100, 100, 150 words as the guideline specifies.",
  },
  {
    key: "results-qualitative",
    heading: "Analysis and Results (Qualitative)",
    wordMin: 500,
    wordMax: 900,
    appliesTo: "qualitative",
    checklist: [
      "Analysis presented objective by objective",
      "Coding process described, generating themes with labels",
      "Quotations from participants used to support each theme",
      "Theme-to-objective mapping made explicit",
    ],
    guidance:
      "Analyse objective by objective. Show how the codes were generated and grouped into themes, give each theme a label and a short definition, and support every theme with verbatim participant quotations carrying participant identifiers. Make explicit which objective each theme answers.",
  },
  {
    key: "discussion",
    heading: "Discussion of Findings",
    wordMin: 250,
    wordMax: 500,
    appliesTo: "all",
    checklist: [
      "Each finding restated and interpreted",
      "Each finding compared and contrasted with the studies reviewed earlier",
      "Agreements, disagreements and the explanation for both",
      "Links back to the theory adopted",
    ],
    guidance:
      "Take each finding in turn, interpret it, and set it against the specific studies reviewed earlier — naming them. Explain agreements and disagreements rather than only listing them, and tie the explanation back to the theory adopted.",
  },
  {
    key: "conclusion",
    heading: "Conclusion and Implications",
    wordMin: 250,
    wordMax: 300,
    appliesTo: "all",
    checklist: [
      "Conclusion answering the aim and each specific objective",
      "Theoretical implications",
      "Managerial / practical implications",
      "Policy implications",
      "No new results or citations introduced",
    ],
    guidance:
      "Answer the aim and each specific objective in turn. Then state the theoretical contribution, the managerial or practical implications, and the policy implications, each in a short paragraph. Introduce no new results and no new citations.",
  },
  {
    key: "limitations",
    heading: "Limitations and Areas for Future Study",
    wordMin: 80,
    wordMax: 130,
    appliesTo: "all",
    checklist: [
      "Honest methodological and scope limitations",
      "Each limitation paired with a concrete future research direction",
    ],
    guidance:
      "State the methodological and scope limitations honestly — sample, context, design, measurement — and pair each one with a concrete direction for future research. No hedging, no self-praise.",
  },
  {
    key: "references",
    heading: "References",
    wordMin: 0,
    wordMax: 0,
    appliesTo: "all",
    checklist: [
      "One consistent referencing style, applied to every entry",
      "Every in-text citation appears in the list, and every entry is cited",
      "Recent and seminal work both represented",
    ],
    guidance:
      "Produce the reference list in one consistent style. Only include works cited in the text, and cite every work listed.",
  },
];

export const PROPOSAL_ONLY_SECTIONS: GuidelineSection[] = [
  {
    key: "workplan",
    heading: "Work Plan and Timeline",
    wordMin: 200,
    wordMax: 400,
    appliesTo: "all",
    checklist: [
      "Phases of the study with activities and deliverables",
      "Timeline by month or term",
      "Milestones tied to supervision or review points",
    ],
    guidance:
      "Set out the study in phases with activities, deliverables, a month-by-month timeline, and the milestones at which supervision or committee review takes place.",
  },
  {
    key: "ethics",
    heading: "Ethical Considerations",
    wordMin: 150,
    wordMax: 300,
    appliesTo: "all",
    checklist: [
      "Ethics approval route and body",
      "Informed consent, anonymity and confidentiality",
      "Data protection and storage",
      "Risk to participants and mitigation",
    ],
    guidance:
      "State the ethics approval route and body, then the informed consent, anonymity, confidentiality and data protection arrangements, and how any risk to participants is mitigated.",
  },
  {
    key: "expected-outcomes",
    heading: "Expected Outcomes and Contributions",
    wordMin: 200,
    wordMax: 350,
    appliesTo: "all",
    checklist: [
      "Anticipated findings stated as expectations, not claims",
      "Theoretical contribution",
      "Practical / policy contribution",
      "Dissemination plan (journal, conference)",
    ],
    guidance:
      "State what you expect to find, framed as expectations rather than claims. Then give the theoretical contribution, the practical or policy contribution, and the dissemination plan including the target journal and conference.",
  },
  {
    key: "budget",
    heading: "Budget and Resources",
    wordMin: 100,
    wordMax: 250,
    appliesTo: "all",
    checklist: ["Cost lines with amounts", "Funding source or self-funded statement", "Justification for each cost line"],
    guidance:
      "Itemise the cost lines with amounts and a one-line justification each, then state the funding source or that the study is self-funded.",
  },
];

/** Front matter that journals require even though the guideline does not itemise it. */
export const FRONT_MATTER: GuidelineSection = {
  key: "abstract",
  heading: "Abstract and Keywords",
  wordMin: 150,
  wordMax: 250,
  appliesTo: "all",
  checklist: [
    "Purpose and research problem",
    "Design, sample and analysis",
    "Headline findings",
    "Implications and originality",
    "Five to six keywords",
  ],
  guidance:
    "Write a structured abstract: purpose, design/methodology/approach, findings, implications, originality. Then list five to six keywords, ordering them from the most to the least specific.",
};

export function getSections(kind: ManuscriptKind, studyType: StudyType): GuidelineSection[] {
  const base = ARTICLE_SECTIONS.filter((section) => appliesToStudy(section, studyType));
  const withFrontMatter = kind === "abstract" ? [FRONT_MATTER] : [FRONT_MATTER, ...base];
  if (kind === "proposal") {
    const references = withFrontMatter.filter((section) => section.key === "references");
    const rest = withFrontMatter.filter((section) => section.key !== "references");
    const proposalBody = rest.filter((section) => section.key !== "results" && section.key !== "results-qualitative" && section.key !== "discussion");
    return [...proposalBody, ...PROPOSAL_ONLY_SECTIONS, ...references];
  }
  return withFrontMatter;
}

function appliesToStudy(section: GuidelineSection, studyType: StudyType): boolean {
  if (section.appliesTo === "all") return true;
  if (studyType === "mixed") return true;
  if (studyType === "quantitative") return section.appliesTo === "quantitative";
  if (studyType === "qualitative") return section.appliesTo === "qualitative";
  return false;
}

/** Sum of the guideline's lower/upper word budgets for a template. */
export function wordBudget(sections: GuidelineSection[]): { min: number; max: number } {
  return sections.reduce(
    (acc, section) => ({ min: acc.min + section.wordMin, max: acc.max + section.wordMax }),
    { min: 0, max: 0 },
  );
}

export const MANUSCRIPT_KINDS: { value: ManuscriptKind; label: string; blurb: string }[] = [
  { value: "article", label: "Journal article", blurb: "Full manuscript written against the publication guideline." },
  { value: "proposal", label: "Research proposal", blurb: "Guideline sections plus work plan, ethics, expected outcomes and budget." },
  { value: "abstract", label: "Abstract only", blurb: "Structured abstract with keywords, for a conference or call for papers." },
];

export const STUDY_TYPES: { value: StudyType; label: string }[] = [
  { value: "quantitative", label: "Quantitative" },
  { value: "qualitative", label: "Qualitative" },
  { value: "mixed", label: "Mixed methods" },
  { value: "conceptual", label: "Conceptual" },
  { value: "systematic-review", label: "Systematic review" },
];

export const MANUSCRIPT_STATUSES = [
  "draft",
  "internal-review",
  "supervisor-review",
  "ready",
  "submitted",
  "published",
] as const;
export type ManuscriptStatus = (typeof MANUSCRIPT_STATUSES)[number];
