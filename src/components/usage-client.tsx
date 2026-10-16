"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Coins } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  MiniMeter,
  Select,
  Spinner,
  Stat,
} from "@/components/ui";
import { ApiError, getJson } from "@/lib/client";
import { formatUsd } from "@/lib/utils";

type UsageResponse = {
  window: { days: number; since: string };
  totals: {
    runs: number;
    costUsd: number;
    promptTokens: number;
    completionTokens: number;
    failures: number;
  };
  byFeature: { feature: string; runs: number; cost: number }[];
  byModel: { model: string; provider: string; runs: number; cost: number }[];
  recent: {
    id: string;
    feature: string;
    model: string;
    costUsd: number;
    latencyMs: number;
    ok: boolean;
    errorText: string | null;
    createdAt: string;
    notebookId: string | null;
  }[];
};

const WINDOWS = [7, 30, 90, 180] as const;

const FEATURE_LABELS: Record<string, string> = {
  "article-review": "Article review",
  "manuscript-section": "Manuscript drafting",
  research: "Grounded research",
  synthesis: "Evidence synthesis",
  chat: "Supervisor chat",
  compliance: "Guideline audit",
};

function featureLabel(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature;
}

function usd4(value: number): string {
  return value === 0 ? "$0.00" : `$${value.toFixed(4)}`;
}

const tokenFormat = new Intl.NumberFormat("en-US");

