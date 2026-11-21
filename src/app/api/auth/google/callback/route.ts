import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { users } from "@/db/schema";
import { fail, ok, toErrorResponse } from "@/lib/api";
import { createSession, exchangeGoogleCode, getCurrentUser, verifyGoogleIdToken, GOOGLE_OAUTH_CONFIG } from "@/lib/auth";
import { grantTokens, STARTER_GRANT_TOKENS } from "@/lib/tokens";

export const runtime = "nodejs";

/** Handles the Google OAuth callback. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("[Google OAuth] Error:", error);
      return redirect("/login?error=google_oauth_denied");
    }

    if (!code || !state) {
      return redirect("/login?error=invalid_oauth_callback");
    }

    // Verify state from cookie
    const cookieStore = await import("next/headers").then((m) => m.cookies());
    const storedState = cookieStore.get("google_oauth_state")?.value;
    cookieStore.delete("google_oauth_state");

    if (!storedState || storedState !== state) {
      console.error("[Google OAuth] Invalid state");
      return redirect("/login?error=invalid_oauth_state");
    }

    // Exchange code for tokens
    const tokens = await exchangeGoogleCode(code);

    // Verify the ID token
    const googleUser = await verifyGoogleIdToken(tokens.id_token);

    if (!googleUser.email_verified) {
      return redirect("/login?error=google_email_not_verified");
    }

    const email = googleUser.email.toLowerCase();
    const googleId = googleUser.sub;
    const name = googleUser.name;
    const avatarUrl = googleUser.picture;

    // Check if user exists with this Google ID
    const existingGoogleUser = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .limit(1);

    if (existingGoogleUser.length > 0) {
      // Existing Google user - sign them in
      await createSession(existingGoogleUser[0].id);
      return redirect("/dashboard");
    }

    // Check if user exists with this email (password-based account)
    const existingEmailUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingEmailUser.length > 0) {
      // Link Google account to existing email account
      await db
        .update(users)
        .set({
          googleId,
          avatarUrl: avatarUrl ?? null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingEmailUser[0].id));

      await createSession(existingEmailUser[0].id);
      return redirect("/dashboard");
    }

    // Create new user with Google account
    const inserted = await db
      .insert(users)
      .values({
        email,
        name,
        googleId,
        avatarUrl: avatarUrl ?? null,
        passwordHash: null, // No password for Google-only accounts
        academicRole: "PhD Candidate",
      })
      .returning({ id: users.id, name: users.name, email: users.email });

    const user = inserted[0];

    // Create session
    await createSession(user.id);

    // Grant starter tokens
    await grantTokens({
      userId: user.id,
      tokens: STARTER_GRANT_TOKENS,
      kind: "starter-grant",
      note: "Welcome grant — free tokens to run your first reviews",
    });

    return redirect("/dashboard?welcome=1");
  } catch (error) {
    console.error("[Google OAuth] Callback failed:", error);
    return redirect("/login?error=google_oauth_failed");
  }
}