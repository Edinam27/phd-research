"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Compass,
  Coins,
  FileText,
  PencilLine,
  Sparkles,
  Table2,
  Target,
  Trash,
  Users,
} from "lucide-react";

import { Modal } from "@/components/modal";
import { NotebookForm, ObjectiveList, type NotebookPayload } from "@/components/notebook-form";
import { PageBody } from "@/components/page-header";
import { Alert, Badge, Button, Card, CardHeader, Spinner, Stat } from "@/components/ui";
import { deleteJson, downloadFile, getJson, patchJson } from "@/lib/client";
import { RESEARCH_TYPES, STUDY_TYPES } from "@/lib/guideline";
import type { NotebookDetail } from "@/lib/types";
import { formatDate, formatUsd } from "@/lib/utils";

const QUICK_LINKS = [
  {
    href: "/review",
    label: "Review a new article",
    body: "Upload a PDF or DOCX and get a filled taxonomy row.",
    icon: Sparkles,
  },
  {
    href: "/reviews",
    label: "Open the evidence matrix",
    body: "The eleven-column table in your TAXONOMY.xlsx layout.",
    icon: Table2,
  },
  {
    href: "/manuscripts",
    label: "Write an article or proposal",
    body: "Section by section, against your publication guideline.",
    icon: FileText,
  },
  {
    href: "/research",
    label: "Research and synthesise",
    body: "Grounded literature answers, plus a synthesis of your matrix.",
    icon: Compass,
  },
];

