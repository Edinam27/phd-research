import { db } from "@/db";
import { aiRuns } from "@/db/schema";
import { InsufficientTokensError, requireTokens, spendTokens } from "@/lib/tokens";
import { estimateTokens } from "@/lib/utils";

/**
 * One thin, provider-agnostic client.
 *
 * Defaults are chosen to be cost-conscious without hurting quality:
 *  - `research` tier is grounded (web search built into the model) and cheap,
 *    so literature claims come back with real citations.
 *  - `reasoning` tier handles extraction and drafting where instruction
 *    following matters more than browsing.
 *  - `fast` tier is reserved for cheap repair/formatting work.
 *
 * Every call is metered into `ai_runs` so a notebook can show what it cost.
 */

export type AiProvider = "gemini" | "openrouter" | "perplexity" | "openai";
export type ModelTier = "reasoning" | "research" | "fast";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type AiFeature =
  | "article-review"
  | "manuscript-section"
  | "research"
  | "synthesis"
  | "chat"
  | "compliance"
  | "reference-extraction"
  | "draft-import";

export type Usage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
};

export type AiResult = {
  text: string;
  model: string;
  provider: AiProvider;
  usage: Usage;
  latencyMs: number;
  citations: { title: string; url: string }[];
};

/**
 * The usage shape routes may hand to the browser: token counts only. The
 * USD cost behind a call is internal — it exists in `ai_runs` and in the
 * admin profitability view, never in a client payload.
 */
export function publicUsage(usage: Usage): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  tokens: number;
} {
  return {
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    tokens: usage.totalTokens,
  };
}

export type AiContext = {
  userId: string;
  notebookId?: string | null;
  feature: AiFeature;
};

/** USD per 1,000,000 tokens. Approximate list prices — override via env if you price differently. */
const PRICE_TABLE: Record<string, { input: number; output: number }> = {
  "perplexity/sonar": { input: 1, output: 1 },
  "perplexity/sonar-pro": { input: 3, output: 15 },
  "perplexity/sonar-reasoning": { input: 1, output: 5 },
  "perplexity/sonar-deep-research": { input: 2, output: 8 },
  sonar: { input: 1, output: 1 },
  "sonar-pro": { input: 3, output: 15 },
  "google/gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "google/gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "gemini-flash-latest": { input: 0.3, output: 2.5 },
  "gemini-3.8-flash": { input: 0.3, output: 2.5 },
  "gemini-flash-lite-latest": { input: 0.1, output: 0.4 },
  "gemini-3.5-flash-lite": { input: 0.1, output: 0.4 },
  "google/gemini-2.0-flash-001": { input: 0.1, output: 0.4 },
  "google/gemini-2.0-flash-lite-001": { input: 0.075, output: 0.3 },
  "deepseek/deepseek-chat": { input: 0.27, output: 1.1 },
  "deepseek/deepseek-chat-v3.1": { input: 0.2, output: 0.8 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai/gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "anthropic/claude-3.5-haiku": { input: 0.8, output: 4 },
  "meta-llama/llama-3.3-70b-instruct": { input: 0.12, output: 0.3 },
  "mistralai/mistral-small-3.2-24b-instruct": { input: 0.1, output: 0.3 },
  "qwen/qwen3-235b-a22b-2507": { input: 0.2, output: 0.8 },
};

const DEFAULT_PRICE = { input: 0.5, output: 1.5 };

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}

export class AiRequestError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "AiRequestError";
    this.status = status;
  }
}

type ResolvedProvider = {
  provider: AiProvider;
  baseUrl: string;
  apiKey: string;
  envVar: string;
};

/** One concrete (provider, model) try in the fallback chain. */
type Attempt = ResolvedProvider & { model: string };

/**
 * Gemini direct via its OpenAI-compatible endpoint. When GEMINI_API_KEY is
 * present the studio spends its free daily quota before touching any paid
 * provider; exhausted free quota simply fails those attempts and the chain
 * falls through.
 */
