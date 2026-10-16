"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Download, Save, Settings, ShieldCheck, Sparkles, X } from "lucide-react";

import { Modal } from "@/components/modal";
import { PageBody, PageHeader } from "@/components/page-header";
import { Prose } from "@/components/prose";
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
  Progress,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";
import {
  ApiError,
  downloadFile,
  getJson,
  patchJson,
  postJson,
  streamSse,
} from "@/lib/client";
import { MANUSCRIPT_KINDS, MANUSCRIPT_STATUSES, STUDY_TYPES } from "@/lib/guideline";
import type {
  ComplianceReport,
  Manuscript,
  ManuscriptKind,
  ManuscriptSection,
  Notebook,
  NotebookRole,
  SectionProgress,
  SectionStatus,
  SectionTemplate,
  StudyType,
} from "@/lib/types";
import { cn, countWords, formatUsd } from "@/lib/utils";

type Tone = "neutral" | "accent" | "good" | "warn" | "bad";
type MeterTone = "accent" | "good" | "warn";

type ManuscriptDetail = {
  manuscript: Manuscript;
  notebook: Notebook;
  role: NotebookRole;
  sections: ManuscriptSection[];
  progress: SectionProgress;
  uncited: string[];
  template: Record<string, SectionTemplate>;
};

const KIND_LABEL: Record<ManuscriptKind, string> = {
  article: "Journal article",
  proposal: "Research proposal",
  abstract: "Abstract",
};

const STATUS_TONE: Record<SectionStatus, Tone> = {
  empty: "neutral",
  drafting: "accent",
  complete: "good",
};

function statusLabel(value: string): string {
  return value.replace(/-/g, " ").replace(/^\w/, (character) => character.toUpperCase());
}

function kindLabel(kind: ManuscriptKind): string {
  return MANUSCRIPT_KINDS.find((entry) => entry.value === kind)?.label ?? KIND_LABEL[kind];
}

function studyLabel(studyType: StudyType): string {
  return STUDY_TYPES.find((entry) => entry.value === studyType)?.label ?? studyType;
}

function budgetText(min: number, max: number): string {
  return max > 0 ? `${min}-${max}` : "no budget";
}

/** Tone of the section's own meter: good inside the budget, warn below, bad above. */
function budgetTone(words: number, min: number, max: number): "good" | "warn" | "bad" | "accent" {
  if (max <= 0) return "accent";
  if (words > max) return "bad";
  if (words < min) return "warn";
  return "good";
}

function meterTone(tone: "good" | "warn" | "bad" | "accent"): MeterTone {
  if (tone === "bad") return "warn";
  if (tone === "accent") return "accent";
  return tone;
}

/** Live counter tone: good inside the budget, warn below or up to 15% above, bad beyond that. */
function counterTone(words: number, min: number, max: number): Tone {
  if (max <= 0) return "neutral";
  if (words >= min && words <= max) return "good";
  if (words < min) return "warn";
  if (words <= max * 1.15) return "warn";
  return "bad";
}

function sameChecklist(a: Record<string, boolean>, b: Record<string, boolean>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (Boolean(a[key]) !== Boolean(b[key])) return false;
  }
  return true;
}

