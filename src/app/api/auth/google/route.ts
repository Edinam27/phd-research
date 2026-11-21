import { randomBytes } from "node:crypto";

import { fail, ok } from "@/lib/api";
import { GOOGLE_OAUTH_CONFIG, getGoogleAuthUrl } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Initiates the Google OAuth flow by redirecting to Google's consent screen. */
export async function GET(request: Request) {
  try {
    const limit = rateLimit(clientKey(request, "google_oauth"), 20, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail(`Too many sign-in attempts. Try again in ${limit.retryAfter} seconds.`, 429);
    }

    // Generate a random state for CSRF protection
    const state = randomBytes(16).toString("base64url");

    // Store state in a cookie for verification on callback
    const cookieStore = await import("next/headers").then((m) => m.cookies());
    cookieStore.set("google_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10, // 10 minutes
    });

    const authUrl = getGoogleAuthUrl(state);
    return ok({ authUrl });
  } catch (error) {
    console.error("[Google OAuth] Initiation failed:", error);
    return fail("Failed to initiate Google sign-in. Please try again.", 500);
  }
}