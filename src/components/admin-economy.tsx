"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

import { Alert, Button, Card, CardHeader, EmptyState, Field, Input, Select, Stat } from "@/components/ui";
import { ApiError } from "@/lib/client";
import { cn, formatUsd } from "@/lib/utils";

type EconomyUser = {
  id: string;
  name: string;
  email: string;
  tokensPurchased: number;
  tokensGranted: number;
  tokensSpent: number;
  revenueMinor: number;
  revenueCurrency: string | null;
  aiCostUsd: number;
};

type TokenEconomy = {
  currency: string | null;
  packsSold: number;
  tokensSold: number;
  tokensGranted: number;
  tokensSpent: number;
  revenueMinor: number;
  costMinor: number;
  marginMinor: number;
  modelCostUsd: number;
};

const numberFormat = new Intl.NumberFormat("en-US");
const GRANT_PRESETS = [100_000, 250_000, 1_000_000];

function money(amountMinor: number, currency: string | null): string {
  const symbols: Record<string, string> = { GHS: "GH₵", NGN: "₦", USD: "$", ZAR: "R" };
  const symbol = currency ? symbols[currency] : undefined;
  return `${symbol ?? `${currency ?? ""} `}${(amountMinor / 100).toFixed(2)}`;
}

const TH = "px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted";
const TH_NUMBER = cn(TH, "text-right");
const TD = "px-4 py-3 align-top text-[13px] text-ink-2";
const TD_NUMBER = cn(TD, "text-right font-mono text-[12.5px] tabular-nums");

export function TokenEconomyView({
  economy,
  users,
  onGrant,
}: {
  economy: TokenEconomy;
  users: EconomyUser[];
  onGrant: (input: { userId: string; tokens: number; note?: string }) => Promise<void>;
}) {
  const currency = economy.currency ?? "GHS";
  const [userId, setUserId] = useState("");
  const [tokens, setTokens] = useState("100000");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number(tokens);
    if (!userId || !Number.isFinite(parsed) || parsed <= 0) {
      setGrantError("Choose an account and a token amount above zero.");
      return;
    }
    setBusy(true);
    setGrantError(null);
    setMessage(null);
    try {
      await onGrant({ userId, tokens: parsed, note: note || undefined });
      setMessage(`Granted ${numberFormat.format(parsed)} tokens.`);
      setNote("");
    } catch (thrown) {
      setGrantError(thrown instanceof ApiError ? thrown.message : "The grant did not go through.");
    } finally {
      setBusy(false);
    }
  };

  const buyers = users
    .filter((account) => account.tokensPurchased > 0 || account.tokensSpent > 0)
    .sort((a, b) => b.tokensSpent - a.tokensSpent);

  return (
    <div className="mt-3 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Revenue collected"
          value={money(economy.revenueMinor, currency)}
          sub={`${economy.packsSold} ${economy.packsSold === 1 ? "pack" : "packs"} sold`}
        />
        <Stat
          label="Model cost"
          value={money(economy.costMinor, currency)}
          sub={`Underlying model spend: $${economy.modelCostUsd.toFixed(2)}`}
        />
        <Stat
          label="Margin"
          value={money(economy.marginMinor, currency)}
          sub="Revenue minus model cost"
          tone={economy.marginMinor >= 0 ? "good" : "bad"}
        />
        <Stat
          label="Tokens outstanding"
          value={numberFormat.format(economy.tokensSold + economy.tokensGranted - economy.tokensSpent)}
          sub={`${numberFormat.format(economy.tokensSpent)} spent of ${numberFormat.format(
            economy.tokensSold + economy.tokensGranted,
          )} issued`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            eyebrow="Economy"
            title="Token flow"
            description="Confirmed ledger totals across the studio."
          />
          <div className="divide-y divide-line px-5 py-2">
            <FlowRow label="Sold through packs" value={economy.tokensSold} />
            <FlowRow label="Granted free (welcome + admin)" value={economy.tokensGranted} />
            <FlowRow label="Consumed by model calls" value={economy.tokensSpent} />
          </div>
        </Card>

        <Card>
          <CardHeader
            eyebrow="Operations"
            title="Grant tokens"
            description="Credit an account directly — offline payment, a goodwill gesture, or support."
          />
          <form onSubmit={submit} className="space-y-3 px-5 py-4">
            {message ? <Alert tone="good">{message}</Alert> : null}
            {grantError ? <Alert tone="bad">{grantError}</Alert> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Account">
                <Select value={userId} onChange={(event) => setUserId(event.target.value)}>
                  <option value="">Choose an account…</option>
                  {users.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} · {account.email}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tokens">
                <Input
                  type="number"
                  min={1}
                  value={tokens}
                  onChange={(event) => setTokens(event.target.value)}
                  inputMode="numeric"
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {GRANT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTokens(String(preset))}
                  className={cn(
                    "rounded-sm border px-2.5 py-1 font-mono text-[11.5px] tabular-nums transition-colors",
                    Number(tokens) === preset
                      ? "border-ink bg-ink text-white"
                      : "border-line-2 bg-card text-ink-2 hover:border-ink/40",
                  )}
                >
                  {numberFormat.format(preset)}
                </button>
              ))}
            </div>
            <Field label="Note (optional)">
              <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reason for the grant" />
            </Field>
            <Button type="submit" variant="primary" loading={busy}>
              Grant tokens
            </Button>
          </form>
        </Card>
      </div>

      <Card>
        <CardHeader
          eyebrow="Economy"
          title="Who buys and who burns"
          description="Accounts with any token activity, sorted by consumption. Model cost is the internal USD spend."
        />
        {buyers.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="size-7" />} title="No token activity yet" />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className={TH}>Person</th>
                  <th className={TH_NUMBER}>Bought</th>
                  <th className={TH_NUMBER}>Granted</th>
                  <th className={TH_NUMBER}>Spent</th>
                  <th className={TH_NUMBER}>Revenue</th>
                  <th className={TH_NUMBER}>Model cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {buyers.map((account) => (
                  <tr key={account.id}>
                    <td className={TD}>
                      <span className="block font-medium text-ink">{account.name}</span>
                      <span className="font-mono text-[11.5px] text-muted">{account.email}</span>
                    </td>
                    <td className={TD_NUMBER}>{numberFormat.format(account.tokensPurchased)}</td>
                    <td className={TD_NUMBER}>{numberFormat.format(account.tokensGranted)}</td>
                    <td className={TD_NUMBER}>{numberFormat.format(account.tokensSpent)}</td>
                    <td className={TD_NUMBER}>{money(account.revenueMinor, account.revenueCurrency ?? currency)}</td>
                    <td className={TD_NUMBER}>{formatUsd(account.aiCostUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function FlowRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between py-2.5">
      <span className="text-[13px] text-ink-2">{label}</span>
      <span className="font-mono text-[13px] tabular-nums text-ink">{numberFormat.format(value)}</span>
    </div>
  );
}
