"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Lock, User } from "lucide-react";

import { ApiError, getJson, postJson } from "@/lib/client";
import { Alert, Button, Field, Input, Select } from "@/components/ui";

const ROLES = [
  "PhD Candidate",
  "MPhil / Masters Candidate",
  "Supervisor",
  "Lecturer",
  "Postdoctoral Researcher",
  "Independent Researcher",
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    academicRole: "PhD Candidate",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not start Google sign-up. Try again.");
      setGoogleBusy(false);
    }
  };

  return (
    <div className="relative -mx-6 -my-10 flex min-h-[70vh] flex-1 items-center justify-center overflow-hidden bg-ink px-6 py-12 sm:-mx-12 sm:px-12">
      <h1 className="absolute top-0 left-0 -mx-6 sm:-mx-12 px-6 sm:px-12 py-6 sm:py-10 z-10 flex items-center gap-2.5 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-sm bg-accent font-serif text-sm font-semibold text-white">
            K
          </span>
          <span className="font-serif text-base tracking-tight">Kadi Research Studio</span>
        </Link>
      </h1>

      <div className="relative z-10 flex w-full justify-center">
        <div className="w-full max-w-sm space-y-6 rounded-2xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <h2 className="font-serif text-3xl tracking-tight text-white">Create account</h2>
            <p className="mt-2 text-sm text-white/60">
              Start reviewing. Free tokens arrive with your account — no card needed.
            </p>
          </div>

          {error ? (
            <div className="rounded-lg border border-bad/40 bg-bad/15 px-3.5 py-3 text-[13px] leading-relaxed text-[#ffb4ab]">
              {error}
            </div>
          ) : null}

          <form onSubmit={submit} className="space-y-8">
            <div className="relative z-0">
              <input
                type="text"
                id="register_name"
                autoComplete="name"
                required
                value={form.name}
                onChange={set("name")}
                placeholder=" "
                className="peer block w-full appearance-none rounded-none border-0 border-b-2 border-white/30 bg-transparent px-0 py-2.5 text-sm text-white focus:border-accent-soft focus:outline-none focus:ring-0"
              />
              <label
                htmlFor="register_name"
                className="absolute top-3 -z-10 origin-[0] -translate-y-6 scale-75 transform text-sm text-white/60 duration-300 peer-focus:left-0 peer-focus:text-accent-soft peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100"
              >
                <User className="mr-2 -mt-1 inline-block" size={16} />
                Full name
              </label>
            </div>

            <div className="relative z-0">
              <input
                type="email"
                id="register_email"
                autoComplete="email"
                required
                value={form.email}
                onChange={set("email")}
                placeholder=" "
                className="peer block w-full appearance-none rounded-none border-0 border-b-2 border-white/30 bg-transparent px-0 py-2.5 text-sm text-white focus:border-accent-soft focus:outline-none focus:ring-0"
              />
              <label
                htmlFor="register_email"
                className="absolute top-3 -z-10 origin-[0] -translate-y-6 scale-75 transform text-sm text-white/60 duration-300 peer-focus:left-0 peer-focus:text-accent-soft peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100"
              >
                <User className="mr-2 -mt-1 inline-block" size={16} />
                Email address
              </label>
            </div>

            <div className="relative z-0">
              <input
                type="password"
                id="register_password"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={set("password")}
                placeholder=" "
                className="peer block w-full appearance-none rounded-none border-0 border-b-2 border-white/30 bg-transparent px-0 py-2.5 text-sm text-white focus:border-accent-soft focus:outline-none focus:ring-0"
              />
              <label
                htmlFor="register_password"
                className="absolute top-3 -z-10 origin-[0] -translate-y-6 scale-75 transform text-sm text-white/60 duration-300 peer-focus:left-0 peer-focus:text-accent-soft peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100"
              >
                <Lock className="mr-2 -mt-1 inline-block" size={16} />
                Password
              </label>
            </div>

            <Field label="Your role">
              <Select value={form.academicRole} onChange={set("academicRole")} className="h-9.5">
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Select>
            </Field>

            <button
              type="submit"
              disabled={busy || googleBusy}
              className="group flex w-full items-center justify-center rounded-lg border border-accent bg-accent px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:border-accent-2 hover:bg-accent-2 focus:outline-none focus:ring-2 focus:ring-accent-soft/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Creating account…" : "Create account"}
              {busy ? null : <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />}
            </button>

            <div className="relative flex items-center py-2">
              <div className="grow border-t border-white/20" />
              <span className="mx-4 shrink-0 text-xs text-white/50">OR CONTINUE WITH</span>
              <div className="grow border-t border-white/20" />
            </div>

            <button
              type="button"
              onClick={googleSignUp}
              disabled={busy || googleBusy}
              className="flex w-full items-center justify-center rounded-lg bg-white/95 px-4 py-2.5 font-semibold text-ink transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-accent-soft/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#FFC107"
                  d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.841C34.553 4.806 29.613 2.5 24 2.5C11.983 2.5 2.5 11.983 2.5 24s9.483 21.5 21.5 21.5S45.5 36.017 45.5 24c0-1.538-.135-3.022-.389-4.417z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12.5 24 12.5c3.059 0 5.842 1.154 7.961 3.039l5.839-5.841C34.553 4.806 29.613 2.5 24 2.5C16.318 2.5 9.642 6.723 6.306 14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 45.5c5.613 0 10.553-2.306 14.802-6.341l-5.839-5.841C30.842 35.846 27.059 38 24 38c-5.039 0-9.345-2.608-11.124-6.481l-6.571 4.819C9.642 41.277 16.318 45.5 24 45.5z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l5.839 5.841C44.196 35.123 45.5 29.837 45.5 24c0-1.538-.135-3.022-.389-4.417z"
                />
              </svg>
              {googleBusy ? "Opening Google…" : "Sign up with Google"}
            </button>
          </form>

          <p className="text-center text-xs text-white/50">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-semibold text-accent-soft underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}