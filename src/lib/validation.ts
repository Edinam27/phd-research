import { z } from "zod";

const studyType = z.enum(["quantitative", "qualitative", "mixed"]);
const researchType = z.enum([
  "empirical",
  "conceptual",
  "systematic-review",
  "narrative-review",
  "case-study",
  "editorial",
]);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
  institution: z.string().trim().max(180).optional(),
  discipline: z.string().trim().max(180).optional(),
  academicRole: z.string().trim().max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const notebookSchema = z.object({
  title: z.string().trim().min(3, "Give the notebook a title.").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  researchArea: z.string().trim().max(200).optional().nullable(),
  researchType: researchType.default("empirical"),
  studyType: studyType.default("quantitative"),
  status: z.enum(["planning", "reviewing", "writing", "submitted", "archived"]).default("planning"),
  targetJournal: z.string().trim().max(200).optional().nullable(),
  keyVariables: z.array(z.string().trim().min(1).max(160)).max(30).default([]),
  researchProblem: z.string().trim().max(4000).optional().nullable(),
  researchObjectives: z.array(z.string().trim().min(1).max(600)).max(20).default([]),
  theory: z.string().trim().max(300).optional().nullable(),
  context: z.string().trim().max(600).optional().nullable(),
  accent: z.string().trim().max(20).default("indigo"),
});

export const notebookUpdateSchema = notebookSchema.partial();

const score = z.coerce.number().int().min(1).max(10).optional().nullable();

export const reviewSchema = z.object({
  author: z.string().trim().max(400).default(""),
  year: z.coerce.number().int().min(1500).max(2100).optional().nullable(),
  title: z.string().trim().max(600).default(""),
  journal: z.string().trim().max(400).optional().nullable(),
  volume: z.string().trim().max(40).optional().nullable(),
  issue: z.string().trim().max(40).optional().nullable(),
  pages: z.string().trim().max(60).optional().nullable(),
  doi: z.string().trim().max(200).optional().nullable(),
  url: z.string().trim().max(600).optional().nullable(),
  citation: z.string().trim().max(1200).optional().nullable(),

  problemsGaps: z.string().trim().max(12000).optional().nullable(),
  objectives: z.string().trim().max(12000).optional().nullable(),
  theory: z.string().trim().max(12000).optional().nullable(),
  empiricalFindings: z.string().trim().max(12000).optional().nullable(),
  methodology: z.string().trim().max(12000).optional().nullable(),
  keyFindings: z.string().trim().max(12000).optional().nullable(),
  limitations: z.string().trim().max(12000).optional().nullable(),

  methodType: z.string().trim().max(60).optional().nullable(),
  sampleSize: z.string().trim().max(200).optional().nullable(),
  country: z.string().trim().max(120).optional().nullable(),
  context: z.string().trim().max(400).optional().nullable(),
  dataAnalysis: z.string().trim().max(400).optional().nullable(),
  keyVariables: z.array(z.string().trim().min(1).max(160)).max(40).default([]),
  hypotheses: z.array(z.string().trim().min(1).max(400)).max(40).default([]),
  gapTags: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  useInManuscript: z.string().trim().max(2000).optional().nullable(),

  scoreRigour: score,
  scoreRelevance: score,
  scoreNovelty: score,
  scoreClarity: score,
  overallScore: z.coerce.number().min(0).max(10).optional().nullable(),
  verdict: z.enum(["include", "borderline", "exclude"]).default("include"),
  strengths: z.string().trim().max(4000).optional().nullable(),
  weaknesses: z.string().trim().max(4000).optional().nullable(),
  reviewerNotes: z.string().trim().max(8000).optional().nullable(),
  status: z.enum(["draft", "ai-drafted", "reviewed", "verified"]).default("draft"),

  sourceKind: z.enum(["manual", "pdf", "docx", "text", "url", "pasted"]).default("manual"),
  sourceFilename: z.string().trim().max(300).optional().nullable(),
  sourceText: z.string().max(400000).optional().nullable(),
  sourceChars: z.coerce.number().int().min(0).optional().nullable(),
  aiModel: z.string().trim().max(200).optional().nullable(),
});

export const reviewUpdateSchema = reviewSchema.partial();

export const manuscriptSchema = z.object({
  title: z.string().trim().min(3, "Give the manuscript a title.").max(300),
  kind: z.enum(["article", "proposal", "abstract"]).default("article"),
  researchType: researchType.default("empirical"),
  studyType: studyType.default("quantitative"),
  /** Empty means every non-excluded review in the notebook. */
  evidenceIds: z.array(z.string().uuid()).max(500).default([]),
  targetJournal: z.string().trim().max(200).optional().nullable(),
  status: z.enum(["draft", "internal-review", "supervisor-review", "ready", "submitted", "published"]).default("draft"),
  abstract: z.string().trim().max(6000).optional().nullable(),
  keywords: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
});

export const manuscriptUpdateSchema = manuscriptSchema.partial();

export const sectionUpdateSchema = z.object({
  content: z.string().max(200000).optional(),
  status: z.enum(["empty", "drafting", "complete"]).optional(),
  checklistState: z.record(z.string(), z.boolean()).optional(),
});

export const researchQuerySchema = z.object({
  question: z.string().trim().min(8, "Ask a fuller question.").max(1200),
  intent: z.enum(["research", "theory", "methodology", "gap", "question"]).default("research"),
});

export const synthesisSchema = z.object({
  focus: z.string().trim().max(600).optional().nullable(),
});

export const assistantSchema = z.object({
  question: z.string().trim().min(2).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20000) }))
    .max(20)
    .default([]),
});

export const memberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(["editor", "viewer"]).default("editor"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type NotebookInput = z.infer<typeof notebookSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type ManuscriptInput = z.infer<typeof manuscriptSchema>;
