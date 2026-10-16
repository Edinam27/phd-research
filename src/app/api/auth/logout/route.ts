import { ok, toErrorResponse } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    await destroySession();
    return ok({ signedOut: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
