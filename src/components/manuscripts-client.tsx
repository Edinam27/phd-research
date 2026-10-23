"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FileText, Plus, Trash } from "lucide-react";

import { Modal } from "@/components/modal";
import { PageBody, PageHeader } from "@/components/page-header";
import { EvidencePicker, type EvidenceOption } from "@/components/evidence-picker";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Progress,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";
import { ApiError, deleteJson, getJson, postJson } from "@/lib/client";
import { MANUSCRIPT_KINDS, MANUSCRIPT_STATUSES, RESEARCH_TYPES, STUDY_TYPES } from "@/lib/guideline";
import type {
  Manuscript,
  ManuscriptKind,
  ManuscriptSummary,
  NotebookDetail,
  ResearchType,
  StudyType,
} from "@/lib/types";

const KIND_TONE: Record<ManuscriptKind, "accent" | "good" | "neutral"> = {
  article: "accent",
  proposal: "good",
  abstract: "neutral",
};

function kindLabel(kind: ManuscriptKind): string {
  return MANUSCRIPT_KINDS.find((entry) => entry.value === kind)?.label ?? kind;
}

function statusLabel(status: string): string {
  return status.replace(/-/g, " ").replace(/^\w/, (character) => character.toUpperCase());
}

export function ManuscriptsList() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [manuscripts, setManuscripts] = useState<ManuscriptSummary[] | null>(null);
  const [detail, setDetail] = useState<NotebookDetail | null>(null);
  const [evidence, setEvidence] = useState<EvidenceOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<ManuscriptSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, notebook, evidenceList] = await Promise.all([
        getJson<{ manuscripts: ManuscriptSummary[] }>(`/api/notebooks/${id}/manuscripts`),
        getJson<NotebookDetail>(`/api/notebooks/${id}`),
        getJson<{ reviews: EvidenceOption[] }>(`/api/notebooks/${id}/reviews?fields=compact`),
      ]);
      setManuscripts(list.manuscripts);
      setDetail(notebook);
      setEvidence(evidenceList.reviews);
      setError(null);
    } catch (thrown) {
      setError(
        thrown instanceof ApiError ? thrown.message : "Could not load this notebook's manuscripts.",
      );
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const canEdit = detail ? detail.role !== "viewer" : true;

  const create = async (payload: CreatePayload) => {
    setBusy(true);
    setFormError(null);
    try {
      const created = await postJson<{ manuscript: Manuscript }>(
        `/api/notebooks/${id}/manuscripts`,
        payload,
      );
      router.push(`/notebooks/${id}/manuscripts/${created.manuscript.id}`);
    } catch (thrown) {
      setFormError(thrown instanceof ApiError ? thrown.message : "Could not create the manuscript.");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmItem) return;
    setDeleting(true);
    try {
      await deleteJson(`/api/manuscripts/${confirmItem.id}`);
      setConfirmItem(null);
      await load();
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not delete the manuscript.");
      setConfirmItem(null);
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    setFormError(null);
    setCreating(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Manuscripts"
        title="Articles, proposals and abstracts"
        subtitle="Every manuscript is scaffolded with the publication guideline's sections, word budgets and per-section checklists. Write against them, draft with the AI, then audit each section before submission."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: detail?.notebook.title ?? "Notebook", href: `/notebooks/${id}` },
          { label: "Manuscripts" },
        ]}
        actions={
          canEdit ? (
            <Button variant="primary" onClick={openCreate}>
              <Plus className="size-3.5" />
              New manuscript
            </Button>
          ) : null
        }
      />

      <PageBody>
        {error ? (
          <Alert tone="bad" className="mb-4">
            {error}
          </Alert>
        ) : null}

        {!manuscripts ? (
          <Card>
            <div className="flex items-center gap-2 px-5 py-10 text-[13px] text-muted">
              <Spinner className="size-4" /> Loading manuscripts…
            </div>
          </Card>
        ) : manuscripts.length === 0 ? (
          <Card>
            <EmptyState
              icon={<FileText className="size-6" />}
              title="No manuscripts yet"
              description="Create an article, proposal or abstract and the guideline's sections, word budgets and checklists are set up for you."
              action={
                canEdit ? (
                  <Button variant="primary" onClick={openCreate}>
                    <Plus className="size-3.5" />
                    Create the first manuscript
                  </Button>
                ) : null
              }
            />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {manuscripts.map((manuscript) => (
              <Card key={manuscript.id} className="flex flex-col">
                <div className="flex flex-col gap-3 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone={KIND_TONE[manuscript.kind]}>{kindLabel(manuscript.kind)}</Badge>
                    <Badge>{statusLabel(manuscript.status)}</Badge>
                  </div>

                  <div className="min-w-0">
                    <Link
                      href={`/notebooks/${id}/manuscripts/${manuscript.id}`}
                      className="font-serif text-[1.05rem] leading-snug text-ink transition-colors hover:text-accent-ink"
                    >
                      {manuscript.title}
                    </Link>
                    {manuscript.targetJournal ? (
                      <p className="mt-1 text-[12px] text-muted">
                        Target journal: {manuscript.targetJournal}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <Progress value={manuscript.progress.percent} />
                    <p className="mt-1.5 font-mono text-[11px] text-muted">
                      {manuscript.progress.complete}/{manuscript.progress.total} sections ·{" "}
                      {manuscript.progress.words} words
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-line px-5 py-3">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/notebooks/${id}/manuscripts/${manuscript.id}`)}
                  >
                    Continue writing
                  </Button>
                  {canEdit ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmItem(manuscript)}
                      aria-label={`Delete ${manuscript.title}`}
                    >
                      <Trash className="size-3.5" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageBody>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New manuscript"
        description="The guideline's sections, word budgets and checklists are created with it."
        size="lg"
      >
        <CreateForm
          initialStudyType={detail?.notebook.studyType ?? "quantitative"}
          initialResearchType={detail?.notebook.researchType ?? "empirical"}
          initialJournal={detail?.notebook.targetJournal ?? ""}
          evidence={evidence}
          onSubmit={create}
          busy={busy}
          error={formError}
        />
      </Modal>

      <Modal
        open={confirmItem !== null}
        onClose={() => setConfirmItem(null)}
        title="Delete this manuscript?"
        description="Its sections and written text are removed permanently."
        footer={
          <>
            <Button onClick={() => setConfirmItem(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} loading={deleting}>
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          <strong>{confirmItem?.title}</strong> and everything written inside it will be gone. This
          cannot be undone.
        </p>
      </Modal>
    </>
  );
}

type CreatePayload = {
  title: string;
  kind: ManuscriptKind;
  researchType: ResearchType;
  studyType: StudyType;
  evidenceIds: string[];
  targetJournal: string | null;
  status: string;
  abstract: string | null;
  keywords: string[];
};

function CreateForm({
  initialStudyType,
  initialResearchType,
  initialJournal,
  evidence,
  onSubmit,
  busy,
  error,
}: {
  initialStudyType: StudyType;
  initialResearchType: ResearchType;
  initialJournal: string;
  evidence: EvidenceOption[];
  onSubmit: (payload: CreatePayload) => void | Promise<void>;
  busy: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState({
    title: "",
    kind: "article" as ManuscriptKind,
    researchType: initialResearchType,
    studyType: initialStudyType,
    targetJournal: initialJournal,
    status: "draft",
    abstract: "",
    keywords: "",
  });
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (form.title.trim().length < 3) {
      setLocalError("Give the manuscript a title of at least three characters.");
      return;
    }
    setLocalError(null);
    void onSubmit({
      title: form.title.trim(),
      kind: form.kind,
      researchType: form.researchType,
      studyType: form.studyType,
      evidenceIds,
      targetJournal: form.targetJournal.trim() || null,
      status: form.status,
      abstract: form.abstract.trim() || null,
      keywords: form.keywords
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    });
  };

  const selectedKind = MANUSCRIPT_KINDS.find((entry) => entry.value === form.kind);

  return (
    <form onSubmit={submit} className="space-y-4">
      {error || localError ? <Alert tone="bad">{error ?? localError}</Alert> : null}

      <Field
        label="Title"
        required
        hint="The working title of the article, proposal or abstract."
      >
        <Input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="e.g. Visitor heterogeneity and experience processing"
          required
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kind" hint={selectedKind?.blurb}>
          <Select
            value={form.kind}
            onChange={(event) => setForm({ ...form, kind: event.target.value as ManuscriptKind })}
          >
            {MANUSCRIPT_KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Type of research" hint="Empirical, conceptual, review, case study or editorial.">
          <Select
            value={form.researchType}
            onChange={(event) =>
              setForm({ ...form, researchType: event.target.value as ResearchType })
            }
          >
            {RESEARCH_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Study type" hint="Decides which guideline sections appear.">
          <Select
            value={form.studyType}
            onChange={(event) => setForm({ ...form, studyType: event.target.value as StudyType })}
          >
            {STUDY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status">
          <Select
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value })}
          >
            {MANUSCRIPT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Target journal" hint="Optional. Borrowed from the notebook if left blank.">
        <Input
          value={form.targetJournal}
          onChange={(event) => setForm({ ...form, targetJournal: event.target.value })}
          placeholder="Tourism Management"
        />
      </Field>

      <Field
        label="Evidence to draw on"
        hint="Pick the reviewed works this manuscript may cite. Leave everything ticked to use the whole matrix."
      >
        <EvidencePicker options={evidence} selected={evidenceIds} onChange={setEvidenceIds} />
      </Field>

      <Field
        label="Abstract"
        hint="Optional. A short summary of the study; only required for abstract-only manuscripts."
      >
        <Textarea
          rows={4}
          value={form.abstract}
          onChange={(event) => setForm({ ...form, abstract: event.target.value })}
          placeholder="Purpose, design, findings and implications in a few sentences."
        />
      </Field>

      <Field label="Keywords" hint="Comma separated, five to six of them.">
        <Input
          value={form.keywords}
          onChange={(event) => setForm({ ...form, keywords: event.target.value })}
          placeholder="visitor heterogeneity, experience processing, destination loyalty"
        />
      </Field>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[12px] text-muted">
          Sections are seeded from the publication guideline and can be re-scaffolded later.
        </p>
        <Button type="submit" variant="primary" loading={busy}>
          <Plus className="size-3.5" />
          Create manuscript
        </Button>
      </div>
    </form>
  );
}
