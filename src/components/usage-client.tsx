"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { ApiError, getJson, postJson } from "@/lib/client";
import { formatTokens } from "@/lib/utils";

type TokenPack = {
  id: string;
  name: string;
  tokens: number;
  priceUsd: number;
  blurb: string;
};

type TokensResponse = {
  balance: number;
  packs: TokenPack[];
  checkout: { currency: string; usdRate: number };
  byFeature: { feature: string; tokens: number; calls: number }[];
  ledger: {
    id: string;
    kind: string;
    tokens: number;
    status: string;
    amountMinor: number | null;
    currency: string | null;
    feature: string | null;
    note: string | null;
    createdAt: string;
  }[];
};

type UsageResponse = {
  window: { days: number };
  totals: { runs: number; tokensSpent: number; failures: number };
  byModel: { model: string; provider: string; runs: number; tokens: number }[];
  recent: {
    id: string;
    feature: string;
    model: string;
    tokens: number;
    latencyMs: number;
    ok: boolean;
    errorText: string | null;
    createdAt: string;
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

const LEDGER_LABELS: Record<string, string> = {
  "starter-grant": "Welcome grant",
  "admin-grant": "Administrator grant",
  purchase: "Pack purchase",
  spend: "Model calls",
};

function featureLabel(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature;
}

const tokenFormat = new Intl.NumberFormat("en-US");

function money(amountMinor: number | null, currency: string | null): string {
  if (amountMinor === null || !currency) return "—";
  const symbols: Record<string, string> = { GHS: "GH₵", NGN: "₦", USD: "$", ZAR: "R" };
  return `${symbols[currency] ?? `${currency} `}${(amountMinor / 100).toFixed(2)}`;
}

export function UsageClient() {
  const searchParams = useSearchParams();
  const [days, setDays] = useState<number>(30);
  const [tokens, setTokens] = useState<TokensResponse | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tokenData, usageData] = await Promise.all([
        getJson<TokensResponse>("/api/tokens"),
        getJson<UsageResponse>(`/api/usage?days=${days}`).catch(() => null),
      ]);
      setTokens(tokenData);
      setUsage(usageData);
      setError(null);
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not load your token account.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  // Returning from Paystack: confirm the reference and refresh the balance.
  const verifyReturn = useCallback(async (reference: string) => {
    try {
      const result = await getJson<{ status: string; balance: number }>(
        `/api/tokens/verify?reference=${encodeURIComponent(reference)}`,
      );
      setNotice(
        result.status === "confirmed"
          ? `Payment confirmed — your balance is now ${tokenFormat.format(result.balance)} tokens.`
          : "The payment is still processing. Your tokens will appear once Paystack confirms it.",
      );
    } catch {
      setNotice("We could not verify that payment yet. If you completed it, the tokens will arrive by webhook.");
    }
  }, []);

  useEffect(() => {
    void load();
    const reference = searchParams.get("ref");
    if (reference) void verifyReturn(reference);
  }, [load, verifyReturn, searchParams]);

  const buy = async (pack: TokenPack) => {
    setBuying(pack.id);
    setError(null);
    try {
      const result = await postJson<{ authorizationUrl: string }>("/api/tokens/checkout", {
        packId: pack.id,
      });
      window.location.href = result.authorizationUrl;
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not start the checkout. Try again.");
      setBuying(null);
    }
  };

  const totals = usage?.totals;
  const totalFeatureTokens = (tokens?.byFeature ?? []).reduce((sum, row) => sum + row.tokens, 0);

  return (
    <>
      <PageHeader
        eyebrow="Tokens & usage"
        title="Your token account"
        subtitle="Every model call is charged in tokens — one token per model token, metered after the answer arrives. Packs are paid through Paystack."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Tokens & usage" }]}
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
        {notice ? (
          <Alert
            tone="good"
            title="Payment"
            className="mb-4"
            action={
              <Button size="sm" variant="ghost" onClick={() => setNotice(null)}>
                Dismiss
              </Button>
            }
          >
            {notice}
          </Alert>
        ) : null}

        {error ? (
          <Alert
            tone="bad"
            title="Something went wrong"
            className="mb-4"
            action={
              <Button size="sm" variant="ghost" onClick={() => setError(null)}>
                Dismiss
              </Button>
            }
          >
            {error}
          </Alert>
        ) : null}

        {loading || !tokens ? (
          <Card>
            <div className="flex items-center justify-center gap-2 px-5 py-16 text-[13px] text-muted">
              <Spinner className="size-4" /> Loading your token account…
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Token balance"
                value={tokenFormat.format(tokens.balance)}
                sub={tokens.balance > 0 ? "Spendable now" : "Top up to keep working"}
                tone={tokens.balance > 0 ? "neutral" : "warn"}
              />
              <Stat
                label="Tokens spent"
                value={tokenFormat.format(totals?.tokensSpent ?? 0)}
                sub={`Last ${usage?.window.days ?? days} days`}
              />
              <Stat label="Model calls" value={tokenFormat.format(totals?.runs ?? 0)} sub="Metered and answered" />
              <Stat
                label="Failed calls"
                value={tokenFormat.format(totals?.failures ?? 0)}
                sub="Charged nothing"
                tone={(totals?.failures ?? 0) > 0 ? "warn" : "neutral"}
              />
            </div>

            <Card className="mt-6">
              <CardHeader
                eyebrow="Top up"
                title="Token packs"
                description="Prepaid packs, paid once through Paystack. Failed model calls are never charged."
              />
              <div className="grid gap-3 px-5 py-4 md:grid-cols-3">
                {tokens.packs.map((pack) => (
                  <div
                    key={pack.id}
                    className="flex flex-col rounded-sm border border-line bg-paper-2 px-4 py-4"
                  >
                    <p className="text-[13px] font-medium text-ink">{pack.name}</p>
                    <p className="mt-2 font-mono text-[22px] tabular-nums leading-none text-ink">
                      {tokenFormat.format(pack.tokens)}
                    </p>
                    <p className="mt-1 text-[11.5px] text-muted">tokens</p>
                    <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">{pack.blurb}</p>
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <span className="font-mono text-[15px] tabular-nums text-ink">
                        ${pack.priceUsd}
                        {tokens.checkout.currency !== "USD" ? (
                          <span className="ml-2 text-[11.5px] text-muted">
                            ≈ {tokens.checkout.currency === "GHS" ? "GH₵" : ""}{Math.round(pack.priceUsd * tokens.checkout.usdRate)}
                          </span>
                        ) : null}
                      </span>
                      <Button
                        size="sm"
                        variant={tokens.balance <= 0 ? "primary" : "secondary"}
                        loading={buying === pack.id}
                        onClick={() => void buy(pack)}
                      >
                        {buying === pack.id ? "Opening checkout…" : "Buy"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader
                  eyebrow="Breakdown"
                  title="Spend by feature"
                  description="Where your tokens went inside the studio."
                />
                {tokens.byFeature.length === 0 ? (
                  <EmptyState
                    icon={<Coins className="size-7" />}
                    title="No tokens spent yet"
                    description="Run a review, a draft or a research query and the charge will appear here."
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
                            Tokens
                          </th>
                          <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Share
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {tokens.byFeature.map((row) => (
                          <tr key={row.feature}>
                            <td className="px-5 py-3 text-[13px] text-ink">{featureLabel(row.feature)}</td>
                            <td className="px-5 py-3 font-mono text-[12.5px] tabular-nums text-ink-2">
                              {tokenFormat.format(row.calls)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-[12.5px] tabular-nums text-ink-2">
                              {tokenFormat.format(row.tokens)}
                            </td>
                            <td className="px-5 py-3">
                              <MiniMeter
                                percent={totalFeatureTokens > 0 ? Math.round((row.tokens / totalFeatureTokens) * 100) : 0}
                                tone="accent"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader
                  eyebrow="Breakdown"
                  title="Spend by model"
                  description="Which model served each call."
                />
                {(usage?.byModel.length ?? 0) === 0 ? (
                  <EmptyState
                    icon={<Coins className="size-7" />}
                    title="No models used yet"
                    description="Once a model answers a request, its share of your spend is listed here."
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
                            Calls
                          </th>
                          <th className="px-5 py-2.5 text-right font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Tokens
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {(usage?.byModel ?? []).map((row) => (
                          <tr key={`${row.model}-${row.provider}`}>
                            <td className="px-5 py-3">
                              <span
                                className="block max-w-[240px] truncate font-mono text-[12.5px] text-ink-2"
                                title={row.model}
                              >
                                {row.model}
                              </span>
                            </td>
                            <td className="px-5 py-3 font-mono text-[12.5px] tabular-nums text-ink-2">
                              {tokenFormat.format(row.runs)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-[12.5px] tabular-nums text-ink-2">
                              {tokenFormat.format(row.tokens)}
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
                title="Balance history"
                description="Every grant, purchase and spend, newest first."
              />
              {tokens.ledger.length === 0 ? (
                <EmptyState
                  icon={<Coins className="size-7" />}
                  title="Nothing recorded yet"
                  description="Your welcome grant will appear here on a new account."
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
                          Entry
                        </th>
                        <th className="px-5 py-2.5 text-right font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                          Tokens
                        </th>
                        <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                          Paid
                        </th>
                        <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {tokens.ledger.map((entry) => (
                        <Fragment key={entry.id}>
                          <tr>
                            <td className="px-5 py-3 align-top text-[12.5px] text-muted">
                              {new Date(entry.createdAt).toLocaleString()}
                            </td>
                            <td className="px-5 py-3 align-top text-[13px] text-ink-2">
                              {LEDGER_LABELS[entry.kind] ?? entry.kind}
                              {entry.feature ? (
                                <span className="block text-[11.5px] text-muted">{featureLabel(entry.feature)}</span>
                              ) : null}
                              {entry.note ? (
                                <span className="block text-[11.5px] text-muted">{entry.note}</span>
                              ) : null}
                            </td>
                            <td
                              className={`px-5 py-3 text-right font-mono text-[12.5px] tabular-nums ${
                                entry.tokens < 0 ? "text-ink-2" : "text-good"
                              }`}
                            >
                              {entry.tokens > 0 ? "+" : "−"}
                              {tokenFormat.format(Math.abs(entry.tokens))}
                            </td>
                            <td className="px-5 py-3 align-top font-mono text-[12.5px] tabular-nums text-ink-2">
                              {money(entry.amountMinor, entry.currency)}
                            </td>
                            <td className="px-5 py-3 align-top">
                              {entry.status === "confirmed" ? (
                                <Badge tone={entry.kind === "spend" ? "neutral" : "good"}>
                                  {entry.kind === "spend" ? "charged" : "confirmed"}
                                </Badge>
                              ) : (
                                <Badge tone="warn">awaiting payment</Badge>
                              )}
                            </td>
                          </tr>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {usage ? (
              <Card className="mt-4">
                <CardHeader
                  eyebrow="Ledger"
                  title="Recent calls"
                  description={`The 40 most recent model calls, newest first. Window: last ${usage.window.days} days.`}
                />
                {usage.recent.length === 0 ? (
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
                          <th className="px-5 py-2.5 text-right font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Tokens
                          </th>
                          <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Latency
                          </th>
                          <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {usage.recent.map((run) => (
                          <Fragment key={run.id}>
                            <tr>
                              <td className="px-5 py-3 align-top text-[12.5px] text-muted">
                                {new Date(run.createdAt).toLocaleString()}
                              </td>
                              <td className="px-5 py-3 align-top text-[13px] text-ink-2">{featureLabel(run.feature)}</td>
                              <td className="px-5 py-3 align-top">
                                <span
                                  className="block max-w-[220px] truncate font-mono text-[12.5px] text-ink-2"
                                  title={run.model}
                                >
                                  {run.model}
                                </span>
                              </td>
                              <td className="px-5 py-3 align-top text-right font-mono text-[12.5px] tabular-nums text-ink-2">
                                {tokenFormat.format(run.tokens)}
                              </td>
                              <td className="px-5 py-3 align-top font-mono text-[12.5px] tabular-nums text-muted">
                                {run.latencyMs} ms
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
                                <td colSpan={6} className="px-5 pb-3 text-[12px] leading-relaxed text-bad">
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
            ) : null}
          </>
        )}
      </PageBody>
    </>
  );
}
