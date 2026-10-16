import Link from "next/link";

import { SetupStatus } from "@/components/setup-status";

const WORKFLOW = [
  {
    step: "01",
    title: "Review to the taxonomy",
    body: "Upload a PDF or DOCX and every article lands as one row in the eleven-column matrix your supervisor expects — Author through Limitations.",
  },
  {
    step: "02",
    title: "Separate every study",
    body: "Each study gets its own notebook: its own evidence matrix, its own research problem, its own drafts. Nothing bleeds across projects.",
  },
  {
    step: "03",
    title: "Synthesise the field",
    body: "Themes, theory usage, method distribution, consensus, contradictions and the gap you can defend — built only from rows you actually reviewed.",
  },
  {
    step: "04",
    title: "Draft to the guideline",
    body: "Articles and proposals written section by section against your journal's word budgets and checklists, with an audit before you submit.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink px-12 py-12 text-white lg:flex xl:w-[55%]">
        <div className="grid-paper pointer-events-none absolute inset-0 opacity-[0.06]" />
        <div className="relative">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-sm bg-accent font-serif text-base font-semibold">
              R
            </span>
            <span className="font-serif text-lg tracking-tight">PhD Research Studio</span>
          </Link>

          <h1 className="mt-14 max-w-xl font-serif text-[2.6rem] leading-[1.12] tracking-tight">
            Turn a stack of articles into a defended literature review — and a draft you can submit.
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-muted">
            Built around two documents you already have: your review taxonomy and your journal&apos;s publication
            guideline. The app does the reading, the tabulating and the drafting. You keep the judgement.
          </p>

          <ol className="mt-12 max-w-xl space-y-6">
            {WORKFLOW.map((item) => (
              <li key={item.step} className="flex gap-4">
                <span className="mt-0.5 font-mono text-[11px] text-accent-soft/80">{item.step}</span>
                <div>
                  <p className="text-[14px] font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative border-t border-ink-line pt-6 text-[12px] text-ink-muted">
          Every claim the models write is drawn from your own evidence matrix. Citations you have not read are
          flagged, not invented.
        </div>
      </div>

      <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-1/2 xl:w-[45%]">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid size-8 place-items-center rounded-sm bg-accent font-serif text-sm font-semibold text-white">
              R
            </span>
            <span className="font-serif text-base tracking-tight">PhD Research Studio</span>
          </Link>
          {children}
          <SetupStatus />
        </div>
      </div>
    </div>
  );
}
