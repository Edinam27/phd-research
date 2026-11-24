import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, exchangeGoogleCode, verifyGoogleIdToken } from "@/lib/auth";
import { grantTokens, STARTER_GRANT_TOKENS } from "@/lib/tokens";

export const runtime = "nodejs";

/**
 * Handles the Google OAuth callback.
 *
 * NOTE: `redirect()` works by throwing a special NEXT_REDIRECT error, so all
 * redirect() calls must live OUTSIDE the try/catch — otherwise the catch
 * would intercept the redirect and turn a successful login into a failure.
 * This handler therefore computes an outcome and redirects once, at the end.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  // --- Early validation: each failure redirects immediately. ---

  // Google reported an error on its side (user denied, etc.)
  if (oauthError) {
    console.error("[Google OAuth] Google returned error:", oauthError);
    redirect(`/login?error=google_oauth_denied&details=${encodeURIComponent(oauthError)}`);
  }

  if (!code || !state) {
    console.error("[Google OAuth] Missing code or state", { hasCode: !!code, hasState: !!state });
    redirect("/login?error=invalid_oauth_callback");
  }

  // CSRF: the state we set in the cookie on initiation must match
  const cookieStore = await import("next/headers").then((m) => m.cookies());
  const storedState = cookieStore.get("google_oauth_state")?.value;
  cookieStore.delete("google_oauth_state");

  if (!storedState) {
    console.error("[Google OAuth] No state cookie found");
    redirect("/login?error=missing_oauth_state_cookie");
  }

  if (storedState !== state) {
    console.error("[Google OAuth] State mismatch", { stored: storedState, received: state });
    redirect("/login?error=invalid_oauth_state");
  }

  // --- Everything from here can genuinely fail: catch it and redirect. ---

  let outcome: { ok: true; destination: string } | { ok: false; reason: string };

  try {
    // Exchange the one-time code for tokens (fails if code reused/expired).
    // The same request resolves the same redirect URI that was sent at
    // initiation; a mismatch here would make Google reject the exchange.
    const tokens = await exchangeGoogleCode(code, request);

    if (!tokens.id_token) {
      console.error("[Google OAuth] No id_token in token response");
      outcome = { ok: false, reason: "no_id_token" };
    } else {
      // Verify the ID token signature + claims with Google directly.
      const googleUser = await verifyGoogleIdToken(tokens.id_token);

      if (!googleUser.email_verified) {
        console.error("[Google OAuth] Email not verified", { email: googleUser.email });
        outcome = { ok: false, reason: "google_email_not_verified" };
      } else {
        const email = googleUser.email.toLowerCase();
        const googleId = googleUser.sub;
        const name = googleUser.name;
        const avatarUrl = googleUser.picture;

        // Existing Google account? Sign in.
        const existingGoogleUser = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.googleId, googleId))
          .limit(1);

        if (existingGoogleUser.length > 0) {
          await createSession(existingGoogleUser[0].id);
          outcome = { ok: true, destination: "/dashboard" };
        } else {
          // Same email, password-based account? Link Google to it.
          const existingEmailUser = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (existingEmailUser.length > 0) {
            await db
              .update(users)
              .set({ googleId, avatarUrl: avatarUrl ?? null, updatedAt: new Date() })
              .where(eq(users.id, existingEmailUser[0].id));

            await createSession(existingEmailUser[0].id);
            outcome = { ok: true, destination: "/dashboard" };
          } else {
            // Brand new user: create the account, sign in, grant free tokens.
            const inserted = await db
              .insert(users)
              .values({
                email,
                name,
                googleId,
                avatarUrl: avatarUrl ?? null,
                passwordHash: null, // Google-only accounts have no password
                academicRole: "PhD Candidate",
              })
              .returning({ id: users.id });

            await createSession(inserted[0].id);
            await grantTokens({
              userId: inserted[0].id,
              tokens: STARTER_GRANT_TOKENS,
              kind: "starter-grant",
              note: "Welcome grant — free tokens to run your first reviews",
            });
            outcome = { ok: true, destination: "/dashboard?welcome=1" };
          }
        }
      }
    }
  } catch (error) {
    console.error("[Google OAuth] Callback failed:", error);
    outcome = { ok: false, reason: String(error) };
  }

  // Single redirect point — outside any try/catch so NEXT_REDIRECT works.
  redirect(
    outcome.ok
      ? outcome.destination
      : `/login?error=google_oauth_failed&details=${encodeURIComponent(outcome.reason)}`,
  );
}