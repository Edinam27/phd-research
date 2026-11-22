import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

import { MarketingShell } from "@/components/site/marketing-shell";
import { BlogPostingJsonLd } from "@/components/seo/json-ld";
import { BLOG_POSTS, getPost, getPosts, type Block } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Article not found" };

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedTime,
      authors: ["Kadi Research Studio"],
    },
  };
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return <h2 className="mt-12 font-serif text-[1.5rem] font-semibold tracking-tight text-ink">{block.text}</h2>;
    case "paragraph":
      return <p className="mt-5 text-[16px] leading-[1.75] text-ink-2">{block.text}</p>;
    case "quote":
      return (
        <blockquote className="mt-8 border-l-2 border-accent pl-5 font-serif text-[1.15rem] italic leading-relaxed text-ink">
          {block.text}
        </blockquote>
      );
    case "list":
      return block.ordered ? (
        <ol className="mt-5 list-decimal space-y-2.5 pl-6 text-[15.5px] leading-relaxed text-ink-2 marker:font-mono marker:text-accent">
          {block.items.map((item) => (
            <li key={item} className="pl-1.5">
              {item}
            </li>
          ))}
        </ol>
      ) : (
        <ul className="mt-5 list-disc space-y-2.5 pl-6 text-[15.5px] leading-relaxed text-ink-2 marker:text-accent">
          {block.items.map((item) => (
            <li key={item} className="pl-1.5">
              {item}
            </li>
          ))}
        </ul>
      );
  }
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const all = getPosts();
  const index = all.findIndex((entry) => entry.slug === slug);
  const newer = index > 0 ? all[index - 1] : null;
  const older = index < all.length - 1 ? all[index + 1] : null;
  const related = all.filter((entry) => entry.slug !== slug).slice(0, 2);

  const published = new Date(post.publishedTime).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <MarketingShell>
      <BlogPostingJsonLd
        title={post.title}
        description={post.description}
        path={`/blog/${post.slug}`}
        publishedTime={post.publishedTime}
      />

      <article className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" /> All articles
        </Link>

        {/* Header */}
        <header className="mt-8 border-b border-line pb-8">
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            <span className="rounded-xs bg-accent-soft px-1.5 py-0.5 font-medium text-accent-ink">
              {post.category}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" /> {post.readingMinutes} min read
            </span>
            <span>·</span>
            <time dateTime={post.publishedTime}>{published}</time>
          </div>
          <h1 className="mt-4 font-serif text-[2.1rem] font-semibold leading-[1.15] tracking-tight text-ink sm:text-[2.6rem]">
            {post.title}
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-2">{post.description}</p>
        </header>

        {/* Body */}
        <div className="mt-2">
          {post.blocks.map((block, i) => (
            <BlockRenderer key={i} block={block} />
          ))}
        </div>

        {/* Author / trust line */}
        <div className="mt-12 flex items-center gap-3 rounded-xl border border-line bg-paper px-5 py-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-accent font-serif text-[15px] font-semibold text-white">
            K
          </span>
          <div>
            <p className="text-[13.5px] font-medium text-ink">Kadi Research Studio</p>
            <p className="text-[12px] text-muted">
              A research studio for doctoral work — review, synthesise, and draft to your guideline.
            </p>
          </div>
        </div>

        {/* Prev / next */}
        <nav className="mt-10 grid gap-4 border-t border-line pt-8 sm:grid-cols-2">
          {older ? (
            <Link
              href={`/blog/${older.slug}`}
              className="group rounded-xl border border-line bg-card p-5 transition-colors hover:border-accent/40"
            >
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <ArrowLeft className="size-3" /> Previous
              </p>
              <p className="mt-2 line-clamp-2 text-[14px] font-medium text-ink group-hover:text-accent-ink">
                {older.title}
              </p>
            </Link>
          ) : (
            <div className="hidden sm:block" />
          )}
          {newer ? (
            <Link
              href={`/blog/${newer.slug}`}
              className="group rounded-xl border border-line bg-card p-5 text-right transition-colors hover:border-accent/40"
            >
              <p className="flex items-center justify-end gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Next <ArrowRight className="size-3" />
              </p>
              <p className="mt-2 line-clamp-2 text-[14px] font-medium text-ink group-hover:text-accent-ink">
                {newer.title}
              </p>
            </Link>
          ) : null}
        </nav>

        {/* Related */}
        {related.length > 0 ? (
          <div className="mt-12">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-accent-ink">
              Keep reading
            </h2>
            <div className="mt-4 space-y-3">
              {related.map((entry) => (
                <Link
                  key={entry.slug}
                  href={`/blog/${entry.slug}`}
                  className="group flex items-center justify-between gap-4 rounded-lg border border-line bg-card px-5 py-4 transition-colors hover:border-accent/40"
                >
                  <div>
                    <p className="text-[14px] font-medium text-ink group-hover:text-accent-ink">{entry.title}</p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      {entry.category} · {entry.readingMinutes} min
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </article>
    </MarketingShell>
  );
}