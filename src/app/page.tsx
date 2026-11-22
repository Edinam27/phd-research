import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  GitCompareArrows,
  GraduationCap,
  MessageCircle,
  NotebookPen,
  Quote,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { TOKEN_PACKS } from "@/lib/tokens";
import { SITE_DESCRIPTION, SITE_KEYWORDS } from "@/lib/site";
import { getFeaturedPosts } from "@/lib/blog";
import { CountUp } from "@/components/site/count-up";
import { ProductPreview } from "@/components/site/product-preview";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SoftwareApplicationJsonLd } from "@/components/seo/json-ld";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Kadi Research Studio — literature reviews, defended",
  description: SITE_DESCRIPTION,
  keywords: [...SITE_KEYWORDS],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Kadi Research Studio — literature reviews, defended",
    description: SITE_DESCRIPTION,
    url: "/",
    type: "website",
  },
};

const STEPS = [
  {
    number: "01",
    icon: FileSpreadsheet,
    title: "Upload an article or a draft",
    body: "A PDF or DOCX becomes a row in your eleven-column review taxonomy — or, if it is your own working paper, a notebook with your prose already in place.",
  },
  {
    number: "02",
    icon: GitCompareArrows,
    title: "Review and synthesise",
    body: "Themes, theory usage, methods, consensus, contradictions and the gap you can defend — built only from rows you actually reviewed.",
  },
  {
    number: "03",
    icon: NotebookPen,
    title: "Draft to the guideline",
    body: "Sections written against your journal's word budgets and checklists, with an audit before you submit. You keep the judgement.",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Submit with confidence",
    body: "Every claim traces to a reviewed row, every section is on budget, and the audit tells you what to check — not what to think.",
  },
];

const PACK_FEATURES: Record<string, string[]> = {
  starter: [
    "Roughly fifteen full article reviews",
    "Section drafting across one manuscript",
    "Guideline audit before you submit",
  ],
  research: [
    "A full thesis season of reviews and drafts",
    "Synthesis across your whole evidence matrix",
    "Grounded literature search with citations",
  ],
  department: [
    "Several notebooks running in parallel",
    "Supervisors and candidates in one workspace",
    "Shared across a lab or faculty group",
  ],
};

const FACTS = [
  { value: 11, prefix: "", suffix: "", label: "Taxonomy columns per review row" },
  { value: 3, prefix: "", suffix: "", label: "Model tiers behind every call" },
  { value: 100, prefix: "", suffix: "k", label: "Free tokens on signup" },
  { value: 0, prefix: "$", suffix: "", label: "To start — no card needed" },
];

