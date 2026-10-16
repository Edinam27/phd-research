/** Browser-side fetch helpers. Every API route answers with JSON or an SSE frame stream. */

export class ApiError extends Error {
  status: number;
  issues: { path: string; message: string }[];
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    const issues = (payload as { issues?: { path: string; message: string }[] } | null)?.issues;
    this.issues = Array.isArray(issues) ? issues : [];
  }
}

type Json = Record<string, unknown> | unknown[] | null;

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const headers = new Headers(init?.headers);
  if (init?.body && !isForm && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...init, headers });
  const raw = await response.text();

  let payload: Json = null;
  if (raw) {
    try {
      payload = JSON.parse(raw) as Json;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      (payload as { error?: string } | null)?.error ??
      (response.status === 401
        ? "Your session has expired. Sign in again."
        : `Request failed with status ${response.status}.`);
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export function postJson<T>(url: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, { method: "POST", body: JSON.stringify(body) });
}

export function patchJson<T>(url: string, body: unknown): Promise<T> {
  return apiFetch<T>(url, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteJson<T>(url: string, body?: unknown): Promise<T> {
  return apiFetch<T>(url, {
    method: "DELETE",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export function getJson<T>(url: string): Promise<T> {
  return apiFetch<T>(url);
}

export type SseFrame =
  | { type: "meta"; model: string; provider: string }
  | { type: "delta"; text: string }
  | { type: "done"; model: string; provider: string; usage: SseUsage; citations: SseCitation[] }
  | { type: "error"; message: string };

export type SseUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
};

export type SseCitation = { title: string; url: string };

export type SseHandlers = {
  onMeta?: (frame: Extract<SseFrame, { type: "meta" }>) => void;
  onDelta?: (text: string) => void;
  onDone?: (frame: Extract<SseFrame, { type: "done" }>) => void;
  onError?: (message: string) => void;
};

/** Consumes a `text/event-stream` response and dispatches each frame. */
export async function streamSse(
  url: string,
  body: unknown,
  handlers: SseHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    signal,
  });

  if (!response.ok || !response.body) {
    const raw = await response.text().catch(() => "");
    let message = `Request failed with status ${response.status}.`;
    try {
      message = (JSON.parse(raw) as { error?: string }).error ?? message;
    } catch {
      // keep the generic message
    }
    handlers.onError?.(message);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

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

      let frame: SseFrame;
      try {
        frame = JSON.parse(data) as SseFrame;
      } catch {
        continue;
      }

      if (frame.type === "delta") handlers.onDelta?.(frame.text);
      else if (frame.type === "meta") handlers.onMeta?.(frame);
      else if (frame.type === "done") handlers.onDone?.(frame);
      else if (frame.type === "error") handlers.onError?.(frame.message);
    }
  }
}

/** Triggers a browser download for an export endpoint. */
export function downloadFile(url: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
