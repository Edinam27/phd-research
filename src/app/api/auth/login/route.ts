import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { createSession, normalizeEmail, verifyPassword } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const limit = rateLimit(clientKey(request, "login"), 12, 10 * 60 * 1000);
    if (!limit.allowed) {
      return fail(`Too many sign-in attempts. Try again in ${limit.retryAfter} seconds.`, 429);
    }

    const body = loginSchema.parse(await readJson(request));
    const email = normalizeEmail(body.email);

    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = rows[0];
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return fail("Email or password is incorrect.", 401);
    }

    await createSession(user.id);
    return ok({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
