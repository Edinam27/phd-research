import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";

export const SESSION_COOKIE = "phd_studio_session";
const SESSION_TTL_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/** Constant-time comparison used when validating emailed access tokens. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export type SessionUser = Pick<
  User,
  "id" | "email" | "name" | "institution" | "discipline" | "academicRole"
> & { isAdmin: boolean };

/**
 * The `users.is_admin` column is the durable flag, but a fresh deployment has
 * nobody carrying it. Listing an address in ADMIN_EMAILS makes that account an
 * administrator from its next request, so the studio never locks its own owner
 * out — the column is there for every admin after that.
 */
export function isAdministrator(user: { email: string; isAdmin: boolean | null }): boolean {
  if (user.isAdmin) return true;
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
  return allowlist.includes(normalizeEmail(user.email));
}

/** Issues a session row and writes the httpOnly cookie. Route handlers only. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      institution: users.institution,
      discipline: users.discipline,
      academicRole: users.academicRole,
      isAdmin: users.isAdmin,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return { ...row, isAdmin: isAdministrator(row) };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[a-zA-Z]/.test(password)) return "Password must contain at least one letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  return null;
}
