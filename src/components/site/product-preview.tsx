"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A tabbed product preview for the homepage hero. The four tabs mirror the
 * real notebook surfaces, so a visitor sees the actual shape of the product
 * before signing up. Content is illustrative but faithful to the app's
 * taxonomy and guideline structure.
 */

type TabId = "matrix" | "synthesis" | "draft" | "audit";

const TABS: { id: TabId; label: string }[] = [
  { id: "matrix", label: "Evidence matrix" },
  { id: "synthesis", label: "Synthesis" },
  { id: "draft", label: "Draft" },
  { id: "audit", label: "Audit" },
];

const MATRIX = {
  columns: ["Author", "Year", "Context", "Method", "Gap noted"],
  rows: [
    ["Mehmetoglu & Engen", "2011", "Norway, nature-based", "Survey, SEM (n=318)", "Realms treated as universal"],
    ["Cohen", "1979", "Tourism typology", "Conceptual", "No operational measures"],
    ["Waitt", "2000", "Australia, heritage", "Intercept survey", "Authenticity assumed singular"],
    ["Poria et al.", "2013", "Israel, heritage sites", "On-site questionnaire", "Motivation left unmeasured"],
  ],
};

const SYNTHESIS = [
  { tone: "accent", title: "Theme 1 · Authenticity is contested", body: "Three studies treat authenticity as singular; two treat it as negotiated. The split tracks whether the setting is heritage or nature-based." },
  { tone: "warn", title: "Contradiction · Motivation vs. meaning", body: "Motivation studies and meaning studies measure different constructs and rarely cite each other — the gap your study can bridge." },
  { tone: "good", title: "Gap · Measurement in emerging contexts", body: "No reviewed study operationalises the construct in a West African heritage setting. That is the defensible entry point." },
];

const DRAFT_LINES = [
  { label: "Introduction", budget: "412 / 450–550", state: "on budget" },
  { label: "Theory or Model", budget: "298 / 250–350", state: "on budget" },
  { label: "Global Perspective", budget: "180 / 250–350", state: "needs work" },
  { label: "Contextual Background", budget: "331 / 250–350", state: "on budget" },
];

const AUDIT = [
  { label: "Structure", detail: "All guideline sections present, in order", tone: "good" },
  { label: "Word budgets", detail: "3 of 4 sections within range", tone: "warn" },
  { label: "Citation hygiene", detail: "Every in-text citation resolves to a reviewed row", tone: "good" },
];

function MatrixView() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Evidence matrix · Tourism Management</span>
        <span className="font-mono text-[10px] tabular-nums text-muted">4 of 41 rows</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line">
              {MATRIX.columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-2 text-[9.5px] font-semibold uppercase tracking-wider text-muted">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {MATRIX.rows.map((row) => (
              <tr key={row[0]} className="transition-colors hover:bg-paper">
                {row.map((cell, index) => (
                  <td
                    key={index}
                    className={cn(
                      "whitespace-nowrap px-3 py-2.5 text-[11.5px]",
                      index === 0 ? "font-medium text-ink" : "text-ink-2",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SynthesisView() {
  return (
    <div className="space-y-2.5">
      {SYNTHESIS.map((item) => {
        const tone =
          item.tone === "good"
            ? "border-good/30 bg-good-soft"
            : item.tone === "warn"
              ? "border-warn/30 bg-warn-soft"
              : "border-accent/25 bg-accent-soft";
        return (
          <div key={item.title} className={cn("rounded-lg border px-3.5 py-3", tone)}>
            <p className="text-[12px] font-semibold text-ink">{item.title}</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-2">{item.body}</p>
          </div>
        );
      })}
    </div>
  );
}

function DraftView() {
  return (
    <div className="rounded-lg border border-line bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Section word budgets</span>
        <span className="font-mono text-[10px] text-accent-ink">4 of 14 sections</span>
      </div>
      <ul className="space-y-2">
        {DRAFT_LINES.map((line) => {
          const ok = line.state === "on budget";
          return (
            <li key={line.label} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-ink">{line.label}</p>
                <p className="font-mono text-[10px] tabular-nums text-muted">{line.budget}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-xs px-1.5 py-0.5 text-[9.5px] font-medium",
                  ok ? "bg-good-soft text-good" : "bg-warn-soft text-warn",
                )}
              >
                {ok ? "on budget" : "needs work"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AuditView() {
  return (
    <div className="space-y-2.5">
      {AUDIT.map((item) => {
        const tone =
          item.tone === "good"
            ? "border-good/30 bg-good-soft text-good"
            : "border-warn/30 bg-warn-soft text-warn";
        return (
          <div key={item.label} className="flex items-start gap-3 rounded-lg border border-line bg-card px-3.5 py-2.5 shadow-sm">
            <span className={cn("mt-1 size-2 shrink-0 rounded-full", item.tone === "good" ? "bg-good" : "bg-warn")} />
            <div>
              <p className="text-[12px] font-semibold text-ink">{item.label}</p>
              <p className="text-[11.5px] leading-relaxed text-ink-2">{item.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const VIEWS: Record<TabId, () => React.ReactElement> = {
  matrix: MatrixView,
  synthesis: SynthesisView,
  draft: DraftView,
  audit: AuditView,
};

export function ProductPreview() {
  const [active, setActive] = useState<TabId>("matrix");
  const ActiveView = VIEWS[active];

  return (
    <div className="rounded-2xl border border-line bg-paper-2/60 p-3 shadow-[0_24px_50px_-24px_rgba(15,18,24,0.35)] backdrop-blur sm:p-4">
      <div className="mb-3 flex flex-wrap gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-[11.5px] font-medium transition-colors",
              active === tab.id
                ? "bg-accent text-white shadow-sm"
                : "text-ink-2 hover:bg-card",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-[220px]">
        <ActiveView />
      </div>
    </div>
  );
}