const DIFFERENTIATORS = [
  {
    icon: GraduationCap,
    title: "Built for the viva, not the content mill",
    body: "Every feature answers to a supervisor or a committee. The matrix, the audit and the synthesis exist so you can defend each claim when asked.",
  },
  {
    icon: Quote,
    title: "Grounded in what you actually read",
    body: "The models never invent a citation. Every claim traces to a row you reviewed, and anything thin is flagged for your eye, not quietly filled in.",
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

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const featured = getFeaturedPosts();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <SoftwareApplicationJsonLd
        offers={TOKEN_PACKS.map((pack) => ({ price: pack.priceUsd, description: pack.blurb, name: pack.name }))}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="grid-paper pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-ink">
              For PhD candidates and their supervisors
            </p>
            <h1 className="mt-5 font-serif text-[2.6rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[3.2rem] lg:text-[3.6rem]">
              Your literature review,{" "}
              <span className="text-accent">defended row by row.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-2">
              Kadi reads your articles into your review taxonomy, synthesises the field, and drafts to
              your journal&apos;s guideline. Two documents you already have — your taxonomy and your
              journal&apos;s checklist — become the whole workflow.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-2"
              >
                Create your workspace
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center rounded-md border border-line-2 bg-card px-6 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:border-accent/40"
              >
                See how it works
              </Link>
              <span className="text-[13px] text-muted">
                <span className="font-medium text-ink-2">100,000 free tokens</span> on signup
                <span className="block">No card needed</span>
              </span>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              {["Evidence matrix", "Field synthesis", "Guideline audit"].map((label) => (
                <span key={label} className="flex items-center gap-1.5 text-[12.5px] text-muted">
                  <CheckCircle2 className="size-3.5 text-accent" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <ProductPreview />
            <div className="absolute -bottom-4 -left-4 hidden items-center gap-2.5 rounded-xl border border-line bg-card px-3.5 py-2.5 shadow-lg sm:flex">
              <span className="grid size-8 place-items-center rounded-md bg-accent-soft text-accent-ink">
                <Zap className="size-4" />
              </span>
              <div>
                <p className="text-[12px] font-semibold text-ink">One upload, one full row</p>
                <p className="text-[10.5px] text-muted">11 columns filled per article</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="border-b border-line bg-ink text-white">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <div className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
            {FACTS.map((fact, index) => (
              <div
                key={fact.label}
                className={`text-center ${index > 0 ? "md:border-l md:border-ink-line" : ""}`}
              >
                <p className="font-serif text-[2.4rem] font-semibold tabular-nums tracking-tight">
                  {fact.prefix}
                  <CountUp to={fact.value} />
                  {fact.suffix}
                </p>
                <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                  {fact.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works (summary) */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-ink">
              How it works
            </p>
            <h2 className="mt-4 font-serif text-[2rem] font-semibold leading-tight tracking-tight text-ink sm:text-[2.4rem]">
              From a stack of PDFs to a submitted manuscript
            </h2>
          </div>
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-accent-ink transition-colors hover:text-accent"
          >
            The full walkthrough <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="group rounded-xl border border-line bg-card p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_16px_30px_-16px_rgba(15,18,24,0.25)]"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-md bg-accent-soft text-accent-ink">
                  <step.icon className="size-5" />
                </span>
                <span className="font-mono text-[12px] font-medium text-line-2 transition-colors group-hover:text-accent">
                  {step.number}
                </span>
              </div>
              <h3 className="mt-4 text-[15.5px] font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section id="pricing" className="border-y border-line bg-paper-2/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="text-center">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-ink">
              Prepaid tokens
            </p>
            <h2 className="mt-4 font-serif text-[2rem] font-semibold tracking-tight text-ink sm:text-[2.4rem]">
              Pay for the work, not a subscription
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15.5px] leading-relaxed text-ink-2">
              One token is one model token, charged after the answer arrives. Failed calls are never
              billed. Every new account starts with 100,000 free tokens.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {TOKEN_PACKS.map((pack) => {
              const isFeaturedPack = pack.id === "research";
              return (
                <div key={pack.id} className="relative">
                  {isFeaturedPack ? (
                    <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-accent px-3.5 py-1 text-[11px] font-semibold text-white">
                      Most popular
                    </span>
                  ) : null}
                  <div
                    className={`flex h-full flex-col rounded-2xl border bg-card p-7 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_16px_30px_-16px_rgba(15,18,24,0.22)] ${
                      isFeaturedPack ? "border-2 border-accent" : "border border-line"
                    }`}
                  >
                    <h3 className="text-[15px] font-semibold text-ink">{pack.name}</h3>
                    <p className="mt-3 text-[2.6rem] font-bold leading-none tracking-tight text-ink">
                      {new Intl.NumberFormat("en-US").format(pack.tokens)}
                    </p>
                    <p className="mt-1.5 text-[12.5px] text-muted">tokens</p>
                    <div className="my-5 h-px bg-line" />
                    <ul className="space-y-3.5">
                      {(PACK_FEATURES[pack.id] ?? []).map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5 text-[13px] text-ink-2">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-7">
                      <p className="text-[1.6rem] font-bold text-ink">
                        ${pack.priceUsd}
                        <span className="text-[13px] font-normal text-muted"> once</span>
                      </p>
                      <Link
                        href="/register"
                        className={`mt-4 block w-full rounded-md py-3 text-center text-[14px] font-semibold transition-colors ${
                          isFeaturedPack
                            ? "bg-accent text-white hover:bg-accent-2"
                            : "border border-line-2 bg-card text-ink hover:border-accent/40"
                        }`}
                      >
                        Start with free tokens
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link href="/pricing" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-accent-ink transition-colors hover:text-accent">
              Compare every pack <ArrowRight className="size-3.5" />
            </Link>
            <p className="mt-3 text-[12.5px] text-muted">
              Payments are processed by Paystack. Buy a pack any time from inside the studio.
            </p>
          </div>
        </div>
      </section>

      {/* Why Kadi — differentiators */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-ink">
              Why Kadi
            </p>
            <h2 className="mt-4 font-serif text-[2rem] font-semibold leading-tight tracking-tight text-ink sm:text-[2.4rem]">
              A studio built for the way doctorates are actually judged
            </h2>
            <p className="mt-5 text-[15.5px] leading-relaxed text-ink-2">
              Generic AI writing tools optimise for output volume. Kadi optimises for what survives a
              committee — defensible claims, correct structure, and citations you can stand behind.
            </p>
            <Link
              href="/why-kadi"
              className="mt-7 inline-flex items-center gap-1.5 rounded-md border border-line-2 bg-card px-5 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:border-accent/40"
            >
              Read the full case <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {DIFFERENTIATORS.map((item) => (
              <div key={item.title} className="rounded-xl border border-line bg-card p-5">
                <span className="grid size-9 place-items-center rounded-md bg-accent-soft text-accent-ink">
                  <item.icon className="size-4.5" />
                </span>
                <h3 className="mt-3.5 text-[14px] font-semibold text-ink">{item.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* From the blog */}
      {featured.length > 0 ? (
        <section className="border-y border-line bg-paper-2/40">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-ink">
                  From the blog
                </p>
                <h2 className="mt-4 font-serif text-[2rem] font-semibold tracking-tight text-ink sm:text-[2.4rem]">
                  Guides for the defensible literature review
                </h2>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-accent-ink transition-colors hover:text-accent"
              >
                All articles <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {featured.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col rounded-xl border border-line bg-card p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_16px_30px_-16px_rgba(15,18,24,0.22)]"
                >
                  <div className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    <span className="text-accent-ink">{post.category}</span>
                    <span>·</span>
                    <span>{post.readingMinutes} min read</span>
                  </div>
                  <h3 className="mt-3 font-serif text-[1.25rem] font-semibold leading-snug text-ink transition-colors group-hover:text-accent-ink">
                    {post.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-ink-2">{post.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent-ink">
                    Read article <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Closing band */}
      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-8 px-5 py-16 sm:px-8">
          <div>
            <h2 className="font-serif text-[1.8rem] font-semibold tracking-tight sm:text-[2rem]">
              Your next committee meeting deserves better rows
            </h2>
            <p className="mt-2 max-w-xl text-[14.5px] text-ink-muted">
              Create an account, upload one article, and watch the matrix fill itself in.
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-2"
          >
            Start free <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}