import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";

export const SESSION_COOKIE = "phd_studio_session";
const SESSION_TTL_DAYS = 30;

/**
 * The public origin of the running app, without a trailing slash.
 *
 * An explicit `APP_URL` wins, because that is the address the product is
 * actually served on (and what the sitemap and OpenRouter referer use). With no
 * `APP_URL` — the default on Vercel, where the deployment URL is only known at
 * request time — the origin is derived from the incoming request instead of
 * falling back to localhost. That fallback is what sent the OAuth callback to
 * `http://localhost:3111` in production, where Google then refused it.
 */
export function appOrigin(request?: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  if (request) {
    try {
      const url = new URL(request.url);
      // Behind Vercel's proxy `request.url` can carry the internal host, so the
      // forwarded headers are the authority when they are present.
      const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
      const proto =
        request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
        url.protocol.replace(":", "");
      if (host) return `${proto}://${host}`;
    } catch {
      // Fall through to the loopback default.
    }
  }

  return "https://phd-research-pi.vercel.app";
}

/**
 * Where Google sends the user after consent. It must match an authorized
 * redirect URI in the Google Cloud console exactly.
 */
export function googleRedirectUri(request?: Request): string {
  return `${appOrigin(request)}/api/auth/google/callback`;
}

/** Google OAuth configuration */
export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  /**
   * Resolved per request rather than at module load: the deployment's origin is
   * only known when a request arrives, and a module-level constant would freeze
   * whatever the first cold start happened to see.
   */
  getRedirectUri: googleRedirectUri,
  scopes: ["openid", "email", "profile"],
};

export function getGoogleAuthUrl(state: string, request?: Request): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    redirect_uri: googleRedirectUri(request),
    response_type: "code",
    scope: GOOGLE_OAUTH_CONFIG.scopes.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
  code: string,
  request?: Request,
): Promise<{
  access_token: string;
  refresh_token?: string;
  id_token: string;
}> {
  const params = new URLSearchParams({
    code,
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
    // Must be byte-identical to the redirect_uri sent at initiation, or Google
    // rejects the exchange — so both are resolved from the same request.
    redirect_uri: googleRedirectUri(request),
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token exchange failed: ${error}`);
  }

  return response.json();
}

export async function verifyGoogleIdToken(idToken: string): Promise<{
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
  );

  if (!response.ok) {
    throw new Error("Invalid Google ID token");
  }

  return response.json();
}

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