export function ManuscriptWriter() {
  const { id, manuscriptId } = useParams<{ id: string; manuscriptId: string }>();

  const [data, setData] = useState<ManuscriptDetail | null>(null);
  const [sections, setSections] = useState<ManuscriptSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<SectionStatus>("empty");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [streamModel, setStreamModel] = useState<string | null>(null);
  const [audit, setAudit] = useState<ComplianceReport | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const sectionsRef = useRef<ManuscriptSection[]>([]);
  const noticeTimer = useRef<number | null>(null);

  const load = useCallback(async (): Promise<ManuscriptDetail | null> => {
    try {
      const payload = await getJson<ManuscriptDetail>(`/api/manuscripts/${manuscriptId}`);
      setData(payload);
      setSections(payload.sections);
      setActiveSectionId((current) => {
        if (current && payload.sections.some((entry) => entry.id === current)) return current;
        return payload.sections[0]?.id ?? null;
      });
      setError(null);
      return payload;
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not open this manuscript.");
      return null;
    }
  }, [manuscriptId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep a ref of the section list so opening a section never depends on stale state.
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  // Seed the editor whenever a different section is opened.
  useEffect(() => {
    if (!activeSectionId) return;
    const section = sectionsRef.current.find((entry) => entry.id === activeSectionId);
    if (!section) return;
    setContent(section.content);
    setStatus(section.status);
    setChecklist(section.checklistState ?? {});
    setAudit(null);
    setStreamText("");
    setStreamModel(null);
  }, [activeSectionId]);

  useEffect(
    () => () => {
      if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  const flash = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3200);
  }, []);

  const activeSection = sections.find((entry) => entry.id === activeSectionId) ?? null;
  const template = activeSection ? data?.template[activeSection.sectionKey] : undefined;
  const checklistItems = template?.checklist ?? [];
  const tables = template?.tables ?? [];

  const canEdit = data ? data.role !== "viewer" : false;
  const words = countWords(content);

  const dirty = activeSection
    ? content !== activeSection.content ||
      status !== activeSection.status ||
      !sameChecklist(checklist, activeSection.checklistState ?? {})
    : false;

  const selectSection = (sectionId: string) => {
    if (sectionId === activeSectionId) return;
    if (dirty && !window.confirm("This section has unsaved changes. Switch sections and discard them?")) {
      return;
    }
    setActiveSectionId(sectionId);
  };

  const save = async () => {
    if (!activeSection || !canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const result = await patchJson<{ section: ManuscriptSection; words: number }>(
        `/api/manuscripts/${manuscriptId}/sections/${activeSection.id}`,
        { content, status, checklistState: checklist },
      );
      setSections((prev) =>
        prev.map((entry) => (entry.id === result.section.id ? result.section : entry)),
      );
      flash("Saved");
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not save this section.");
    } finally {
      setSaving(false);
    }
  };

  const draft = async (mode: "write" | "append" | "refine") => {
    if (!activeSection || !canEdit || drafting) return;
    const sectionId = activeSection.id;
    setDrafting(true);
    setError(null);
    setStreamText("");
    setStreamModel(null);
    try {
      await streamSse(
        `/api/manuscripts/${manuscriptId}/sections/${sectionId}/draft`,
        { mode, instruction: instruction.trim() || null },
        {
          onMeta: (frame) => setStreamModel(frame.model),
          onDelta: (text) => setStreamText((prev) => prev + text),
          onDone: async (frame) => {
            const fresh = await load();
            const updated = fresh?.sections.find((entry) => entry.id === sectionId);
            if (updated) {
              setContent(updated.content);
              setStatus(updated.status);
              setChecklist(updated.checklistState ?? {});
            }
            setStreamText("");
            setStreamModel(null);
            setDrafting(false);
            flash(`Draft saved · ${frame.model} · ${formatUsd(frame.usage.costUsd)}`);
          },
          onError: (message) => {
            setStreamText("");
            setStreamModel(null);
            setDrafting(false);
            setError(message);
          },
        },
      );
    } catch (thrown) {
      setStreamText("");
      setStreamModel(null);
      setDrafting(false);
      setError(thrown instanceof ApiError ? thrown.message : "The draft could not be generated.");
    }
  };

  const runAudit = async () => {
    if (!activeSection || !canEdit) return;
    setAuditing(true);
    setError(null);
    try {
      const result = await postJson<{ report: ComplianceReport; model: string; words: number }>(
        `/api/manuscripts/${manuscriptId}/sections/${activeSection.id}/audit`,
        { content },
      );
      setAudit(result.report);
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "The audit could not be completed.");
    } finally {
      setAuditing(false);
    }
  };

  const saveSettings = async (payload: ManuscriptSettingsPayload) => {
    setSettingsBusy(true);
    setSettingsError(null);
    try {
      await patchJson(`/api/manuscripts/${manuscriptId}`, payload);
      await load();
      setSettingsOpen(false);
      flash("Manuscript settings saved");
    } catch (thrown) {
      setSettingsError(
        thrown instanceof ApiError ? thrown.message : "Could not save the manuscript settings.",
      );
    } finally {
      setSettingsBusy(false);
    }
  };

  if (error && !data) {
    return (
      <PageBody>
        <Alert tone="bad" title="This manuscript is not available">
          {error}
        </Alert>
      </PageBody>
    );
  }

  if (!data) {
    return (
      <PageBody>
        <Card>
          <div className="flex items-center gap-2 px-5 py-10 text-[13px] text-muted">
            <Spinner className="size-4" /> Loading manuscript…
          </div>
        </Card>
      </PageBody>
    );
  }

  const { manuscript, notebook, progress, uncited } = data;
  const subtitle = `${kindLabel(manuscript.kind)} · ${studyLabel(manuscript.studyType)}${
    manuscript.targetJournal ? ` · Target journal: ${manuscript.targetJournal}` : ""
  }`;

  return (
    <>
      <PageHeader
        eyebrow={KIND_LABEL[manuscript.kind]}
        title={manuscript.title}
        subtitle={subtitle}
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: notebook.title, href: `/notebooks/${id}` },
          { label: "Manuscripts", href: `/notebooks/${id}/manuscripts` },
          { label: manuscript.title },
        ]}
        actions={
          <>
            <div className="mr-1 hidden w-44 sm:block">
              <Progress value={progress.percent} />
              <p className="mt-1.5 font-mono text-[11px] text-muted">
                {progress.complete}/{progress.total} sections · {progress.words} words
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadFile(`/api/manuscripts/${manuscriptId}/export`)}
            >
              <Download className="size-3.5" />
              Download
            </Button>
            <Button size="sm" onClick={() => setSettingsOpen(true)} disabled={!canEdit}>
              <Settings className="size-3.5" />
              Settings
            </Button>
            <Button size="sm" onClick={runAudit} disabled={!canEdit || !activeSection} loading={auditing}>
              <ShieldCheck className="size-3.5" />
              Audit section
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => draft("write")}
              disabled={!canEdit || !activeSection || drafting}
            >
              <Sparkles className="size-3.5" />
              Draft with AI
            </Button>
          </>
        }
      />

      <PageBody wide>
        {!canEdit ? (
          <Alert tone="warn" className="mb-4" title="Read-only">
            You have read-only access to this notebook, so the manuscript cannot be edited.
          </Alert>
        ) : null}

        {error ? (
          <Alert tone="bad" className="mb-4">
            {error}
          </Alert>
        ) : null}

        {notice ? (
          <Alert tone="good" className="mb-4">
            {notice}
          </Alert>
        ) : null}

        {uncited.length > 0 ? (
          <Alert tone="warn" className="mb-4" title="Citation hygiene">
            These in-text citations have no matching reviewed article: {uncited.join(", ")}. Add them
            to the evidence matrix, or remove them before submission.
          </Alert>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SectionRail
            sections={sections}
            activeId={activeSectionId}
            activeContent={content}
            onSelect={selectSection}
          />

          <div className="space-y-4">
            {activeSection ? (
              <>
                <Card>
                  <CardHeader
                    eyebrow={activeSection.heading}
                    title="How the guideline expects this section to be written"
                    action={
                      tables.length > 0 ? (
                        <Badge tone="accent">{tables.length} tables expected</Badge>
                      ) : undefined
                    }
                  />
                  <div className="space-y-3 px-5 py-4">
                    <Alert tone="neutral">
                      {template?.guidance ?? "No guidance is recorded for this section."}
                    </Alert>
                    {tables.length > 0 ? (
                      <p className="text-[12.5px] leading-relaxed text-muted">
                        <span className="font-medium text-ink-2">Tables expected:</span>{" "}
                        {tables.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </Card>

                <Card>
                  <CardHeader
                    eyebrow="Checklist"
                    title="Guideline requirements"
                    description="Tick each requirement the section now satisfies. Toggles are held locally until you save the section."
                    action={
                      <Badge tone="neutral">
                        {checklistItems.filter((item) => checklist[item]).length}/{checklistItems.length}
                      </Badge>
                    }
                  />
                  {checklistItems.length === 0 ? (
                    <p className="px-5 py-4 text-[13px] text-muted">
                      The guideline records no checklist for this section.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {checklistItems.map((item) => {
                        const checked = Boolean(checklist[item]);
                        return (
                          <li key={item}>
                            <label
                              className={cn(
                                "flex items-start gap-3 px-5 py-3 transition-colors",
                                canEdit ? "cursor-pointer hover:bg-paper/60" : "cursor-not-allowed",
                              )}
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5 size-4 accent-accent"
                                checked={checked}
                                disabled={!canEdit}
                                onChange={(event) =>
                                  setChecklist((prev) => ({ ...prev, [item]: event.target.checked }))
                                }
                              />
                              <span
                                className={cn(
                                  "text-[13px] leading-relaxed",
                                  checked ? "text-ink-2" : "text-muted",
                                )}
                              >
                                {item}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>

                <Card>
                  <div className="border-b border-line px-5 py-4">
                    <Textarea
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      readOnly={!canEdit}
                      placeholder="Write this section against the guidance and checklist above, or draft it with the AI and edit in place."
                      className="min-h-[460px] font-serif text-[15px] leading-relaxed"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <Badge tone={counterTone(words, activeSection.wordMin, activeSection.wordMax)}>
                      {words} words · budget {budgetText(activeSection.wordMin, activeSection.wordMax)}
                    </Badge>

                    <Select
                      value={status}
                      onChange={(event) => setStatus(event.target.value as SectionStatus)}
                      disabled={!canEdit}
                      className="h-8 w-auto text-[13px]"
                      aria-label="Section status"
                    >
                      <option value="empty">empty</option>
                      <option value="drafting">drafting</option>
                      <option value="complete">complete</option>
                    </Select>

                    <Input
                      value={instruction}
                      onChange={(event) => setInstruction(event.target.value)}
                      disabled={!canEdit}
                      placeholder="Instruction for the AI (optional), e.g. keep it in third person and cite Ghanaian sources"
                      className="h-8 min-w-[220px] flex-1 text-[13px]"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="primary" onClick={save} loading={saving} disabled={!canEdit}>
                        <Save className="size-3.5" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => draft("write")}
                        disabled={!canEdit || drafting}
                        title="Rewrite the section from scratch"
                      >
                        Draft with AI
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => draft("append")}
                        disabled={!canEdit || drafting}
                        title="Continue from where the draft stops"
                      >
                        Continue
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => draft("refine")}
                        disabled={!canEdit || drafting}
                        title="Tighten the existing draft"
                      >
                        Tighten
                      </Button>
                      <Button size="sm" onClick={runAudit} loading={auditing} disabled={!canEdit}>
                        <ShieldCheck className="size-3.5" />
                        Audit section
                      </Button>
                    </div>
                  </div>
                </Card>

                {drafting || streamText ? (
                  <Card>
                    <CardHeader
                      eyebrow="Live draft"
                      title={streamModel ? `Drafting with ${streamModel}` : "Drafting…"}
                      description="The server saves the finished draft into this section automatically."
                      action={drafting ? <Spinner className="size-4 text-accent" /> : undefined}
                    />
                    <div className="px-5 py-4">
                      {streamText ? (
                        <Prose>{streamText}</Prose>
                      ) : (
                        <p className="text-[13px] text-muted">Waiting for the first tokens…</p>
                      )}
                    </div>
                  </Card>
                ) : null}

                {audit ? <AuditReport report={audit} onClose={() => setAudit(null)} /> : null}
              </>
            ) : (
              <Card>
                <EmptyState
                  icon={<ShieldCheck className="size-6" />}
                  title="No section selected"
                  description="Pick a section from the guideline on the left to start writing."
                />
              </Card>
            )}
          </div>
        </div>
      </PageBody>

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Manuscript settings"
        description="The title, kind, study type, status, abstract and keywords saved with this manuscript."
        size="lg"
      >
        <SettingsForm
          manuscript={manuscript}
          onSubmit={saveSettings}
          busy={settingsBusy}
          error={settingsError}
        />
      </Modal>
    </>
  );
}

function SectionRail({
  sections,
  activeId,
  activeContent,
  onSelect,
}: {
  sections: ManuscriptSection[];
  activeId: string | null;
  activeContent: string;
  onSelect: (sectionId: string) => void;
}) {
  return (
    <Card className="h-fit lg:sticky lg:top-4">
      <CardHeader eyebrow="Sections" title="Guideline structure" />
      <ul className="scroll-thin divide-y divide-line lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
        {sections.map((section) => {
          const words = section.id === activeId ? countWords(activeContent) : countWords(section.content);
          const tone = budgetTone(words, section.wordMin, section.wordMax);
          const percent =
            section.wordMax > 0 ? Math.min(100, Math.round((words / section.wordMax) * 100)) : 0;
          const active = section.id === activeId;
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onSelect(section.id)}
                className={cn(
                  "w-full px-4 py-3 text-left transition-colors",
                  active ? "bg-accent-soft" : "hover:bg-paper/70",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "text-[12.5px] font-medium leading-snug",
                      active ? "text-accent-ink" : "text-ink",
                    )}
                  >
                    {section.heading}
                  </span>
                  <Badge tone={STATUS_TONE[section.status]}>{section.status}</Badge>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10.5px] text-muted">
                    {words} / {budgetText(section.wordMin, section.wordMax)} words
                  </span>
                  <MiniMeter percent={percent} tone={meterTone(tone)} />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function AuditReport({ report, onClose }: { report: ComplianceReport; onClose: () => void }) {
  const tone: Tone = report.score >= 80 ? "good" : report.score >= 55 ? "warn" : "bad";
  const barTone = tone === "bad" ? "warn" : tone === "good" ? "good" : "warn";
  return (
    <Card>
      <CardHeader
        eyebrow="Compliance audit"
        title="How this section measures against the guideline"
        action={
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-3.5" />
            Close
          </Button>
        }
      />
      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <Badge tone={tone}>{report.score}/100</Badge>
          <div className="min-w-[180px] flex-1">
            <Progress value={report.score} tone={barTone} />
          </div>
        </div>

        <p className="text-[13.5px] leading-relaxed text-ink-2">{report.verdict}</p>

        <Alert tone="neutral" title="Word count">
          {report.wordCountAssessment}
        </Alert>

        <AuditList heading="Satisfied" tone="good" items={report.satisfied} />
        <AuditList heading="Missing" tone="warn" items={report.missing} />
        <AuditList heading="Unsupported claims" tone="bad" items={report.unsupportedClaims} />
        <AuditList heading="Recommendations" tone="neutral" items={report.recommendations} />
      </div>
    </Card>
  );
}

function AuditList({ heading, tone, items }: { heading: string; tone: Tone; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <Badge tone={tone}>{heading}</Badge>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, index) => (
          <li
            key={`${heading}-${index}`}
            className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-2"
          >
            <ArrowRight className="mt-1 size-3 shrink-0 text-muted" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type ManuscriptSettingsPayload = {
  title: string;
  kind: ManuscriptKind;
  studyType: StudyType;
  targetJournal: string | null;
  status: string;
  abstract: string | null;
  keywords: string[];
};

function SettingsForm({
  manuscript,
  onSubmit,
  busy,
  error,
}: {
  manuscript: Manuscript;
  onSubmit: (payload: ManuscriptSettingsPayload) => void | Promise<void>;
  busy: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState({
    title: manuscript.title,
    kind: manuscript.kind,
    studyType: manuscript.studyType,
    targetJournal: manuscript.targetJournal ?? "",
    status: manuscript.status,
    abstract: manuscript.abstract ?? "",
    keywords: manuscript.keywords.join(", "),
  });
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
      studyType: form.studyType,
      targetJournal: form.targetJournal.trim() || null,
      status: form.status,
      abstract: form.abstract.trim() || null,
      keywords: form.keywords
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error || localError ? <Alert tone="bad">{error ?? localError}</Alert> : null}

      <Alert tone="warn" title="Before you change the kind or study type">
        Changing the kind or study type re-scaffolds the section list from the publication guideline.
        Sections you have already written are never deleted, but new sections may appear and sections
        that no longer apply may move.
      </Alert>

      <Field label="Title" required>
        <Input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="Manuscript title"
          required
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kind" hint="Article, proposal or abstract only.">
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
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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

        <Field label="Target journal">
          <Input
            value={form.targetJournal}
            onChange={(event) => setForm({ ...form, targetJournal: event.target.value })}
            placeholder="Tourism Management"
          />
        </Field>
      </div>

      <Field label="Abstract">
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

      <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
        <Button type="submit" variant="primary" loading={busy}>
          <Save className="size-3.5" />
          Save settings
        </Button>
      </div>
    </form>
  );
}
