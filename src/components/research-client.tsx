"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Modal } from "@/components/modal";
import { PageBody, PageHeader } from "@/components/page-header";
import { Prose } from "@/components/prose";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  SectionLabel,
  Select,
  Spinner,
  Stat,
  Textarea,
} from "@/components/ui";
import { ApiError, deleteJson, getJson, postJson, streamSse } from "@/lib/client";
import type { NotebookDetail, ResearchEntry, Synthesis } from "@/lib/types";
import { cn, formatDateTime, formatUsd } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Contracts                                                           */
/* ------------------------------------------------------------------ */

type ResearchIntent = "research" | "theory" | "methodology" | "gap" | "question";

type ResearchResult = {
  answer: string;
  keySources: { title: string; url: string }[];
  evidenceStrength: string;
  gaps: string[];
  nextSearches: string[];
};

type ResearchResponse = {
  entry: ResearchEntry;
  result: ResearchResult;
  model: string;
  usage: { costUsd: number } | null;
};

type SynthesisResponse = {
  entry: ResearchEntry;
  synthesis: Synthesis;
  model: string;
  usage: { costUsd: number } | null;
};

type Source = { title: string; url: string };

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  model?: string | null;
  costUsd?: number | null;
  failed?: boolean;
};

type TabId = "ask" | "synthesis" | "chat";

/* ------------------------------------------------------------------ */
/* Presentation constants                                              */
/* ------------------------------------------------------------------ */

const INTENT_OPTIONS: { value: ResearchIntent; label: string }[] = [
  { value: "research", label: "Literature search" },
  { value: "theory", label: "Theory / model" },
  { value: "methodology", label: "Method and analysis" },
  { value: "gap", label: "Gap in the literature" },
  { value: "question", label: "Research question" },
];

const INTENT_LABEL: Record<string, string> = {
  research: "Literature search",
  theory: "Theory / model",
  methodology: "Method and analysis",
  gap: "Gap in the literature",
  question: "Research question",
  synthesis: "Synthesis",
};

const TABS: { id: TabId; label: string; icon: typeof Search }[] = [
  { id: "ask", label: "Ask & record", icon: Search },
  { id: "synthesis", label: "Synthesise evidence", icon: Sparkles },
  { id: "chat", label: "Supervisor chat", icon: MessageSquare },
];

const SUGGESTED_PROMPTS = [
  "Where is my conceptual framework weakest?",
  "Which of my objectives is not adequately supported by my evidence matrix?",
  "Draft the first paragraph of the contextual background for my context.",
];

