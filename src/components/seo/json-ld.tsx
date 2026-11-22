import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * JSON-LD structured data. Rendered server-side as a single <script> so
 * crawlers and AI answer engines see the same entity graph the sitemap and
 * metadata describe. Values are trusted constants from `lib/site`, never
 * user input.
 */

type JsonLd = Record<string, unknown>;

function toJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** The publisher / software application entity, injected site-wide. */
export function OrganizationJsonLd() {
  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    slogan: "Literature reviews, defended.",
    description: SITE_DESCRIPTION,
    sameAs: [],
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: toJsonLd(data) }}
    />
  );
}

/** The WebSite entity, so sitelinks search box and entity resolution work. */
export function WebSiteJsonLd() {
  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/blog?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: toJsonLd(data) }}
    />
  );
}

/** FAQPage schema. Question/answer pairs; answers stay short for snippet extraction. */
export function FaqJsonLd({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: toJsonLd(data) }}
    />
  );
}

/** BlogPosting schema for an individual post. */
export function BlogPostingJsonLd({
  title,
  description,
  path,
  publishedTime,
  author = "Kadi Research Studio",
}: {
  title: string;
  description: string;
  path: string;
  publishedTime: string;
  author?: string;
}) {
  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    datePublished: publishedTime,
    dateModified: publishedTime,
    author: { "@type": "Organization", name: author },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${path}` },
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: toJsonLd(data) }}
    />
  );
}

/** Blog + ItemList schema for the blog index. */
export function BlogJsonLd({ posts }: { posts: { title: string; description: string; path: string; publishedTime: string }[] }) {
  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE_URL}/blog#blog`,
    name: `${SITE_NAME} — Blog`,
    description: "Guides and explainers on literature reviews, evidence matrices, research synthesis and academic writing for doctoral researchers.",
    publisher: { "@id": `${SITE_URL}/#organization` },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      url: `${SITE_URL}${post.path}`,
      datePublished: post.publishedTime,
      author: { "@type": "Organization", name: "Kadi Research Studio" },
    })),
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: toJsonLd(data) }}
    />
  );
}

/** SoftwareApplication schema — the product entity for "what is X" queries. */
export function SoftwareApplicationJsonLd({
  offers,
}: {
  offers: { price: number; description: string; name: string }[];
}) {
  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "ResearchApplication",
    operatingSystem: "Web",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    offers: offers.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      description: offer.description,
      price: offer.price,
      priceCurrency: "USD",
    })),
    featureList: [
      "Eleven-column literature review taxonomy matrix",
      "Evidence matrix with AI completeness meter",
      "Field synthesis across reviewed articles",
      "Manuscript and proposal drafting to journal guidelines",
      "Section word-budget and checklist audits",
    ],
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: toJsonLd(data) }}
    />
  );
}