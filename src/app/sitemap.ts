import type { MetadataRoute } from "next";

import { getPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

/**
 * XML sitemap. Marketing pages only — the authenticated app (dashboard,
 * notebooks, settings, admin) is intentionally excluded, both because there
 * is nothing to index behind a login and to keep crawl budget on the pages
 * that can actually rank.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getPosts();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/how-it-works`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/pricing`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/why-kadi`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.publishedTime),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...postPages];
}