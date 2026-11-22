"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Lock, User } from "lucide-react";

import { ApiError, getJson, postJson } from "@/lib/client";
import { Alert, Button, Field, Input } from "@/components/ui";

type AuthPageProps = {
  title: string;
  subtitle: string;
  primary: string;
  secondaryLabel: string;
  secondaryHref: string;
  googleLabel?: string;
  onGoogle?: () => void;
  googleBusy?: boolean;
  extraFields?: React.ReactNode;
};

function AuthPage({
  title,
  subtitle,
  primary,
  secondaryLabel,
  secondaryHref,
  googleLabel,
  onGoogle,
  googleBusy,
  extraFields,
}: AuthPageProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const form = event.currentTarget as HTMLFormElement;
      const data = new FormData(form);
      await postJson("/api/auth/login", {
        email: data.get("email"),
        password: data.get("password"),
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not sign you in. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-ink text-white">
      <div className="flex flex-col justify-center px-5 py-10 sm:px-8 sm:py-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-7 flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-sm bg-accent font-serif text-sm font-semibold text-white">
              K
            </span>
            <span className="font-serif text-sm tracking-tight">Kadi Research Studio</span>
          </Link>

          <h1 className="font-serif text-[1.9rem] font-semibold leading-tight tracking-tight text-white sm:text-[2.4rem]">
            {title}
          </h1>
          <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-ink-muted">{subtitle}</p>

          {error ? (
            <div className="mt-6 rounded-sm border border-bad/40 bg-bad/15 px-3 py-2.5 text-[12.5px] leading-relaxed text-[#ffb4ab]">
              {error}
            </div>
          ) : null}

          <form onSubmit={submit} className="mt-6 space-y-3">
            {extraFields}
            <Field label="Email address" required>
              <Input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@university.edu"
                required
                className="h-10"
              />
            </Field>
            <Field label="Password" required hint="At least 8 characters.">
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="h-10"
              />
            </Field>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-sm bg-accent px-3 py-2.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-accent-2 disabled:opacity-60"
            >
              {busy ? "Signing in…" : primary}
            </button>
          </form>

          {onGoogle && googleLabel ? (
            <button
              type="button"
              onClick={onGoogle}
              disabled={googleBusy}
              className="mt-3 w-full rounded-sm border border-white/15 bg-white/5 px-3 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-60"
            >
              {googleBusy ? "Opening Google…" : googleLabel}
              {googleBusy ? null : <ArrowRight className="ml-2 size-4" />}
            </button>
          ) : null}

          <p className="mt-6 text-center text-[12px] text-ink-muted">
            {!onGoogle ? `Don't have an account? ` : ""}{" "}
            <Link
              href={secondaryHref}
              className="font-medium text-accent-soft underline-offset-2 hover:underline"
            >
              {secondaryLabel}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [googleBusy, setGoogleBusy] = useState(false);

  const googleSignIn = async () => {
    try {
      const { authUrl } = await getJson<{ authUrl: string }>("/api/auth/google");
      window.location.href = authUrl;
    } catch {
      setGoogleBusy(false);
    }
  };

  return (
    <AuthPage
      title="Sign in"
      subtitle="Enter the email and password you used to create your account."
      primary="Sign in"
      secondaryLabel="Create account"
      secondaryHref="/register"
      googleLabel="Sign in with Google"
      onGoogle={googleSignIn}
      googleBusy={googleBusy}
    />
  );
}