function geminiProvider(): ResolvedProvider | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  return {
    provider: "gemini",
    baseUrl: process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey: key,
    envVar: "GEMINI_API_KEY",
  };
}

export function resolveProvider(): ResolvedProvider {
  const configured = (process.env.AI_PROVIDER ?? "openrouter").toLowerCase();

  if (configured === "perplexity") {
    const key = process.env.PERPLEXITY_API_KEY?.trim();
    if (key) {
      return {
        provider: "perplexity",
        baseUrl: process.env.PERPLEXITY_BASE_URL ?? "https://api.perplexity.ai",
        apiKey: key,
        envVar: "PERPLEXITY_API_KEY",
      };
    }
    const fallback = process.env.OPENROUTER_API_KEY?.trim();
    if (fallback) {
      return {
        provider: "openrouter",
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: fallback,
        envVar: "OPENROUTER_API_KEY",
      };
    }
    throw new AiConfigError(
      "AI_PROVIDER is set to perplexity but neither PERPLEXITY_API_KEY nor OPENROUTER_API_KEY is configured.",
    );
  }

  if (configured === "openai") {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) throw new AiConfigError("AI_PROVIDER is set to openai but OPENAI_API_KEY is missing.");
    return {
      provider: "openai",
      baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      apiKey: key,
      envVar: "OPENAI_API_KEY",
    };
  }

  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new AiConfigError(
      "OPENROUTER_API_KEY is missing. Add it to .env.local — OpenRouter gives you one key for Perplexity Sonar, Gemini, DeepSeek and more.",
    );
  }
  return {
    provider: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: key,
    envVar: "OPENROUTER_API_KEY",
  };
}

/**
 * Providers to try for a tier, in order. Everywhere except the research tier
 * the free Gemini daily quota is spent first. The research tier keeps the
 * grounded provider (built-in web search) first so literature claims still
 * come back with real citations. A missing primary is tolerated when Gemini
 * is configured, so the studio still works with a Gemini key alone.
 */
export function resolveProviders(tier: ModelTier): ResolvedProvider[] {
  const gemini = geminiProvider();
  let primary: ResolvedProvider | null = null;
  try {
    primary = resolveProvider();
  } catch {
    primary = null;
  }

  if (tier === "research") {
    const list = primary ? [primary] : [];
    if (gemini) list.push(gemini);
    return list;
  }

  const list = gemini ? [gemini] : [];
  if (primary) list.push(primary);
  return list;
}

