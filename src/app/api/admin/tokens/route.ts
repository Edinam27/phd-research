import { z } from "zod";

import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { grantTokens } from "@/lib/tokens";

export const runtime = "nodejs";

const grantSchema = z.object({
  userId: z.string().uuid(),
  tokens: z.coerce.number().int().min(1).max(50_000_000),
  note: z.string().trim().max(300).optional(),
});

/** An administrator credits tokens to an account, e.g. after offline payment. */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);
    requireAdmin(user);

    const body = grantSchema.parse(await readJson(request));
    await grantTokens({
      userId: body.userId,
      tokens: body.tokens,
      kind: "admin-grant",
      note: body.note ?? "Granted by an administrator",
    });

    return ok({ granted: true }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
