"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Compass,
  Download,
  FileSpreadsheet,
  FileText,
  Gauge,
  Sparkles,
  Table2,
  Users,
} from "lucide-react";

import { Alert, Badge, Button, Card, Spinner } from "@/components/ui";
import { downloadFile, getJson } from "@/lib/client";
import { RESEARCH_TYPES, STUDY_TYPES } from "@/lib/guideline";
import type { NotebookDetail } from "@/lib/types";
import { cn, formatUsd } from "@/lib/utils";

const TABS = [
  { href: "", label: "Overview", icon: Gauge },
  { href: "/review", label: "Article reviewer", icon: Sparkles },
  { href: "/reviews", label: "Evidence matrix", icon: Table2 },
  { href: "/manuscripts", label: "Manuscripts", icon: FileText },
  { href: "/research", label: "Research & synthesis", icon: Compass },
  { href: "/team", label: "Team", icon: Users },
];

const ROLE_TONE = { owner: "accent", editor: "good", viewer: "warn" } as const;

export default function NotebookLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const notebookId = params.id;
  const pathname = usePathname();
  const base = `/notebooks/${notebookId}`;

  const [detail, setDetail] = useState<NotebookDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getJson<NotebookDetail>(`/api/notebooks/${notebookId}`);
      setDetail(data);
      setError(null);
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not open this notebook.");
    }
  }, [notebookId]);

  useEffect(() => {
    void load();
  }, [load]);

  const studyLabel = detail
    ? (STUDY_TYPES.find((type) => type.value === detail.notebook.studyType)?.label ?? detail.notebook.studyType)
    : "";
  const researchLabel = detail
    ? (RESEARCH_TYPES.find((type) => type.value === detail.notebook.researchType)?.label ??
      detail.notebook.researchType)
    : "";

  return (
    <div>
      <header className="border-b border-line bg-ink text-white">
        <div className="mx-auto max-w-[1500px] px-5 pt-5 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">Notebook</p>
              <h1 className="mt-1.5 font-serif text-[1.5rem] leading-tight tracking-tight">
                {detail?.notebook.title ?? "Loading notebook…"}
              </h1>
              {detail ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{studyLabel}</Badge>
                  {researchLabel ? <Badge>{researchLabel}</Badge> : null}
                  <Badge tone={ROLE_TONE[detail.role]}>{detail.role}</Badge>
                  <Badge>{detail.notebook.status}</Badge>
                  {detail.notebook.researchArea ? <Badge>{detail.notebook.researchArea}</Badge> : null}
                  {detail.notebook.targetJournal ? (
                    <Badge tone="good">Target: {detail.notebook.targetJournal}</Badge>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {detail ? (
                <>
                  <div className="mr-1 hidden items-center gap-4 text-right sm:flex">
                    <HeaderStat label="Articles" value={String(detail.stats.reviews)} />
                    <HeaderStat label="Drafts" value={String(detail.stats.manuscripts)} />
                    <HeaderStat label="Spend" value={formatUsd(detail.stats.spendUsd)} />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-ink-muted hover:bg-ink-3 hover:text-white"
                    onClick={() => downloadFile(`/api/notebooks/${notebookId}/export?format=xlsx`)}
                  >
                    <FileSpreadsheet className="size-3.5" />
                    XLSX
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-ink-muted hover:bg-ink-3 hover:text-white"
                    onClick={() => downloadFile(`/api/notebooks/${notebookId}/export?format=csv`)}
                  >
                    <Download className="size-3.5" />
                    CSV
                  </Button>
                </>
              ) : (
                <Spinner className="size-4 text-ink-muted" />
              )}
            </div>
          </div>

          <nav className="scroll-thin mt-5 flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const href = `${base}${tab.href}`;
              const active =
                tab.href === ""
                  ? pathname === base
                  : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={tab.label}
                  href={href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-t-sm border-b-2 px-3 py-2.5 text-[13px] transition-colors",
                    active
                      ? "border-accent text-white"
                      : "border-transparent text-ink-muted hover:border-ink-line hover:text-white",
                  )}
                >
                  <tab.icon className="size-3.5" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {error ? (
        <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-7">
          <Alert tone="bad" title="This notebook is not available">
            {error}
          </Alert>
          <Card className="mt-4">
            <div className="px-5 py-6 text-[13px] text-muted">
              It may have been deleted, or you may not have been invited to it.{" "}
              <Link href="/dashboard" className="text-accent-ink underline underline-offset-2">
                Back to your dashboard
              </Link>
              .
            </div>
          </Card>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className="text-[14px] font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}