export function NotebookOverview() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const notebookId = params.id;

  const [detail, setDetail] = useState<NotebookDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      setDetail(await getJson<NotebookDetail>(`/api/notebooks/${notebookId}`));
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not load this notebook.");
    }
  }, [notebookId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (payload: NotebookPayload) => {
    setBusy(true);
    setFormError(null);
    try {
      await patchJson(`/api/notebooks/${notebookId}`, payload);
      setEditing(false);
      await load();
      router.refresh();
    } catch (thrown) {
      setFormError(thrown instanceof Error ? thrown.message : "Could not save the notebook.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteJson(`/api/notebooks/${notebookId}`);
      router.push("/dashboard");
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not delete the notebook.");
      setConfirmDelete(false);
      setBusy(false);
    }
  };

  if (error) {
    return (
      <PageBody>
        <Alert tone="bad">{error}</Alert>
      </PageBody>
    );
  }

  if (!detail) {
    return (
      <PageBody>
        <Card>
          <div className="flex items-center gap-2 px-5 py-10 text-[13px] text-muted">
            <Spinner className="size-4" /> Loading notebook…
          </div>
        </Card>
      </PageBody>
    );
  }

  const { notebook, role, stats, members } = detail;
  const canEdit = role !== "viewer";
  const studyLabel = STUDY_TYPES.find((type) => type.value === notebook.studyType)?.label ?? notebook.studyType;
  const researchLabel =
    RESEARCH_TYPES.find((type) => type.value === notebook.researchType)?.label ?? notebook.researchType;

  return (
    <PageBody>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Articles in matrix" value={stats.reviews} sub="Rows you have reviewed" />
        <Stat label="Manuscripts" value={stats.manuscripts} sub="Articles, proposals, abstracts" />
        <Stat label="Research queries" value={stats.researchQueries} sub="Grounded answers and syntheses" />
        <Stat label="AI spend" value={formatUsd(stats.spendUsd)} sub={`${stats.aiRuns} metered calls`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            eyebrow="Study design"
            title="What this study is about"
            description="Every review, draft and answer inside this notebook is grounded in the design below."
            action={
              canEdit ? (
                <Button size="sm" onClick={() => setEditing(true)}>
                  <PencilLine className="size-3.5" />
                  Edit
                </Button>
              ) : (
                <Badge tone="warn">read-only</Badge>
              )
            }
          />
          <div className="space-y-5 px-5 py-4">
            <Row label="Study type" value={studyLabel} />
            <Row label="Type of research" value={researchLabel} />
            <Row label="Stage" value={notebook.status} />
            <Row label="Target journal" value={notebook.targetJournal ?? "—"} />
            <Row label="Theory / model" value={notebook.theory ?? "—"} />
            <Row label="Context" value={notebook.context ?? "—"} />
            <Row label="Research area" value={notebook.researchArea ?? "—"} />

            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">Research problem</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
                {notebook.researchProblem ?? "Not recorded yet. Add the problem and the gap so drafts can argue it."}
              </p>
            </div>

            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">Key variables</p>
              {notebook.keyVariables.length === 0 ? (
                <p className="mt-1.5 text-[13.5px] text-muted">
                  No variables recorded. These drive the hypothesis pairings in the article.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {notebook.keyVariables.map((variable) => (
                    <Badge key={variable} tone="accent">
                      {variable}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                Specific objectives
              </p>
              <div className="mt-2">
                <ObjectiveList objectives={notebook.researchObjectives} />
              </div>
            </div>

            <p className="border-t border-line pt-3 text-[11.5px] text-muted">
              Created {formatDate(notebook.createdAt)} · last updated {formatDate(notebook.updatedAt)}
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader eyebrow="Next step" title="Where to go from here" />
            <ul className="divide-y divide-line">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={`/notebooks/${notebookId}${link.href}`}
                    className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-paper/70"
                  >
                    <link.icon className="mt-0.5 size-4 shrink-0 text-accent" />
                    <span>
                      <span className="block text-[13.5px] font-medium text-ink">{link.label}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">{link.body}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader
              eyebrow="Collaborators"
              title={`${members.length + 1} with access`}
              action={
                <Link href={`/notebooks/${notebookId}/team`}>
                  <Button size="sm">
                    <Users className="size-3.5" />
                    Manage
                  </Button>
                </Link>
              }
            />
            <ul className="divide-y divide-line">
              <li className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="text-[13px] text-ink-2">You</span>
                <Badge tone="accent">{role}</Badge>
              </li>
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-ink-2">{member.name}</span>
                    <span className="block truncate text-[11.5px] text-muted">{member.email}</span>
                  </span>
                  <Badge>{member.role}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader eyebrow="Data" title="Take the notebook out" />
            <div className="flex flex-wrap gap-2 px-5 py-4">
              <Button size="sm" onClick={() => downloadFile(`/api/notebooks/${notebookId}/export?format=xlsx`)}>
                Export matrix (XLSX)
              </Button>
              <Button size="sm" onClick={() => downloadFile(`/api/notebooks/${notebookId}/export?format=csv`)}>
                CSV
              </Button>
              <Button size="sm" onClick={() => downloadFile(`/api/notebooks/${notebookId}/export?format=json`)}>
                JSON
              </Button>
            </div>
            <p className="px-5 pb-4 text-[11.5px] leading-relaxed text-muted">
              The XLSX sheet uses the exact eleven headers from TAXONOMY.xlsx, with your reviewer enrichment in
              the columns to the right.
            </p>
          </Card>

          {role === "owner" ? (
            <Card className="border-bad/25">
              <CardHeader eyebrow="Danger" title="Delete this notebook" />
              <div className="px-5 py-4">
                <p className="text-[12.5px] leading-relaxed text-muted">
                  Removes every article review, manuscript and research entry in this notebook. This cannot be
                  undone.
                </p>
                <Button variant="danger" size="sm" className="mt-3" onClick={() => setConfirmDelete(true)}>
                  <Trash className="size-3.5" />
                  Delete notebook
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <Card className="mt-4 border-dashed bg-transparent shadow-none">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5 text-[12.5px] text-muted">
          <span className="flex items-center gap-2">
            <Coins className="size-3.5 text-accent" />
            Spend shown here is metered per notebook
          </span>
          <span className="flex items-center gap-2">
            <Target className="size-3.5 text-accent" />
            Objectives are injected into every drafting prompt
          </span>
        </div>
      </Card>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit study design"
        description="Changes here change what the models are told about your study."
        size="lg"
      >
        <NotebookForm
          initial={notebook}
          onSubmit={save}
          submitLabel="Save design"
          busy={busy}
          error={formError}
        />
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this notebook?"
        description="All articles, drafts and research entries inside it are removed permanently."
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} loading={busy}>
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          Type nothing, read once: <strong>{notebook.title}</strong> and its {stats.reviews} article reviews,{" "}
          {stats.manuscripts} manuscripts and {stats.researchQueries} research entries will be gone.
        </p>
      </Modal>
    </PageBody>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2.5 last:border-0">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="max-w-[68%] text-right text-[13px] text-ink-2">{value}</span>
    </div>
  );
}