const TH = "px-3 py-2 text-left font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted";
const TD = "px-3 py-2.5 align-top text-[13px] text-ink-2";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function parseSynthesis(answer: string): Synthesis | null {
  try {
    const parsed = JSON.parse(answer) as Synthesis;
    if (parsed && typeof parsed.overview === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function AuthorChips({ authors }: { authors: string[] }) {
  if (!authors?.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {authors.map((author) => (
        <Badge key={author}>{author}</Badge>
      ))}
    </div>
  );
}

function SourceList({ sources }: { sources: Source[] }) {
  if (!sources?.length) {
    return <p className="text-[13px] text-muted">No sources were returned for this entry.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {sources.map((source, index) => (
        <li key={`${source.url}-${index}`} className="flex items-start gap-1.5 text-[13px] leading-relaxed">
          <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted" />
          {source.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 break-words"
            >
              <span className="font-medium text-accent-ink underline underline-offset-2">
                {source.title || source.url}
              </span>
              <span className="ml-1.5 font-mono text-[11px] text-muted">{source.url}</span>
            </a>
          ) : (
            <span className="text-ink-2">{source.title}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Synthesis view                                                      */
/* ------------------------------------------------------------------ */

function SynthesisView({ synthesis }: { synthesis: Synthesis }) {
  return (
    <div className="space-y-5">
      {synthesis.overview ? (
        <Card>
          <CardHeader eyebrow="Synthesis" title="Overview" />
          <div className="px-5 py-4">
            <Prose>{synthesis.overview}</Prose>
          </div>
        </Card>
      ) : null}

      {synthesis.themes?.length ? (
        <Card>
          <CardHeader
            eyebrow="Synthesis"
            title="Themes"
            description={`${synthesis.themes.length} cross-article theme${synthesis.themes.length === 1 ? "" : "s"} identified across the evidence matrix.`}
          />
          <div className="divide-y divide-line">
            {synthesis.themes.map((theme) => (
              <div key={theme.name} className="px-5 py-4">
                <h3 className="text-[14px] font-semibold tracking-tight text-ink">{theme.name}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{theme.summary}</p>
                <AuthorChips authors={theme.authors} />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {synthesis.theoryUsage?.length ? (
        <Card>
          <CardHeader eyebrow="Synthesis" title="Theories in use" />
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className={TH}>
                    Theory
                  </th>
                  <th scope="col" className={cn(TH, "w-20 text-right")}>
                    Studies
                  </th>
                  <th scope="col" className={TH}>
                    Authors
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {synthesis.theoryUsage.map((row) => (
                  <tr key={row.theory}>
                    <td className={cn(TD, "font-medium text-ink")}>{row.theory}</td>
                    <td className={cn(TD, "text-right font-mono tabular-nums")}>{row.count}</td>
                    <td className={TD}>{row.authors?.length ? row.authors.join(", ") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {synthesis.methodDistribution?.length ? (
        <Card>
          <CardHeader eyebrow="Synthesis" title="Method distribution" />
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className={TH}>
                    Method
                  </th>
                  <th scope="col" className={cn(TH, "w-20 text-right")}>
                    Studies
                  </th>
                  <th scope="col" className={TH}>
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {synthesis.methodDistribution.map((row) => (
                  <tr key={row.method}>
                    <td className={cn(TD, "font-medium text-ink")}>{row.method}</td>
                    <td className={cn(TD, "text-right font-mono tabular-nums")}>{row.count}</td>
                    <td className={TD}>{row.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {synthesis.contexts?.length ? (
        <Card>
          <CardHeader eyebrow="Synthesis" title="Contexts studied" />
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className={TH}>
                    Context
                  </th>
                  <th scope="col" className={cn(TH, "w-20 text-right")}>
                    Studies
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {synthesis.contexts.map((row) => (
                  <tr key={row.context}>
                    <td className={cn(TD, "font-medium text-ink")}>{row.context}</td>
                    <td className={cn(TD, "text-right font-mono tabular-nums")}>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {synthesis.consensus?.length ? (
        <Card>
          <CardHeader eyebrow="Synthesis" title="Points of consensus" />
          <ul className="list-disc space-y-3 px-5 py-4 pl-9">
            {synthesis.consensus.map((point) => (
              <li key={point.statement} className="text-[13.5px] leading-relaxed text-ink-2">
                <span>{point.statement}</span>
                <AuthorChips authors={point.authors} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {synthesis.contradictions?.length ? (
        <Card>
          <CardHeader eyebrow="Synthesis" title="Contradictions" />
          <div className="divide-y divide-line">
            {synthesis.contradictions.map((item) => (
              <div key={item.statement} className="px-5 py-4">
                <h3 className="text-[14px] font-semibold tracking-tight text-ink">{item.statement}</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-sm border border-line bg-paper-2 px-3.5 py-2.5">
                    <SectionLabel>One side</SectionLabel>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-ink-2">
                      {item.sideA?.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-sm border border-line bg-paper-2 px-3.5 py-2.5">
                    <SectionLabel>The other side</SectionLabel>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-ink-2">
                      {item.sideB?.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {item.explanation ? (
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">{item.explanation}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {synthesis.gaps?.length ? (
        <Card>
          <CardHeader eyebrow="Synthesis" title="Gaps and opportunities" />
          <div className="divide-y divide-line">
            {synthesis.gaps.map((item) => (
              <div key={item.gap} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[14px] font-semibold tracking-tight text-ink">{item.gap}</h3>
                  {item.type ? <Badge tone="warn">{item.type}</Badge> : null}
                </div>
                {item.evidence ? (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{item.evidence}</p>
                ) : null}
                {item.opportunity ? (
                  <div className="mt-2 rounded-sm border border-accent/25 bg-accent-soft px-3.5 py-2.5">
                    <SectionLabel className="text-accent-ink">Opportunity</SectionLabel>
                    <p className="mt-1 text-[13px] leading-relaxed text-accent-ink">{item.opportunity}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {synthesis.researchQuestions?.length ? (
        <Card>
          <CardHeader eyebrow="Synthesis" title="Candidate research questions" />
          <ol className="list-decimal space-y-2 px-5 py-4 pl-9 text-[13.5px] leading-relaxed text-ink-2">
            {synthesis.researchQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </Card>
      ) : null}

      {synthesis.hypotheses?.length ? (
        <Card>
          <CardHeader eyebrow="Synthesis" title="Candidate hypotheses" />
          <div className="divide-y divide-line">
            {synthesis.hypotheses.map((item) => (
              <div key={item.label} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{item.label}</Badge>
                  <p className="text-[13.5px] leading-relaxed text-ink-2">{item.statement}</p>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-sm border border-line bg-paper-2 px-3.5 py-2.5">
                    <SectionLabel>Independent</SectionLabel>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{item.independent}</p>
                  </div>
                  <div className="rounded-sm border border-line bg-paper-2 px-3.5 py-2.5">
                    <SectionLabel>Dependent</SectionLabel>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{item.dependent}</p>
                  </div>
                </div>
                {item.rationale ? (
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">{item.rationale}</p>
                ) : null}
                <AuthorChips authors={item.authors} />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {synthesis.recommendedOutline?.length ? (
        <Card>
          <CardHeader eyebrow="Synthesis" title="Recommended outline" />
          <div className="divide-y divide-line">
            {synthesis.recommendedOutline.map((item) => (
              <div key={item.section} className="px-5 py-4">
                <h3 className="text-[14px] font-semibold tracking-tight text-ink">{item.section}</h3>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-ink-2">
                  {item.keyPoints?.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main client                                                         */
/* ------------------------------------------------------------------ */

export function ResearchClient() {
  const { id } = useParams<{ id: string }>();

  const [detail, setDetail] = useState<NotebookDetail | null>(null);
  const [queries, setQueries] = useState<ResearchEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("ask");

  /* Tab A — ask & record */
  const [intent, setIntent] = useState<ResearchIntent>("research");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [resultModel, setResultModel] = useState<string | null>(null);
  const [resultCost, setResultCost] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ResearchEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /* Tab B — synthesis */
  const [focus, setFocus] = useState("");
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthError, setSynthError] = useState<string | null>(null);
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [synthMeta, setSynthMeta] = useState<{ model: string | null; createdAt: string } | null>(null);

  /* Tab C — supervisor chat */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [detailData, researchData] = await Promise.all([
        getJson<NotebookDetail>(`/api/notebooks/${id}`),
        getJson<{ queries: ResearchEntry[] }>(`/api/notebooks/${id}/research`),
      ]);
      setDetail(detailData);
      setQueries(researchData.queries ?? []);
      setLoadError(null);
    } catch (thrown) {
      setLoadError(messageOf(thrown, "Could not open the research workspace."));
      setQueries([]);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
  }, [messages]);

  const canEdit = detail ? detail.role !== "viewer" : false;

  const sortedQueries = useMemo(
    () =>
      [...(queries ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [queries],
  );
  const logQueries = useMemo(() => sortedQueries.filter((entry) => entry.intent !== "synthesis"), [sortedQueries]);
  const synthesisEntries = useMemo(
    () => sortedQueries.filter((entry) => entry.intent === "synthesis"),
    [sortedQueries],
  );

  const newestId = logQueries[0]?.id ?? null;

  /* --------------------------- Tab A --------------------------- */

  const ask = async () => {
    const trimmed = question.trim();
    if (trimmed.length < 8 || asking) return;
    setAsking(true);
    setAskError(null);
    setResult(null);
    try {
      const response = await postJson<ResearchResponse>(`/api/notebooks/${id}/research`, {
        question: trimmed,
        intent,
      });
      setResult(response.result);
      setResultModel(response.model);
      setResultCost(response.usage?.costUsd ?? 0);
      setExpanded((prev) => ({ ...prev, [response.entry.id]: true }));
      await load();
    } catch (thrown) {
      setAskError(messageOf(thrown, "The grounded search did not return an answer. Try again."));
    } finally {
      setAsking(false);
    }
  };

  const copyEntry = async (entry: ResearchEntry) => {
    try {
      await navigator.clipboard.writeText(`${entry.question}\n\n${entry.answer}`);
      setCopiedId(entry.id);
      window.setTimeout(() => setCopiedId((current) => (current === entry.id ? null : current)), 1800);
    } catch {
      setCopiedId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteJson(`/api/notebooks/${id}/research`, { queryId: pendingDelete.id });
      setPendingDelete(null);
      await load();
    } catch (thrown) {
      setDeleteError(messageOf(thrown, "Could not delete this entry."));
    } finally {
      setDeleting(false);
    }
  };

  /* --------------------------- Tab B --------------------------- */

  const runSynthesis = async () => {
    if (synthesizing) return;
    setSynthesizing(true);
    setSynthError(null);
    try {
      const response = await postJson<SynthesisResponse>(`/api/notebooks/${id}/synthesis`, {
        focus: focus.trim() || null,
      });
      setSynthesis(response.synthesis);
      setSynthMeta({ model: response.model, createdAt: response.entry.createdAt });
      await load();
    } catch (thrown) {
      setSynthError(messageOf(thrown, "The synthesis could not be written. Try again."));
    } finally {
      setSynthesizing(false);
    }
  };

  const loadLastSynthesis = () => {
    const last = synthesisEntries[0];
    if (!last) return;
    const parsed = parseSynthesis(last.answer);
    if (!parsed) {
      setSynthError("The most recent synthesis could not be read. Run a new synthesis to regenerate it.");
      return;
    }
    setSynthesis(parsed);
    setSynthMeta({ model: last.model, createdAt: last.createdAt });
    setSynthError(null);
  };

  /* --------------------------- Tab C --------------------------- */

  const sendMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || streaming) return;

    const history = messages.slice(-20).map((message) => ({ role: message.role, content: message.content }));
    const placeholderIndex = messages.length + 1;

    setMessages([...messages, { role: "user", content: trimmed }, { role: "assistant", content: "" }]);
    setChatInput("");
    setStreaming(true);
    setChatError(null);

    const patchLast = (patch: Partial<ChatMessage>) =>
      setMessages((prev) =>
        prev.map((message, index) => (index === placeholderIndex ? { ...message, ...patch } : message)),
      );

    await streamSse(
      `/api/notebooks/${id}/assistant`,
      { question: trimmed, history },
      {
        onDelta: (text) =>
          setMessages((prev) =>
            prev.map((message, index) =>
              index === placeholderIndex ? { ...message, content: message.content + text } : message,
            ),
          ),
        onDone: (frame) => patchLast({ model: frame.model, costUsd: frame.usage?.costUsd ?? 0 }),
        onError: (message) => {
          setChatError(message);
          patchLast({ content: message, failed: true });
        },
      },
    );

    setStreaming(false);
  };

  const clearConversation = () => {
    setMessages([]);
    setChatError(null);
  };

  /* --------------------------- render -------------------------- */

  const header = (
    <PageHeader
      eyebrow="Research & synthesis"
      title={detail?.notebook.title ?? "Research log"}
      subtitle="Grounded literature answers, the cross-article synthesis and the supervisor chat are all scoped to this notebook and its evidence matrix."
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: detail?.notebook.title ?? "Notebook", href: `/notebooks/${id}` },
        { label: "Research & synthesis" },
      ]}
    >
      <div className="inline-flex flex-wrap gap-0.5 rounded-sm border border-line-2 bg-paper-2 p-0.5">
        {TABS.map((item) => (
          <Button
            key={item.id}
            variant={tab === item.id ? "primary" : "ghost"}
            size="sm"
            className="rounded-xs"
            onClick={() => setTab(item.id)}
          >
            <item.icon className="size-3.5" />
            {item.label}
          </Button>
        ))}
      </div>
    </PageHeader>
  );

  if (queries === null && !loadError) {
    return (
      <>
        {header}
        <PageBody>
          <div className="flex items-center justify-center gap-2 rounded-md border border-line bg-card px-5 py-16 text-[13px] text-muted">
            <Spinner className="size-4" /> Opening the research workspace…
          </div>
        </PageBody>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        {header}
        <PageBody>
          <Alert tone="bad" title="Could not open the research workspace">
            {loadError}{" "}
            <Link href="/dashboard" className="text-accent-ink underline underline-offset-2">
              Back to your dashboard
            </Link>
            .
          </Alert>
        </PageBody>
      </>
    );
  }

  return (
    <>
      {header}

      <PageBody>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Article reviews" value={detail?.stats.reviews ?? 0} sub="Rows in the evidence matrix" />
          <Stat label="Manuscripts" value={detail?.stats.manuscripts ?? 0} sub="Drafts in this notebook" />
          <Stat
            label="Research queries"
            value={detail?.stats.researchQueries ?? 0}
            sub="Grounded questions recorded"
          />
          <Stat label="AI spend" value={formatUsd(detail?.stats.spendUsd ?? 0)} sub="Metered model calls" />
        </div>

        {!canEdit ? (
          <Alert tone="warn" title="Read-only access" className="mt-5">
            You are a viewer in this notebook, so the synthesis and the supervisor chat are read-only. Ask the owner to
            grant editor access to run them.
          </Alert>
        ) : null}

        <div className="mt-6">
          {tab === "ask" ? (
            <div className="space-y-6">
              <Card>
                <CardHeader
                  eyebrow="Grounded search"
                  title="Ask the literature"
                  description="The answer is grounded in a live web search and recorded in this notebook's research log."
                />
                <div className="space-y-4 px-5 py-4">
                  <Field label="Intent" hint="Choose the kind of question so the answer is framed correctly.">
                    <Select
                      value={intent}
                      onChange={(event) => setIntent(event.target.value as ResearchIntent)}
                      className="w-full sm:w-72"
                    >
                      {INTENT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field
                    label="Research question"
                    counter={`${question.trim().length} characters`}
                    hint="A fuller question — with your context, theory and population — produces a better grounded answer. At least 8 characters."
                  >
                    <Textarea
                      rows={3}
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="e.g. How has servant leadership been measured in emerging-market public-sector studies since 2015?"
                    />
                  </Field>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      onClick={ask}
                      loading={asking}
                      disabled={!canEdit || asking || question.trim().length < 8}
                    >
                      <Search className="size-4" />
                      Ask and record
                    </Button>
                  </div>

                  {asking ? (
                    <div className="flex items-center gap-2 rounded-sm border border-accent/25 bg-accent-soft px-3.5 py-3 text-[12.5px] text-accent-ink">
                      <Spinner className="size-4" />
                      Searching the literature and grounding the answer — this can take up to a minute…
                    </div>
                  ) : null}

                  {askError ? <Alert tone="bad">{askError}</Alert> : null}
                </div>
              </Card>

              {result ? (
                <Card>
                  <CardHeader
                    eyebrow="Latest answer"
                    title="Grounded result"
                    description="Recorded in the research log below."
                  />
                  <div className="space-y-4 px-5 py-4">
                    <Prose>{result.answer}</Prose>

                    <div className="flex flex-wrap items-center gap-2">
                      <SectionLabel>Evidence strength</SectionLabel>
                      <Badge tone="accent">{result.evidenceStrength || "Not stated"}</Badge>
                    </div>

                    <div>
                      <SectionLabel>Key sources</SectionLabel>
                      <div className="mt-2">
                        <SourceList sources={result.keySources ?? []} />
                      </div>
                    </div>

                    {result.gaps?.length ? (
                      <div>
                        <SectionLabel>Gaps identified</SectionLabel>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-ink-2">
                          {result.gaps.map((gap) => (
                            <li key={gap}>{gap}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {result.nextSearches?.length ? (
                      <div>
                        <SectionLabel>Suggested next searches</SectionLabel>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {result.nextSearches.map((next) => (
                            <Badge key={next} tone="neutral">
                              {next}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <p className="border-t border-line pt-3 font-mono text-[11px] text-muted">
                      {resultModel ?? "unknown model"} · {formatUsd(resultCost)}
                    </p>
                  </div>
                </Card>
              ) : null}

              <div>
                <SectionLabel>Research log</SectionLabel>
                <div className="mt-3 space-y-3">
                  {logQueries.length === 0 ? (
                    <Card>
                      <EmptyState
                        icon={<BookOpen className="size-6" />}
                        title="No research entries yet"
                        description="Ask your first grounded question above and it will be recorded here with its sources, gaps and suggested next searches."
                      />
                    </Card>
                  ) : (
                    logQueries.map((entry) => {
                      const isExpanded = expanded[entry.id] ?? entry.id === newestId;
                      return (
                        <Card key={entry.id} className="overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((prev) => ({ ...prev, [entry.id]: !isExpanded }))
                            }
                            className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-paper-2"
                          >
                            <span className="mt-0.5 shrink-0 text-muted">
                              {isExpanded ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <Badge tone="accent">{INTENT_LABEL[entry.intent] ?? entry.intent}</Badge>
                                <span className="font-mono text-[11px] text-muted">
                                  {new Date(entry.createdAt).toLocaleString()}
                                </span>
                              </span>
                              <span className="mt-1 block text-[13.5px] font-medium text-ink">
                                {entry.question}
                              </span>
                            </span>
                          </button>

                          {isExpanded ? (
                            <div className="space-y-3 border-t border-line px-4 py-4">
                              <Prose compact>{entry.answer}</Prose>

                              {entry.citations?.length ? (
                                <div>
                                  <SectionLabel>Citations</SectionLabel>
                                  <div className="mt-2">
                                    <SourceList sources={entry.citations} />
                                  </div>
                                </div>
                              ) : null}

                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <Button variant="ghost" size="sm" onClick={() => void copyEntry(entry)}>
                                  {copiedId === entry.id ? (
                                    <>
                                      <Check className="size-3.5" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="size-3.5" />
                                      Copy to notes
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setDeleteError(null);
                                    setPendingDelete(entry);
                                  }}
                                  disabled={!canEdit}
                                >
                                  <Trash2 className="size-3.5" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {tab === "synthesis" ? (
            <div className="space-y-6">
              <Card>
                <CardHeader
                  eyebrow="Cross-article synthesis"
                  title="Synthesise the evidence"
                  description="The synthesis reads every completed row of the evidence matrix and reports themes, theory usage, method distribution, consensus, contradictions and gaps."
                />
                <div className="space-y-4 px-5 py-4">
                  <Field
                    label="Focus (optional)"
                    hint="Nudge the synthesis — e.g. 'emphasise methodological gaps in emerging-market studies'."
                  >
                    <Input
                      value={focus}
                      onChange={(event) => setFocus(event.target.value)}
                      placeholder="Focus on…"
                      className="w-full sm:w-96"
                    />
                  </Field>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      onClick={runSynthesis}
                      loading={synthesizing}
                      disabled={!canEdit || synthesizing}
                    >
                      <Sparkles className="size-4" />
                      Run synthesis
                    </Button>
                    {synthesisEntries.length ? (
                      <Button variant="ghost" onClick={loadLastSynthesis}>
                        Load the last synthesis
                      </Button>
                    ) : null}
                  </div>

                  {synthesizing ? (
                    <div className="flex items-center gap-2 rounded-sm border border-accent/25 bg-accent-soft px-3.5 py-3 text-[12.5px] text-accent-ink">
                      <Spinner className="size-4" />
                      Reading the matrix and writing the synthesis — this can take a couple of minutes…
                    </div>
                  ) : null}

                  {synthError ? <Alert tone="bad">{synthError}</Alert> : null}
                </div>
              </Card>

              {synthesis ? (
                <div className="space-y-4">
                  {synthMeta ? (
                    <p className="font-mono text-[11px] text-muted">
                      generated {formatDateTime(synthMeta.createdAt)} · model {synthMeta.model ?? "—"}
                    </p>
                  ) : null}
                  <SynthesisView synthesis={synthesis} />
                </div>
              ) : (
                <Card>
                  <EmptyState
                    icon={<Sparkles className="size-6" />}
                    title="No synthesis yet"
                    description="Run a synthesis to read every completed article review at once and produce themes, contradictions, gaps, candidate questions and hypotheses."
                    action={
                      <Button variant="primary" onClick={runSynthesis} loading={synthesizing} disabled={!canEdit || synthesizing}>
                        <Sparkles className="size-4" />
                        Run the first synthesis
                      </Button>
                    }
                  />
                </Card>
              )}
            </div>
          ) : null}

          {tab === "chat" ? (
            <div className="space-y-4">
              <Card>
                <CardHeader
                  eyebrow="Supervisor chat"
                  title="Discuss your work"
                  description="The supervisor answers as a critical PhD supervisor with access to this notebook's evidence matrix and research log."
                  action={
                    <Button variant="ghost" size="sm" onClick={clearConversation} disabled={!messages.length}>
                      Clear the conversation
                    </Button>
                  }
                />

                <div ref={transcriptRef} className="scroll-thin max-h-[520px] overflow-y-auto px-5 py-4">
                  {messages.length === 0 ? (
                    <div className="rounded-md border border-dashed border-line-2 bg-paper-2/40 px-5 py-6">
                      <div className="flex items-center gap-2 text-muted">
                        <MessageSquare className="size-5" />
                        <p className="text-[13px] font-medium text-ink-2">Start a conversation with your supervisor</p>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                        Try one of these prompts, or write your own:
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {SUGGESTED_PROMPTS.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => setChatInput(prompt)}
                            className="rounded-xs border border-line-2 bg-card px-2 py-1 text-left text-[12.5px] text-ink-2 transition-colors hover:border-accent/40 hover:text-accent-ink"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, index) => {
                        const isStreamingLast =
                          streaming && index === messages.length - 1 && message.role === "assistant";

                        if (message.role === "user") {
                          return (
                            <div key={index} className="flex justify-end">
                              <div className="max-w-[85%] rounded-sm bg-accent-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-accent-ink">
                                {message.content}
                              </div>
                            </div>
                          );
                        }

                        if (message.failed) {
                          return (
                            <div key={index} className="max-w-[92%]">
                              <Alert tone="bad">{message.content}</Alert>
                            </div>
                          );
                        }

                        return (
                          <div key={index} className="max-w-[92%]">
                            <div className="rounded-md border border-line bg-card px-4 py-3">
                              {message.content ? (
                                <Prose compact>{message.content}</Prose>
                              ) : (
                                <Spinner className="size-4 text-muted" />
                              )}
                              {isStreamingLast && message.content ? (
                                <div className="mt-2 flex items-center gap-2 text-[11.5px] text-muted">
                                  <Spinner className="size-3" /> writing…
                                </div>
                              ) : null}
                            </div>
                            {message.model ? (
                              <p className="mt-1.5 font-mono text-[11px] text-muted">
                                {message.model} · {formatUsd(message.costUsd ?? 0)}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t border-line px-5 py-4">
                  {chatError ? <Alert tone="bad">{chatError}</Alert> : null}
                  <Textarea
                    rows={2}
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder="Ask the supervisor… (Enter to send, Shift+Enter for a new line)"
                    disabled={!canEdit}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11.5px] text-muted">
                      Enter sends the message. Shift+Enter adds a new line.
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => void sendMessage()}
                      loading={streaming}
                      disabled={!canEdit || streaming || !chatInput.trim()}
                    >
                      <Send className="size-4" />
                      Ask the supervisor
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      </PageBody>

      {/* Delete confirmation --------------------------------------- */}
      <Modal
        open={pendingDelete !== null}
        onClose={() => {
          if (deleting) return;
          setPendingDelete(null);
          setDeleteError(null);
        }}
        title="Delete this research entry?"
        description="The question, its grounded answer and its citations are removed from this notebook permanently."
        footer={
          <>
            <Button
              onClick={() => {
                setPendingDelete(null);
                setDeleteError(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              Delete entry
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          {pendingDelete ? <strong>{pendingDelete.question}</strong> : null}
        </p>
        {deleteError ? (
          <Alert tone="bad" className="mt-3">
            {deleteError}
          </Alert>
        ) : null}
      </Modal>
    </>
  );
}