function envModels(key: string, fallback: string[]): string[] {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Ordered attempt list for one tier on one provider — the first model that answers wins. */
export function modelsForTier(tier: ModelTier, provider: AiProvider): string[] {
  const openrouterStyle = provider === "openrouter" || provider === "perplexity";
  const envFallbacks = openrouterStyle ? envModels("AI_FALLBACK_MODELS", []) : [];

  if (provider === "gemini") {
    // The flash-lite tier answers reliably on the OpenAI-compatible endpoint
    // today; the 3.x flash generation is a thinking-first family that stalls
    // or 503s under load, so it sits second and the chain moves on when it
    // does not answer. Override with GEMINI_MODEL_* as models settle.
    if (tier === "fast") return envModels("GEMINI_MODEL_FAST", ["gemini-flash-lite-latest"]);
    if (tier === "research") return envModels("GEMINI_MODEL_RESEARCH", ["gemini-flash-lite-latest"]);
    return envModels("GEMINI_MODEL_REASONING", ["gemini-flash-lite-latest", "gemini-3.8-flash"]);
  }

  if (provider === "perplexity") {
    const primary =
      tier === "research"
        ? envModels("AI_MODEL_RESEARCH", ["sonar"])
        : envModels("AI_MODEL_REASONING", ["sonar"]);
    return [...primary, ...envFallbacks];
  }

  if (provider === "openai") {
    const primary =
      tier === "research"
        ? envModels("AI_MODEL_RESEARCH", ["gpt-4o-mini"])
        : envModels("AI_MODEL_REASONING", ["gpt-4.1-mini"]);
    return [...primary, ...envFallbacks];
  }

  if (tier === "research") {
    return [
      ...envModels("AI_MODEL_RESEARCH", ["perplexity/sonar"]),
      ...envModels("AI_MODEL_REASONING", ["google/gemini-2.5-flash"]),
      ...envFallbacks,
    ];
  }

  if (tier === "fast") {
    return [
      ...envModels("AI_MODEL_FAST", ["google/gemini-2.5-flash-lite"]),
      ...envModels("AI_MODEL_REASONING", ["google/gemini-2.5-flash"]),
      ...envFallbacks,
    ];
  }

  return [
    ...envModels("AI_MODEL_REASONING", ["google/gemini-2.5-flash"]),
    ...envFallbacks,
    ...envModels("AI_MODEL_RESEARCH", ["perplexity/sonar"]),
  ];
}

export function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const price = PRICE_TABLE[model] ?? DEFAULT_PRICE;
  const cost =
    (promptTokens / 1_000_000) * price.input + (completionTokens / 1_000_000) * price.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

/**
 * What a call cost the studio. Calls served by the Gemini free daily quota
 * cost nothing; set GEMINI_FREE_TIER=false once the key is on a paid plan so
 * list prices apply and the profitability panel stays honest.
 */
function callCostUsd(provider: AiProvider, model: string, promptTokens: number, completionTokens: number): number {
  if (provider === "gemini" && process.env.GEMINI_FREE_TIER !== "false") return 0;
  return estimateCost(model, promptTokens, completionTokens);
}

export function aiStatus(): {
  configured: boolean;
  provider: string;
  freeProvider: string | null;
  researchModel: string;
  reasoningModel: string;
  issue: string | null;
} {
  let providerLabel = "not configured";
  let primaryIssue: string | null = null;
  try {
    providerLabel = resolveProvider().provider;
  } catch (error) {
    primaryIssue = error instanceof Error ? error.message : "AI provider is not configured.";
  }

  const gemini = geminiProvider();
  const configured = Boolean(gemini) || primaryIssue === null;

  return {
    configured,
    provider: providerLabel,
    freeProvider: gemini ? "gemini (free daily quota first)" : null,
    researchModel: modelsForTier("research", primaryIssue && gemini ? "gemini" : "openrouter")[0] ?? "—",
    reasoningModel: modelsForTier("reasoning", gemini ? "gemini" : "openrouter")[0] ?? "—",
    issue: configured ? null : (primaryIssue ?? "No model provider is configured."),
  };
}

type CallOptions = {
  messages: ChatMessage[];
  tier?: ModelTier;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

/** Hard ceiling per model attempt, so a hung model can never wedge a request. */
const REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 180_000);

async function postChat(
  resolved: ResolvedProvider,
  model: string,
  options: CallOptions,
  stream: boolean,
  signal?: AbortSignal,
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${resolved.apiKey}`,
    "Content-Type": "application/json",
  };

  if (resolved.provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.APP_URL ?? "http://localhost:3000";
    headers["X-Title"] = "Kadi Research Studio";
  }

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const composedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  return fetch(`${resolved.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    signal: composedSignal,
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 4000,
      stream,
    }),
  });
}

