import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FileText,
  GitCompareArrows,
  GraduationCap,
  Quote,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { MarketingShell } from "@/components/site/marketing-shell";

export const metadata: Metadata = {
  title: "Why Kadi — a research studio built for the viva",
  description:
    "Generic AI writing tools optimise for output volume. Kadi Research Studio optimises for what survives a committee: defensible claims, correct structure and citations you can stand behind. See the difference.",
  alternates: { canonical: "/why-kadi" },
  openGraph: {
    title: "Why Kadi Research Studio",
    description: "A studio built for the way doctorates are actually judged.",
    url: "/why-kadi",
  },
};

const PILLARS = [
  {
    icon: GraduationCap,
    title: "Built for the viva, not the content mill",
    body: "Every feature answers to a supervisor or a committee. The matrix, the audit and the synthesis exist so you can defend each claim when asked — not so you can produce more words faster.",
  },
  {
    icon: Quote,
    title: "Grounded in what you actually read",
    body: "The models never invent a citation. Every claim traces to a row you reviewed, and anything thin is flagged for your eye rather than quietly filled in.",
  },
  {
    icon: FileText,
    title: "Your guideline, not a generic template",
    body: "Kadi turns your journal's publication guideline into real word budgets and per-section checklists, then drafts and audits against them.",
  },
  {
    icon: ShieldCheck,
    title: "Your PDFs never leave your machine",
    body: "PDFs are read inside your browser. Only the extracted text you keep is sent to the server; the binary itself is never uploaded.",
  },
  {
    icon: Users,
    title: "Supervisors and candidates, together",
    body: "Invite a supervisor as a viewer or an editor. Notebooks stay isolated, so collaboration happens without anything bleeding across studies.",
  },
  {
    icon: BookOpenCheck,
    title: "Three study types, one workspace",
    body: "Quantitative, qualitative and mixed methods are first-class. The right sections and word budgets appear for your design automatically.",
  },
];

const COMPARISON = [
  { criterion: "Organises articles into a fixed taxonomy", kadi: true, generic: false },
  { criterion: "Flags low-confidence cells for your review", kadi: true, generic: false },
  { criterion: "Drafts to your journal's word budgets", kadi: true, generic: false },
  { criterion: "Audits structure, budget and citations before submission", kadi: true, generic: false },
  { criterion: "Grounds every claim in rows you reviewed", kadi: true, generic: false },
  { criterion: "Keeps your PDF binaries on your machine", kadi: true, generic: false },
  { criterion: "Supports supervisor / candidate collaboration", kadi: true, generic: false },
];

function Cell({ value }: { value: boolean }) {
  return value ? (
    <CheckCircle2 className="mx-auto size-5 text-accent" aria-label="Yes" />
  ) : (
    <X className="mx-auto size-4 text-line-2" aria-label="No" />
  );
}

export default function WhyKadiPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="grid-paper pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-5 py-16 sm:px-8 lg:py-20">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-ink">
            Why Kadi
          </p>
          <h1 className="mt-5 font-serif text-[2.4rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[3rem]">
            A studio built for the way <span className="text-accent">doctorates are actually judged</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-2">
            Generic AI writing tools optimise for output volume. Kadi optimises for what survives a
            committee — defensible claims, correct structure, and citations you can stand behind.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="rounded-xl border border-line bg-card p-6">
              <span className="grid size-10 place-items-center rounded-md bg-accent-soft text-accent-ink">
                <pillar.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-[15px] font-semibold text-ink">{pillar.title}</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="border-y border-line bg-paper-2/40">
        <div className="mx-auto max-w-4xl px-5 py-20 sm:px-8">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-ink">
            The difference
          </p>
          <h2 className="mt-4 font-serif text-[2rem] font-semibold tracking-tight text-ink sm:text-[2.4rem]">
            Kadi vs. a generic AI writing tool
          </h2>
          <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">
            A generic chatbot will write you prose. It will not tell you which claims are thin, which
            sections are over budget, or whether the citation you just used actually exists.
          </p>

          <div className="mt-10 overflow-hidden rounded-xl border border-line bg-card">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line bg-paper-2/60">
                  <th className="px-5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-muted">
                    Capability
                  </th>
                  <th className="px-5 py-3.5 text-center text-[12px] font-semibold uppercase tracking-wider text-accent-ink">
                    Kadi
                  </th>
                  <th className="px-5 py-3.5 text-center text-[12px] font-semibold uppercase tracking-wider text-muted">
                    Generic tool
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {COMPARISON.map((row) => (
                  <tr key={row.criterion} className="transition-colors hover:bg-paper">
                    <td className="px-5 py-3.5 text-[13.5px] text-ink-2">{row.criterion}</td>
                    <td className="px-5 py-3.5 text-center">
                      <Cell value={row.kadi} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Cell value={row.generic} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Quote band + CTA */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8">
          <GitCompareArrows className="mx-auto size-9 text-accent-soft" />
          <blockquote className="mt-6 font-serif text-[1.6rem] font-medium leading-snug sm:text-[2rem]">
            “The tabulating is automated. The judgement stays yours.”
          </blockquote>
          <p className="mt-4 text-[14px] text-ink-muted">The principle every Kadi feature is built around.</p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-2"
          >
            Start free <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}