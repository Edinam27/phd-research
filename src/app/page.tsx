import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpenCheck, FileSpreadsheet, FileText, ShieldCheck } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { TOKEN_PACKS } from "@/lib/tokens";

export const metadata = {
  title: "Kadi Research Studio — literature reviews, defended",
};

const WORKFLOW = [
  {
    icon: BookOpenCheck,
    title: "Review to the taxonomy",
    body: "Upload a PDF or DOCX and every article lands as one row in the eleven-column matrix your supervisor expects — Author through Limitations.",
  },
  {
    icon: FileSpreadsheet,
    title: "Synthesise the field",
    body: "Themes, theory usage, method distribution, consensus, contradictions and the gap you can defend — built only from rows you actually reviewed.",
  },
  {
    icon: FileText,
    title: "Draft to the guideline",
    body: "Articles and proposals written section by section against your journal's word budgets and checklists, with an audit before you submit.",
  },
  {
    icon: ShieldCheck,
    title: "Cite honestly",
    body: "Every claim is drawn from your own evidence matrix. Citations you have not read are flagged, not invented.",
  },
];

const MATRIX_PREVIEW = {
  columns: ["Author", "Year", "Context", "Method", "Gap noted"],
  rows: [
    ["Mehmetoglu & Engen", "2011", "Norway, nature-based", "Survey, SEM (n=318)", "Realms treated as universal"],
    ["Cohen", "1979", "Tourism typology", "Conceptual", "No operational measures"],
    ["Waitt", "2000", "Australia, heritage", "Intercept survey", "Authenticity assumed singular"],
  ],
};

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Navigation — wordmark, one quiet link, one button */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-sm bg-accent font-serif text-sm font-semibold text-white">
            K
          </span>
          <span className="font-serif text-[15px] tracking-tight">Kadi Research Studio</span>
        </span>
        <nav className="flex items-center gap-5">
          <Link href="/login" className="text-[13.5px] text-ink-2 hover:text-ink">
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-sm border border-accent bg-accent px-3.5 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-accent-2"
          >
            Start free
          </Link>
        </nav>
      </header>

      {/* Hero — split, text left, the real matrix right */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-14 lg:grid-cols-[1fr_1.1fr] lg:pt-20">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            For PhD candidates and their supervisors
          </p>
          <h1 className="mt-4 font-serif text-[2.6rem] leading-[1.1] tracking-tight">
            Turn a stack of articles into a defended literature review
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-2">
            Kadi reads your articles into your review taxonomy, synthesises the field, and drafts to your
            journal&apos;s guideline. You keep the judgement; the tabulating and the drafting stop eating your
            weekends.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/register"
              className="rounded-sm border border-accent bg-accent px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-accent-2"
            >
              Create your workspace
            </Link>
            <span className="text-[12.5px] text-muted">
              Free tokens on signup
              <span className="block">No card needed</span>
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-card shadow-[0_2px_16px_rgba(16,19,25,0.06)]">
          <div className="flex items-center justify-between border-b border-line bg-paper-2 px-4 py-2.5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
              Evidence matrix · Tourism Management
            </span>
            <span className="font-mono text-[10.5px] tabular-nums text-muted">3 of 41 rows</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left">
                {MATRIX_PREVIEW.columns.map((column) => (
                  <th
                    key={column}
                    className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {MATRIX_PREVIEW.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td
                      key={index}
                      className={`px-4 py-2.5 text-[12.5px] ${index === 0 ? "text-ink" : "text-ink-2"}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Workflow — the four things the studio does, in order */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="max-w-xl font-serif text-[1.7rem] leading-tight tracking-tight">
            Built around two documents you already have: your review taxonomy and your journal&apos;s guideline
          </h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map((step, index) => (
              <div key={step.title}>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[11px] text-accent-ink">0{index + 1}</span>
                  <step.icon className="size-4 text-ink-2" />
                </div>
                <p className="mt-3 text-[14px] font-medium">{step.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — prepaid tokens, priced once, in cedis */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-serif text-[1.7rem] leading-tight tracking-tight">Prepaid tokens, no subscription</h2>
          <p className="text-[12.5px] text-muted">One token per model token. Failed calls are never charged.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {TOKEN_PACKS.map((pack) => (
            <div key={pack.id} className="rounded-md border border-line bg-card px-5 py-5">
              <p className="text-[13px] font-medium text-ink">{pack.name}</p>
              <p className="mt-3 font-mono text-[26px] tabular-nums leading-none text-ink">
                {new Intl.NumberFormat("en-US").format(pack.tokens)}
              </p>
              <p className="mt-1 text-[11.5px] text-muted">tokens · GH₵{pack.priceGhs}</p>
              <p className="mt-4 text-[12.5px] leading-relaxed text-ink-2">{pack.blurb}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-xl text-[13px] leading-relaxed text-ink-2">
          Every new account starts with free tokens — enough to review your first articles and draft a section
          before you decide. Payments are handled by Paystack.
        </p>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-line bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-12">
          <div>
            <p className="font-serif text-[1.4rem] tracking-tight">Your next committee meeting deserves better rows</p>
            <p className="mt-1.5 text-[13.5px] text-ink-muted">
              Create an account, upload one article, and see the matrix fill itself in.
            </p>
          </div>
          <Link
            href="/register"
            className="flex items-center gap-2 rounded-sm border border-white/20 bg-white px-5 py-3 text-[14px] font-medium text-ink transition-colors hover:bg-paper-2"
          >
            Start free
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-[12px] text-muted">
        Kadi Research Studio · review · synthesise · publish
      </footer>
    </div>
  );
}
