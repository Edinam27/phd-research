"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  ClipboardPaste,
  PenLine,
  RefreshCw,
  Sparkles,
  Table2,
  Upload,
} from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { ReviewForm, type ReviewPayload } from "@/components/review-form";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  MiniMeter,
  Spinner,
  Stat,
  Textarea,
} from "@/components/ui";
import { ApiError, apiFetch, getJson, patchJson, postJson } from "@/lib/client";
import { scoreReviewCompleteness, TAXONOMY_COLUMNS, type TaxonomyField } from "@/lib/taxonomy";
import type { NotebookDetail, Review, Verdict } from "@/lib/types";
import { ArticleReadError, prepareArticleFile } from "@/lib/upload";
import { cn, formatUsd } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Mode = "file" | "paste";
type SourceKind = "pdf" | "docx" | "text" | "pasted";

type AnalyzeSource = { filename: string | null; kind: string; chars: number };

type AnalyzeResult = {
  draft: Partial<Review>;
  source?: AnalyzeSource;
  model: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number; costUsd: number };
};

type ReviewsResponse = { reviews: Review[] };

const VERDICT_TONE: Record<Verdict, "good" | "warn" | "bad"> = {
  include: "good",
  borderline: "warn",
  exclude: "bad",
};

const SOURCE_KINDS: readonly string[] = ["pdf", "docx", "text", "pasted"];

function kindFromFilename(name: string | null | undefined): SourceKind {
  const lower = (name ?? "").toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "docx";
  return "text";
}

function resolveSourceKind(source: AnalyzeSource | undefined, mode: Mode, filename: string | null): SourceKind {
  if (mode === "paste") return "pasted";
  const raw = source?.kind;
  if (raw && SOURCE_KINDS.includes(raw)) return raw as SourceKind;
  return kindFromFilename(source?.filename ?? filename);
}

