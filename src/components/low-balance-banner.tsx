"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui";
import { getJson, notifyTokensExhausted } from "@/lib/client";
import { formatTokens } from "@/lib/utils";

type TokensResponse = {
  balance: number;
  lowBalanceAlert: number;
};

/**
 * Dismissal persists per viewer (browser storage); it is only a convenience —
 * if storage is unavailable the banner simply shows again after a reload.
 */
const DISMISS_KEY = "kadi:low-balance-dismissed-at";
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function readDismissedAt(): number | null {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * The proactive nudge shown once the balance falls to 10% of the free grant.
 * The hard gate (popup on any model call) is TokenExhaustedModal; this is the
 * earlier, softer warning so users top up before work is interrupted.
 */
export function LowBalanceBanner({ isAdmin }: { isAdmin: boolean }) {
  const [data, setData] = useState<TokensResponse | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isAdmin) return;
    setDismissed(readDismissedAt() !== null);
    getJson<TokensResponse>("/api/tokens")
      .then((result) => {
        // An exhausted balance is handled by the harder popup; no banner noise.
        if (result.lowBalanceAlert === 0 && result.balance <= 0) return;
        setData(result);
      })
      .catch(() => {
        // The banner is informational; a failed load stays silent.
      });
  }, [isAdmin]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage unavailable: the banner just returns on the next reload.
    }
  }, []);

  if (isAdmin || dismissed || !data) return null;
  if (data.balance > data.lowBalanceAlert || data.balance <= 0) return null;

  const remainingPct = Math.max(0, Math.round((data.balance / data.lowBalanceAlert) * 10));

  return (
    <div className="no-print sticky top-0 z-40 border-b border-warn/30 bg-warn-soft">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5 sm:px-7">
        <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink-2">
          <strong className="font-semibold text-ink">
            {formatTokens(data.balance)} tokens left
          </strong>{" "}
          — about {remainingPct}% of your starter grant. Top up soon so a review or draft is never
          cut off mid-thought.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="primary" onClick={() => notifyTokensExhausted("low")}>
            Top up
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
