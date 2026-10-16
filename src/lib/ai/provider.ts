import { db } from "@/db";
import { aiRuns } from "@/db/schema";
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

export type AiProvider = "openrouter" | "perplexity" | "openai";
export type ModelTier = "reasoning" | "research" | "fast";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type AiFeature =
  | "article-review"
  | "manuscript-section"
  | "research"
  | "synthesis"
  | "chat"
  | "compliance";

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
  "google/gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
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

function envModels(key: string, fallback: string[]): string[] {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Ordered attempt list — the first model that answers wins. */
export function modelsForTier(tier: ModelTier): string[] {
  const provider = (process.env.AI_PROVIDER ?? "openrouter").toLowerCase();
  const fallbacks = envModels("AI_FALLBACK_MODELS", []);

  if (provider === "perplexity") {
    const primary =
      tier === "research"
        ? envModels("AI_MODEL_RESEARCH", ["sonar"])
        : envModels("AI_MODEL_REASONING", ["sonar"]);
    return [...primary, ...fallbacks];
  }

  if (provider === "openai") {
    const primary =
      tier === "research"
        ? envModels("AI_MODEL_RESEARCH", ["gpt-4o-mini"])
        : envModels("AI_MODEL_REASONING", ["gpt-4.1-mini"]);
    return [...primary, ...fallbacks];
  }

  if (tier === "research") {
    return [
      ...envModels("AI_MODEL_RESEARCH", ["perplexity/sonar"]),
      ...envModels("AI_MODEL_REASONING", ["google/gemini-2.5-flash"]),
      ...fallbacks,
    ];
  }

  if (tier === "fast") {
    return [
      ...envModels("AI_MODEL_FAST", ["google/gemini-2.5-flash-lite"]),
      ...envModels("AI_MODEL_REASONING", ["google/gemini-2.5-flash"]),
      ...fallbacks,
    ];
  }

  return [
    ...envModels("AI_MODEL_REASONING", ["google/gemini-2.5-flash"]),
    ...fallbacks,
    ...envModels("AI_MODEL_RESEARCH", ["perplexity/sonar"]),
  ];
}

export function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const price = PRICE_TABLE[model] ?? DEFAULT_PRICE;
  const cost =
    (promptTokens / 1_000_000) * price.input + (completionTokens / 1_000_000) * price.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function aiStatus(): {
  configured: boolean;
  provider: string;
  researchModel: string;
  reasoningModel: string;
  issue: string | null;
} {
  try {
    const resolved = resolveProvider();
    return {
      configured: true,
      provider: resolved.provider,
      researchModel: modelsForTier("research")[0] ?? "—",
      reasoningModel: modelsForTier("reasoning")[0] ?? "—",
      issue: null,
    };
  } catch (error) {
    return {
      configured: false,
      provider: (process.env.AI_PROVIDER ?? "openrouter").toLowerCase(),
      researchModel: "—",
      reasoningModel: "—",
      issue: error instanceof Error ? error.message : "AI provider is not configured.",
    };
  }
}

type CallOptions = {
  messages: ChatMessage[];
  tier?: ModelTier;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

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
    headers["X-Title"] = "PhD Research Studio";
  }

  return fetch(`${resolved.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 4000,
      stream,
    }),
  });
}

function buildAttempts(options: CallOptions): string[] {
  if (options.model) return [options.model];
  const tiers: ModelTier[] = options.tier === "research" ? ["research"] : [options.tier ?? "reasoning"];
  const attempts = tiers.flatMap((tier) => modelsForTier(tier));
  return Array.from(new Set(attempts)).slice(0, 4);
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

/** Non-streaming completion with automatic model fallback. */
export async function complete(
  options: CallOptions,
  signal?: AbortSignal,
): Promise<RawCompletion> {
  const resolved = resolveProvider();
  const attempts = buildAttempts(options);
  const errors: string[] = [];

  for (let index = 0; index < attempts.length; index += 1) {
    const model = attempts[index];
    try {
      const response = await postChat(resolved, model, options, false, signal);
      if (!response.ok) {
        errors.push(`${model}: ${await readError(response)}`);
        continue;
      }
      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        citations?: unknown;
      };

      const text = payload.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) {
        errors.push(`${model}: empty completion`);
        continue;
      }

      const promptTokens = payload.usage?.prompt_tokens ?? estimateTokens(
        options.messages.map((message) => message.content).join("\n"),
      );
      const completionTokens = payload.usage?.completion_tokens ?? estimateTokens(text);

      return {
        text,
        model,
        provider: resolved.provider,
        citations: normalizeCitations(payload.citations),
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: payload.usage?.total_tokens ?? promptTokens + completionTokens,
          costUsd: estimateCost(model, promptTokens, completionTokens),
        },
      };
    } catch (error) {
      errors.push(`${model}: ${error instanceof Error ? error.message : "network error"}`);
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
    const result = await complete(options);
    await logRun({
      context,
      provider: result.provider,
      model: result.model,
      usage: result.usage,
      latencyMs: Date.now() - startedAt,
      ok: true,
    });
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
}): Promise<void> {
  try {
    await db.insert(aiRuns).values({
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
    });
  } catch {
    // Metering must never break a request.
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

      let resolved: ResolvedProvider;
      try {
        resolved = resolveProvider();
      } catch (error) {
        send({ type: "error", message: error instanceof Error ? error.message : "AI not configured" });
        finish();
        return;
      }

      const attempts = buildAttempts(options);
      const errors: string[] = [];
      let succeeded = false;

      for (const model of attempts) {
        try {
          const response = await postChat(resolved, model, options, true);
          if (!response.ok || !response.body) {
            errors.push(`${model}: ${await readError(response)}`);
            continue;
          }

          send({ type: "meta", model, provider: resolved.provider });

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let text = "";
          let promptTokens = 0;
          let completionTokens = 0;
          let citations: { title: string; url: string }[] = [];
          let finalModel = model;

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
            costUsd: estimateCost(finalModel, promptTokens, completionTokens),
          };

          await logRun({
            context,
            provider: resolved.provider,
            model: finalModel,
            usage,
            latencyMs: Date.now() - startedAt,
            ok: true,
          });

          if (hooks.onFinish) {
            try {
              await hooks.onFinish(text);
            } catch {
              // Persisting must never truncate the stream.
            }
          }

          send({ type: "done", model: finalModel, provider: resolved.provider, usage, citations });
          succeeded = true;
          break;
        } catch (error) {
          errors.push(`${model}: ${error instanceof Error ? error.message : "network error"}`);
        }
      }

      if (!succeeded) {
        await logRun({
          context,
          provider: resolved.provider,
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

/** Pulls a JSON object out of a model answer that may be fenced or chatty. */
export function extractJson<T>(text: string): T | null {
  const candidates: string[] = [text.trim()];

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    candidates.push(text.slice(firstBracket, lastBracket + 1));
  }

  for (const candidate of candidates) {
    const cleaned = candidate
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // try the next candidate
    }
  }
  return null;
}
