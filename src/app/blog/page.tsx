import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { MarketingShell } from "@/components/site/marketing-shell";
import { BlogJsonLd } from "@/components/seo/json-ld";
import { getPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — guides to the defensible literature review",
  description:
    "Practical guides for doctoral researchers: what an evidence matrix is, how to turn rows into a synthesis, why to draft to your journal's guideline, and where AI belongs in a literature review.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Kadi Research Studio — Blog",
    description: "Guides and explainers on literature reviews, evidence matrices and academic writing.",
    url: "/blog",
    type: "website",
  },
};

const posts = getPosts();
const [lead, ...rest] = posts;

const blogJsonPosts = posts.map((post) => ({
  title: post.title,
  description: post.description,
  path: `/blog/${post.slug}`,
  publishedTime: post.publishedTime,
}));

export default function BlogIndexPage() {
  return (
    <MarketingShell>
      <BlogJsonLd posts={blogJsonPosts} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="grid-paper pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-5 py-16 sm:px-8 lg:py-20">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-ink">
            The Kadi blog
          </p>
          <h1 className="mt-5 font-serif text-[2.4rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[3rem]">
            Guides to the <span className="text-accent">defensible literature review</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[16.5px] leading-relaxed text-ink-2">
            Practical, opinionated writing for doctoral researchers — on evidence matrices, research
            synthesis, writing to journal guidelines, and where AI belongs in a literature review.
          </p>
        </div>
      </section>

      {/* Lead post + grid */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        {lead ? (
          <Link
            href={`/blog/${lead.slug}`}
            className="group grid gap-8 rounded-2xl border border-line bg-card p-7 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(15,18,24,0.25)] md:grid-cols-[1.3fr_0.7fr] md:p-9"
          >
            <div>
              <div className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <span className="rounded-xs bg-accent-soft px-1.5 py-0.5 font-medium text-accent-ink">
                  Featured
                </span>
                <span>{lead.category}</span>
                <span>·</span>
                <span>{lead.readingMinutes} min read</span>
              </div>
              <h2 className="mt-4 font-serif text-[1.7rem] font-semibold leading-snug text-ink transition-colors group-hover:text-accent-ink sm:text-[2rem]">
                {lead.title}
              </h2>
              <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-ink-2">{lead.description}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-accent-ink">
                Read article <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-xl border border-line bg-paper p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Inside</p>
                <ul className="mt-2.5 space-y-1.5">
                  {lead.blocks
                    .filter((block) => block.type === "heading")
                    .slice(0, 3)
                    .map((block) => (
                      <li key={block.type === "heading" ? block.text : ""} className="text-[12.5px] text-ink-2">
                        {block.type === "heading" ? block.text : ""}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </Link>
        ) : null}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {rest.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-xl border border-line bg-card p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_16px_30px_-16px_rgba(15,18,24,0.22)]"
            >
              <div className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <span className="text-accent-ink">{post.category}</span>
                <span>·</span>
                <span>{post.readingMinutes} min read</span>
              </div>
              <h2 className="mt-3 font-serif text-[1.25rem] font-semibold leading-snug text-ink transition-colors group-hover:text-accent-ink">
                {post.title}
              </h2>
              <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-ink-2">{post.description}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent-ink">
                Read article <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}