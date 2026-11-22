/**
 * Central site metadata and SEO constants.
 *
 * Everything that describes the *product* to search engines, social cards and
 * AI answer engines lives here so the homepage, the per-tab pages, the blog,
 * the FAQ, sitemap.ts and the JSON-LD blocks can never drift apart.
 */

export const SITE_NAME = "Kadi Research Studio";
export const SITE_TAGLINE = "Literature reviews, defended.";
export const SITE_DESCRIPTION =
  "Kadi Research Studio turns your journal PDFs and DOCX drafts into a structured literature review — an eleven-column evidence matrix, a field synthesis, and publication-ready drafts written to your journal's own guideline. Built for PhD candidates and their supervisors.";

/** Set APP_URL in the environment; the sitemap and canonical tags need an absolute origin. */
export const SITE_URL = (process.env.APP_URL ?? "http://localhost:3111").replace(/\/$/, "");

export const SITE_KEYWORDS = [
  "literature review software",
  "systematic literature review tool",
  "evidence matrix",
  "research taxonomy",
  "PhD research software",
  "doctoral research tools",
  "literature review matrix generator",
  "academic writing assistant",
  "manuscript drafting software",
  "research synthesis tool",
  "thesis writing software",
  "publication guideline checker",
] as const;

/** The two product surfaces the homepage is split into. */
export const PRIMARY_NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/why-kadi", label: "Why Kadi" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
] as const;

export type NavItem = (typeof PRIMARY_NAV)[number];

/** Google Tag Manager container id (GTM-XXXXXXX). Served only when configured. */
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim() || null;
/** Google Analytics 4 measurement id (G-XXXXXXX). Optional on top of GTM. */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || null;