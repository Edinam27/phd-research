CREATE TABLE "ai_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"notebook_id" uuid,
	"feature" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"ok" boolean DEFAULT true NOT NULL,
	"error_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manuscript_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manuscript_id" uuid NOT NULL,
	"section_key" text NOT NULL,
	"heading" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"word_min" integer DEFAULT 0 NOT NULL,
	"word_max" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'empty' NOT NULL,
	"checklist_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manuscripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notebook_id" uuid NOT NULL,
	"created_by_id" uuid NOT NULL,
	"kind" text DEFAULT 'article' NOT NULL,
	"title" text NOT NULL,
	"target_journal" text,
	"research_type" text DEFAULT 'empirical' NOT NULL,
	"study_type" text DEFAULT 'quantitative' NOT NULL,
	"evidence_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reference_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"abstract" text,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notebook_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notebook_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notebooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"research_area" text,
	"research_type" text DEFAULT 'empirical' NOT NULL,
	"study_type" text DEFAULT 'quantitative' NOT NULL,
	"status" text DEFAULT 'planning' NOT NULL,
	"target_journal" text,
	"key_variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"research_problem" text,
	"research_objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"theory" text,
	"context" text,
	"accent" text DEFAULT 'indigo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notebook_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"intent" text DEFAULT 'research' NOT NULL,
	"question" text NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text,
	"provider" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notebook_id" uuid NOT NULL,
	"created_by_id" uuid NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"year" integer,
	"title" text DEFAULT '' NOT NULL,
	"journal" text,
	"problems_gaps" text,
	"objectives" text,
	"theory" text,
	"empirical_findings" text,
	"methodology" text,
	"key_findings" text,
	"limitations" text,
	"volume" text,
	"issue" text,
	"pages" text,
	"doi" text,
	"url" text,
	"citation" text,
	"method_type" text,
	"sample_size" text,
	"country" text,
	"context" text,
	"data_analysis" text,
	"key_variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hypotheses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gap_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"use_in_manuscript" text,
	"cited_references" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score_rigour" integer,
	"score_relevance" integer,
	"score_novelty" integer,
	"score_clarity" integer,
	"overall_score" real,
	"verdict" text DEFAULT 'include' NOT NULL,
	"strengths" text,
	"weaknesses" text,
	"reviewer_notes" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_kind" text DEFAULT 'manual' NOT NULL,
	"source_filename" text,
	"source_text" text,
	"source_chars" integer,
	"ai_model" text,
	"ai_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"tokens" integer NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"reference" text,
	"amount_minor" integer,
	"currency" text,
	"feature" text,
	"ai_run_id" uuid,
	"notebook_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"institution" text,
	"discipline" text,
	"academic_role" text DEFAULT 'PhD Candidate',
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscript_sections" ADD CONSTRAINT "manuscript_sections_manuscript_id_manuscripts_id_fk" FOREIGN KEY ("manuscript_id") REFERENCES "public"."manuscripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscripts" ADD CONSTRAINT "manuscripts_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscripts" ADD CONSTRAINT "manuscripts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_members" ADD CONSTRAINT "notebook_members_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebook_members" ADD CONSTRAINT "notebook_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_queries" ADD CONSTRAINT "research_queries_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_queries" ADD CONSTRAINT "research_queries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_notebook_id_notebooks_id_fk" FOREIGN KEY ("notebook_id") REFERENCES "public"."notebooks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_runs_user_idx" ON "ai_runs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "manuscript_sections_unique" ON "manuscript_sections" USING btree ("manuscript_id","section_key");--> statement-breakpoint
CREATE INDEX "manuscript_sections_manuscript_idx" ON "manuscript_sections" USING btree ("manuscript_id");--> statement-breakpoint
CREATE INDEX "manuscripts_notebook_idx" ON "manuscripts" USING btree ("notebook_id");--> statement-breakpoint
CREATE INDEX "manuscripts_created_by_idx" ON "manuscripts" USING btree ("created_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notebook_members_unique" ON "notebook_members" USING btree ("notebook_id","user_id");--> statement-breakpoint
CREATE INDEX "notebook_members_user_idx" ON "notebook_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notebooks_owner_idx" ON "notebooks" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "research_queries_notebook_idx" ON "research_queries" USING btree ("notebook_id");--> statement-breakpoint
CREATE INDEX "reviews_notebook_idx" ON "reviews" USING btree ("notebook_id");--> statement-breakpoint
CREATE INDEX "reviews_created_by_idx" ON "reviews" USING btree ("created_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "token_ledger_reference_unique" ON "token_ledger" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "token_ledger_user_idx" ON "token_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "token_ledger_notebook_idx" ON "token_ledger" USING btree ("notebook_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");