"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PencilLine, Plus, RefreshCw, Search, Sparkles, Table2, Trash } from "lucide-react";

import { Modal } from "@/components/modal";
import { PageBody, PageHeader } from "@/components/page-header";
import { ReviewForm, type ReviewPayload } from "@/components/review-form";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  MiniMeter,
  SectionLabel,
  Select,
  Spinner,
  Stat,
  Textarea,
} from "@/components/ui";
import { ApiError, apiFetch, deleteJson, getJson, patchJson, postJson } from "@/lib/client";
import { averageAppraisal, scoreReviewCompleteness, TAXONOMY_COLUMNS, type TaxonomyColumn } from "@/lib/taxonomy";
import type { NotebookDetail, Review, ReviewStatus, Verdict } from "@/lib/types";
import { ArticleReadError, prepareArticleFile } from "@/lib/upload";
import { cn, formatUsd } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Data contracts                                                      */
/* ------------------------------------------------------------------ */

type AnalyzeUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
};

type AnalyzeResponse = {
  draft: Partial<Review>;
  source?: { filename: string | null; kind: string; chars: number };
  model: string;
  usage: AnalyzeUsage;
};

/** Source metadata carried alongside an AI draft so it is persisted with the row. */
type SourceMeta = {
  sourceKind: string;
  sourceFilename: string | null;
  sourceText: string | null;
  sourceChars: number | null;
  aiModel: string | null;
};

type ImportSummary = { model: string; chars: number; costUsd: number };

/* ------------------------------------------------------------------ */
/* Presentation constants                                              */
/* ------------------------------------------------------------------ */

const VERDICT_TONE: Record<Verdict, "good" | "warn" | "bad"> = {
  include: "good",
  borderline: "warn",
  exclude: "bad",
};

const VERDICT_LABEL: Record<Verdict, string> = {
  include: "Include",
  borderline: "Borderline",
  exclude: "Exclude",
};

const STATUS_TONE: Record<ReviewStatus, "neutral" | "warn" | "accent" | "good"> = {
  draft: "neutral",
  "ai-drafted": "warn",
  reviewed: "accent",
  verified: "good",
};

const STATUS_LABEL: Record<ReviewStatus, string> = {
  draft: "Draft",
  "ai-drafted": "AI drafted",
  reviewed: "Reviewed",
  verified: "Verified",
};

/** Column widths, chosen so the eleven taxonomy columns stay readable side by side. */
const COLUMN_WIDTH: Record<string, string> = {
  author: "w-[210px]",
  year: "w-[64px]",
  title: "w-[240px]",
  journal: "w-[150px]",
  problemsGaps: "w-[180px]",
  objectives: "w-[170px]",
  theory: "w-[160px]",
  empiricalFindings: "w-[190px]",
  methodology: "w-[180px]",
  keyFindings: "w-[190px]",
  limitations: "w-[170px]",
};

const TH =
  "border-b border-line px-2.5 py-2.5 text-left align-bottom font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted";
const TD = "px-2.5 py-2.5 align-top";
const CHECK = "mt-0.5 size-3.5 shrink-0 cursor-pointer rounded-xs border border-line-2 accent-accent";

const COLUMN_COUNT = TAXONOMY_COLUMNS.length + 4;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError || error instanceof ArticleReadError ? error.message : fallback;
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <Badge tone={VERDICT_TONE[verdict]}>{VERDICT_LABEL[verdict]}</Badge>;
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

/** Renders one taxonomy cell, with clamping and a "read" affordance for long columns. */
function TaxonomyCell({ column, review }: { column: TaxonomyColumn; review: Review }) {
  if (column.field === "author") {
    return (
      <div className="min-w-0">
        <p className="font-medium text-ink">{review.author || "Untitled article"}</p>
        <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted">{review.year ?? "—"}</p>
      </div>
    );
  }

  if (column.field === "year") {
    return <span className="font-mono tabular-nums text-ink-2">{review.year ?? "—"}</span>;
  }

  const raw: unknown = review[column.field as keyof Review];
  const text = typeof raw === "string" ? raw : raw === null || raw === undefined ? "" : String(raw);
  if (!text.trim()) return <span className="text-muted">—</span>;

  if (column.kind === "long") {
    return (
      <span className="block">
        <span className="block line-clamp-3">{text}</span>
        <span className="mt-0.5 block font-mono text-[10px] text-muted">(click to read)</span>
      </span>
    );
  }

  return <span className={cn("block", column.field === "title" && "line-clamp-2")}>{text}</span>;
}

function HeaderCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      onClick={(event) => event.stopPropagation()}
      className={CHECK}
      aria-label="Select all visible rows"
    />
  );
}

/* ------------------------------------------------------------------ */
/* AI import dialog                                                    */
/* ------------------------------------------------------------------ */

function ImportDialog({
  open,
  onClose,
  notebookId,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  notebookId: string;
  onImported: (result: AnalyzeResponse, mode: "file" | "text", pastedText: string | null) => void;
}) {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [focusNote, setFocusNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setMode("file");
    setFile(null);
    setText("");
    setFocusNote("");
    setError(null);
    setBusy(false);
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const submit = async () => {
    setError(null);

    const chosenFile = mode === "file" ? file : null;
    const pastedText = mode === "text" ? text.trim() : "";

    if (mode === "file" && !chosenFile) {
      setError("Choose a PDF, DOCX or TXT file to import.");
      return;
    }
    if (mode === "text" && pastedText.length < 200) {
      setError("Paste at least a few paragraphs of the article (200+ characters) so the reviewer has something to work with.");
      return;
    }

    setBusy(true);
    try {
      let result: AnalyzeResponse;

      if (chosenFile) {
        const prepared = await prepareArticleFile(chosenFile);
        if (prepared.transport === "text") {
          result = await postJson<AnalyzeResponse>(`/api/notebooks/${notebookId}/reviews/analyze`, {
            text: prepared.text,
            filename: prepared.filename,
            kind: prepared.kind,
            focusNote: focusNote.trim() || undefined,
          });
        } else {
          const form = new FormData();
          form.append("file", prepared.file);
          if (focusNote.trim()) form.append("focusNote", focusNote.trim());
          result = await apiFetch<AnalyzeResponse>(`/api/notebooks/${notebookId}/reviews/analyze`, {
            method: "POST",
            body: form,
          });
        }
      } else {
        result = await postJson<AnalyzeResponse>(`/api/notebooks/${notebookId}/reviews/analyze`, {
          text: pastedText,
          focusNote: focusNote.trim() || undefined,
        });
      }

      onImported(result, mode, mode === "text" ? pastedText : null);
      reset();
    } catch (thrown) {
      setError(messageOf(thrown, "The reviewer could not read that article. Try again, or paste the text instead."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Import an article with AI"
      size="lg"
      footer={
        <>
          <Button onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={busy}>
            Read and fill the matrix
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-[13px] leading-relaxed text-muted">
          The reviewer reads the article and proposes a value for each of the eleven TAXONOMY.xlsx columns. Nothing is
          saved yet — you check every column, then add the row to the matrix.
        </p>

        <div className="inline-flex rounded-sm border border-line-2 bg-paper-2 p-0.5">
          <Button
            variant={mode === "file" ? "primary" : "ghost"}
            size="sm"
            className="rounded-xs"
            onClick={() => setMode("file")}
          >
            Upload a file
          </Button>
          <Button
            variant={mode === "text" ? "primary" : "ghost"}
            size="sm"
            className="rounded-xs"
            onClick={() => setMode("text")}
          >
            Paste the text
          </Button>
        </div>

        {mode === "file" ? (
          <Field
            label="Article file"
            hint="PDF, DOCX or TXT. A PDF is read in your browser, so only its text is uploaded and the file never leaves your machine."
          >
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-[13px] text-ink-2 file:mr-3 file:cursor-pointer file:rounded-sm file:border file:border-line-2 file:bg-card file:px-3 file:py-1.5 file:text-[13px] file:text-ink hover:file:border-ink/40"
            />
          </Field>
        ) : (
          <Field label="Article text" hint="Paste the article — abstract, method and results at a minimum.">
            <Textarea
              rows={12}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste the article text here…"
            />
          </Field>
        )}

        <Field
          label="Focus note (optional)"
          hint="Tell the reviewer what to look for — e.g. 'focus on the sampling frame and the measurement of service quality'."
        >
          <Input
            value={focusNote}
            onChange={(event) => setFocusNote(event.target.value)}
            placeholder="Focus on…"
          />
        </Field>

        {busy ? (
          <div className="flex items-center gap-2 rounded-sm border border-accent/25 bg-accent-soft px-3.5 py-3 text-[12.5px] text-accent-ink">
            <Spinner className="size-4" />
            Reading the article and filling the eleven taxonomy columns — this can take a minute…
          </div>
        ) : null}

        {error ? <Alert tone="bad">{error}</Alert> : null}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* The matrix                                                          */
/* ------------------------------------------------------------------ */

export function EvidenceMatrix() {
  const { id } = useParams<{ id: string }>();
  const notebookId = id;

  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [detail, setDetail] = useState<NotebookDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<"all" | Verdict>("all");

  const [selected, setSelected] = useState<string[]>([]);

  // Editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [seed, setSeed] = useState<Partial<Review> | undefined>(undefined);
  const [sourceMeta, setSourceMeta] = useState<SourceMeta | null>(null);
  const [draftModel, setDraftModel] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState(false);

  // Import
  const [importOpen, setImportOpen] = useState(false);

  // Bulk delete
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [reviewData, detailData] = await Promise.all([
        getJson<{ reviews: Review[] }>(`/api/notebooks/${notebookId}/reviews`),
        getJson<NotebookDetail>(`/api/notebooks/${notebookId}`),
      ]);
      setReviews(reviewData.reviews ?? []);
      setDetail(detailData);
      setLoadError(null);
    } catch (thrown) {
      setLoadError(messageOf(thrown, "Could not load the evidence matrix."));
      setReviews([]);
    }
  }, [notebookId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canEdit = detail ? detail.role !== "viewer" : false;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (reviews ?? []).filter((review) => {
      if (verdictFilter !== "all" && review.verdict !== verdictFilter) return false;
      if (!term) return true;
      const haystack = [
        review.author,
        review.title,
        review.journal,
        review.keyFindings ?? "",
        review.problemsGaps ?? "",
        ...review.gapTags,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [reviews, search, verdictFilter]);

  const visibleIds = useMemo(() => visible.map((review) => review.id), [visible]);
  const selectedVisible = selected.filter((reviewId) => visibleIds.includes(reviewId));
  const allSelected = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
  const someSelected = selectedVisible.length > 0 && !allSelected;

  const includedCount = (reviews ?? []).filter((review) => review.verdict === "include").length;
  const borderlineCount = (reviews ?? []).filter((review) => review.verdict === "borderline").length;

  const toggleRow = (reviewId: string) =>
    setSelected((current) =>
      current.includes(reviewId) ? current.filter((entry) => entry !== reviewId) : [...current, reviewId],
    );

  const toggleAll = () =>
    setSelected((current) => {
      if (allSelected) return current.filter((entry) => !visibleIds.includes(entry));
      return Array.from(new Set([...current, ...visibleIds]));
    });

  /* ------------------------------- editor ------------------------------ */

  const openEditor = (review: Review) => {
    setEditing(review);
    setSeed(review);
    setSourceMeta(null);
    setDraftModel(review.aiModel && review.status !== "verified" ? review.aiModel : null);
    setImportSummary(null);
    setSaveError(null);
    setFormKey((key) => key + 1);
    setEditorOpen(true);
  };

  const openBlank = () => {
    setEditing(null);
    setSeed(undefined);
    setSourceMeta(null);
    setDraftModel(null);
    setImportSummary(null);
    setSaveError(null);
    setFormKey((key) => key + 1);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditing(null);
    setSeed(undefined);
    setSourceMeta(null);
    setDraftModel(null);
    setImportSummary(null);
    setSaveError(null);
  };

  const handleImported = (result: AnalyzeResponse, mode: "file" | "text", pastedText: string | null) => {
    setImportOpen(false);
    setEditing(null);
    setSeed({ ...result.draft, status: "ai-drafted" });
    setSourceMeta({
      sourceKind: result.source?.kind ?? (mode === "file" ? "text" : "pasted"),
      sourceFilename: result.source?.filename ?? null,
      sourceText: mode === "text" ? pastedText : null,
      sourceChars: result.source?.chars ?? null,
      aiModel: result.model,
    });
    setDraftModel(result.model);
    setImportSummary({
      model: result.model,
      chars: result.source?.chars ?? 0,
      costUsd: result.usage?.costUsd ?? 0,
    });
    setSaveError(null);
    setFormKey((key) => key + 1);
    setEditorOpen(true);
  };

  const save = async (payload: ReviewPayload) => {
    setSaving(true);
    setSaveError(null);
    try {
      const body: Record<string, unknown> = { ...payload };
      if (sourceMeta) {
        body.sourceKind = sourceMeta.sourceKind;
        body.sourceFilename = sourceMeta.sourceFilename;
        body.sourceChars = sourceMeta.sourceChars;
        if (sourceMeta.sourceText !== null) body.sourceText = sourceMeta.sourceText;
        if (sourceMeta.aiModel) body.aiModel = sourceMeta.aiModel;
      }

      if (editing) {
        await patchJson(`/api/reviews/${editing.id}`, body);
      } else {
        await postJson(`/api/notebooks/${notebookId}/reviews`, body);
      }

      closeEditor();
      await load();
    } catch (thrown) {
      setSaveError(messageOf(thrown, "Could not save this review."));
    } finally {
      setSaving(false);
    }
  };

  const rerun = async () => {
    if (!editing) return;
    setRerunning(true);
    setSaveError(null);
    try {
      const result = await apiFetch<AnalyzeResponse>(`/api/reviews/${editing.id}/analyze`, {
        method: "POST",
        body: JSON.stringify({ save: false }),
      });
      setSeed(result.draft);
      setDraftModel(result.model);
      setImportSummary(null);
      setFormKey((key) => key + 1);
    } catch (thrown) {
      setSaveError(messageOf(thrown, "Could not re-run the AI reviewer."));
    } finally {
      setRerunning(false);
    }
  };

  const bulkDelete = async () => {
    setDeleting(true);
    setBulkError(null);
    try {
      await deleteJson(`/api/notebooks/${notebookId}/reviews`, { reviewIds: selected });
      setConfirmBulk(false);
      setSelected([]);
      await load();
    } catch (thrown) {
      setBulkError(messageOf(thrown, "Could not delete the selected rows."));
    } finally {
      setDeleting(false);
    }
  };

  /* ------------------------------- render ------------------------------ */

  const actions = (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search author, title, findings, gap tags…"
          className="w-64 pl-8"
        />
      </div>
      <Select
        value={verdictFilter}
        onChange={(event) => setVerdictFilter(event.target.value as "all" | Verdict)}
        className="w-40"
      >
        <option value="all">All verdicts</option>
        <option value="include">Include</option>
        <option value="borderline">Borderline</option>
        <option value="exclude">Exclude</option>
      </Select>
      <Button onClick={openBlank} disabled={!canEdit}>
        <Plus className="size-3.5" />
        Add blank row
      </Button>
      <Button variant="primary" onClick={() => setImportOpen(true)} disabled={!canEdit}>
        <Sparkles className="size-4" />
        Import article with AI
      </Button>
    </>
  );

  return (
    <>
      <PageHeader
        eyebrow="Evidence matrix"
        title={detail?.notebook.title ?? "Literature matrix"}
        subtitle="Each row is one article captured across the eleven TAXONOMY.xlsx columns — the layout your literature reviews are documented in."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: detail?.notebook.title ?? "Notebook", href: `/notebooks/${notebookId}` },
          { label: "Evidence matrix" },
        ]}
        actions={actions}
      />

      <PageBody>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Articles reviewed" value={reviews?.length ?? 0} sub="Rows in this matrix" />
          <Stat label="Included" value={includedCount} tone="good" sub="Verdict: include" />
          <Stat label="Flagged borderline" value={borderlineCount} tone="warn" sub="Cite with care" />
          <Stat label="AI spend" value={formatUsd(detail?.stats.spendUsd ?? 0)} sub="Metered review calls" />
        </div>

        <div className="mt-6">
          <SectionLabel>TAXONOMY.xlsx · columns A–K</SectionLabel>
          <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-muted">
            The eleven columns below are the exact layout of TAXONOMY.xlsx — Author, Year, Title, Journal,
            Problems/Gaps, Objectives, Theory, Empirical findings of past research, Methodology, Key Findings and
            Limitations. Score, Verdict and Status are this app&apos;s reviewer enrichment.
          </p>

          {loadError ? (
            <Alert tone="bad" title="Could not open the evidence matrix" className="mt-4">
              {loadError}
            </Alert>
          ) : null}

          {reviews === null && !loadError ? (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-line bg-card px-5 py-10 text-[13px] text-muted">
              <Spinner className="size-4" /> Loading the matrix…
            </div>
          ) : null}

          {reviews !== null && reviews.length === 0 && !loadError ? (
            <div className="mt-4 rounded-md border border-line bg-card">
              <EmptyState
                icon={<Table2 className="size-6" />}
                title="No articles in this matrix yet"
                description="Import an article and the AI reviewer will propose a value for each of the eleven TAXONOMY.xlsx columns. You verify each column, then cite."
                action={
                  <Button variant="primary" onClick={() => setImportOpen(true)} disabled={!canEdit}>
                    <Sparkles className="size-4" />
                    Add the first article
                  </Button>
                }
              />
            </div>
          ) : null}

          {reviews !== null && reviews.length > 0 ? (
            <>
              {selected.length > 0 ? (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-sm border border-line-2 bg-paper-2 px-3.5 py-2.5">
                  <span className="text-[12.5px] text-ink-2">
                    <span className="font-mono tabular-nums">{selected.length}</span> selected
                  </span>
                  <Button variant="danger" size="sm" onClick={() => setConfirmBulk(true)} disabled={!canEdit}>
                    <Trash className="size-3.5" />
                    Delete rows
                  </Button>
                </div>
              ) : null}

              <div className="scroll-thin mt-4 overflow-x-auto rounded-md border border-line bg-card">
                <table className="w-full min-w-[1500px] border-collapse text-[12.5px]">
                  <thead className="sticky top-0 z-10 bg-paper-2">
                    <tr>
                      {TAXONOMY_COLUMNS.map((column, index) => (
                        <th key={column.field} scope="col" className={cn(TH, COLUMN_WIDTH[column.field])}>
                          {index === 0 ? (
                            <span className="flex items-center gap-2">
                              <HeaderCheckbox
                                checked={allSelected}
                                indeterminate={someSelected}
                                disabled={!canEdit}
                                onChange={toggleAll}
                              />
                              <span>{column.header}</span>
                            </span>
                          ) : (
                            column.header
                          )}
                        </th>
                      ))}
                      <th scope="col" className={cn(TH, "w-[150px] text-right")}>
                        Score
                      </th>
                      <th scope="col" className={cn(TH, "w-[100px]")}>
                        Verdict
                      </th>
                      <th scope="col" className={cn(TH, "w-[110px]")}>
                        Status
                      </th>
                      <th scope="col" className={cn(TH, "w-[52px]")} aria-label="Row actions" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-line">
                    {visible.length === 0 ? (
                      <tr>
                        <td colSpan={COLUMN_COUNT} className="px-5 py-10 text-center text-[13px] text-muted">
                          No rows match this search or verdict filter.
                        </td>
                      </tr>
                    ) : (
                      visible.map((review) => {
                        const completeness = scoreReviewCompleteness(
                          review as unknown as Record<string, unknown>,
                        );
                        const mean = averageAppraisal(review);
                        const meterTone =
                          completeness.percent >= 80 ? "good" : completeness.percent >= 50 ? "warn" : "accent";
                        const isSelected = selected.includes(review.id);

                        return (
                          <tr
                            key={review.id}
                            onClick={() => openEditor(review)}
                            className={cn(
                              "cursor-pointer align-top transition-colors hover:bg-paper-2",
                              isSelected && "bg-accent-soft/40",
                            )}
                          >
                            {TAXONOMY_COLUMNS.map((column) => (
                              <td
                                key={column.field}
                                className={cn(TD, column.field === "year" && "text-right")}
                              >
                                {column.field === "author" ? (
                                  <div className="flex items-start gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleRow(review.id)}
                                      onClick={(event) => event.stopPropagation()}
                                      className={CHECK}
                                      aria-label={`Select ${review.title || review.author || "review"}`}
                                    />
                                    <TaxonomyCell column={column} review={review} />
                                  </div>
                                ) : (
                                  <TaxonomyCell column={column} review={review} />
                                )}
                              </td>
                            ))}

                            <td className={cn(TD, "text-right")}>
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-mono tabular-nums text-ink-2">
                                  {review.overallScore ?? "—"}
                                </span>
                                <MiniMeter percent={completeness.percent} tone={meterTone} />
                                <span className="font-mono text-[10px] text-muted">
                                  {mean === null ? "appraisal —" : `appraisal ${mean.toFixed(1)}`}
                                </span>
                              </div>
                            </td>
                            <td className={TD}>
                              <VerdictBadge verdict={review.verdict} />
                            </td>
                            <td className={TD}>
                              <StatusBadge status={review.status} />
                            </td>
                            <td className={cn(TD, "text-right")}>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                aria-label="Open this review"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditor(review);
                                }}
                              >
                                <PencilLine className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </PageBody>

      {/* Editor -------------------------------------------------------- */}
      <Modal
        size="xl"
        open={editorOpen}
        onClose={closeEditor}
        title={editing ? "Edit review" : "New review row"}
        description="Every field maps to a column of TAXONOMY.xlsx. AI-drafted values must be verified against the source before you cite them."
      >
        <div className="space-y-4">
          {draftModel ? (
            <Alert tone="warn">
              Drafted by {draftModel}. Check every column against the article before citing it.
            </Alert>
          ) : null}

          {importSummary ? (
            <Alert tone="good" title="Article read successfully">
              {importSummary.model} extracted {importSummary.chars.toLocaleString()} characters
              {importSummary.costUsd > 0 ? ` at an estimated cost of ${formatUsd(importSummary.costUsd)}` : ""}. Review
              each column, then add the row to the matrix.
            </Alert>
          ) : null}

          <ReviewForm
            key={formKey}
            initial={seed}
            onSubmit={save}
            submitLabel={editing ? "Save review" : "Add to matrix"}
            busy={saving}
            error={saveError}
            readOnly={!canEdit}
          />

          {editing?.sourceText ? (
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <Button
                variant="secondary"
                size="sm"
                loading={rerunning}
                disabled={!canEdit || saving}
                onClick={rerun}
              >
                <RefreshCw className="size-3.5" />
                Re-run the AI reviewer
              </Button>
              <span className="text-[11.5px] leading-relaxed text-muted">
                Re-reads the stored article text{editing.sourceFilename ? ` (${editing.sourceFilename})` : ""} and
                replaces the form values with a fresh draft — the record is not changed until you save.
              </span>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* AI import ----------------------------------------------------- */}
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        notebookId={notebookId}
        onImported={handleImported}
      />

      {/* Bulk delete confirmation -------------------------------------- */}
      <Modal
        open={confirmBulk}
        onClose={() => {
          if (deleting) return;
          setConfirmBulk(false);
          setBulkError(null);
        }}
        title="Delete the selected rows?"
        description="The articles are removed from this evidence matrix permanently."
        footer={
          <>
            <Button
              onClick={() => {
                setConfirmBulk(false);
                setBulkError(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={bulkDelete} loading={deleting}>
              Delete {selected.length} {selected.length === 1 ? "row" : "rows"}
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          You are about to remove <strong>{selected.length}</strong>{" "}
          {selected.length === 1 ? "review" : "reviews"} from this notebook. This cannot be undone.
        </p>
        {bulkError ? (
          <Alert tone="bad" className="mt-3">
            {bulkError}
          </Alert>
        ) : null}
      </Modal>
    </>
  );
}
