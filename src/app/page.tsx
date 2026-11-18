import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, MessageCircle, Zap } from "lucide-react";
import { Public_Sans } from "next/font/google";

import { getCurrentUser } from "@/lib/auth";
import { TOKEN_PACKS } from "@/lib/tokens";

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-public-sans",
});

export const metadata = {
  title: "Kadi Research Studio — literature reviews, defended",
};

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#facts", label: "Why Kadi" },
];

const STEPS = [
  {
    number: "01",
    title: "Upload an article or a draft",
    body: "A PDF or DOCX becomes a row in your eleven-column review taxonomy — or, if it is your own working paper, a notebook with your prose already in place.",
  },
  {
    number: "02",
    title: "Review and synthesise",
    body: "Themes, theory usage, methods, consensus, contradictions and the gap you can defend — built only from rows you actually reviewed.",
  },
  {
    number: "03",
    title: "Draft to the guideline",
    body: "Sections written against your journal's word budgets and checklists, with an audit before you submit. You keep the judgement.",
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
  { value: "11", label: "Taxonomy columns per review row" },
  { value: "3", label: "Model tiers behind every call" },
  { value: "100k", label: "Free tokens on signup" },
  { value: "$10", label: "Smallest prepaid pack" },
];

const MATRIX_PREVIEW = {
  columns: ["Author", "Year", "Context", "Method", "Gap noted"],
  rows: [
    ["Mehmetoglu & Engen", "2011", "Norway, nature-based", "Survey, SEM (n=318)", "Realms treated as universal"],
    ["Cohen", "1979", "Tourism typology", "Conceptual", "No operational measures"],
    ["Waitt", "2000", "Australia, heritage", "Intercept survey", "Authenticity assumed singular"],
    ["Poria et al.", "2013", "Israel, heritage sites", "On-site questionnaire", "Motivation left unmeasured"],
  ],
};

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const supportWhatsApp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim() || null;

  return (
    <div className={`${publicSans.variable} min-h-screen bg-white font-[family-name:var(--font-public-sans)] text-[#0F172A]`}>
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-[#1E293B] bg-[#020617]">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-[#059669] text-[15px] font-bold text-white">
              K
            </span>
            <span className="text-[15px] font-bold tracking-tight text-white">
              Kadi Research Studio
            </span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[14px] text-[#CBD5E1] transition-colors duration-300 hover:text-[#10B981]"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <Link
            href="/register"
            className="rounded-lg bg-[#059669] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(5,150,105,0.35)] transition-colors duration-300 hover:bg-[#047857]"
          >
            Start free
          </Link>
        </div>
      </header>

      {/* Hero — split layout */}
      <section className="mx-auto grid max-w-[1440px] items-center gap-12 px-8 py-20 lg:grid-cols-2 lg:gap-16 lg:px-12 lg:py-24">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-[#059669]">
            For PhD candidates and their supervisors
          </p>
          <h1 className="mt-5 text-[40px] font-extrabold leading-[1.08] tracking-tight text-[#0F172A] sm:text-[52px] lg:text-[60px]">
            Your literature review,{" "}
            <span className="text-[#64748B]">defended row by row.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[18px] leading-relaxed text-[#475569]">
            Kadi reads your articles into your review taxonomy, synthesises the field, and drafts to
            your journal&apos;s guideline. Two documents you already have — your taxonomy and your
            journal&apos;s checklist — become the whole workflow.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/register"
              className="rounded-xl bg-[#059669] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(5,150,105,0.35)] transition-all duration-300 hover:bg-[#047857]"
            >
              Create your workspace
            </Link>
            <Link
              href="#pricing"
              className="rounded-xl border border-[#E2E8F0] bg-white px-6 py-3.5 text-[15px] font-semibold text-[#0F172A] transition-colors duration-300 hover:border-[#94A3B8]"
            >
              See pricing
            </Link>
            <span className="text-[13px] text-[#94A3B8]">
              100,000 free tokens on signup
              <span className="block">No card needed</span>
            </span>
          </div>
        </div>

        {/* Product preview — the real matrix, in a padded frame with a floating badge */}
        <div className="relative rounded-[40px] bg-[#F8FAFC] p-6 sm:p-10">
          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]">
                Evidence matrix · Tourism Management
              </span>
              <span className="font-mono text-[11px] tabular-nums text-[#94A3B8]">
                4 of 41 rows
              </span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-left">
                  {MATRIX_PREVIEW.columns.map((column) => (
                    <th
                      key={column}
                      className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {MATRIX_PREVIEW.rows.map((row) => (
                  <tr key={row[0]} className="transition-colors duration-300 hover:bg-[#F8FAFC]">
                    {row.map((cell, index) => (
                      <td
                        key={index}
                        className={`px-4 py-3 text-[12px] ${index === 0 ? "font-semibold text-[#0F172A]" : "text-[#475569]"}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="absolute bottom-6 left-6 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl sm:bottom-10 sm:left-10">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#059669]/10 text-[#059669]">
              <Zap className="size-4" />
            </span>
            <div>
              <p className="text-[13px] font-bold text-[#0F172A]">One upload, one full row</p>
              <p className="text-[11px] text-[#94A3B8]">11 columns filled per article</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-[1440px] px-8 py-20 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-[12px] font-bold uppercase tracking-widest text-[#059669]">
              How it works
            </p>
            <h2 className="mt-4 text-[36px] font-bold leading-tight tracking-tight text-[#0F172A]">
              From a stack of PDFs to a submitted manuscript
            </h2>
          </div>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number}>
                <span className="text-[13px] font-bold tracking-widest text-[#10B981]">
                  {step.number}
                </span>
                <h3 className="mt-3 text-[18px] font-bold text-[#0F172A]">{step.title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-[#475569]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing grid */}
      <section id="pricing" className="bg-[#F8FAFC]">
        <div className="mx-auto max-w-[1440px] px-8 py-20 lg:px-12">
          <div className="text-center">
            <p className="text-[12px] font-bold uppercase tracking-widest text-[#059669]">
              Prepaid tokens
            </p>
            <h2 className="mt-4 text-[36px] font-bold tracking-tight text-[#0F172A]">
              Pay for the work, not a subscription
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[16px] text-[#475569]">
              One token is one model token, charged after the answer arrives. Failed calls are never
              billed. Every new account starts with 100,000 free tokens.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {TOKEN_PACKS.map((pack) => {
              const featured = pack.id === "research";
              return (
                <div key={pack.id} className="relative">
                  {featured ? (
                    <span className="absolute -top-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#059669] px-4 py-1.5 text-[12px] font-bold text-white">
                      Most popular
                    </span>
                  ) : null}
                  <div
                    className={`flex h-full flex-col rounded-[32px] border bg-white p-10 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.05)] ${
                      featured ? "border-2 border-[#059669]" : "border border-[#E2E8F0]"
                    }`}
                  >
                    <h3 className="text-[16px] font-bold text-[#0F172A]">{pack.name}</h3>
                    <p className="mt-4 text-[48px] font-black leading-none tracking-tight text-[#0F172A]">
                      {new Intl.NumberFormat("en-US").format(pack.tokens)}
                    </p>
                    <p className="mt-2 text-[13px] text-[#94A3B8]">tokens</p>
                    <div className="my-6 h-px bg-[#E2E8F0]" />
                    <ul className="space-y-5">
                      {(PACK_FEATURES[pack.id] ?? []).map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-[14px] text-[#475569]">
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#10B981]/10 text-[#10B981]">
                            <Zap className="size-3" />
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto pt-8">
                      <p className="text-[28px] font-black text-[#0F172A]">
                        ${pack.priceUsd}
                        <span className="text-[14px] font-medium text-[#94A3B8]"> once</span>
                      </p>
                      <Link
                        href="/register"
                        className={`mt-5 block w-full rounded-xl py-3.5 text-center text-[15px] font-semibold transition-colors duration-300 ${
                          featured
                            ? "bg-[#059669] text-white shadow-[0_4px_14px_rgba(5,150,105,0.35)] hover:bg-[#047857]"
                            : "border border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#94A3B8]"
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
          <p className="mt-8 text-center text-[13px] text-[#94A3B8]">
            Payments are processed by Paystack. Buy a pack any time from inside the studio.
          </p>
        </div>
      </section>

      {/* Stats banner */}
      <section id="facts" className="bg-white">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-y-12 px-8 py-24 md:grid-cols-4 lg:px-12">
          {FACTS.map((fact, index) => (
            <div
              key={fact.label}
              className={`text-center ${index > 0 ? "md:border-l md:border-[#E2E8F0]" : ""}`}
            >
              <p className="text-[36px] font-black tracking-tight text-[#0F172A]">{fact.value}</p>
              <p className="mt-2 text-[12px] font-medium uppercase tracking-widest text-[#94A3B8]">
                {fact.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing band */}
      <section className="bg-[#020617]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-8 px-8 py-16 lg:px-12">
          <div>
            <h2 className="text-[28px] font-bold tracking-tight text-white sm:text-[32px]">
              Your next committee meeting deserves better rows
            </h2>
            <p className="mt-2 text-[15px] text-[#CBD5E1]">
              Create an account, upload one article, and watch the matrix fill itself in.
            </p>
          </div>
          <Link
            href="/register"
            className="rounded-xl bg-[#059669] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(5,150,105,0.35)] transition-colors duration-300 hover:bg-[#047857]"
          >
            Start free
          </Link>
        </div>
      </section>

      {/* Corporate footer */}
      <footer className="bg-[#020617] pt-24">
        <div className="mx-auto max-w-[1440px] px-8 lg:px-12">
          <div className="grid gap-12 pb-16 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-[#059669] text-[15px] font-bold text-white">
                  K
                </span>
                <span className="text-[15px] font-bold text-white">Kadi Research Studio</span>
              </div>
              <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-[#CBD5E1]">
                A research studio for doctoral work: review to your taxonomy, synthesise the field,
                draft to your journal&apos;s guideline. The tabulating is automated; the judgement
                stays yours.
              </p>
            </div>
            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-widest text-[#94A3B8]">
                Quick links
              </h3>
              <ul className="mt-4 space-y-3">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="text-[14px] text-[#CBD5E1] transition-colors duration-300 hover:text-[#10B981]">
                      {item.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link href="/login" className="text-[14px] text-[#CBD5E1] transition-colors duration-300 hover:text-[#10B981]">
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-widest text-[#94A3B8]">
                Contact
              </h3>
              <ul className="mt-4 space-y-3 text-[14px] text-[#CBD5E1]">
                <li className="flex items-center gap-2.5">
                  <Mail className="size-4 text-[#10B981]" />
                  <a
                    href="mailto:support@kadistudio.app"
                    className="transition-colors duration-300 hover:text-[#10B981]"
                  >
                    support@kadistudio.app
                  </a>
                </li>
                {supportWhatsApp ? (
                  <li className="flex items-center gap-2.5">
                    <MessageCircle className="size-4 text-[#10B981]" />
                    <a
                      href={`https://wa.me/${supportWhatsApp}`}
                      className="transition-colors duration-300 hover:text-[#10B981]"
                    >
                      WhatsApp support
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#0F172A] py-8">
            <p className="text-[11px] uppercase tracking-widest text-[#94A3B8]">
              © {new Date().getFullYear()} Kadi Research Studio
            </p>
            <p className="text-[11px] uppercase tracking-widest text-[#94A3B8]/20">
              Payments by Paystack
            </p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp contact — rendered only when a number is configured */}
      {supportWhatsApp ? (
        <a
          href={`https://wa.me/${supportWhatsApp}`}
          className="group fixed bottom-10 right-10 z-50"
          aria-label="Chat on WhatsApp"
        >
          <span className="absolute inset-0 -z-10 scale-150 rounded-2xl bg-[rgba(16,185,129,0.2)] blur-2xl" />
          <span className="flex size-16 items-center justify-center rounded-2xl bg-[#059669] text-white transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-110">
            <MessageCircle className="size-7" />
          </span>
          <span className="pointer-events-none absolute right-[4.5rem] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold text-[#0F172A] opacity-0 shadow-xl transition-opacity duration-300 group-hover:opacity-100">
            Chat with us
          </span>
        </a>
      ) : null}
    </div>
  );
}
