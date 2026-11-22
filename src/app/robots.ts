import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * robots.txt. The marketing pages (homepage, per-tab pages, blog, FAQ) are
 * crawlable and indexable. The authenticated app surface is disallowed —
 * there is nothing for a crawler behind the login, and indexing dashboard
 * URLs would be wasted crawl budget.
 *
 * AI answer engines are explicitly allowed: GPTBot, PerplexityBot, ClaudeBot,
 * Google-Extended and Bingbot all get access so Kadi can be cited by ChatGPT,
 * Perplexity, Claude, Gemini and Copilot.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/(app)", "/dashboard", "/notebooks", "/settings", "/usage", "/admin", "/api/"],
      },
      // AI crawlers — explicitly welcomed.
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "Bingbot", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}