function buildAttempts(options: CallOptions): Attempt[] {
  if (options.model) {
    // An explicit model rides on the primary provider only.
    const primary = resolveProvider();
    return [{ ...primary, model: options.model }];
  }
  const tiers: ModelTier[] = options.tier === "research" ? ["research"] : [options.tier ?? "reasoning"];
  const attempts: Attempt[] = [];
  for (const tier of tiers) {
    for (const provider of resolveProviders(tier)) {
      for (const model of modelsForTier(tier, provider.provider)) {
        attempts.push({ ...provider, model });
      }
    }
  }
  const seen = new Set<string>();
  const unique = attempts.filter((attempt) => {
    const key = `${attempt.provider}:${attempt.model}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.slice(0, 6);
}

async function readError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string };
      return parsed.error?.message ?? parsed.message ?? text.slice(0, 500);
    } catch {
      return text.slice(0, 500);
    }
  } catch {
    return `HTTP ${response.status}`;
  }
}

export type RawCompletion = {
  text: string;
  usage: Usage;
  model: string;
  provider: AiProvider;
  citations: { title: string; url: string }[];
};

/** Non-streaming completion with automatic provider and model fallback. */
export async function complete(
  options: CallOptions,
  signal?: AbortSignal,
): Promise<RawCompletion> {
  const attempts = buildAttempts(options);
  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      const response = await postChat(attempt, attempt.model, options, false, signal);
      if (!response.ok) {
        errors.push(`${attempt.provider}/${attempt.model}: ${await readError(response)}`);
        continue;
      }
      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        citations?: unknown;
      };

      const text = payload.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) {
        errors.push(`${attempt.provider}/${attempt.model}: empty completion`);
        continue;
      }

      const promptTokens = payload.usage?.prompt_tokens ?? estimateTokens(
        options.messages.map((message) => message.content).join("\n"),
      );
      const completionTokens = payload.usage?.completion_tokens ?? estimateTokens(text);

      return {
        text,
        model: attempt.model,
        provider: attempt.provider,
        citations: normalizeCitations(payload.citations),
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: payload.usage?.total_tokens ?? promptTokens + completionTokens,
          costUsd: callCostUsd(attempt.provider, attempt.model, promptTokens, completionTokens),
        },
      };
    } catch (error) {
      errors.push(`${attempt.provider}/${attempt.model}: ${error instanceof Error ? error.message : "network error"}`);
    }
  }

  throw new AiRequestError(
    `No model in the fallback chain answered. ${errors.join(" | ")}`,
    502,
  );
}

export async function completeAndLog(
  options: CallOptions,
  context: AiContext,
): Promise<AiResult> {
  const startedAt = Date.now();
  try {
    await requireTokens(context.userId);
    const result = await complete(options);
    const logged = await logRun({
      context,
      provider: result.provider,
      model: result.model,
      usage: result.usage,
      latencyMs: Date.now() - startedAt,
      ok: true,
    });
    await chargeTokens(context, result.usage, logged?.id ?? null);
    return { ...result, latencyMs: Date.now() - startedAt };
  } catch (error) {
    await logRun({
      context,
      provider: (process.env.AI_PROVIDER ?? "openrouter").toLowerCase(),
      model: options.model ?? "fallback-chain",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 },
      latencyMs: Date.now() - startedAt,
      ok: false,
      errorText: error instanceof Error ? error.message.slice(0, 900) : "unknown error",
    });
    throw error;
  }
}

async function logRun(input: {
  context: AiContext;
  provider: string;
  model: string;
  usage: Usage;
  latencyMs: number;
  ok: boolean;
  errorText?: string;
}): Promise<{ id: string } | null> {
  try {
    const inserted = await db
      .insert(aiRuns)
      .values({
        userId: input.context.userId,
        notebookId: input.context.notebookId ?? null,
        feature: input.context.feature,
        provider: input.provider,
        model: input.model,
        promptTokens: input.usage.promptTokens,
        completionTokens: input.usage.completionTokens,
        costUsd: input.usage.costUsd,
        latencyMs: input.latencyMs,
        ok: input.ok,
        errorText: input.errorText ?? null,
      })
      .returning({ id: aiRuns.id });
    return inserted[0] ?? null;
  } catch {
    // Metering must never break a request.
    return null;
  }
}

/**
 * Charges the token ledger for a completed call. The user is debited the
 * model tokens actually consumed, 1:1; the USD cost behind them stays
 * internal and is only ever reported in the admin profitability view.
 */
async function chargeTokens(context: AiContext, usage: Usage, aiRunId: string | null): Promise<void> {
  try {
    await spendTokens({
      userId: context.userId,
      tokens: usage.promptTokens + usage.completionTokens,
      feature: context.feature,
      aiRunId: aiRunId ?? crypto.randomUUID(),
      notebookId: context.notebookId ?? null,
    });
  } catch {
    // The ledger is important, but a failed write must not fail the answer.
  }
}

function normalizeCitations(raw: unknown): { title: string; url: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === "string") return { title: entry, url: entry };
      if (entry && typeof entry === "object" && "url" in entry) {
        const record = entry as { url?: string; title?: string };
        return { title: record.title ?? record.url ?? "", url: record.url ?? "" };
      }
      return null;
    })
    .filter((entry): entry is { title: string; url: string } => Boolean(entry));
}

export type StreamHooks = {
  /** Runs once the model finishes cleanly, before the terminal frame is sent. */
  onFinish?: (text: string) => Promise<void> | void;
};

/**
 * Server-sent-event stream of `{type:"delta"|"done"|"error"}` frames.
 * Usage is resolved server-side and written to the cost ledger at the end.
 */
export function streamCompletion(
  options: CallOptions,
  context: AiContext,
  hooks: StreamHooks = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const startedAt = Date.now();
      let closed = false;
      const send = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // The client hung up mid-stream; stop trying to write.
          closed = true;
        }
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      let attempts: Attempt[];
      try {
        attempts = buildAttempts(options);
        await requireTokens(context.userId);
      } catch (error) {
        const isTokenGate = error instanceof InsufficientTokensError;
        send({
          type: "error",
          code: isTokenGate ? "insufficient_tokens" : undefined,
          message: error instanceof Error ? error.message : "AI not configured",
        });
        finish();
        return;
      }

      if (attempts.length === 0) {
        send({ type: "error", message: "No model provider is configured." });
        finish();
        return;
      }

      const errors: string[] = [];
      let succeeded = false;

      for (const attempt of attempts) {
        try {
          const response = await postChat(attempt, attempt.model, options, true);
          if (!response.ok || !response.body) {
            errors.push(`${attempt.provider}/${attempt.model}: ${await readError(response)}`);
            continue;
          }

          send({ type: "meta", model: attempt.model, provider: attempt.provider });

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let text = "";
          let promptTokens = 0;
          let completionTokens = 0;
          let citations: { title: string; url: string }[] = [];
          let finalModel = attempt.model;

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === "[DONE]") continue;

              try {
                const chunk = JSON.parse(data) as {
                  model?: string;
                  choices?: { delta?: { content?: string } }[];
                  usage?: { prompt_tokens?: number; completion_tokens?: number };
                  citations?: unknown;
                };
                const delta = chunk.choices?.[0]?.delta?.content;
                if (delta) {
                  text += delta;
                  send({ type: "delta", text: delta });
                }
                if (chunk.usage) {
                  promptTokens = chunk.usage.prompt_tokens ?? promptTokens;
                  completionTokens = chunk.usage.completion_tokens ?? completionTokens;
                }
                if (chunk.citations) citations = normalizeCitations(chunk.citations);
                if (chunk.model) finalModel = chunk.model;
              } catch {
                // Ignore keep-alive comments and malformed frames.
              }
            }
          }

          if (promptTokens === 0) {
            promptTokens = estimateTokens(options.messages.map((message) => message.content).join("\n"));
          }
          if (completionTokens === 0) completionTokens = estimateTokens(text);

          const usage: Usage = {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
            costUsd: callCostUsd(attempt.provider, finalModel, promptTokens, completionTokens),
          };

          await logRun({
            context,
            provider: attempt.provider,
            model: finalModel,
            usage,
            latencyMs: Date.now() - startedAt,
            ok: true,
          }).then((logged) => chargeTokens(context, usage, logged?.id ?? null));

          if (hooks.onFinish) {
            try {
              await hooks.onFinish(text);
            } catch {
              // Persisting must never truncate the stream.
            }
          }

          send({
            type: "done",
            model: finalModel,
            provider: attempt.provider,
            usage: publicUsage(usage),
            citations,
          });
          succeeded = true;
          break;
        } catch (error) {
          errors.push(`${attempt.provider}/${attempt.model}: ${error instanceof Error ? error.message : "network error"}`);
        }
      }

      if (!succeeded) {
        await logRun({
          context,
          provider: attempts[0]?.provider ?? (process.env.AI_PROVIDER ?? "openrouter").toLowerCase(),
          model: "fallback-chain",
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 },
          latencyMs: Date.now() - startedAt,
          ok: false,
          errorText: errors.join(" | ").slice(0, 900),
        });
        send({ type: "error", message: `All models failed. ${errors.join(" | ")}` });
      }

      finish();
    },
  });
}

const EVENT_STREAM_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

export function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, { headers: EVENT_STREAM_HEADERS });
}

/** Pulls a JSON object or array out of a model answer that may be fenced or chatty. */
export function extractJson<T>(text: string): T | null {
  const normalised = text.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'");
  const fenced = normalised.match(/```(?:json)?\s*([\s\S]*?)```/i);

  const candidates = [normalised.trim()];
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const salvaged = salvageJson(normalised);
  if (salvaged) candidates.push(salvaged);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // A trailing comma before a closing bracket is the one lapse worth fixing.
      try {
        return JSON.parse(candidate.replace(/,\s*([}\]])/g, "$1")) as T;
      } catch {
        // try the next candidate
      }
    }
  }
  return null;
}

/**
 * Rebuilds the JSON value a model began writing, tolerating the two things that
 * break parsing in practice: literal control characters inside long strings
 * (models write real newlines into prose) and an answer that ran into the token
 * ceiling. A cut-off object is closed at its last complete entry, so the
 * finished parts survive instead of the whole answer being thrown away.
 */
function salvageJson(text: string): string | null {
  const brace = text.indexOf("{");
  const bracket = text.indexOf("[");
  const start = brace < 0 ? bracket : bracket < 0 ? brace : Math.min(brace, bracket);
  if (start < 0) return null;

  const out: string[] = [];
  const open: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        out.push(char);
        escaped = false;
      } else if (char === "\\") {
        out.push(char);
        escaped = true;
      } else if (char === '"') {
        out.push(char);
        inString = false;
      } else if (char === "\n") {
        out.push("\\n");
      } else if (char === "\r") {
        out.push("\\r");
      } else if (char === "\t") {
        out.push("\\t");
      } else if (char >= " ") {
        out.push(char);
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      out.push(char);
    } else if (char === "{" || char === "[") {
      open.push(char);
      out.push(char);
    } else if (char === "}" || char === "]") {
      if (open.length === 0) break;
      open.pop();
      out.push(char);
      if (open.length === 0) return out.join("");
    } else {
      out.push(char);
    }
  }

  // Ran out of text mid-value. Close the string, drop a trailing key or comma
  // that never got its value, then close every container still open.
  let repaired = out.join("");
  if (inString) repaired += '"';
  repaired = repaired.replace(/,\s*$/, "");
  repaired = repaired.replace(/"(?:[^"\\]|\\.)*"\s*:\s*$/, "");
  if (open[open.length - 1] === "{") repaired = repaired.replace(/,\s*"(?:[^"\\]|\\.)*"\s*$/, "");
  repaired = repaired.replace(/,\s*$/, "");
  for (let index = open.length - 1; index >= 0; index -= 1) {
    repaired += open[index] === "{" ? "}" : "]";
  }

  return repaired;
}
