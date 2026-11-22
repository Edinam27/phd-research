"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Lock, User } from "lucide-react";

import { ApiError, getJson, postJson } from "@/lib/client";
import { Alert, Button, Field, Input, Select } from "@/components/ui";

const ROUTES = [
  { value: "PhD Candidate", label: "PhD Candidate" },
  { value: "MPhil / Masters Candidate", label: "MPhil / Masters Candidate" },
  { value: "Supervisor", label: "Supervisor" },
  { value: "Lecturer", label: "Lecturer" },
  { value: "Postdoctoral Researcher", label: "Postdoctoral Researcher" },
  { value: "Independent Researcher", label: "Independent Researcher" },
];

function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    academicRole: "PhD Candidate",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (form.password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    setBusy(true);
    try {
      await postJson("/api/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        academicRole: form.academicRole || undefined,
      });
      router.replace("/dashboard?welcome=1");
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not create your account. Try again.");
      setBusy(false);
    }
  };

  const googleSignUp = async () => {
    setError(null);
    setGoogleBusy(true);
    try {
      const { authUrl } = await getJson<{ authUrl: string }>("/api/auth/google");
      window.location.href = authUrl;
    } catch {
      setGoogleBusy(false);
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
            Create account
          </h1>
          <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-ink-muted">
            Start reviewing. Free tokens arrive with your account — no card needed.
          </p>

          {error ? (
            <div className="mt-6 rounded-sm border border-bad/40 bg-bad/15 px-3 py-2.5 text-[12.5px] leading-relaxed text-[#ffb4ab]">
              {error}
            </div>
          ) : null}

          <form onSubmit={submit} className="mt-6 space-y-3">
            <Field label="Full name" required>
              <Input
                type="text"
                name="name"
                autoComplete="name"
                value={form.name}
                onChange={set("name")}
                placeholder="Ama Boateng"
                required
                autoFocus
                className="h-10"
              />
            </Field>
            <Field label="Email address" required>
              <Input
                type="email"
                name="email"
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
                placeholder="you@university.edu"
                required
                className="h-10"
              />
            </Field>
            <Field label="Password" required hint="At least 8 characters.">
              <Input
                type="password"
                name="password"
                autoComplete="new-password"
                value={form.password}
                onChange={set("password")}
                placeholder="••••••••"
                required
                className="h-10"
              />
            </Field>
            <Field label="Your role">
              <Select value={form.academicRole} onChange={set("academicRole")} className="h-10">
                {ROUTES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </Field>
            <button
              type="submit"
              disabled={busy || googleBusy}
              className="w-full rounded-sm bg-accent px-3 py-2.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-accent-2 disabled:opacity-60"
            >
              {busy ? "Creating account…" : "Create account"}
              {busy ? null : <ArrowRight className="ml-2 size-4" />}
            </button>
          </form>

          <button
            type="button"
            onClick={googleSignUp}
            disabled={busy || googleBusy}
            className="mt-3 w-full rounded-sm border border-white/15 bg-white/5 px-3 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-60"
          >
            {googleBusy ? "Opening Google…" : "Sign up with Google"}
            {googleBusy ? null : <ArrowRight className="ml-2 size-4" />}
          </button>

          <p className="mt-6 text-center text-[12px] text-ink-muted">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-medium text-accent-soft underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;