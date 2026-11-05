"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  MiniMeter,
  Spinner,
  Stat,
} from "@/components/ui";
import { ApiError, getJson } from "@/lib/client";
import { RESEARCH_TYPES, STUDY_TYPES } from "@/lib/guideline";
import { cn, formatUsd } from "@/lib/utils";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  institution: string | null;
  discipline: string | null;
  academicRole: string | null;
  isAdmin: boolean;
  createdAt: string;
  notebooksOwned: number;
  sharedInto: number;
  reviews: number;
  manuscripts: number;
  aiRuns: number;
  aiCostUsd: number;
};

type AdminNotebook = {
  id: string;
  title: string;
  researchArea: string | null;
  researchType: string;
  studyType: string;
  status: string;
  targetJournal: string | null;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
  reviews: number;
  manuscripts: number;
  collaborators: number;
  spendUsd: number;
};

type AdminManuscript = {
  id: string;
  title: string;
  kind: string;
  researchType: string;
  studyType: string;
  status: string;
  updatedAt: string;
  notebookId: string;
  notebookTitle: string;
  createdByName: string;
  sections: number;
  sectionsComplete: number;
  words: number;
};

type AdminOverview = {
  generatedAt: string;
  viewer: { id: string; name: string; email: string };
  totals: {
    users: number;
    admins: number;
    notebooks: number;
    reviews: number;
    manuscripts: number;
    researchQueries: number;
    aiRuns: number;
    aiCostUsd: number;
    aiFailures: number;
  };
  users: AdminUser[];
  notebooks: AdminNotebook[];
  manuscripts: AdminManuscript[];
};

type View = "accounts" | "workspaces" | "drafts";

const VIEWS: { value: View; label: string }[] = [
  { value: "accounts", label: "Accounts" },
  { value: "workspaces", label: "Workspaces" },
  { value: "drafts", label: "Drafts" },
];

const numberFormat = new Intl.NumberFormat("en-US");

function labelOf(list: { value: string; label: string }[], value: string): string {
  return list.find((entry) => entry.value === value)?.label ?? value;
}

function shortDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const TH = "px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted";
const TH_NUMBER = cn(TH, "text-right");
const TD = "px-4 py-3 align-top text-[13px] text-ink-2";
const TD_NUMBER = cn(TD, "text-right font-mono text-[12.5px] tabular-nums");

