import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { createSession, hashPassword, normalizeEmail, validatePasswordStrength } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const limit = rateLimit(clientKey(request, "register"), 10, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail(`Too many sign-up attempts. Try again in ${limit.retryAfter} seconds.`, 429);
    }

    const body = registerSchema.parse(await readJson(request));
    const email = normalizeEmail(body.email);

    const problem = validatePasswordStrength(body.password);
    if (problem) return fail(problem, 422);

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return fail("An account with that email already exists. Sign in instead.", 409);
    }

    const inserted = await db
      .insert(users)
      .values({
        email,
        name: body.name,
        passwordHash: await hashPassword(body.password),
        institution: body.institution ?? null,
        discipline: body.discipline ?? null,
        academicRole: body.academicRole ?? "PhD Candidate",
      })
      .returning({ id: users.id, name: users.name, email: users.email });

    const user = inserted[0];
    await createSession(user.id);

    return ok({ user }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
