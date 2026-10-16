"use client";

import { useMemo, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

import { Alert, Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { APPRAISAL_FIELDS, TAXONOMY_COLUMNS } from "@/lib/taxonomy";
import type { Review, ReviewStatus, Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ReviewPayload = {
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
  verdict: Verdict;
  strengths: string | null;
  weaknesses: string | null;
  reviewerNotes: string | null;
  status: ReviewStatus;
};

const STATUSES: { value: ReviewStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "ai-drafted", label: "AI drafted — not yet checked" },
  { value: "reviewed", label: "Reviewed by me" },
  { value: "verified", label: "Verified against the source" },
];

const VERDICT_LABELS: Record<Verdict, string> = {
  include: "Include — cite it",
  borderline: "Borderline — cite with care",
  exclude: "Exclude — do not cite",
};

type FormState = {
  author: string;
  year: string;
  title: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  url: string;
  citation: string;
  problemsGaps: string;
  objectives: string;
  theory: string;
  empiricalFindings: string;
  methodology: string;
  keyFindings: string;
  limitations: string;
  methodType: string;
  sampleSize: string;
  country: string;
  context: string;
  dataAnalysis: string;
  keyVariables: string;
  hypotheses: string;
  gapTags: string;
  useInManuscript: string;
  scoreRigour: number | null;
  scoreRelevance: number | null;
  scoreNovelty: number | null;
  scoreClarity: number | null;
  verdict: Verdict;
  strengths: string;
  weaknesses: string;
  reviewerNotes: string;
  status: ReviewStatus;
};

function initialise(initial?: Partial<Review>): FormState {
  return {
    author: initial?.author ?? "",
    year: initial?.year ? String(initial.year) : "",
    title: initial?.title ?? "",
    journal: initial?.journal ?? "",
    volume: initial?.volume ?? "",
    issue: initial?.issue ?? "",
    pages: initial?.pages ?? "",
    doi: initial?.doi ?? "",
    url: initial?.url ?? "",
    citation: initial?.citation ?? "",
    problemsGaps: initial?.problemsGaps ?? "",
    objectives: initial?.objectives ?? "",
    theory: initial?.theory ?? "",
    empiricalFindings: initial?.empiricalFindings ?? "",
    methodology: initial?.methodology ?? "",
    keyFindings: initial?.keyFindings ?? "",
    limitations: initial?.limitations ?? "",
    methodType: initial?.methodType ?? "",
    sampleSize: initial?.sampleSize ?? "",
    country: initial?.country ?? "",
    context: initial?.context ?? "",
    dataAnalysis: initial?.dataAnalysis ?? "",
    keyVariables: (initial?.keyVariables ?? []).join(", "),
    hypotheses: (initial?.hypotheses ?? []).join("\n"),
    gapTags: (initial?.gapTags ?? []).join(", "),
    useInManuscript: initial?.useInManuscript ?? "",
    scoreRigour: initial?.scoreRigour ?? null,
    scoreRelevance: initial?.scoreRelevance ?? null,
    scoreNovelty: initial?.scoreNovelty ?? null,
    scoreClarity: initial?.scoreClarity ?? null,
    verdict: initial?.verdict ?? "include",
    strengths: initial?.strengths ?? "",
    weaknesses: initial?.weaknesses ?? "",
    reviewerNotes: initial?.reviewerNotes ?? "",
    status: initial?.status ?? "draft",
  };
}

function blank(value: string): string | null {
  return value.trim() ? value.trim() : null;
}

function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** Renders one taxonomy field with the completeness verdict the supervisor will apply. */
function TaxonomyFieldInput({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: (typeof TAXONOMY_COLUMNS)[number];
  value: string;
  onChange: (next: string) => void;
  readOnly: boolean;
}) {
  const trimmed = value.trim();
  const thin = trimmed.length < Math.round(field.minChars * 0.5);
  const good = trimmed.length >= field.minChars;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-2">
          {field.label}
          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{field.header}</span>
        </span>
        {trimmed.length > 0 ? (
          <span
            className={cn(
              "flex items-center gap-1 font-mono text-[10.5px]",
              good ? "text-good" : thin ? "text-bad" : "text-warn",
            )}
          >
            {good ? <CircleCheck className="size-3" /> : <CircleAlert className="size-3" />}
            {trimmed.length} chars
          </span>
        ) : (
          <span className="font-mono text-[10.5px] text-bad">missing</span>
        )}
      </div>
      <Textarea
        rows={field.kind === "long" ? 4 : 1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        placeholder={field.hint}
      />
      <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{field.hint}</p>
    </div>
  );
}

export function ReviewForm({
  initial,
  onSubmit,
  submitLabel = "Save review",
  busy = false,
  error,
  readOnly = false,
  footer,
}: {
  initial?: Partial<Review>;
  onSubmit: (payload: ReviewPayload) => void | Promise<void>;
  submitLabel?: string;
  busy?: boolean;
  error?: string | null;
  readOnly?: boolean;
  footer?: React.ReactNode;
}) {
  const [form, setForm] = useState<FormState>(() => initialise(initial));
  const [localError, setLocalError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const completeness = useMemo(() => {
    const filled = TAXONOMY_COLUMNS.filter((column) => {
      const raw = form[column.field as keyof FormState];
      const text = typeof raw === "string" ? raw.trim() : raw === null ? "" : String(raw ?? "");
      return text.length >= Math.round(column.minChars * 0.5);
    }).length;
    return { filled, total: TAXONOMY_COLUMNS.length };
  }, [form]);

  const scores = [form.scoreRigour, form.scoreRelevance, form.scoreNovelty, form.scoreClarity].filter(
    (value): value is number => typeof value === "number",
  );
  const mean =
    scores.length > 0 ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10 : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() && !form.author.trim()) {
      setLocalError("A review needs at least a title or an author.");
      return;
    }
    setLocalError(null);

    const yearValue = form.year.trim() ? Number.parseInt(form.year, 10) : null;

    void onSubmit({
      author: form.author.trim(),
      year: yearValue !== null && Number.isFinite(yearValue) ? yearValue : null,
      title: form.title.trim(),
      journal: blank(form.journal),
      volume: blank(form.volume),
      issue: blank(form.issue),
      pages: blank(form.pages),
      doi: blank(form.doi),
      url: blank(form.url),
      citation: blank(form.citation),
      problemsGaps: blank(form.problemsGaps),
      objectives: blank(form.objectives),
      theory: blank(form.theory),
      empiricalFindings: blank(form.empiricalFindings),
      methodology: blank(form.methodology),
      keyFindings: blank(form.keyFindings),
      limitations: blank(form.limitations),
      methodType: blank(form.methodType),
      sampleSize: blank(form.sampleSize),
      country: blank(form.country),
      context: blank(form.context),
      dataAnalysis: blank(form.dataAnalysis),
      keyVariables: splitList(form.keyVariables),
      hypotheses: splitLines(form.hypotheses),
      gapTags: splitList(form.gapTags),
      useInManuscript: blank(form.useInManuscript),
      scoreRigour: form.scoreRigour,
      scoreRelevance: form.scoreRelevance,
      scoreNovelty: form.scoreNovelty,
      scoreClarity: form.scoreClarity,
      verdict: form.verdict,
      strengths: blank(form.strengths),
      weaknesses: blank(form.weaknesses),
      reviewerNotes: blank(form.reviewerNotes),
      status: form.status,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {error || localError ? <Alert tone="bad">{error ?? localError}</Alert> : null}

      {/* Source ------------------------------------------------------ */}
      <section className="space-y-4">
        <header className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
          <h3 className="text-[14px] font-semibold tracking-tight text-ink">The article</h3>
          <span className="font-mono text-[10.5px] text-muted">
            {completeness.filled}/{completeness.total} taxonomy columns substantiated
          </span>
        </header>

        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_3fr]">
          <Field label="Author(s)" required hint="Surname and initials, as they will appear in your reference list.">
            <Input
              value={form.author}
              onChange={(event) => set("author", event.target.value)}
              placeholder="Agyeiwaah, E."
              readOnly={readOnly}
            />
          </Field>
          <Field label="Year">
            <Input
              value={form.year}
              onChange={(event) => set("year", event.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
              placeholder="2024"
              inputMode="numeric"
              readOnly={readOnly}
            />
          </Field>
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
              placeholder="Full article title"
              readOnly={readOnly}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Journal / outlet">
            <Input
              value={form.journal}
              onChange={(event) => set("journal", event.target.value)}
              placeholder="Tourism Management"
              readOnly={readOnly}
            />
          </Field>
          <Field label="Volume(issue), pages">
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={form.volume}
                onChange={(event) => set("volume", event.target.value)}
                placeholder="Vol"
                readOnly={readOnly}
              />
              <Input
                value={form.issue}
                onChange={(event) => set("issue", event.target.value)}
                placeholder="Iss"
                readOnly={readOnly}
              />
              <Input
                value={form.pages}
                onChange={(event) => set("pages", event.target.value)}
                placeholder="1-19"
                readOnly={readOnly}
              />
            </div>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="DOI">
            <Input
              value={form.doi}
              onChange={(event) => set("doi", event.target.value)}
              placeholder="10.1016/j.tourman.2024.104742"
              readOnly={readOnly}
            />
          </Field>
          <Field label="URL">
            <Input
              value={form.url}
              onChange={(event) => set("url", event.target.value)}
              placeholder="https://doi.org/…"
              readOnly={readOnly}
            />
          </Field>
        </div>

        <Field label="Full reference (APA)" hint="Paste the reference as your journal requires it.">
          <Textarea
            rows={2}
            value={form.citation}
            onChange={(event) => set("citation", event.target.value)}
            readOnly={readOnly}
          />
        </Field>
      </section>

      {/* Taxonomy ---------------------------------------------------- */}
      <section className="space-y-4">
        <header className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
          <h3 className="text-[14px] font-semibold tracking-tight text-ink">The taxonomy</h3>
          <span className="font-mono text-[10.5px] text-muted">TAXONOMY.xlsx · columns E–K</span>
        </header>

        <TaxonomyFieldInput
          field={TAXONOMY_COLUMNS.find((column) => column.field === "problemsGaps")!}
          value={form.problemsGaps}
          onChange={(next) => set("problemsGaps", next)}
          readOnly={readOnly}
        />
        <TaxonomyFieldInput
          field={TAXONOMY_COLUMNS.find((column) => column.field === "objectives")!}
          value={form.objectives}
          onChange={(next) => set("objectives", next)}
          readOnly={readOnly}
        />
        <TaxonomyFieldInput
          field={TAXONOMY_COLUMNS.find((column) => column.field === "theory")!}
          value={form.theory}
          onChange={(next) => set("theory", next)}
          readOnly={readOnly}
        />
        <TaxonomyFieldInput
          field={TAXONOMY_COLUMNS.find((column) => column.field === "empiricalFindings")!}
          value={form.empiricalFindings}
          onChange={(next) => set("empiricalFindings", next)}
          readOnly={readOnly}
        />
        <TaxonomyFieldInput
          field={TAXONOMY_COLUMNS.find((column) => column.field === "methodology")!}
          value={form.methodology}
          onChange={(next) => set("methodology", next)}
          readOnly={readOnly}
        />
        <TaxonomyFieldInput
          field={TAXONOMY_COLUMNS.find((column) => column.field === "keyFindings")!}
          value={form.keyFindings}
          onChange={(next) => set("keyFindings", next)}
          readOnly={readOnly}
        />
        <TaxonomyFieldInput
          field={TAXONOMY_COLUMNS.find((column) => column.field === "limitations")!}
          value={form.limitations}
          onChange={(next) => set("limitations", next)}
          readOnly={readOnly}
        />
      </section>

      {/* Method detail ---------------------------------------------- */}
      <section className="space-y-4">
        <header className="border-b border-line pb-2">
          <h3 className="text-[14px] font-semibold tracking-tight text-ink">Method and context detail</h3>
          <p className="mt-1 text-[12.5px] text-muted">
            This is what lets you describe the field&apos;s methods and geographic spread in your methodology
            chapter without re-reading every paper.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Method type">
            <Select value={form.methodType} onChange={(event) => set("methodType", event.target.value)} disabled={readOnly}>
              <option value="">Not recorded</option>
              {["Quantitative", "Qualitative", "Mixed", "Conceptual", "Review / meta-analysis"].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sample size">
            <Input
              value={form.sampleSize}
              onChange={(event) => set("sampleSize", event.target.value)}
              placeholder="412 tourists"
              readOnly={readOnly}
            />
          </Field>
          <Field label="Country / region">
            <Input
              value={form.country}
              onChange={(event) => set("country", event.target.value)}
              placeholder="Ghana"
              readOnly={readOnly}
            />
          </Field>
          <Field label="Analysis technique">
            <Input
              value={form.dataAnalysis}
              onChange={(event) => set("dataAnalysis", event.target.value)}
              placeholder="PLS-SEM"
              readOnly={readOnly}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sector / setting">
            <Input
              value={form.context}
              onChange={(event) => set("context", event.target.value)}
              placeholder="Heritage sites"
              readOnly={readOnly}
            />
          </Field>
          <Field label="Gap tags" hint="Comma separated — your own labels for the gaps this paper exposes.">
            <Input
              value={form.gapTags}
              onChange={(event) => set("gapTags", event.target.value)}
              placeholder="contextual, moderation, African sample"
              readOnly={readOnly}
            />
          </Field>
        </div>

        <Field label="Key variables" hint="Comma separated. Used to match this paper to your own constructs.">
          <Input
            value={form.keyVariables}
            onChange={(event) => set("keyVariables", event.target.value)}
            placeholder="Visitor heterogeneity, Experience processing"
            readOnly={readOnly}
          />
        </Field>

        <Field label="Hypotheses reported" hint="One per line — copy them exactly as the paper states them.">
          <Textarea
            rows={3}
            value={form.hypotheses}
            onChange={(event) => set("hypotheses", event.target.value)}
            placeholder={"H1: Visitor heterogeneity positively affects experience processing"}
            readOnly={readOnly}
          />
        </Field>

        <Field label="How I will use this in my manuscript" hint="Where in your own article this paper will be cited.">
          <Textarea
            rows={2}
            value={form.useInManuscript}
            onChange={(event) => set("useInManuscript", event.target.value)}
            readOnly={readOnly}
          />
        </Field>
      </section>

      {/* Appraisal --------------------------------------------------- */}
      <section className="space-y-4">
        <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-2">
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight text-ink">Critical appraisal</h3>
            <p className="mt-1 text-[12.5px] text-muted">
              Score 1–10. The overall score is the mean of the four, and drives the discounting of weak evidence.
            </p>
          </div>
          <Badge tone={mean === null ? "neutral" : mean >= 7 ? "good" : mean >= 4.5 ? "warn" : "bad"}>
            Overall {mean === null ? "—" : mean.toFixed(1)} / 10
          </Badge>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {APPRAISAL_FIELDS.map((item) => {
            const value = form[item.field] as number | null;
            return (
              <div key={item.field}>
                <p className="text-[13px] font-medium text-ink-2">{item.label}</p>
                <p className="mt-0.5 text-[11.5px] text-muted">{item.hint}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
                    <button
                      key={score}
                      type="button"
                      disabled={readOnly}
                      onClick={() =>
                        set(item.field as "scoreRigour", value === score ? null : (score as never))
                      }
                      className={cn(
                        "size-7 rounded-xs border font-mono text-[11px] transition-colors disabled:cursor-not-allowed",
                        value === score
                          ? "border-accent bg-accent text-white"
                          : "border-line-2 bg-card text-muted hover:border-accent hover:text-accent-ink",
                      )}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Verdict" hint="Excluded articles are kept in the matrix but dropped from drafting.">
            <Select
              value={form.verdict}
              onChange={(event) => set("verdict", event.target.value as Verdict)}
              disabled={readOnly}
            >
              {(Object.keys(VERDICT_LABELS) as Verdict[]).map((verdict) => (
                <option key={verdict} value={verdict}>
                  {VERDICT_LABELS[verdict]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Review status">
            <Select
              value={form.status}
              onChange={(event) => set("status", event.target.value as ReviewStatus)}
              disabled={readOnly}
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Strengths">
            <Textarea
              rows={3}
              value={form.strengths}
              onChange={(event) => set("strengths", event.target.value)}
              readOnly={readOnly}
            />
          </Field>
          <Field label="Weaknesses and gaps">
            <Textarea
              rows={3}
              value={form.weaknesses}
              onChange={(event) => set("weaknesses", event.target.value)}
              readOnly={readOnly}
            />
          </Field>
        </div>

        <Field label="My notes" hint="Anything you want to remember when you come back to this paper in six months.">
          <Textarea
            rows={3}
            value={form.reviewerNotes}
            onChange={(event) => set("reviewerNotes", event.target.value)}
            readOnly={readOnly}
          />
        </Field>
      </section>

      {readOnly ? (
        <p className="text-[12.5px] text-muted">
          You have read-only access to this notebook, so this review cannot be edited.
        </p>
      ) : (
        <div className="sticky bottom-0 -mx-5 flex items-center justify-between gap-3 border-t border-line bg-card/95 px-5 py-3.5 backdrop-blur">
          <p className="text-[12px] text-muted">
            {completeness.filled}/{completeness.total} taxonomy columns substantiated
          </p>
          <div className="flex items-center gap-2">
            {footer}
            <Button type="submit" variant="primary" loading={busy}>
              {submitLabel}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
