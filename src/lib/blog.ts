/**
 * Blog content. Each post is a self-contained record with the metadata the
 * index page, the article page and the sitemap all read from the same source,
 * so a post can never appear in one and be missing from another.
 *
 * Bodies are stored as arrays of blocks (heading / paragraph / list) so the
 * article page renders them with consistent typography without pulling in a
 * markdown renderer. Keeping the content here — rather than in MDX — means
 * zero extra build tooling and full type safety.
 */

export type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "quote"; text: string };

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  /** ISO date, first publication. */
  publishedTime: string;
  /** Short label shown above the title. */
  category: string;
  /** Reading time, computed at build. */
  readingMinutes: number;
  /** Featured posts lead the index and the homepage. */
  featured?: boolean;
  blocks: Block[];
};

const RAW_POSTS: Omit<BlogPost, "readingMinutes">[] = [
  {
    slug: "what-is-an-evidence-matrix",
    title: "What is an evidence matrix, and why your supervisor wants one",
    description:
      "An evidence matrix is the table that turns a stack of PDFs into a defensible literature review. Here is the structure, the columns, and how to fill it.",
    publishedTime: "2026-11-12",
    category: "Foundations",
    featured: true,
    blocks: [
      {
        type: "paragraph",
        text: "An evidence matrix is a single table in which every article you have read becomes one row, and every dimension you compare it on becomes a column. It is the difference between having read forty papers and being able to prove what you took from each one.",
      },
      { type: "heading", text: "Why the matrix matters more than the reading" },
      {
        type: "paragraph",
        text: "Reading is not the hard part of a literature review. Remembering, comparing and defending what you read is. A matrix forces each article onto the same axes — author, year, problem, theory, method, findings, limitations — so the field becomes comparable instead of a pile of separate summaries.",
      },
      {
        type: "paragraph",
        text: "When your supervisor asks why a study is relevant, the matrix answers in one line instead of a ten-minute search through your notes. That defensibility is the whole point.",
      },
      { type: "heading", text: "The eleven columns that do the work" },
      {
        type: "list",
        items: [
          "Author and year — who, and when, so claims can be traced.",
          "Title and journal — the citation and its weight (Scopus, WoS, ABDC).",
          "Problems / gaps — the problem the study tackles and the specific gap it claims to fill.",
          "Objectives — the aim and the numbered questions.",
          "Theory — the model used and how the article applied it.",
          "Empirical findings — what earlier work had already established.",
          "Methodology — design, sample, instrument and analysis.",
          "Key findings — this article's own results, with statistics.",
          "Limitations — stated and unstated, where your contribution lives.",
        ],
      },
      { type: "heading", text: "Filling it without losing your judgement" },
      {
        type: "paragraph",
        text: "A good matrix is built, not transcribed. Tools such as Kadi Research Studio draft a row from a PDF or DOCX, then flag every low-confidence cell so you verify it before it counts. The automation does the tabulating; you keep the reading, the appraisal and the call on what matters.",
      },
      {
        type: "quote",
        text: "The matrix does not think for you. It makes sure the thinking is comparable, traceable and defensible when the committee asks.",
      },
      { type: "heading", text: "Where to start" },
      {
        type: "paragraph",
        text: "Take the ten articles you have already read most closely and build the first ten rows by hand. Notice which columns are hardest to fill — that is usually where your own argument will eventually live. Then let the tooling handle the next ninety while you supervise it.",
      },
    ],
  },
  {
    slug: "taxonomy-to-synthesis",
    title: "From taxonomy to synthesis: the three moves that turn rows into a review",
    description:
      "Once your evidence matrix is full, synthesis is three moves: group the rows into themes, weigh where they agree and disagree, and name the gap you can defend.",
    publishedTime: "2026-11-18",
    category: "Method",
    featured: true,
    blocks: [
      {
        type: "paragraph",
        text: "A full evidence matrix is necessary but not sufficient. A review is not the table; it is the argument built on top of the table. The move from one to the other is synthesis, and it is a repeatable process rather than a flash of insight.",
      },
      { type: "heading", text: "Move one: group the rows into themes" },
      {
        type: "paragraph",
        text: "Read across a single column at a time — theory, method, findings — and notice which rows cluster. Those clusters are candidate themes. A theme is not a topic; it is a claim the studies collectively make. Naming it in one sentence forces you to know what you think the field is arguing.",
      },
      { type: "heading", text: "Move two: weigh agreement and disagreement" },
      {
        type: "paragraph",
        text: "Do not average the findings — explain them. Where two credible studies disagree, the interesting question is why: different context, different measurement, different sample. Naming the reason for a contradiction is worth more to a committee than a list of studies that agree.",
      },
      { type: "heading", text: "Move three: name the defensible gap" },
      {
        type: "paragraph",
        text: "A gap is not an absence of studies; it is a specific thing the literature has not yet done, in a context or with a method or on a variable that your study can address. The matrix makes the gap legible: it is the column everyone left thin, or the setting nobody has tested.",
      },
      {
        type: "quote",
        text: "Themes are what the field says. Contradictions are where it argues. The gap is where you enter.",
      },
      {
        type: "paragraph",
        text: "Kadi Research Studio runs these three moves against your own reviewed rows, so every theme, contradiction and gap is traceable back to a study you actually read — never to a model's memory.",
      },
    ],
  },
  {
    slug: "writing-to-your-journal-guideline",
    title: "Why you should draft to your journal's guideline, not a template",
    description:
      "Generic writing advice produces generic papers. A journal guideline — section order, word budgets, checklists — is the actual contract your manuscript is judged against.",
    publishedTime: "2026-11-20",
    category: "Writing",
    blocks: [
      {
        type: "paragraph",
        text: "Most writing tools give you a blank page and some encouraging advice. But a manuscript is not judged against a generic ideal — it is judged against a specific journal's expectations, which are written down in its guideline for authors.",
      },
      { type: "heading", text: "A guideline is a contract, not a suggestion" },
      {
        type: "paragraph",
        text: "Your target journal's guideline fixes the section order, the word budget for each section, the checklists a reviewer will tick, and the tables they expect to find. Ignoring it is the easiest way to get a desk rejection before your argument is even read.",
      },
      { type: "heading", text: "What 'drafting to the guideline' means in practice" },
      {
        type: "list",
        items: [
          "Sections appear in the journal's order, with the right headings.",
          "Each section respects its word budget — not a generic length.",
          "Per-section checklists are satisfied: introduction, theory, methodology, results and their required commentary.",
          "The audit checks structure, budget and citation hygiene before you submit.",
        ],
      },
      {
        type: "paragraph",
        text: "Kadi Research Studio turns a guideline document into exactly those budgets and checklists, then drafts and audits your manuscript against them. You still write the argument; the tool makes sure the shape is the one your journal will accept.",
      },
      { type: "heading", text: "The payoff" },
      {
        type: "paragraph",
        text: "When the structure is already correct, your energy goes into the science instead of the formatting. That is the difference between a paper that survives review and one that gets read on its merits.",
      },
    ],
  },
  {
    slug: "ai-in-the-literature-review",
    title: "Where AI belongs in a literature review — and where it doesn't",
    description:
      "AI should tabulate, draft and audit. It should not invent citations, decide relevance, or replace your appraisal. Here is the line, and why it matters.",
    publishedTime: "2026-11-21",
    category: "Opinion",
    blocks: [
      {
        type: "paragraph",
        text: "The honest answer to 'can AI write my literature review?' is: it can do the parts that are mechanical, and it should not do the parts that are judgement. Confusing the two is how people get into trouble.",
      },
      { type: "heading", text: "Where AI earns its place" },
      {
        type: "list",
        items: [
          "Tabulating — turning a PDF into a structured taxonomy row, cell by cell.",
          "Drafting — producing a first pass of a section against a word budget you can then revise.",
          "Auditing — checking structure, length and citation hygiene before submission.",
          "Synthesising across rows you actually reviewed — surfacing themes and contradictions you can then verify.",
        ],
      },
      { type: "heading", text: "Where it does not" },
      {
        type: "paragraph",
        text: "AI should never invent a citation, decide what is relevant to your study, or replace your appraisal of a paper's rigour. A citation you have not read is a liability, and relevance is your research question — not the model's guess.",
      },
      {
        type: "quote",
        text: "The tabulating is automated. The judgement stays yours. That division is not a limitation — it is the design.",
      },
      {
        type: "paragraph",
        text: "The tools worth using are the ones that keep that division visible: every AI-drafted cell is flagged, every claim traces to a row you reviewed, and the audit tells you what to check rather than deciding for you.",
      },
    ],
  },
];

/** Reading time from word count, at a calm 200 wpm. */
function readingMinutes(blocks: Block[]): number {
  let words = 0;
  for (const block of blocks) {
    if (block.type === "paragraph" || block.type === "heading" || block.type === "quote") {
      words += block.text.trim().split(/\s+/).filter(Boolean).length;
    } else if (block.type === "list") {
      words += block.items.join(" ").trim().split(/\s+/).filter(Boolean).length;
    }
  }
  return Math.max(1, Math.round(words / 200));
}

export const BLOG_POSTS: BlogPost[] = RAW_POSTS.map((post) => ({
  ...post,
  readingMinutes: readingMinutes(post.blocks),
}));

/** Posts newest-first. */
export function getPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => b.publishedTime.localeCompare(a.publishedTime));
}

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getFeaturedPosts(): BlogPost[] {
  return getPosts().filter((post) => post.featured);
}