function draftedValue(draft: Partial<Review>, field: TaxonomyField): string {
  const raw = (draft as Record<string, unknown>)[field];
  if (raw === null || raw === undefined) return "";
  return String(raw).trim();
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ReviewStudio() {
  const { id } = useParams<{ id: string }>();
  const notebookId = id;
  const base = `/notebooks/${notebookId}`;

  const [detail, setDetail] = useState<NotebookDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [pasted, setPasted] = useState("");
  const [focusNote, setFocusNote] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);

  const [seed, setSeed] = useState<Partial<Review> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const [rerunningId, setRerunningId] = useState<string | null>(null);
  const [rerunError, setRerunError] = useState<string | null>(null);

  const stepTwoRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const loadReviews = async () => {
    try {
      const data = await getJson<ReviewsResponse>(`/api/notebooks/${notebookId}/reviews`);
      setReviews(data.reviews);
    } catch {
      // Keep the list already on screen; the workflow itself is unaffected.
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [detailData, reviewsData] = await Promise.all([
          getJson<NotebookDetail>(`/api/notebooks/${notebookId}`),
          getJson<ReviewsResponse>(`/api/notebooks/${notebookId}/reviews`),
        ]);
        if (!active) return;
        setDetail(detailData);
        setReviews(reviewsData.reviews);
        setLoadError(null);
      } catch (thrown) {
        if (!active) return;
        setLoadError(thrown instanceof ApiError ? thrown.message : "Could not load this notebook.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [notebookId]);

  const canEdit = detail !== null && detail.role !== "viewer";
  const canAnalyze = !analyzing && (mode === "file" ? file !== null : pasted.trim().length >= 200);

  const scrollToEditor = () => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  /* ---- Step 1: analyse ------------------------------------------------ */

  const analyze = async () => {
    if (mode === "file" && !file) return;
    if (mode === "paste" && pasted.trim().length < 200) return;

    setAnalyzing(true);
    setAnalyzeError(null);
    setSavedId(null);

    try {
      let result: AnalyzeResult;
      if (mode === "file" && file) {
        const prepared = await prepareArticleFile(file);
        if (prepared.transport === "text") {
          result = await postJson<AnalyzeResult>(`/api/notebooks/${notebookId}/reviews/analyze`, {
            text: prepared.text,
            filename: prepared.filename,
            kind: prepared.kind,
            focusNote: focusNote.trim() || undefined,
          });
        } else {
          const body = new FormData();
          body.append("file", prepared.file);
          if (focusNote.trim()) body.append("focusNote", focusNote.trim());
          result = await apiFetch<AnalyzeResult>(`/api/notebooks/${notebookId}/reviews/analyze`, {
            method: "POST",
            body,
          });
        }
      } else {
        result = await postJson<AnalyzeResult>(`/api/notebooks/${notebookId}/reviews/analyze`, {
          text: pasted.trim(),
          focusNote: focusNote.trim() || undefined,
        });
      }

      setAnalysis(result);
      setSeed(result.draft);
      setEditingId(null);
      setSaveError(null);
      setFormKey((key) => key + 1);
      window.requestAnimationFrame(() => stepTwoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (thrown) {
      setAnalyzeError(
        thrown instanceof ApiError || thrown instanceof ArticleReadError
          ? thrown.message
          : "The reviewer could not read that article. Please try again.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  /* ---- Step 3: save --------------------------------------------------- */

  const save = async (payload: ReviewPayload) => {
    setSaving(true);
    setSaveError(null);
    setSavedId(null);

    try {
      let saved: Review;
      if (editingId) {
        const result = await patchJson<{ review: Review }>(`/api/reviews/${editingId}`, payload);
        saved = result.review;
      } else {
        const body: Record<string, unknown> = { ...payload };
        if (analysis) {
          body.sourceKind = resolveSourceKind(analysis.source, mode, file?.name ?? null);
          body.sourceFilename = analysis.source?.filename ?? file?.name ?? null;
          body.sourceChars = analysis.source?.chars ?? (mode === "paste" ? pasted.trim().length : null);
          body.aiModel = analysis.model;
          if (mode === "paste" && pasted.trim()) body.sourceText = pasted.trim();
        }
        const result = await postJson<{ review: Review }>(`/api/notebooks/${notebookId}/reviews`, body);
        saved = result.review;
      }

      setSavedId(saved.id);
      setAnalysis(null);
      setSeed(null);
      setEditingId(null);
      setFile(null);
      setPasted("");
      setFocusNote("");
      setFormKey((key) => key + 1);
      await loadReviews();
    } catch (thrown) {
      setSaveError(thrown instanceof ApiError ? thrown.message : "Could not save this review.");
    } finally {
      setSaving(false);
    }
  };

  /* ---- Recent list actions ------------------------------------------- */

  const openRecent = (review: Review) => {
    setSeed(review);
    setEditingId(review.id);
    setAnalysis(null);
    setSavedId(null);
    setSaveError(null);
    setFormKey((key) => key + 1);
    window.requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const startBlank = () => {
    setSeed(null);
    setEditingId(null);
    setAnalysis(null);
    setSavedId(null);
    setSaveError(null);
    setFormKey((key) => key + 1);
  };

  const rerun = async (review: Review) => {
    setRerunningId(review.id);
    setRerunError(null);
    setAnalyzeError(null);

    try {
      const result = await postJson<AnalyzeResult>(`/api/reviews/${review.id}/analyze`, { save: false });
      setAnalysis(result);
      setSeed(result.draft);
      setEditingId(review.id);
      setSavedId(null);
      setSaveError(null);
      setFormKey((key) => key + 1);
      window.requestAnimationFrame(() => stepTwoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (thrown) {
      setRerunError(
        thrown instanceof ApiError ? thrown.message : "The reviewer could not re-read that article. Please try again.",
      );
    } finally {
      setRerunningId(null);
    }
  };

  /* ---- Render --------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="size-5 text-muted" />
      </div>
    );
  }

  if (!detail) {
    return (
      <PageBody>
        <Alert tone="bad" title="This notebook could not be opened">
          {loadError ?? "Something went wrong while loading the notebook."}{" "}
          <Link href="/dashboard" className="text-accent-ink underline underline-offset-2">
            Back to your dashboard
          </Link>
          .
        </Alert>
      </PageBody>
    );
  }

  const completeness = analysis ? scoreReviewCompleteness(analysis.draft as Record<string, unknown>) : null;
  const recent = reviews.slice(0, 8);

  return (
    <div>
      <PageHeader
        eyebrow="Article reviewer"
        title="Review one article against the taxonomy"
        subtitle="Supply one article — upload the file or paste the text — and the AI fills the eleven TAXONOMY.xlsx columns. You verify every cell against the source before it enters the evidence matrix."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: detail.notebook.title, href: base },
          { label: "Article reviewer" },
        ]}
      />

      <PageBody>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            {/* Step 1 ------------------------------------------------ */}
            <Card>
              <CardHeader
                eyebrow="Step 1"
                title="Supply the article"
                description="Upload the source file, or paste at least two hundred characters of article text."
              />
              <div className="space-y-4 px-5 py-4">
                <div className="inline-flex rounded-sm border border-line-2 bg-paper-2 p-0.5">
                  {[
                    { value: "file" as const, label: "Upload a file", icon: Upload },
                    { value: "paste" as const, label: "Paste the text", icon: ClipboardPaste },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMode(option.value)}
                      disabled={analyzing}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed",
                        mode === option.value ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink",
                      )}
                    >
                      <option.icon className="size-3.5" />
                      {option.label}
                    </button>
                  ))}
                </div>

                {mode === "file" ? (
                  <Field
                    label="Article file"
                    hint="PDF, DOCX or TXT. A PDF is read in your browser, so only its text is uploaded — the file stays on your machine."
                  >
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                      disabled={analyzing}
                      className="block w-full cursor-pointer rounded-sm border border-line-2 bg-card px-3 py-2 text-sm text-ink-2 file:mr-3 file:rounded-xs file:border file:border-line-2 file:bg-paper-2 file:px-2.5 file:py-1 file:text-[12px] file:font-medium file:text-ink-2 hover:file:border-ink/40"
                    />
                  </Field>
                ) : (
                  <Field
                    label="Article text"
                    hint="Paste the body of the article. At least two hundred characters are needed for a reliable read."
                    counter={`${pasted.trim().length} chars`}
                  >
                    <Textarea
                      rows={14}
                      value={pasted}
                      onChange={(event) => setPasted(event.target.value)}
                      disabled={analyzing}
                      placeholder="Paste the article text here…"
                    />
                  </Field>
                )}

                <Field
                  label="Focus note"
                  hint="Tell the reviewer what to look for — e.g. 'scrutinise the sampling frame and how service quality is measured'."
                >
                  <Input
                    value={focusNote}
                    onChange={(event) => setFocusNote(event.target.value)}
                    disabled={analyzing}
                    placeholder="Optional"
                  />
                </Field>

                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" onClick={() => void analyze()} disabled={!canEdit || !canAnalyze}>
                    {analyzing ? <Spinner className="size-3.5" /> : <Sparkles className="size-3.5" />}
                    Draft the taxonomy row
                  </Button>
                  {!canEdit ? (
                    <span className="text-[12px] text-muted">You have read-only access to this notebook.</span>
                  ) : null}
                </div>

                {analyzing ? (
                  <p className="flex items-center gap-2 text-[13px] text-muted">
                    <Spinner className="size-3.5" />
                    Reading the article and filling the eleven taxonomy columns — this can take a minute…
                  </p>
                ) : null}

                {analyzeError ? <Alert tone="bad">{analyzeError}</Alert> : null}
              </div>
            </Card>

            {/* Step 2 ------------------------------------------------ */}
            <div ref={stepTwoRef}>
              <Card>
                <CardHeader
                  eyebrow="Step 2"
                  title="The AI draft"
                  description="One row of the taxonomy, exactly as the model read it. Nothing here is saved yet."
                />
                <div className="space-y-4 px-5 py-4">
                  {analysis && completeness ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[13px] text-ink-2">
                          <span className="font-semibold text-ink">
                            {completeness.filled}/{completeness.total}
                          </span>{" "}
                          columns substantiated
                        </p>
                        <MiniMeter percent={completeness.percent} tone={completeness.percent >= 80 ? "good" : "warn"} />
                      </div>

                      <Alert tone="warn">
                        Drafted by {analysis.model}. Verify every column against the article before you cite it.
                      </Alert>

                      <div className="divide-y divide-line overflow-hidden rounded-sm border border-line">
                        {TAXONOMY_COLUMNS.map((column) => {
                          const value = draftedValue(analysis.draft, column.field);
                          const marker = value.length === 0 ? "missing" : value.length >= column.minChars ? "good" : "thin";
                          return (
                            <div
                              key={column.field}
                              className="grid gap-1.5 px-3.5 py-3 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-4"
                            >
                              <div className="flex items-start justify-between gap-2 sm:block">
                                <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
                                  {column.header}
                                </span>
                                {marker === "good" ? (
                                  <CircleCheck className="size-3.5 text-good sm:mt-1" />
                                ) : marker === "thin" ? (
                                  <CircleAlert className="size-3.5 text-warn sm:mt-1" />
                                ) : (
                                  <CircleX className="size-3.5 text-bad sm:mt-1" />
                                )}
                              </div>
                              <p
                                className={cn(
                                  "text-[13.5px] leading-relaxed whitespace-pre-wrap",
                                  value ? "text-ink-2" : "text-muted",
                                )}
                              >
                                {value || "—"}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="secondary" onClick={() => void analyze()} disabled={!canEdit || !canAnalyze}>
                          <RefreshCw className={cn("size-3.5", analyzing && "animate-spin")} />
                          Redraft
                        </Button>
                        <Button variant="primary" onClick={scrollToEditor}>
                          <PenLine className="size-3.5" />
                          Open in the editor
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-[13px] leading-relaxed text-muted">
                      No draft yet. Supply an article above and draft the taxonomy row — or open a stored review from the
                      list on the right.
                    </p>
                  )}
                </div>
              </Card>
            </div>

            {/* Step 3 ------------------------------------------------ */}
            <div ref={editorRef}>
              <Card>
                <CardHeader
                  eyebrow="Step 3"
                  title="Verify and save"
                  description={
                    editingId
                      ? "Editing a stored review. Saving updates it in place in the evidence matrix."
                      : "Check each cell against the article, then file the row into the evidence matrix."
                  }
                />
                <div className="px-5 py-4">
                  {savedId ? (
                    <div className="mb-4">
                      <Alert tone="good" title="Saved to the evidence matrix">
                        The row is now part of this notebook&apos;s matrix.{" "}
                        <Link href={`${base}/reviews`} className="text-accent-ink underline underline-offset-2">
                          See it in the evidence matrix
                        </Link>
                        .
                      </Alert>
                    </div>
                  ) : null}

                  <ReviewForm
                    key={formKey}
                    initial={seed ?? undefined}
                    onSubmit={save}
                    submitLabel="Save to the evidence matrix"
                    busy={saving}
                    error={saveError}
                    readOnly={!canEdit}
                  />
                </div>
              </Card>
            </div>
          </div>

          {/* Right column ------------------------------------------- */}
          <aside className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Reviews" value={detail.stats.reviews} sub="Rows in the matrix" />
              <Stat
                label="AI spend"
                value={formatUsd(detail.stats.spendUsd)}
                sub={`${detail.stats.aiRuns} metered calls`}
              />
            </div>

            <Card>
              <CardHeader
                eyebrow="Evidence matrix"
                title="Recent reviews in this notebook"
                action={
                  <Button size="sm" variant="ghost" onClick={startBlank}>
                    <PenLine className="size-3.5" />
                    Start a blank row
                  </Button>
                }
              />
              <div className="px-5 py-3">
                <Link
                  href={`${base}/reviews`}
                  className="inline-flex items-center gap-2 text-[13px] text-accent-ink underline underline-offset-2"
                >
                  <Table2 className="size-3.5" />
                  Open the evidence matrix
                </Link>
              </div>

              {recent.length === 0 ? (
                <EmptyState
                  title="No reviews yet"
                  description="The rows you save from this workspace will appear in this list."
                />
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {recent.map((review) => (
                    <li key={review.id} className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => openRecent(review)}
                        className="group block w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 text-[13px] font-medium text-ink group-hover:text-accent-ink">
                            {review.author || "Untitled"}
                            {review.year ? <span className="text-muted"> ({review.year})</span> : null}
                          </p>
                          <Badge tone={VERDICT_TONE[review.verdict]}>{review.verdict}</Badge>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
                          {review.title || "No title recorded"}
                        </p>
                        <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                          updated {new Date(review.updatedAt).toLocaleDateString()}
                        </p>
                      </button>

                      <div className="mt-1.5 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[11.5px]"
                          disabled={!canEdit || !review.sourceText || rerunningId === review.id}
                          onClick={() => void rerun(review)}
                        >
                          <RefreshCw className={cn("size-3", rerunningId === review.id && "animate-spin")} />
                          Re-run AI
                        </Button>
                        {!review.sourceText ? <span className="text-[11px] text-muted">no stored text</span> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {rerunError ? (
                <div className="px-5 pb-4">
                  <Alert tone="bad">{rerunError}</Alert>
                </div>
              ) : null}
            </Card>
          </aside>
        </div>
      </PageBody>
    </div>
  );
}
