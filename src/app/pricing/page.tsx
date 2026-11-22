import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, HelpCircle, ShieldCheck, Zap } from "lucide-react";

import { MarketingShell } from "@/components/site/marketing-shell";
import { SoftwareApplicationJsonLd } from "@/components/seo/json-ld";
import { TOKEN_PACKS } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Pricing — prepaid token packs, no subscription",
  description:
    "Kadi Research Studio uses prepaid token packs, not subscriptions. One token is one model token, charged after the answer arrives. Packs start at $10 and every account begins with 100,000 free tokens.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Kadi Research Studio pricing",
    description: "Prepaid token packs. Pay for the work, not a subscription. 100,000 free tokens on signup.",
    url: "/pricing",
  },
};

const PACK_FEATURES: Record<string, string[]> = {
  starter: [
    "Roughly fifteen full article reviews",
    "Section drafting across one manuscript",
    "Guideline audit before you submit",
    "Export reviews to Excel",
    "Email support",
  ],
  research: [
    "A full thesis season of reviews and drafts",
    "Synthesis across your whole evidence matrix",
    "Grounded literature search with citations",
    "Proposals, articles and abstracts",
    "Supervisor collaboration",
  ],
  department: [
    "Several notebooks running in parallel",
    "Supervisors and candidates in one workspace",
    "Shared across a lab or faculty group",
    "Everything in the Research pack",
    "Priority email and WhatsApp support",
  ],
};

const PRINCIPLES = [
  {
    icon: Zap,
    title: "One token, one model token",
    body: "Tokens are charged after the answer arrives. A failed call is never billed — you only pay for work that actually completed.",
  },
  {
    icon: ShieldCheck,
    title: "No subscription, no surprise renewals",
    body: "Buy a pack when you need it. Tokens do not expire, and there is no monthly charge to forget about.",
  },
  {
    icon: HelpCircle,
    title: "Start before you spend",
    body: "Every account starts with 100,000 free tokens — enough to review roughly a dozen articles before you decide to buy a pack.",
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <SoftwareApplicationJsonLd
        offers={TOKEN_PACKS.map((pack) => ({ price: pack.priceUsd, description: pack.blurb, name: pack.name }))}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="grid-paper pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-5 py-16 text-center sm:px-8 lg:py-20">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-ink">
            Prepaid tokens
          </p>
          <h1 className="mt-5 font-serif text-[2.4rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[3rem]">
            Pay for the work, <span className="text-accent">not a subscription</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[16.5px] leading-relaxed text-ink-2">
            One token is one model token, charged after the answer arrives. Failed calls are never billed.
            Every new account starts with 100,000 free tokens.
          </p>
        </div>
      </section>

      {/* Packs */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-5 md:grid-cols-3">
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
                  className={`flex h-full flex-col rounded-2xl border bg-card p-7 ${
                    isFeaturedPack ? "border-2 border-accent" : "border border-line"
                  }`}
                >
                  <h2 className="text-[15px] font-semibold text-ink">{pack.name}</h2>
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
        <p className="mt-8 text-center text-[12.5px] text-muted">
          Payments are processed by Paystack. Buy a pack any time from inside the studio.
        </p>
      </section>

      {/* Principles */}
      <section className="border-y border-line bg-paper-2/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <div key={principle.title} className="rounded-xl border border-line bg-card p-6">
                <span className="grid size-10 place-items-center rounded-md bg-accent-soft text-accent-ink">
                  <principle.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-[15.5px] font-semibold text-ink">{principle.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{principle.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-line bg-card px-6 py-5">
            <p className="text-[14px] text-ink-2">Still have questions about tokens or billing?</p>
            <Link
              href="/faq"
              className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-accent-ink transition-colors hover:text-accent"
            >
              Read the FAQ <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}