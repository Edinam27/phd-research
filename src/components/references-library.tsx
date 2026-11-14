"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { BookMarked, Languages, Library, Quote, RefreshCw, Search } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { libraryLabel } from "@/components/reference-picker";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Select,
  Spinner,
  Stat,
} from "@/components/ui";
import { ApiError, getJson, postJson } from "@/lib/client";
import { REFERENCE_ROLE_LABELS } from "@/lib/reference-labels";
import type { ReferenceLibraryEntry, ReferenceRole } from "@/lib/types";
import { cn } from "@/lib/utils";

type ArticleRow = {
  reviewId: string;
  author: string;
  year: number | null;
  title: string;
  verdict: string;
  count: number;
  hasSource: boolean;
};

type Payload = {
  library: ReferenceLibraryEntry[];
  articles: ArticleRow[];
  totals: { references: number; unique: number; core: number; articles: number; extracted: number };
};

type RoleFilter = ReferenceRole | "all";

/**
 * The notebook's reference library: every work the reviewed articles lean on,
 * ranked by how many of those articles cite it. That ranking is the point —
 * a work named by eight of your sources is core to the field, not incidental.
 */
export function ReferencesLibrary() {
  const { id: notebookId } = useParams<{ id: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [coreOnly, setCoreOnly] = useState(false);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);
  const [tab, setTab] = useState<"works" | "articles">("works");

  const load = useCallback(async () => {
    try {
      const payload = await getJson<Payload>(`/api/notebooks/${notebookId}/references`);
      setData(payload);
      setError(null);
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not load the reference library.");
    }
  }, [notebookId]);

  useEffect(() => {
    void load();
  }, [load]);

  const extract = useCallback(
    async (reviewId: string, force = false) => {
      setExtracting(reviewId);
      setError(null);
      try {
        const result = await postJson<{ referencedCount: number }>(
          `/api/reviews/${reviewId}/references`,
          { force },
        );
        await load();
        setNotice(`Found ${result.referencedCount} cited works.`);
      } catch (thrown) {
        setError(thrown instanceof ApiError ? thrown.message : "Could not extract the reference list.");
      } finally {
        setExtracting(null);
      }
    },
    [load],
  );

  const missing = useMemo(
    () => (data?.articles ?? []).filter((article) => article.count === 0 && article.hasSource),
    [data],
  );

  const extractAll = async () => {
    if (missing.length === 0) return;
    setBulk(true);
    setError(null);
    const queue = [...missing];
    let done = 0;
    try {
      for (const article of queue) {
        setExtracting(article.reviewId);
        try {
          await postJson(`/api/reviews/${article.reviewId}/references`, {});
          done += 1;
        } catch {
          // Keep going: one unreadable article should not stop the batch.
        }
      }
      await load();
      setNotice(`Extracted reference lists from ${done} of ${queue.length} articles.`);
    } finally {
      setExtracting(null);
      setBulk(false);
    }
  };

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data?.library ?? []).filter((entry) => {
      if (coreOnly && entry.citedBy.length < 2) return false;
      if (role !== "all" && !entry.roles.includes(role)) return false;
      if (!needle) return true;
      return `${entry.authors} ${entry.year ?? ""} ${entry.title} ${entry.source ?? ""}`
        .toLowerCase()
        .includes(needle);
    });
  }, [data, search, role, coreOnly]);

  if (error && !data) {
    return (
      <PageBody>
        <Alert tone="bad" title="The reference library is not available">
          {error}
        </Alert>
      </PageBody>
    );
  }

  if (!data) {
    return (
      <PageBody>
        <Card>
          <div className="flex items-center gap-2 px-5 py-10 text-[13px] text-muted">
            <Spinner className="size-4" /> Loading the reference library…
          </div>
        </Card>
      </PageBody>
    );
  }

  const { totals } = data;

  return (
    <>
      <PageHeader
        eyebrow="References"
        title="The works your articles lean on"
        subtitle="Every reviewed article names its own theories, concepts, methods and prior evidence. Those works are collected here, deduped across the whole matrix and ranked by how many of your articles cite them — the clearest signal of what is core to your field."
        actions={
          <Button
            variant="primary"
            onClick={extractAll}
            disabled={bulk || missing.length === 0}
            loading={bulk}
            title={
              missing.length === 0
                ? "Every readable article has already been mined for its reference list"
                : `Read ${missing.length} article${missing.length === 1 ? "" : "s"} for their reference lists`
            }
          >
            <RefreshCw className="size-3.5" />
            {missing.length > 0 ? `Extract from ${missing.length} article${missing.length === 1 ? "" : "s"}` : "All extracted"}
          </Button>
        }
      />

      <PageBody>
        {error ? (
          <Alert tone="bad" className="mb-4">
            {error}
          </Alert>
        ) : null}
        {notice ? (
          <Alert tone="good" className="mb-4">
            {notice}
          </Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Unique works" value={totals.unique} sub={`${totals.references} citations in total`} />
          <Stat
            label="Core works"
            value={totals.core}
            tone="accent"
            sub="Cited by more than one of your articles"
          />
          <Stat
            label="Articles mined"
            value={`${totals.extracted}/${totals.articles}`}
            sub={missing.length > 0 ? `${missing.length} still readable and unprocessed` : "Every readable article is done"}
          />
          <Stat label="Articles in the matrix" value={totals.articles} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex rounded-sm border border-line">
            {(["works", "articles"] as const).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setTab(entry)}
                className={cn(
                  "px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  tab === entry ? "bg-accent text-white" : "bg-card text-ink-2 hover:bg-paper-2",
                )}
              >
                {entry === "works" ? "Cited works" : "Per article"}
              </button>
            ))}
          </div>

          {tab === "works" ? (
            <>
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by author, year or title"
                  className="h-8 pl-8 text-[13px]"
                />
              </div>
              <Select
                value={role}
                onChange={(event) => setRole(event.target.value as RoleFilter)}
                className="h-8 w-auto text-[13px]"
                aria-label="Filter by role"
              >
                <option value="all">Every role</option>
                {(Object.keys(REFERENCE_ROLE_LABELS) as ReferenceRole[]).map((entry) => (
                  <option key={entry} value={entry}>
                    {REFERENCE_ROLE_LABELS[entry]}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                variant={coreOnly ? "primary" : "secondary"}
                onClick={() => setCoreOnly((value) => !value)}
                title="Show only works cited by more than one of your articles"
              >
                <Library className="size-3.5" />
                Core only
              </Button>
            </>
          ) : null}
        </div>

        {tab === "works" ? (
          filtered.length === 0 ? (
            <Card className="mt-4">
              <EmptyState
                icon={<BookMarked className="size-6" />}
                title={data.library.length === 0 ? "No cited works yet" : "No work matches this filter"}
                description={
                  data.library.length === 0
                    ? "Review an article, then press Extract above: the reference list is read out of each article you have already reviewed."
                    : "Clear the search, the role filter or the core-only toggle to see the rest."
                }
              />
            </Card>
          ) : (
            <Card className="mt-4">
              <CardHeader
                title={`${filtered.length} of ${data.library.length} works`}
                description="Ranked by how many of your articles cite each work. A secondary source is cited honestly — “Smith (2019, as cited in Jones, 2021)”."
              />
              <ul className="divide-y divide-line">
                {filtered.map((entry) => (
                  <li key={entry.key} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-ink">{libraryLabel(entry)}</p>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{entry.title}</p>
                        {entry.source ? (
                          <p className="mt-0.5 text-[12px] text-muted">{entry.source}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        {entry.roles.map((value) => (
                          <Badge key={value}>{REFERENCE_ROLE_LABELS[value]}</Badge>
                        ))}
                        <Badge tone={entry.citedBy.length > 1 ? "accent" : "neutral"}>
                          <Quote className="size-2.5" />
                          cited by {entry.citedBy.length}
                        </Badge>
                      </div>
                    </div>

                    {entry.note ? (
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{entry.note}</p>
                    ) : null}

                    <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                      Found in:{" "}
                      {entry.citedBy
                        .slice(0, 4)
                        .map((source) => libraryLabel({ authors: source.author, year: source.year }))
                        .join("; ")}
                      {entry.citedBy.length > 4 ? ` +${entry.citedBy.length - 4} more` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )
        ) : (
          <Card className="mt-4">
            <CardHeader
              title="How much each article gave up"
              description="Articles you have not read yet show zero. Articles you excluded still count as read, but contribute nothing to the library."
              action={bulk ? <Spinner className="size-4 text-accent" /> : undefined}
            />
            <ul className="divide-y divide-line">
              {data.articles.map((article) => (
                <li
                  key={article.reviewId}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] text-ink">
                      {libraryLabel({ authors: article.author, year: article.year })}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-muted">{article.title}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={article.verdict === "exclude" ? "bad" : article.count > 0 ? "good" : "warn"}>
                      {article.count > 0 ? `${article.count} works` : "not extracted"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!article.hasSource || extracting !== null}
                      loading={extracting === article.reviewId}
                      onClick={() => extract(article.reviewId, article.count > 0)}
                      title={
                        article.hasSource
                          ? "Read this article again for its reference list"
                          : "No stored article text to read"
                      }
                    >
                      <Languages className="size-3.5" />
                      {article.count > 0 ? "Re-read" : "Extract"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </PageBody>
    </>
  );
}
