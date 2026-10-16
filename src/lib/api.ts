import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AccessError } from "@/lib/access";
import { AiConfigError, AiRequestError } from "@/lib/ai/provider";
import { ExtractionError } from "@/lib/extract";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data as object, { status });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Maps domain errors to sensible HTTP responses so routes stay readable. */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const path = first?.path?.length ? `${first.path.join(".")}: ` : "";
    return fail(`${path}${first?.message ?? "Invalid request."}`, 422, {
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }
  if (error instanceof AccessError) return fail(error.message, error.status);
  if (error instanceof ExtractionError) return fail(error.message, 422);
  if (error instanceof AiConfigError) return fail(error.message, 503);
  if (error instanceof AiRequestError) return fail(error.message, error.status);

  const message = error instanceof Error ? error.message : "Unexpected server error.";
  console.error("[api]", error);
  return fail(message, 500);
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ZodError([
      { code: "custom", message: "Request body must be valid JSON.", path: [], input: undefined },
    ]);
  }
}
