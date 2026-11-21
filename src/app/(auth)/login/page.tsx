"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Button, Field, Input } from "@/components/ui";
import { ApiError, postJson } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await postJson("/api/auth/login", { email, password });
      router.replace("/dashboard");
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not sign you in. Try again.");
      setBusy(false);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div>
      <h1 className="font-serif text-2xl tracking-tight text-ink">Sign in</h1>
      <p className="mt-1.5 text-[13.5px] text-muted">Pick up where your literature review left off.</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        {error ? <Alert tone="bad">{error}</Alert> : null}

        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@university.edu"
            required
            autoFocus
          />
        </Field>

        <Field label="Password" required>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full justify-center" loading={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-card px-2 text-muted">Or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full justify-center gap-2"
        onClick={handleGoogleSignIn}
      >
        <svg className="size-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.97 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>Continue with Google</span>
      </Button>

      <p className="mt-6 text-[13px] text-muted text-center">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-accent-ink underline underline-offset-2">
          Create one
        </Link>
      </p>
    </div>
  );
}
