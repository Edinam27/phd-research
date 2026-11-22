import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";

import { MarketingShell } from "@/components/site/marketing-shell";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { FaqJsonLd } from "@/components/seo/json-ld";
import { FAQ_GROUPS, FAQS } from "@/lib/faq";

export const metadata: Metadata = {
  title: "FAQ — questions about the evidence matrix, drafting and pricing",
  description:
    "Answers to common questions about Kadi Research Studio: the eleven-column evidence matrix, how PDFs are handled, drafting to your journal's guideline, supervisor collaboration, and prepaid token pricing.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Kadi Research Studio — frequently asked questions",
    description: "Everything about the evidence matrix, drafting, collaboration and pricing.",
    url: "/faq",
  },
};

export default function FaqPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@kadistudio.app";

  return (
    <MarketingShell>
      <FaqJsonLd faqs={FAQS.map((faq) => ({ question: faq.question, answer: faq.answer }))} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="grid-paper pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-5 py-16 sm:px-8 lg:py-20">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-ink">
            Frequently asked questions
          </p>
          <h1 className="mt-5 font-serif text-[2.4rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[3rem]">
            Answers before you <span className="text-accent">upload your first article</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[16.5px] leading-relaxed text-ink-2">
            Everything about the evidence matrix, how Kadi handles your PDFs, drafting to your
            journal&apos;s guideline, working with a supervisor, and how the token pricing works.
          </p>
        </div>
      </section>

      {/* Grouped FAQs */}
      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <div className="space-y-12">
          {FAQ_GROUPS.map((group) => {
            const groupFaqs = FAQS.filter((faq) => faq.group === group);
            if (groupFaqs.length === 0) return null;
            return (
              <div key={group}>
                <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-accent-ink">
                  {group}
                </h2>
                <div className="mt-4">
                  <FaqAccordion faqs={groupFaqs} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact prompt */}
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-card px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-accent-soft text-accent-ink">
              <Mail className="size-5" />
            </span>
            <div>
              <p className="text-[14px] font-medium text-ink">Still have a question?</p>
              <p className="text-[12.5px] text-muted">Email us at {supportEmail} — we answer every one.</p>
            </div>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-2"
          >
            Start free <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}