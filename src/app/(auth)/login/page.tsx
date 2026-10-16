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

      <p className="mt-6 text-[13px] text-muted">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-accent-ink underline underline-offset-2">
          Create one
        </Link>
      </p>
    </div>
  );
}
