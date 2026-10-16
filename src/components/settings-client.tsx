"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Coins, Database, LogOut, ShieldCheck } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { SetupStatus } from "@/components/setup-status";
import { Button, Card, CardHeader } from "@/components/ui";
import { postJson } from "@/lib/client";

type SettingsUser = {
  id: string;
  email: string;
  name: string;
  institution: string | null;
  discipline: string | null;
  academicRole: string | null;
};

const ENV_VARS: { name: string; description: string }[] = [
  { name: "AI_PROVIDER", description: "Which provider serves model calls by default." },
  { name: "OPENROUTER_API_KEY", description: "Key for the OpenRouter gateway and its fallback chain." },
  { name: "PERPLEXITY_API_KEY", description: "Key for the grounded web-search tier (citations)." },
  { name: "OPENAI_API_KEY", description: "Optional direct key when OpenAI is the configured provider." },
  { name: "AI_MODEL_RESEARCH", description: "Model for the grounded research tier, with built-in web search." },
  { name: "AI_MODEL_REASONING", description: "Model for extraction and drafting." },
  { name: "AI_MODEL_FAST", description: "Cheap model for repair work and short tasks." },
  { name: "AI_FALLBACK_MODELS", description: "Comma-separated models tried in order when a tier is unavailable." },
];

function maskId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function SettingsView({ user }: { user: SettingsUser }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await postJson("/api/auth/logout", {});
    } catch {
      // The session cookie is cleared by the route regardless of the response.
    }
    router.replace("/login");
    router.refresh();
  };

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Your account and this studio"
        subtitle="The studio is multi-user, but everything is scoped to you: every notebook, its evidence matrix, its drafts and its AI spend are isolated to you and the collaborators you invite."
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
      />

      <PageBody>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              eyebrow="Account"
              title="Your profile"
              description="These details identify you across the studio."
            />
            <div className="space-y-3 px-5 py-4">
              <Row label="Name" value={user.name} />
              <Row label="Email" value={user.email} />
              <Row label="Institution" value={user.institution ?? "—"} />
              <Row label="Discipline" value={user.discipline ?? "—"} />
              <Row label="Academic role" value={user.academicRole ?? "—"} />
              <Row label="User id" value={maskId(user.id)} mono />
              <p className="border-t border-line pt-3 text-[11.5px] leading-relaxed text-muted">
                Profile details are set when you register. Ask an administrator, or register a new account, to
                change them.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader
              eyebrow="Diagnostics"
              title="System status"
              description="Checks the Neon database connection and the configured AI provider."
            />
            <div className="px-5 py-4">
              <SetupStatus />
            </div>
          </Card>

          <Card>
            <CardHeader
              eyebrow="Models"
              title="Models and cost"
              description="Calls are routed across three tiers, with a fallback chain when a model is unavailable."
            />
            <div className="space-y-4 px-5 py-4">
              <div className="space-y-2">
                <Tier icon={<Database className="size-3.5" />} name="Grounded research tier">
                  Built-in web search, so literature claims come back with citations.
                </Tier>
                <Tier icon={<Coins className="size-3.5" />} name="Reasoning tier">
                  Extraction and drafting — the heavy analytical work.
                </Tier>
                <Tier icon={<ShieldCheck className="size-3.5" />} name="Fast tier">
                  Cheap repair work and short, low-stakes tasks.
                </Tier>
              </div>

              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                  Environment variables in .env.local
                </p>
                <dl className="mt-2 divide-y divide-line border-t border-line">
                  {ENV_VARS.map((variable) => (
                    <div key={variable.name} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-3">
                      <dt className="shrink-0">
                        <code className="rounded-xs bg-paper-2 px-1.5 py-0.5 font-mono text-[11.5px] text-ink-2">
                          {variable.name}
                        </code>
                      </dt>
                      <dd className="text-[12.5px] leading-relaxed text-muted">{variable.description}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <p className="text-[12.5px] text-ink-2">
                <Link href="/usage" className="text-accent-ink underline underline-offset-2">
                  See what you have spent
                </Link>
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader
              eyebrow="Data"
              title="Data and privacy"
              description="How the studio handles your session, your notebooks and your files."
            />
            <ul className="space-y-3 px-5 py-4 text-[12.5px] leading-relaxed text-ink-2">
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent" />
                <span>Your session is an httpOnly cookie that is valid for 30 days.</span>
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent" />
                <span>
                  Each notebook&apos;s data is readable only by you and the collaborators you invite.
                </span>
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent" />
                <span>
                  Uploaded article files are parsed in memory and are never stored as binaries — only the
                  extracted text and the derived taxonomy row are kept.
                </span>
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent" />
                <span>
                  Every AI call is logged with its model and cost so your spend stays auditable.
                </span>
              </li>
            </ul>
          </Card>
        </div>

        <Card className="mt-4 border-bad/25">
          <CardHeader
            eyebrow="Session"
            title="Sign out"
            description="Ends this browser session on this device. Your notebooks are untouched."
          />
          <div className="px-5 py-4">
            <Button variant="danger" onClick={signOut} loading={signingOut}>
              <LogOut className="size-3.5" />
              Sign out of this device
            </Button>
          </div>
        </Card>
      </PageBody>
    </>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2.5 last:border-0 last:pb-0">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className={mono ? "font-mono text-[12.5px] text-ink-2" : "max-w-[68%] truncate text-right text-[13px] text-ink-2"}>
        {value}
      </span>
    </div>
  );
}

function Tier({
  icon,
  name,
  children,
}: {
  icon: React.ReactNode;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-accent">{icon}</span>
      <span>
        <span className="block text-[13px] font-medium text-ink">{name}</span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">{children}</span>
      </span>
    </div>
  );
}
