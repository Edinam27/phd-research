import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  FileSpreadsheet,
  FileText,
  GitCompareArrows,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { MarketingShell } from "@/components/site/marketing-shell";
import { SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  title: "How it works — from PDF stack to submitted manuscript",
  description:
    "Kadi turns a stack of journal PDFs into a defended literature review in four steps: review to an eleven-column taxonomy, synthesise the field, draft to your guideline, and submit with an audit. See the full walkthrough.",
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    title: "How Kadi Research Studio works",
    description: "The four-step path from a stack of PDFs to a submitted manuscript.",
    url: "/how-it-works",
  },
};

const STEPS = [
  {
    number: "01",
    icon: FileSpreadsheet,
    title: "Upload an article or a draft",
    body: "Drop in a journal PDF or DOCX. Kadi reads it into the eleven-column review taxonomy — Author through Limitations — or, if it is your own working paper, opens a notebook with your prose already in place.",
    detail: "PDFs are read in your browser; only the extracted text is sent to the server.",
  },
  {
    number: "02",
    icon: GitCompareArrows,
    title: "Review and synthesise",
    body: "Every article becomes one row of the evidence matrix. Kadi then synthesises across the rows you actually reviewed: themes, theory usage, method distribution, consensus, contradictions and the gap you can defend.",
    detail: "Low-confidence cells are flagged so you verify them — the model never quietly fills them in.",
  },
  {
    number: "03",
    icon: NotebookPen,
    title: "Draft to the guideline",
    body: "Kadi turns your journal's publication guideline into section templates, word budgets and per-section checklists. It drafts each section against those budgets, and you revise from a real first pass instead of a blank page.",
    detail: "Sections appear in the journal's order with the right headings and lengths.",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Submit with confidence",
    body: "Before you submit, the audit checks structure, word budgets and citation hygiene. Every claim traces back to a row you reviewed, so nothing is invented and everything is defensible when the committee asks.",
    detail: "The audit tells you what to check — it does not decide for you.",
  },
];

const SURFACES = [
  { icon: FileSpreadsheet, title: "The evidence matrix", body: "One row per article, eleven taxonomy columns plus appraisal scores, verdict and a completeness meter. Sortable, searchable and exportable to Excel with your original headers." },
  { icon: Sparkles, title: "Research & synthesis", body: "Ask grounded literature questions, synthesise the field into themes and hypotheses, and run a supervisor chat grounded in your own material." },
  { icon: BookOpenCheck, title: "Proposals & articles", body: "Draft a proposal, article or abstract against the guideline, section by section, with word budgets and checklists on every section." },
];

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="grid-paper pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-5 py-16 sm:px-8 lg:py-20">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-ink">
            How it works
          </p>
          <h1 className="mt-5 font-serif text-[2.4rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[3rem]">
            From a stack of PDFs to a <span className="text-accent">submitted manuscript</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-2">{SITE_DESCRIPTION}</p>
          <div className="mt-8 flex flex-wrap gap-3.5">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-2"
            >
              Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-md border border-line-2 bg-card px-6 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:border-accent/40"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Four steps */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <ol className="space-y-6">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="grid gap-6 rounded-2xl border border-line bg-card p-7 md:grid-cols-[auto_1fr] md:gap-8 md:p-9"
            >
              <div className="flex items-center gap-4 md:flex-col md:items-start">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-ink">
                  <step.icon className="size-6" />
                </span>
                <span className="font-serif text-[1.8rem] font-semibold text-line-2">{step.number}</span>
              </div>
              <div>
                <h2 className="font-serif text-[1.5rem] font-semibold tracking-tight text-ink">{step.title}</h2>
                <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">{step.body}</p>
                <p className="mt-3 flex items-start gap-2 text-[13px] text-muted">
                  <Zap className="mt-0.5 size-3.5 shrink-0 text-accent" />
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Surfaces */}
      <section className="border-y border-line bg-paper-2/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-ink">
            Inside the notebook
          </p>
          <h2 className="mt-4 max-w-2xl font-serif text-[2rem] font-semibold tracking-tight text-ink sm:text-[2.4rem]">
            Three surfaces, one study
          </h2>
          <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">
            Everything is scoped to a notebook — one notebook per study, thesis stream or paper. Notebooks
            never see each other&apos;s articles, notes or drafts.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {SURFACES.map((surface) => (
              <div key={surface.title} className="rounded-xl border border-line bg-card p-6">
                <span className="grid size-10 place-items-center rounded-md bg-accent-soft text-accent-ink">
                  <surface.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-[15.5px] font-semibold text-ink">{surface.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{surface.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8">
        <FileText className="mx-auto size-8 text-accent" />
        <h2 className="mt-4 font-serif text-[2rem] font-semibold tracking-tight text-ink">
          Start with one article
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[15.5px] leading-relaxed text-ink-2">
          Create an account, upload one article, and watch the matrix fill itself in. Your first 100,000
          tokens are on us — no card required.
        </p>
        <Link
          href="/register"
          className="mt-7 inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-2"
        >
          Create your workspace <ArrowRight className="size-4" />
        </Link>
      </section>
    </MarketingShell>
  );
}