export function UsageClient() {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getJson<UsageResponse>(`/api/usage?days=${days}`);
      setData(result);
      setError(null);
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not load your cost ledger.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = data?.totals;

  return (
    <>
      <PageHeader
        eyebrow="Cost & usage"
        title="What the AI has cost you"
        subtitle="Every model call is metered: feature, model, tokens and latency are recorded so your spend stays auditable. The studio defaults to cost-conscious models behind a fallback chain."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Cost & usage" }]}
        actions={
          <Select
            value={String(days)}
            onChange={(event) => setDays(Number(event.target.value))}
            className="w-44"
            aria-label="Usage window"
          >
            {WINDOWS.map((window) => (
              <option key={window} value={window}>
                Last {window} days
              </option>
            ))}
          </Select>
        }
      />

      <PageBody>
        {error && !data ? (
          <Alert
            tone="bad"
            title="Could not load your usage"
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
              <Spinner className="size-4" /> Loading your cost ledger…
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Stat
                label="Total spend"
                value={usd4(totals?.costUsd ?? 0)}
                sub={`Last ${data.window.days} days`}
              />
              <Stat label="Model calls" value={tokenFormat.format(totals?.runs ?? 0)} sub="Metered requests" />
              <Stat
                label="Tokens in"
                value={tokenFormat.format(totals?.promptTokens ?? 0)}
                sub="Prompt tokens billed"
              />
              <Stat
                label="Tokens out"
                value={tokenFormat.format(totals?.completionTokens ?? 0)}
                sub="Completion tokens billed"
              />
              <Stat
                label="Failures"
                value={tokenFormat.format(totals?.failures ?? 0)}
                sub="Calls that errored"
                tone={(totals?.failures ?? 0) > 0 ? "warn" : "neutral"}
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader
                  eyebrow="Breakdown"
                  title="Spend by feature"
                  description="Where the model budget went inside the studio."
                />
                {data.byFeature.length === 0 ? (
                  <EmptyState
                    icon={<Coins className="size-7" />}
                    title="No metered calls in this window"
                    description="Run a review, a draft or a research query and its cost will appear here."
                  />
                ) : (
                  <div className="scroll-thin overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-line text-left">
                          <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Feature
                          </th>
                          <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Calls
                          </th>
                          <th className="px-5 py-2.5 text-right font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Cost
                          </th>
                          <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Share
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {data.byFeature.map((row) => {
                          const percent =
                            (totals?.costUsd ?? 0) > 0
                              ? Math.round((row.cost / (totals?.costUsd ?? 1)) * 100)
                              : 0;
                          return (
                            <tr key={row.feature}>
                              <td className="px-5 py-3 text-[13px] text-ink">{featureLabel(row.feature)}</td>
                              <td className="px-5 py-3 font-mono text-[12.5px] tabular-nums text-ink-2">
                                {tokenFormat.format(row.runs)}
                              </td>
                              <td className="px-5 py-3 text-right font-mono text-[12.5px] tabular-nums text-ink-2">
                                {formatUsd(row.cost)}
                              </td>
                              <td className="px-5 py-3">
                                <MiniMeter percent={percent} tone="accent" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader
                  eyebrow="Breakdown"
                  title="Spend by model"
                  description="Which model served each call, and what it charged."
                />
                {data.byModel.length === 0 ? (
                  <EmptyState
                    icon={<Coins className="size-7" />}
                    title="No models used yet"
                    description="Once a model answers a request, its provider and running cost will be listed here."
                  />
                ) : (
                  <div className="scroll-thin overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-line text-left">
                          <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Model
                          </th>
                          <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Provider
                          </th>
                          <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Calls
                          </th>
                          <th className="px-5 py-2.5 text-right font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Cost
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {data.byModel.map((row) => (
                          <tr key={`${row.model}-${row.provider}`}>
                            <td className="px-5 py-3">
                              <span
                                className="block max-w-[240px] truncate font-mono text-[12.5px] text-ink-2"
                                title={row.model}
                              >
                                {row.model}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <Badge tone="accent">{row.provider}</Badge>
                            </td>
                            <td className="px-5 py-3 font-mono text-[12.5px] tabular-nums text-ink-2">
                              {tokenFormat.format(row.runs)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-[12.5px] tabular-nums text-ink-2">
                              {formatUsd(row.cost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader
                eyebrow="Ledger"
                title="Recent calls"
                description="The 40 most recent model calls, newest first."
              />
              {data.recent.length === 0 ? (
                <EmptyState
                  icon={<Coins className="size-7" />}
                  title="Nothing recorded yet"
                  description="Model calls made from any notebook will show up in this ledger."
                />
              ) : (
                <div className="scroll-thin overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-line text-left">
                        <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                          Time
                        </th>
                        <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                          Feature
                        </th>
                        <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                          Model
                        </th>
                        <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                          Latency
                        </th>
                        <th className="px-5 py-2.5 text-right font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                          Cost
                        </th>
                        <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {data.recent.map((run) => (
                        <Fragment key={run.id}>
                          <tr>
                            <td className="px-5 py-3 align-top text-[12.5px] text-muted">
                              {new Date(run.createdAt).toLocaleString()}
                            </td>
                            <td className="px-5 py-3 align-top text-[13px] text-ink-2">
                              {featureLabel(run.feature)}
                            </td>
                            <td className="px-5 py-3 align-top">
                              <span
                                className="block max-w-[220px] truncate font-mono text-[12.5px] text-ink-2"
                                title={run.model}
                              >
                                {run.model}
                              </span>
                            </td>
                            <td className="px-5 py-3 align-top font-mono text-[12.5px] tabular-nums text-muted">
                              {run.latencyMs} ms
                            </td>
                            <td className="px-5 py-3 align-top text-right font-mono text-[12.5px] tabular-nums text-ink-2">
                              {formatUsd(run.costUsd)}
                            </td>
                            <td className="px-5 py-3 align-top">
                              {run.ok ? (
                                <Badge tone="good">ok</Badge>
                              ) : (
                                <span title={run.errorText ?? undefined}>
                                  <Badge tone="bad">failed</Badge>
                                </span>
                              )}
                            </td>
                          </tr>
                          {!run.ok && run.errorText ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-5 pb-3 text-[12px] leading-relaxed text-bad"
                              >
                                {run.errorText}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Alert tone="neutral" className="mt-4">
              <span className="block">
                Calls are routed across three tiers: the <strong>grounded research tier</strong> performs
                built-in web search so literature claims come back with citations; the{" "}
                <strong>reasoning tier</strong> handles extraction and drafting; and the{" "}
                <strong>fast tier</strong> does cheap repair work. When a tier is unavailable the fallback
                chain moves to the next model.
              </span>
              <span className="mt-1.5 block">
                The chain and model names are configured in{" "}
                <code className="font-mono">.env.local</code> via{" "}
                <code className="font-mono">AI_PROVIDER</code>,{" "}
                <code className="font-mono">OPENROUTER_API_KEY</code>,{" "}
                <code className="font-mono">AI_MODEL_RESEARCH</code>,{" "}
                <code className="font-mono">AI_MODEL_REASONING</code>,{" "}
                <code className="font-mono">AI_MODEL_FAST</code> and{" "}
                <code className="font-mono">AI_FALLBACK_MODELS</code>.
              </span>
            </Alert>
          </>
        )}
      </PageBody>
    </>
  );
}