export function AdminClient() {
  const [view, setView] = useState<View>("accounts");
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getJson<AdminOverview>("/api/admin/overview"));
      setError(null);
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not load the studio overview.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Everything in the studio"
        subtitle="Every account and every workspace in one place. Administrators see the whole studio and open any notebook as a reader — writing, editing and deleting stay with the people who own the work."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Administration" }]}
      />

      <PageBody>
        {error && !data ? (
          <Alert
            tone="bad"
            title="Could not load the overview"
            action={
              <Button size="sm" onClick={() => void load()}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : !data ? (
          <Card>
            <div className="flex items-center justify-center gap-2 px-5 py-16 text-[13px] text-muted">
              <Spinner className="size-4" /> Reading the whole studio…
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <Stat label="Accounts" value={numberFormat.format(data.totals.users)} sub={`${data.totals.admins} admin`} />
              <Stat label="Workspaces" value={numberFormat.format(data.totals.notebooks)} sub="Notebooks" />
              <Stat label="Articles" value={numberFormat.format(data.totals.reviews)} sub="Reviewed rows" />
              <Stat label="Drafts" value={numberFormat.format(data.totals.manuscripts)} sub="Manuscripts" />
              <Stat label="Model calls" value={numberFormat.format(data.totals.aiRuns)} sub={`${data.totals.aiFailures} failed`} />
              <Stat label="AI spend" value={formatUsd(data.totals.aiCostUsd)} sub="All accounts, all time" />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-1.5">
              {VIEWS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => setView(entry.value)}
                  className={cn(
                    "rounded-sm border px-3 py-1.5 text-[13px] transition-colors",
                    view === entry.value
                      ? "border-ink bg-ink text-white"
                      : "border-line-2 bg-card text-ink-2 hover:border-ink/40",
                  )}
                >
                  {entry.label}
                  <span className="ml-2 font-mono text-[11px] text-muted">
                    {entry.value === "accounts"
                      ? data.users.length
                      : entry.value === "workspaces"
                        ? data.notebooks.length
                        : data.manuscripts.length}
                  </span>
                </button>
              ))}
            </div>

            {view === "accounts" ? (
              <Card className="mt-3">
                <CardHeader
                  eyebrow="People"
                  title="Every account"
                  description="Who is registered, what they own, and what the AI has cost them."
                />
                {data.users.length === 0 ? (
                  <EmptyState icon={<ShieldCheck className="size-7" />} title="No accounts yet" />
                ) : (
                  <div className="scroll-thin overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-line text-left">
                          <th className={TH}>Person</th>
                          <th className={TH}>Institution</th>
                          <th className={TH}>Access</th>
                          <th className={TH}>Workspaces</th>
                          <th className={TH}>Articles</th>
                          <th className={TH}>Drafts</th>
                          <th className={TH_NUMBER}>AI spend</th>
                          <th className={TH}>Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {data.users.map((account) => (
                          <tr key={account.id}>
                            <td className={TD}>
                              <span className="block font-medium text-ink">{account.name}</span>
                              <span className="font-mono text-[11.5px] text-muted">{account.email}</span>
                            </td>
                            <td className={TD}>
                              {account.institution ?? "—"}
                              {account.discipline ? (
                                <span className="block text-[11.5px] text-muted">{account.discipline}</span>
                              ) : null}
                            </td>
                            <td className={TD}>
                              <span className="flex flex-wrap items-center gap-1.5">
                                {account.isAdmin ? <Badge tone="accent">admin</Badge> : null}
                                <Badge>{account.academicRole ?? "Researcher"}</Badge>
                              </span>
                            </td>
                            <td className={TD}>
                              <span className="font-mono text-[12px] tabular-nums">
                                {account.notebooksOwned} owned
                              </span>
                              {account.sharedInto > 0 ? (
                                <span className="block font-mono text-[11.5px] text-muted">
                                  {account.sharedInto} shared in
                                </span>
                              ) : null}
                            </td>
                            <td className={cn(TD, "font-mono text-[12.5px] tabular-nums")}>{account.reviews}</td>
                            <td className={cn(TD, "font-mono text-[12.5px] tabular-nums")}>{account.manuscripts}</td>
                            <td className={TD_NUMBER}>
                              {formatUsd(account.aiCostUsd)}
                              <span className="block text-[11.5px] text-muted">
                                {numberFormat.format(account.aiRuns)} calls
                              </span>
                            </td>
                            <td className={cn(TD, "text-muted")}>{shortDate(account.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ) : null}

            {view === "workspaces" ? (
              <Card className="mt-3">
                <CardHeader
                  eyebrow="Work"
                  title="Every workspace"
                  description="Each notebook in the studio, its owner and what it holds. Open one to read it."
                />
                {data.notebooks.length === 0 ? (
                  <EmptyState icon={<ShieldCheck className="size-7" />} title="No workspaces yet" />
                ) : (
                  <div className="scroll-thin overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-line text-left">
                          <th className={TH}>Notebook</th>
                          <th className={TH}>Owner</th>
                          <th className={TH}>Type</th>
                          <th className={TH}>Stage</th>
                          <th className={TH}>Articles</th>
                          <th className={TH}>Drafts</th>
                          <th className={TH}>Team</th>
                          <th className={TH_NUMBER}>AI spend</th>
                          <th className={TH}>Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {data.notebooks.map((workspace) => (
                          <tr key={workspace.id}>
                            <td className={TD}>
                              <Link
                                href={`/notebooks/${workspace.id}`}
                                className="font-medium text-ink underline-offset-2 hover:text-accent-ink hover:underline"
                              >
                                {workspace.title}
                              </Link>
                              {workspace.targetJournal ? (
                                <span className="block text-[11.5px] text-muted">
                                  Target: {workspace.targetJournal}
                                </span>
                              ) : null}
                            </td>
                            <td className={TD}>
                              <span className="block">{workspace.ownerName}</span>
                              <span className="font-mono text-[11.5px] text-muted">{workspace.ownerEmail}</span>
                            </td>
                            <td className={TD}>
                              <span className="flex flex-wrap items-center gap-1.5">
                                <Badge tone="accent">{labelOf(STUDY_TYPES, workspace.studyType)}</Badge>
                                <Badge>{labelOf(RESEARCH_TYPES, workspace.researchType)}</Badge>
                              </span>
                            </td>
                            <td className={TD}>{workspace.status}</td>
                            <td className={cn(TD, "font-mono text-[12.5px] tabular-nums")}>{workspace.reviews}</td>
                            <td className={cn(TD, "font-mono text-[12.5px] tabular-nums")}>{workspace.manuscripts}</td>
                            <td className={cn(TD, "font-mono text-[12.5px] tabular-nums")}>
                              {workspace.collaborators}
                            </td>
                            <td className={TD_NUMBER}>{formatUsd(workspace.spendUsd)}</td>
                            <td className={cn(TD, "text-muted")}>{shortDate(workspace.updatedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ) : null}

            {view === "drafts" ? (
              <Card className="mt-3">
                <CardHeader
                  eyebrow="Work"
                  title="Every draft"
                  description="Proposals, articles and chapters across the studio, with how far each one has got."
                />
                {data.manuscripts.length === 0 ? (
                  <EmptyState icon={<ShieldCheck className="size-7" />} title="No drafts yet" />
                ) : (
                  <div className="scroll-thin overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-line text-left">
                          <th className={TH}>Draft</th>
                          <th className={TH}>Workspace</th>
                          <th className={TH}>Author</th>
                          <th className={TH}>Kind</th>
                          <th className={TH}>Status</th>
                          <th className={TH}>Sections</th>
                          <th className={TH_NUMBER}>Words</th>
                          <th className={TH}>Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {data.manuscripts.map((draft) => {
                          const percent =
                            draft.sections === 0
                              ? 0
                              : Math.round((draft.sectionsComplete / draft.sections) * 100);
                          return (
                            <tr key={draft.id}>
                              <td className={TD}>
                                <Link
                                  href={`/notebooks/${draft.notebookId}/manuscripts/${draft.id}`}
                                  className="font-medium text-ink underline-offset-2 hover:text-accent-ink hover:underline"
                                >
                                  {draft.title}
                                </Link>
                              </td>
                              <td className={TD}>
                                <Link
                                  href={`/notebooks/${draft.notebookId}`}
                                  className="text-ink-2 underline-offset-2 hover:text-accent-ink hover:underline"
                                >
                                  {draft.notebookTitle}
                                </Link>
                              </td>
                              <td className={TD}>{draft.createdByName}</td>
                              <td className={TD}>
                                <span className="flex flex-wrap items-center gap-1.5">
                                  <Badge>{draft.kind}</Badge>
                                  <Badge tone="accent">{labelOf(STUDY_TYPES, draft.studyType)}</Badge>
                                </span>
                              </td>
                              <td className={TD}>{draft.status}</td>
                              <td className={TD}>
                                <span className="flex items-center gap-2">
                                  <MiniMeter percent={percent} tone={percent === 100 ? "good" : "accent"} />
                                  <span className="font-mono text-[11.5px] text-muted">
                                    {draft.sectionsComplete}/{draft.sections}
                                  </span>
                                </span>
                              </td>
                              <td className={TD_NUMBER}>{numberFormat.format(draft.words)}</td>
                              <td className={cn(TD, "text-muted")}>{shortDate(draft.updatedAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ) : null}

            <p className="mt-4 font-mono text-[11px] text-muted">
              Read at {new Date(data.generatedAt).toLocaleString()} · signed in as {data.viewer.email}
            </p>
          </>
        )}
      </PageBody>
    </>
  );
}
