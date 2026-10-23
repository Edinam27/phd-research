"use client";

import { useState } from "react";
import { Plus, Trash } from "lucide-react";

import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { RESEARCH_TYPES, STUDY_TYPES } from "@/lib/guideline";
import type { Notebook, ResearchType, StudyType } from "@/lib/types";

export const NOTEBOOK_STATUSES = [
  { value: "planning", label: "Planning" },
  { value: "reviewing", label: "Reviewing literature" },
  { value: "writing", label: "Writing" },
  { value: "submitted", label: "Submitted" },
  { value: "archived", label: "Archived" },
];

export type NotebookPayload = {
  title: string;
  description: string | null;
  researchArea: string | null;
  researchType: ResearchType;
  studyType: StudyType;
  status: string;
  targetJournal: string | null;
  keyVariables: string[];
  researchProblem: string | null;
  researchObjectives: string[];
  theory: string | null;
  context: string | null;
};

function toLines(values: string[]): string {
  return values.join("\n");
}

function fromLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim().replace(/^\d+[.)]\s*/, ""))
    .filter(Boolean);
}

function toCsv(values: string[]): string {
  return values.join(", ");
}

function fromCsv(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * The design block of a notebook. Everything here is injected into every AI
 * call for the notebook, so the variables and objectives are worth the typing.
 */
export function NotebookForm({
  initial,
  onSubmit,
  submitLabel = "Save",
  busy = false,
  error,
  compact = false,
}: {
  initial?: Partial<Notebook>;
  onSubmit: (payload: NotebookPayload) => void | Promise<void>;
  submitLabel?: string;
  busy?: boolean;
  error?: string | null;
  compact?: boolean;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    researchArea: initial?.researchArea ?? "",
    researchType: (initial?.researchType ?? "empirical") as ResearchType,
    studyType: (initial?.studyType ?? "quantitative") as StudyType,
    status: initial?.status ?? "planning",
    targetJournal: initial?.targetJournal ?? "",
    keyVariables: toCsv(initial?.keyVariables ?? []),
    researchProblem: initial?.researchProblem ?? "",
    researchObjectives: toLines(initial?.researchObjectives ?? []),
    theory: initial?.theory ?? "",
    context: initial?.context ?? "",
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (form.title.trim().length < 3) {
      setLocalError("Give the notebook a title of at least three characters.");
      return;
    }
    setLocalError(null);
    void onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || null,
      researchArea: form.researchArea.trim() || null,
      researchType: form.researchType,
      studyType: form.studyType,
      status: form.status,
      targetJournal: form.targetJournal.trim() || null,
      keyVariables: fromCsv(form.keyVariables),
      researchProblem: form.researchProblem.trim() || null,
      researchObjectives: fromLines(form.researchObjectives),
      theory: form.theory.trim() || null,
      context: form.context.trim() || null,
    });
  };

  const objectives = fromLines(form.researchObjectives);

  return (
    <form onSubmit={submit} className="space-y-4">
      {error || localError ? <Alert tone="bad">{error ?? localError}</Alert> : null}

      <Field label="Notebook title" required hint="Name the study, e.g. “Visitor heterogeneity and experience processing”.">
        <Input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="Study title"
          required
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type of research" hint="The shape of the paper: empirical, conceptual, review, case study.">
          <Select
            value={form.researchType}
            onChange={(event) => setForm({ ...form, researchType: event.target.value as ResearchType })}
          >
            {RESEARCH_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
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
        <Field label="Stage">
          <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            {NOTEBOOK_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
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

      {compact ? null : (
        <Field label="Description">
          <Textarea
            rows={2}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="One or two lines on what this study sets out to do."
          />
        </Field>
      )}

      <Field
        label="Key variables / constructs"
        hint="Comma separated. Each one anchors the literature review and the hypothesis pairings."
        counter={`${fromCsv(form.keyVariables).length} variables`}
      >
        <Textarea
          rows={2}
          value={form.keyVariables}
          onChange={(event) => setForm({ ...form, keyVariables: event.target.value })}
          placeholder="Visitor heterogeneity, Experience processing, Destination loyalty"
        />
      </Field>

      <Field label="Research problem">
        <Textarea
          rows={3}
          value={form.researchProblem}
          onChange={(event) => setForm({ ...form, researchProblem: event.target.value })}
          placeholder="The problem this study addresses, and the specific gap it fills."
        />
      </Field>

      <Field
        label="Specific objectives"
        hint="One per line. Numbering is added automatically."
        counter={`${objectives.length} objectives`}
      >
        <Textarea
          rows={objectiveRows(objectives.length)}
          value={form.researchObjectives}
          onChange={(event) => setForm({ ...form, researchObjectives: event.target.value })}
          placeholder={"Examine the effect of X on Y\nDetermine how Z moderates the relationship"}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Theory or model" hint="Used to justify the framework and to bound the discussion.">
          <Input
            value={form.theory}
            onChange={(event) => setForm({ ...form, theory: event.target.value })}
            placeholder="Stimulus-Organism-Response"
          />
        </Field>
        <Field label="Context / setting" hint="Country, sector, population.">
          <Input
            value={form.context}
            onChange={(event) => setForm({ ...form, context: event.target.value })}
            placeholder="Ghanaian heritage tourism"
          />
        </Field>
      </div>

      <Field label="Discipline / research area">
        <Input
          value={form.researchArea}
          onChange={(event) => setForm({ ...form, researchArea: event.target.value })}
          placeholder="Tourism marketing"
        />
      </Field>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[12px] text-muted">
          {objectives.length > 0
            ? `${objectives.length} objectives and ${fromCsv(form.keyVariables).length} variables will be injected into every draft and review.`
            : "Notebooks keep each study's evidence, drafts and AI spend completely separate."}
        </p>
        <Button type="submit" variant="primary" loading={busy}>
          <Plus className="size-3.5" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function objectiveRows(count: number): number {
  return Math.min(8, Math.max(3, count + 1));
}

/** Renders one objective per line with a delete control — used on the overview tab. */
export function ObjectiveList({
  objectives,
  onRemove,
}: {
  objectives: string[];
  onRemove?: (index: number) => void;
}) {
  if (objectives.length === 0) {
    return <p className="text-[13px] text-muted">No specific objectives recorded yet.</p>;
  }
  return (
    <ol className="space-y-2">
      {objectives.map((objective, index) => (
        <li key={`${objective}-${index}`} className="flex items-start gap-3">
          <span className="mt-0.5 font-mono text-[11px] text-accent-ink">O{index + 1}</span>
          <span className="flex-1 text-[13.5px] leading-relaxed text-ink-2">{objective}</span>
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="rounded-xs p-1 text-muted transition-colors hover:bg-bad-soft hover:text-bad"
              aria-label={`Remove objective ${index + 1}`}
            >
              <Trash className="size-3.5" />
            </button>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
