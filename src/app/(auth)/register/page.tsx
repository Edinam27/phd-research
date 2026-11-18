"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { ApiError, postJson } from "@/lib/client";

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

  return (
    <div>
      <h1 className="font-serif text-2xl tracking-tight text-ink">Start reviewing</h1>
      <p className="mt-1.5 text-[13.5px] text-muted">
        Three fields, then your first notebook. Free tokens arrive with the account — no card needed.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        {error ? <Alert tone="bad">{error}</Alert> : null}

        <Field label="Full name" required>
          <Input value={form.name} onChange={set("name")} placeholder="Ama Boateng" required autoFocus />
        </Field>

        <Field label="Email" required>
          <Input
            type="email"
            value={form.email}
            onChange={set("email")}
            autoComplete="email"
            placeholder="you@university.edu"
            required
          />
        </Field>

        <Field label="Password" required hint="At least 8 characters, with a number in it.">
          <Input
            type="password"
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
            placeholder="••••••••"
            required
          />
        </Field>

        <Field label="Your role">
          <Select value={form.academicRole} onChange={set("academicRole")}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full justify-center" loading={busy}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-accent-ink underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
