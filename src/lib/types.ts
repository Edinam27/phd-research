/**
 * Shapes the browser receives from the JSON API.
 * Kept hand-written so the client never imports server-only modules.
 */

export type StudyType = "quantitative" | "qualitative" | "mixed" | "conceptual" | "systematic-review";
export type ManuscriptKind = "article" | "proposal" | "abstract";
export type NotebookRole = "owner" | "editor" | "viewer";
export type Verdict = "include" | "borderline" | "exclude";
export type ReviewStatus = "draft" | "ai-drafted" | "reviewed" | "verified";
export type SectionStatus = "empty" | "drafting" | "complete";

export type Notebook = {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  researchArea: string | null;
  studyType: StudyType;
  status: string;
  targetJournal: string | null;
  keyVariables: string[];
  researchProblem: string | null;
  researchObjectives: string[];
  theory: string | null;
  context: string | null;
  accent: string;
  createdAt: string;
  updatedAt: string;
};

export type NotebookSummary = Notebook & {
  role: NotebookRole;
  reviewCount: number;
  manuscriptCount: number;
  spendUsd: number;
};

export type NotebookDetail = {
  notebook: Notebook;
  role: NotebookRole;
  members: { id: string; name: string; email: string; role: NotebookRole }[];
  stats: {
    reviews: number;
    manuscripts: number;
    researchQueries: number;
    spendUsd: number;
    aiRuns: number;
  };
};

export type Review = {
  id: string;
  notebookId: string;
  createdById: string;
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
  scoreRigour: number | null;
  scoreRelevance: number | null;
  scoreNovelty: number | null;
  scoreClarity: number | null;
  overallScore: number | null;
  verdict: Verdict;
  strengths: string | null;
  weaknesses: string | null;
  reviewerNotes: string | null;
  status: ReviewStatus;
  sourceKind: string;
  sourceFilename: string | null;
  sourceText: string | null;
  sourceChars: number | null;
  aiModel: string | null;
  aiReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SectionProgress = {
  total: number;
  complete: number;
  inProgress: number;
  percent: number;
  words: number;
};

export type ManuscriptSection = {
  id: string;
  manuscriptId: string;
  sectionKey: string;
  heading: string;
  content: string;
  wordMin: number;
  wordMax: number;
  position: number;
  status: SectionStatus;
  checklistState: Record<string, boolean>;
  updatedAt: string;
};

export type Manuscript = {
  id: string;
  notebookId: string;
  createdById: string;
  kind: ManuscriptKind;
  title: string;
  targetJournal: string | null;
  studyType: StudyType;
  status: string;
  abstract: string | null;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
};

export type ManuscriptSummary = Manuscript & { progress: SectionProgress };

export type SectionTemplate = {
  heading: string;
  checklist: string[];
  guidance: string;
  tables: string[];
};

export type ResearchEntry = {
  id: string;
  notebookId: string;
  userId: string;
  intent: string;
  question: string;
  answer: string;
  citations: { title: string; url: string }[];
  model: string | null;
  provider: string | null;
  createdAt: string;
};

export type ComplianceReport = {
  score: number;
  verdict: string;
  satisfied: string[];
  missing: string[];
  unsupportedClaims: string[];
  recommendations: string[];
  wordCountAssessment: string;
};

export type Synthesis = {
  overview: string;
  themes: { name: string; summary: string; authors: string[] }[];
  theoryUsage: { theory: string; count: number; authors: string[] }[];
  methodDistribution: { method: string; count: number; notes: string }[];
  contexts: { context: string; count: number }[];
  consensus: { statement: string; authors: string[] }[];
  contradictions: { statement: string; sideA: string[]; sideB: string[]; explanation: string }[];
  gaps: { gap: string; type: string; evidence: string; opportunity: string }[];
  researchQuestions: string[];
  hypotheses: {
    label: string;
    statement: string;
    independent: string;
    dependent: string;
    rationale: string;
    authors: string[];
  }[];
  recommendedOutline: { section: string; keyPoints: string[] }[];
};
