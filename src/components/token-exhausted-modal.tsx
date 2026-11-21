"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Modal } from "@/components/modal";
import { Alert, Button, Spinner } from "@/components/ui";
import { ApiError, getJson, postJson, TOKENS_EXHAUSTED_EVENT, type TokensExhaustedReason } from "@/lib/client";

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
};

const numberFormat = new Intl.NumberFormat("en-US");

/**
 * The payment popup shown when a user runs out of tokens. Listens globally:
 * any 402 response or token-gate stream error opens it, wherever the user
 * is in the studio. Buying a pack redirects to Paystack checkout.
 */
export function TokenExhaustedModal() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<TokensExhaustedReason>("empty");
  const [data, setData] = useState<TokensResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    const onExhausted = (event: Event) => {
      const detail = (event as CustomEvent<{ reason?: TokensExhaustedReason }>).detail;
      setReason(detail?.reason === "low" ? "low" : "empty");
      setOpen(true);
    };
    window.addEventListener(TOKENS_EXHAUSTED_EVENT, onExhausted);
    return () => window.removeEventListener(TOKENS_EXHAUSTED_EVENT, onExhausted);
  }, []);

  // Load the pack catalogue once per opening, so the balance shown is current.
  useEffect(() => {
    if (!open) return;
    setData(null);
    setError(null);
    let cancelled = false;
    getJson<TokensResponse>("/api/tokens")
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((thrown) => {
        if (!cancelled) {
          setError(thrown instanceof ApiError ? thrown.message : "Could not load your token account.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

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
      onClose={() => setOpen(false)}
      title={reason === "low" ? "Your tokens are running low" : "You are out of tokens"}
      description={
        reason === "low"
          ? "You still have tokens to spend — top up now so a review or draft is never cut off. Payment is once, through Paystack."
          : "Your free tokens have been used up. Pick a pack to keep reviewing and drafting — payment is once, through Paystack."
      }
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-sm border border-warn/30 bg-warn-soft px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
          <p className="text-[13px] leading-relaxed text-ink-2">
            {reason === "low"
              ? "Model calls keep working for now, but the balance will not last long. Your notebooks, matrices and drafts are untouched either way."
              : "Model calls are paused until you top up. Your notebooks, matrices and drafts are untouched — everything resumes the moment a pack is confirmed."}
          </p>
        </div>

        {error ? <Alert tone="bad">{error}</Alert> : null}

        {data ? (
          <div className="space-y-2">
            {(data.packs ?? []).map((pack) => (
              <div
                key={pack.id}
                className="flex items-center justify-between gap-4 rounded-sm border border-line bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink">
                    {pack.name} · ${pack.priceUsd}
                    {data.checkout.currency !== "USD" ? (
                      <span className="ml-1.5 font-mono text-[11.5px] tabular-nums text-muted">
                        ≈ {data.checkout.currency === "GHS" ? "GH₵" : ""}
                        {Math.round(pack.priceUsd * data.checkout.usdRate)}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-muted">{pack.blurb}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[13px] tabular-nums text-ink-2">
                    {numberFormat.format(pack.tokens)}
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    loading={buying === pack.id}
                    onClick={() => void buy(pack)}
                  >
                    Buy
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-[11.5px] leading-relaxed text-muted">
              Packs are paid once through Paystack. Failed model calls are never charged.
            </p>
          </div>
        ) : error ? null : (
          <div className="flex items-center gap-2 px-1 py-3 text-[13px] text-muted">
            <Spinner className="size-3.5" /> Loading token packs…
          </div>
        )}

        <div className="flex justify-end border-t border-line pt-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Maybe later
          </Button>
        </div>
      </div>
    </Modal>
  );
}
