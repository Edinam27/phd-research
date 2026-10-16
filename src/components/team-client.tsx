"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { UserMinus, UserPlus, Users } from "lucide-react";

import { Modal } from "@/components/modal";
import { PageBody, PageHeader } from "@/components/page-header";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Select,
  Spinner,
  Stat,
} from "@/components/ui";
import { ApiError, apiFetch, getJson, postJson } from "@/lib/client";
import { STUDY_TYPES } from "@/lib/guideline";
import type { NotebookDetail, NotebookRole } from "@/lib/types";
import { formatUsd } from "@/lib/utils";

const ROLE_TONE: Record<NotebookRole, "accent" | "good" | "warn"> = {
  owner: "accent",
  editor: "good",
  viewer: "warn",
};

function roleNoun(role: NotebookRole): string {
  return role === "editor" ? "an editor" : "a viewer";
}

export function TeamClient() {
  const { id } = useParams<{ id: string }>();

  const [detail, setDetail] = useState<NotebookDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invited, setInvited] = useState<{ name: string; role: NotebookRole } | null>(null);

  const [memberError, setMemberError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getJson<NotebookDetail>(`/api/notebooks/${id}`);
      setDetail(data);
      setError(null);
    } catch (thrown) {
      setError(
        thrown instanceof ApiError ? thrown.message : "Could not open this notebook's collaborators.",
      );
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInvited(null);
    try {
      const result = await postJson<{ member: { name: string; email: string }; role: NotebookRole }>(
        `/api/notebooks/${id}`,
        { email: email.trim(), role },
      );
      setEmail("");
      setInvited({ name: result.member.name || result.member.email, role: result.role });
      await load();
    } catch (thrown) {
      setInviteError(
        thrown instanceof ApiError ? thrown.message : "Could not add that collaborator.",
      );
    } finally {
      setInviting(false);
    }
  };

  const remove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    setMemberError(null);
    try {
      await apiFetch(`/api/notebooks/${id}`, {
        method: "PUT",
        body: JSON.stringify({ userId: removeTarget.id }),
      });
      setRemoveTarget(null);
      await load();
    } catch (thrown) {
      setMemberError(
        thrown instanceof ApiError ? thrown.message : "Could not remove that collaborator.",
      );
      setRemoveTarget(null);
    } finally {
      setRemoving(false);
    }
  };

  const isOwner = detail?.role === "owner";
  const studyLabel = detail
    ? (STUDY_TYPES.find((type) => type.value === detail.notebook.studyType)?.label ??
      detail.notebook.studyType)
    : "";

  return (
    <>
      <PageHeader
        eyebrow="Collaborators"
        title="Who can see this notebook"
        subtitle="The owner manages collaborators. An editor can review articles and write manuscripts; a viewer has read-only access to everything in the notebook."
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: detail?.notebook.title ?? "Notebook", href: `/notebooks/${id}` },
          { label: "Collaborators" },
        ]}
      />

      <PageBody>
        {error ? (
          <Alert tone="bad" title="This notebook is not available">
            {error}{" "}
            <Link href="/dashboard" className="text-accent-ink underline underline-offset-2">
              Back to your dashboard
            </Link>
            .
          </Alert>
        ) : !detail ? (
          <Card>
            <div className="flex items-center justify-center gap-2 px-5 py-16 text-[13px] text-muted">
              <Spinner className="size-4" /> Loading collaborators…
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Articles reviewed" value={detail.stats.reviews} sub="Rows in the evidence matrix" />
              <Stat label="Manuscripts" value={detail.stats.manuscripts} sub="Articles, proposals, abstracts" />
              <Stat label="Research queries" value={detail.stats.researchQueries} sub="Grounded answers and syntheses" />
              <Stat
                label="AI spend"
                value={formatUsd(detail.stats.spendUsd)}
                sub={`${detail.stats.aiRuns} metered calls`}
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <Card>
                <CardHeader
                  eyebrow="Access"
                  title={`${detail.members.length} collaborator${detail.members.length === 1 ? "" : "s"}`}
                  description="Everyone listed here can open this notebook with the role shown."
                />
                {memberError ? (
                  <div className="px-5 pt-4">
                    <Alert tone="bad">{memberError}</Alert>
                  </div>
                ) : null}
                {detail.members.length === 0 ? (
                  <EmptyState
                    icon={<Users className="size-7" />}
                    title="No collaborators yet"
                    description="Invite a supervisor or co-author and they will be able to work inside this notebook."
                  />
                ) : (
                  <div className="scroll-thin overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-line text-left">
                          <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Name
                          </th>
                          <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Email
                          </th>
                          <th className="px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                            Role
                          </th>
                          <th className="px-5 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {detail.members.map((member) => (
                          <tr key={member.id}>
                            <td className="px-5 py-3 text-[13px] text-ink">{member.name}</td>
                            <td className="px-5 py-3 text-[13px] text-muted">{member.email}</td>
                            <td className="px-5 py-3">
                              <Badge tone={ROLE_TONE[member.role]}>{member.role}</Badge>
                            </td>
                            <td className="px-5 py-3 text-right">
                              {isOwner && member.role !== "owner" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-bad hover:border-bad/30 hover:bg-bad-soft"
                                  onClick={() => {
                                    setMemberError(null);
                                    setRemoveTarget({ id: member.id, name: member.name });
                                  }}
                                >
                                  <UserMinus className="size-3.5" />
                                  Remove
                                </Button>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader eyebrow="Context" title="What this notebook covers" />
                  <div className="space-y-3 px-5 py-4">
                    <Row label="Title" value={detail.notebook.title} />
                    <Row label="Study type" value={studyLabel} />
                    <Row label="Stage" value={detail.notebook.status} />
                    <Row label="Target journal" value={detail.notebook.targetJournal ?? "—"} />
                  </div>
                </Card>

                {isOwner ? (
                  <Card>
                    <CardHeader
                      eyebrow="Invite"
                      title="Invite a collaborator"
                      description="They must already have an account in the studio — ask them to register first."
                    />
                    <form onSubmit={invite} className="space-y-4 px-5 py-4">
                      {invited ? (
                        <Alert tone="good">
                          Added {invited.name} as {roleNoun(invited.role)}.
                        </Alert>
                      ) : null}
                      {inviteError ? <Alert tone="bad">{inviteError}</Alert> : null}

                      <Field
                        label="Email address"
                        required
                        hint="The person must already have an account in the studio. Add them by the email they registered with."
                      >
                        <Input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="coauthor@university.edu"
                          autoComplete="email"
                        />
                      </Field>

                      <Field label="Role">
                        <Select
                          value={role}
                          onChange={(event) => setRole(event.target.value as "editor" | "viewer")}
                        >
                          <option value="editor">Editor — can review and write</option>
                          <option value="viewer">Viewer — read only</option>
                        </Select>
                      </Field>

                      <Button type="submit" variant="primary" loading={inviting} disabled={!email.trim()}>
                        <UserPlus className="size-3.5" />
                        Add collaborator
                      </Button>
                    </form>
                  </Card>
                ) : (
                  <Alert tone="warn" title="Read-only view">
                    Only the notebook owner can manage collaborators. You can still open everything in this
                    notebook with your {detail.role} access.
                  </Alert>
                )}
              </div>
            </div>
          </>
        )}
      </PageBody>

      <Modal
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title="Remove collaborator?"
        description="They immediately lose access to this notebook."
        footer={
          <>
            <Button onClick={() => setRemoveTarget(null)} disabled={removing}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} loading={removing}>
              Remove access
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          <strong>{removeTarget?.name}</strong> will no longer be able to open this notebook — its evidence
          matrix, drafts and research entries.
        </p>
      </Modal>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2.5 last:border-0 last:pb-0">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="max-w-[68%] truncate text-right text-[13px] text-ink-2">{value}</span>
    </div>
  );
}
