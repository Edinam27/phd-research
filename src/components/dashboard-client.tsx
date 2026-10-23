"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  FileSpreadsheet,
  FileText,
  NotebookPen,
  Plus,
  Sparkles,
} from "lucide-react";

import { Modal } from "@/components/modal";
import { NotebookForm, type NotebookPayload } from "@/components/notebook-form";
import { PageBody, PageHeader } from "@/components/page-header";
import { Alert, Badge, Button, Card, EmptyState, Spinner, Stat } from "@/components/ui";
import { getJson, postJson } from "@/lib/client";
import { RESEARCH_TYPES, STUDY_TYPES } from "@/lib/guideline";
import type { NotebookSummary } from "@/lib/types";
import { formatDate, formatUsd } from "@/lib/utils";

type UsageResponse = {
  window: { days: number };
  totals: { runs: number; costUsd: number; failures: number };
};

const STAGE_TONE: Record<string, "neutral" | "accent" | "good" | "warn"> = {
  planning: "neutral",
  reviewing: "accent",
  writing: "accent",
  submitted: "warn",
  archived: "neutral",
};

export function DashboardClient({
  user,
  openNew,
}: {
  user: { name: string; academicRole: string | null };
  openNew: boolean;
}) {
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<NotebookSummary[] | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(openNew);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [notebookData, usageData] = await Promise.all([
        getJson<{ notebooks: NotebookSummary[] }>("/api/notebooks"),
        getJson<UsageResponse>("/api/usage?days=30").catch(() => null),
      ]);
      setNotebooks(notebookData.notebooks ?? []);
      setUsage(usageData);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not load your notebooks.");
      setNotebooks([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const list = notebooks ?? [];
    return {
      notebooks: list.length,
      articles: list.reduce((sum, notebook) => sum + notebook.reviewCount, 0),
      drafts: list.reduce((sum, notebook) => sum + notebook.manuscriptCount, 0),
      spend: list.reduce((sum, notebook) => sum + notebook.spendUsd, 0),
    };
  }, [notebooks]);

  const create = async (payload: NotebookPayload) => {
    setBusy(true);
    setFormError(null);
    try {
      const data = await postJson<{ notebook: { id: string } }>("/api/notebooks", payload);
      setCreating(false);
      router.push(`/notebooks/${data.notebook.id}`);
      router.refresh();
    } catch (thrown) {
      setFormError(thrown instanceof Error ? thrown.message : "Could not create the notebook.");
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title={`Good to see you, ${user.name.split(" ")[0]}.`}
        subtitle="Each notebook is one study — its own evidence matrix, its own drafts, its own spend. Nothing is shared between them unless you invite a collaborator."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" />
            New notebook
          </Button>
        }
      />

      <PageBody>
        {error ? (
          <Alert tone="bad" className="mb-5">
            {error}
          </Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Notebooks" value={notebooks === null ? "—" : totals.notebooks} sub="One per study" />
          <Stat
            label="Articles reviewed"
            value={notebooks === null ? "—" : totals.articles}
            sub="Rows in your taxonomy matrices"
          />
          <Stat
            label="Drafts in progress"
            value={notebooks === null ? "—" : totals.drafts}
            sub="Articles, proposals, abstracts"
          />
          <Stat
            label="AI spend (30 days)"
            value={formatUsd(usage?.totals.costUsd ?? totals.spend)}
            sub={usage ? `${usage.totals.runs} model calls` : "Across all notebooks"}
          />
        </div>

        <div className="mt-7 flex items-baseline justify-between gap-4">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">Your notebooks</h2>
          {notebooks && notebooks.length > 0 ? (
            <p className="text-[12.5px] text-muted">{notebooks.length} studies</p>
          ) : null}
        </div>

        {notebooks === null ? (
          <Card className="mt-3">
            <div className="flex items-center gap-2 px-5 py-10 text-[13px] text-muted">
              <Spinner className="size-4" /> Loading your notebooks…
            </div>
          </Card>
        ) : notebooks.length === 0 ? (
          <Card className="mt-3">
            <EmptyState
              icon={<NotebookPen className="size-7" />}
              title="No notebooks yet"
              description="Create your first notebook and the app will set up an evidence matrix in your taxonomy layout, plus a manuscript outline built from your publication guideline."
              action={
                <Button variant="primary" onClick={() => setCreating(true)}>
                  <Plus className="size-3.5" />
                  Create a notebook
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {notebooks.map((notebook) => (
              <NotebookCard key={notebook.id} notebook={notebook} />
            ))}
          </div>
        )}

        <Card className="mt-7 border-dashed bg-transparent shadow-none">
          <div className="flex flex-wrap items-start gap-x-8 gap-y-3 px-5 py-4">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">How this maps to your documents</p>
            <div className="flex flex-wrap gap-x-7 gap-y-2 text-[12.5px] text-ink-2">
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="size-3.5 text-accent" />
                TAXONOMY.xlsx → the eleven-column evidence matrix
              </span>
              <span className="flex items-center gap-2">
                <FileText className="size-3.5 text-accent" />
                guideline_for_publications1.docx → section word budgets and checklists
              </span>
              <span className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-accent" />
                Models run through OpenRouter with a fallback chain
              </span>
            </div>
          </div>
        </Card>
      </PageBody>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New notebook"
        description="One notebook per study. The design you enter here grounds every review, draft and answer inside it."
        size="lg"
      >
        <NotebookForm onSubmit={create} submitLabel="Create notebook" busy={busy} error={formError} />
      </Modal>
    </>
  );
}

function NotebookCard({ notebook }: { notebook: NotebookSummary }) {
  const studyLabel = STUDY_TYPES.find((type) => type.value === notebook.studyType)?.label ?? notebook.studyType;
  const researchLabel =
    RESEARCH_TYPES.find((type) => type.value === notebook.researchType)?.label ?? notebook.researchType;
  const roleTone = notebook.role === "owner" ? "neutral" : notebook.role === "editor" ? "accent" : "warn";

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-[0_2px_12px_rgba(16,19,25,0.08)]">
      <Link href={`/notebooks/${notebook.id}`} className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-tight text-ink">{notebook.title}</p>
            <p className="mt-1 truncate text-[12.5px] text-muted">
              {notebook.researchArea ?? notebook.targetJournal ?? "No area recorded yet"}
            </p>
          </div>
          <Badge tone={STAGE_TONE[notebook.status] ?? "neutral"}>{notebook.status}</Badge>
        </div>

        {notebook.description ? (
          <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-2">{notebook.description}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge>{studyLabel}</Badge>
          <Badge>{researchLabel}</Badge>
          <Badge tone={roleTone}>{notebook.role}</Badge>
          {notebook.keyVariables.length > 0 ? (
            <Badge tone="accent">{notebook.keyVariables.length} variables</Badge>
          ) : null}
        </div>

        <div className="mt-auto grid grid-cols-3 gap-3 border-t border-line pt-4">
          <Metric label="Articles" value={notebook.reviewCount} icon={<BookOpenCheck className="size-3.5" />} />
          <Metric label="Drafts" value={notebook.manuscriptCount} icon={<FileText className="size-3.5" />} />
          <Metric label="Spend" value={formatUsd(notebook.spendUsd)} />
        </div>
      </Link>

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-2.5">
        <span className="text-[11.5px] text-muted">Updated {formatDate(notebook.updatedAt)}</span>
        <span className="text-[11.5px] text-muted">{notebook.researchObjectives.length} objectives</span>
      </div>
    </Card>
  );
}

function Metric({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-[15px] font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}
