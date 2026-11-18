"use client";

import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";

import { Modal } from "@/components/modal";
import { Alert, Button, Spinner } from "@/components/ui";
import { ApiError, getJson, postJson } from "@/lib/client";

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
};

const numberFormat = new Intl.NumberFormat("en-US");

/**
 * The first screen a new account sees: their free grant, and the packs on
 * offer. Buying is never forced — the free tokens are spendable immediately.
 */
export function WelcomeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [data, setData] = useState<TokensResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!open || data) return;
    getJson<TokensResponse>("/api/tokens")
      .then(setData)
      .catch((thrown) =>
        setError(thrown instanceof ApiError ? thrown.message : "Could not load your token account."),
      );
  }, [open, data]);

  const buy = useCallback(async (pack: TokenPack) => {
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
  }, []);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your token account is open"
      description="Free tokens are already credited — nothing is owed and nothing is charged unless you choose a pack."
      size="lg"
    >
      <div className="space-y-4">
        {error ? <Alert tone="bad">{error}</Alert> : null}

        {data ? (
          <div className="flex items-baseline gap-3 rounded-sm border border-good/25 bg-good-soft px-4 py-3">
            <Check className="size-4 text-good" />
            <p className="text-[13px] text-ink-2">
              <strong className="font-semibold text-ink">
                {numberFormat.format(data.balance)} tokens
              </strong>{" "}
              are spendable now — enough to review your first articles and draft a section.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-1 py-3 text-[13px] text-muted">
            <Spinner className="size-3.5" /> Opening your token account…
          </div>
        )}

        <div className="space-y-2">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
            When you need more
          </p>
          {(data?.packs ?? []).map((pack) => (
            <div
              key={pack.id}
              className="flex items-center justify-between gap-4 rounded-sm border border-line bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink">
                  {pack.name} · ${pack.priceUsd}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-muted">{pack.blurb}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-[13px] tabular-nums text-ink-2">
                  {numberFormat.format(pack.tokens)}
                </span>
                <Button size="sm" variant="secondary" loading={buying === pack.id} onClick={() => void buy(pack)}>
                  Buy
                </Button>
              </div>
            </div>
          ))}
          <p className="text-[11.5px] leading-relaxed text-muted">
            Packs are paid once through Paystack. Failed model calls are never charged.
          </p>
        </div>

        <div className="flex justify-end border-t border-line pt-3">
          <Button variant="primary" onClick={onClose}>
            Start with my free tokens
          </Button>
        </div>
      </div>
    </Modal>
  );
}
