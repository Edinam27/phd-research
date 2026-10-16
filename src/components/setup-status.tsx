"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

import { getJson } from "@/lib/client";

type Health = {
  database: { ok: boolean; message: string };
  ai: { ok: boolean; provider: string; researchModel: string; reasoningModel: string; issue: string | null };
};

/** Tells a first-time user, before they type anything, whether the env is wired up. */
export function SetupStatus() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let cancelled = false;
    getJson<Health>("/api/health")
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {
        if (!cancelled) setHealth(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!health) return null;
  const ready = health.database.ok && health.ai.ok;

  return (
    <div className="mt-8 rounded-sm border border-line bg-card px-3.5 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Setup status</p>
      <ul className="mt-2 space-y-1.5 text-[12.5px]">
        <li className="flex items-start gap-2">
          {health.database.ok ? (
            <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-good" />
          ) : (
            <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-bad" />
          )}
          <span className={health.database.ok ? "text-ink-2" : "text-bad"}>
            Neon: {health.database.message}
          </span>
        </li>
        <li className="flex items-start gap-2">
          {health.ai.ok ? (
            <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-good" />
          ) : (
            <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-bad" />
          )}
          <span className={health.ai.ok ? "text-ink-2" : "text-bad"}>
            {health.ai.ok
              ? `Models via ${health.ai.provider} — ${health.ai.reasoningModel}`
              : (health.ai.issue ?? "Model provider not configured.")}
          </span>
        </li>
      </ul>
      {ready ? null : (
        <p className="mt-2 border-t border-line pt-2 text-[12px] leading-relaxed text-muted">
          Add the missing values to <code className="font-mono">.env.local</code> and restart the dev server. See
          <code className="font-mono"> .env.example</code> for the keys.
        </p>
      )}
    </div>
  );
}
