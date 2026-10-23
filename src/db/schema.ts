import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    institution: text("institution"),
    discipline: text("discipline"),
    /** PhD candidate, supervisor, lecturer, researcher ... */
    academicRole: text("academic_role").default("PhD Candidate"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
  ],
);

/* ------------------------------------------------------------------ */
/* Notebooks — one notebook per study / thesis stream                  */
/* ------------------------------------------------------------------ */

export const notebooks = pgTable(
  "notebooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    /** Broad field, e.g. "Tourism marketing" */
    researchArea: text("research_area"),
    /** What kind of paper this is: empirical | conceptual | systematic-review | ... */
    researchType: text("research_type").default("empirical").notNull(),
    /** quantitative | qualitative | mixed */
    studyType: text("study_type").default("quantitative").notNull(),
    /** planning | reviewing | writing | submitted | archived */
    status: text("status").default("planning").notNull(),
    targetJournal: text("target_journal"),
    /** Core constructs of the study, used to ground every AI call */
    keyVariables: jsonb("key_variables").$type<string[]>().default([]).notNull(),
    researchProblem: text("research_problem"),
    researchObjectives: jsonb("research_objectives").$type<string[]>().default([]).notNull(),
    theory: text("theory"),
    context: text("context"),
    accent: text("accent").default("indigo").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("notebooks_owner_idx").on(table.ownerId)],
);

/** Allows a supervisor / co-author to work inside a candidate's notebook. */
export const notebookMembers = pgTable(
  "notebook_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** owner | editor | viewer */
    role: text("role").default("editor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("notebook_members_unique").on(table.notebookId, table.userId),
    index("notebook_members_user_idx").on(table.userId),
  ],
);

/* ------------------------------------------------------------------ */
/* Article reviews — the TAXONOMY.xlsx matrix, one row per article     */
/* ------------------------------------------------------------------ */

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /* ---- TAXONOMY.xlsx columns (A–K) ---- */
    author: text("author").notNull().default(""),
    year: integer("year"),
    title: text("title").notNull().default(""),
    journal: text("journal"),
    problemsGaps: text("problems_gaps"),
    objectives: text("objectives"),
    theory: text("theory"),
    empiricalFindings: text("empirical_findings"),
    methodology: text("methodology"),
    keyFindings: text("key_findings"),
    limitations: text("limitations"),

    /* ---- bibliographic detail ---- */
    volume: text("volume"),
    issue: text("issue"),
    pages: text("pages"),
    doi: text("doi"),
    url: text("url"),
    citation: text("citation"),

    /* ---- reviewer enrichment ---- */
    methodType: text("method_type"),
    sampleSize: text("sample_size"),
    country: text("country"),
    context: text("context"),
    dataAnalysis: text("data_analysis"),
    keyVariables: jsonb("key_variables").$type<string[]>().default([]).notNull(),
    hypotheses: jsonb("hypotheses").$type<string[]>().default([]).notNull(),
    gapTags: jsonb("gap_tags").$type<string[]>().default([]).notNull(),
    useInManuscript: text("use_in_manuscript"),

    /* ---- critical appraisal scorecard ---- */
    scoreRigour: integer("score_rigour"),
    scoreRelevance: integer("score_relevance"),
    scoreNovelty: integer("score_novelty"),
    scoreClarity: integer("score_clarity"),
    overallScore: real("overall_score"),
    /** include | borderline | exclude */
    verdict: text("verdict").default("include").notNull(),
    strengths: text("strengths"),
    weaknesses: text("weaknesses"),
    reviewerNotes: text("reviewer_notes"),
    /** draft | ai-drafted | reviewed | verified */
    status: text("status").default("draft").notNull(),

    /* ---- source material ---- */
    sourceKind: text("source_kind").default("manual").notNull(),
    sourceFilename: text("source_filename"),
    sourceText: text("source_text"),
    sourceChars: integer("source_chars"),

    aiModel: text("ai_model"),
    aiReviewedAt: timestamp("ai_reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("reviews_notebook_idx").on(table.notebookId),
    index("reviews_created_by_idx").on(table.createdById),
  ],
);

/* ------------------------------------------------------------------ */
/* Manuscripts — proposals and articles, structured by the guideline   */
/* ------------------------------------------------------------------ */

export const manuscripts = pgTable(
  "manuscripts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** proposal | article | abstract | chapter */
    kind: text("kind").default("article").notNull(),
    title: text("title").notNull(),
    targetJournal: text("target_journal"),
    /** What kind of paper this is: empirical | conceptual | systematic-review | ... */
    researchType: text("research_type").default("empirical").notNull(),
    /** quantitative | qualitative | mixed */
    studyType: text("study_type").default("quantitative").notNull(),
    /**
     * Which evidence-matrix rows this manuscript may cite. Empty means every
     * non-excluded review in the notebook, which is the behaviour before the
     * manuscript could choose a subset.
     */
    evidenceIds: jsonb("evidence_ids").$type<string[]>().default([]).notNull(),
    /** draft | internal-review | supervisor-review | ready | submitted | published */
    status: text("status").default("draft").notNull(),
    abstract: text("abstract"),
    keywords: jsonb("keywords").$type<string[]>().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("manuscripts_notebook_idx").on(table.notebookId),
    index("manuscripts_created_by_idx").on(table.createdById),
  ],
);

export const manuscriptSections = pgTable(
  "manuscript_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    manuscriptId: uuid("manuscript_id")
      .notNull()
      .references(() => manuscripts.id, { onDelete: "cascade" }),
    /** stable key from the publication guideline, e.g. "introduction" */
    sectionKey: text("section_key").notNull(),
    heading: text("heading").notNull(),
    content: text("content").default("").notNull(),
    wordMin: integer("word_min").default(0).notNull(),
    wordMax: integer("word_max").default(0).notNull(),
    position: integer("position").default(0).notNull(),
    /** empty | drafting | complete */
    status: text("status").default("empty").notNull(),
    /** guideline checklist items the author has confirmed */
    checklistState: jsonb("checklist_state").$type<Record<string, boolean>>().default({}).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("manuscript_sections_unique").on(table.manuscriptId, table.sectionKey),
    index("manuscript_sections_manuscript_idx").on(table.manuscriptId),
  ],
);

/* ------------------------------------------------------------------ */
/* Research log — grounded literature queries with citations           */
/* ------------------------------------------------------------------ */

export const researchQueries = pgTable(
  "research_queries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notebookId: uuid("notebook_id")
      .notNull()
      .references(() => notebooks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** research | theory | methodology | gap | question */
    intent: text("intent").default("research").notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull().default(""),
    citations: jsonb("citations").$type<{ title: string; url: string }[]>().default([]).notNull(),
    model: text("model"),
    provider: text("provider"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("research_queries_notebook_idx").on(table.notebookId)],
);

/* ------------------------------------------------------------------ */
/* Cost ledger — every model call is metered                           */
/* ------------------------------------------------------------------ */

export const aiRuns = pgTable(
  "ai_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notebookId: uuid("notebook_id").references(() => notebooks.id, { onDelete: "set null" }),
    /** article-review | manuscript-section | research | synthesis | chat */
    feature: text("feature").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    promptTokens: integer("prompt_tokens").default(0).notNull(),
    completionTokens: integer("completion_tokens").default(0).notNull(),
    costUsd: real("cost_usd").default(0).notNull(),
    latencyMs: integer("latency_ms").default(0).notNull(),
    ok: boolean("ok").default(true).notNull(),
    errorText: text("error_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("ai_runs_user_idx").on(table.userId)],
);

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

export const usersRelations = relations(users, ({ many }) => ({
  notebooks: many(notebooks),
  memberships: many(notebookMembers),
}));

export const notebooksRelations = relations(notebooks, ({ one, many }) => ({
  owner: one(users, { fields: [notebooks.ownerId], references: [users.id] }),
  members: many(notebookMembers),
  reviews: many(reviews),
  manuscripts: many(manuscripts),
}));

export const notebookMembersRelations = relations(notebookMembers, ({ one }) => ({
  notebook: one(notebooks, { fields: [notebookMembers.notebookId], references: [notebooks.id] }),
  user: one(users, { fields: [notebookMembers.userId], references: [users.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  notebook: one(notebooks, { fields: [reviews.notebookId], references: [notebooks.id] }),
  createdBy: one(users, { fields: [reviews.createdById], references: [users.id] }),
}));

export const manuscriptsRelations = relations(manuscripts, ({ one, many }) => ({
  notebook: one(notebooks, { fields: [manuscripts.notebookId], references: [notebooks.id] }),
  sections: many(manuscriptSections),
}));

export const manuscriptSectionsRelations = relations(manuscriptSections, ({ one }) => ({
  manuscript: one(manuscripts, {
    fields: [manuscriptSections.manuscriptId],
    references: [manuscripts.id],
  }),
}));

/* ------------------------------------------------------------------ */
/* Inferred types                                                      */
/* ------------------------------------------------------------------ */

export type User = typeof users.$inferSelect;
export type Notebook = typeof notebooks.$inferSelect;
export type NotebookMember = typeof notebookMembers.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Manuscript = typeof manuscripts.$inferSelect;
export type ManuscriptSection = typeof manuscriptSections.$inferSelect;
export type ResearchQuery = typeof researchQueries.$inferSelect;
export type AiRun = typeof aiRuns.$inferSelect;
