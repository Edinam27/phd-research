/**
 * FAQ content, shared by the FAQ page, the homepage FAQ section and the
 * FAQPage JSON-LD so the structured data and the visible page can never
 * disagree. Answers are written to stand alone (40–60 words) so they extract
 * cleanly as snippets and into AI answer engines.
 */

export type Faq = { question: string; answer: string; group: string };

export const FAQS: Faq[] = [
  {
    group: "Getting started",
    question: "What is Kadi Research Studio?",
    answer:
      "Kadi Research Studio is a literature review workspace for doctoral researchers. You upload your articles and drafts, and it builds an eleven-column evidence matrix, synthesises the field, and drafts publication-ready manuscripts against your journal's guideline.",
  },
  {
    group: "Getting started",
    question: "Do I need to install anything?",
    answer:
      "No. Kadi runs entirely in your browser and on the server. You upload a PDF or DOCX, review the extracted text, and work in the studio. There is no software to install and nothing is written to your disk.",
  },
  {
    group: "Getting started",
    question: "Is there a free plan?",
    answer:
      "Every new account starts with 100,000 free tokens, which is enough to review roughly a dozen full articles. You can try the full workflow before paying anything, and no card is required to start.",
  },
  {
    group: "Evidence matrix",
    question: "What is the eleven-column evidence matrix?",
    answer:
      "The evidence matrix is a table where every article is one row and the eleven taxonomy columns — Author, Year, Title, Journal, Problems/Gaps, Objectives, Theory, Empirical findings, Methodology, Key Findings and Limitations — are the columns. It is the layout your supervisor expects.",
  },
  {
    group: "Evidence matrix",
    question: "Can I export my reviews?",
    answer:
      "Yes. A notebook's evidence matrix exports to Excel (.xlsx) with the original TAXONOMY.xlsx headers, so your reviews drop straight into the spreadsheet your department already uses.",
  },
  {
    group: "Evidence matrix",
    question: "How does Kadi handle my PDFs?",
    answer:
      "PDFs are read inside your browser, not uploaded. The text inside a journal PDF is rebuilt locally and only that text is sent to the server — a 6 MB paper becomes roughly 100 KB. The binary never leaves your machine.",
  },
  {
    group: "Writing & drafting",
    question: "Can Kadi write to my journal's guideline?",
    answer:
      "Yes. Kadi turns your journal's publication guideline into section templates, word budgets and per-section checklists. Drafts are written against those budgets, and an audit checks structure, length and citation hygiene before you submit.",
  },
  {
    group: "Writing & drafting",
    question: "Will the AI invent citations?",
    answer:
      "No. Every claim the models write is drawn from your own evidence matrix — the articles you actually reviewed. Citations you have not read are flagged, not fabricated. Kadi's design keeps the judgement yours and the tabulating automated.",
  },
  {
    group: "Writing & drafting",
    question: "Can I draft a research proposal as well as an article?",
    answer:
      "Yes. Kadi scaffolds proposals with the guideline's sections plus work plan, ethics, expected outcomes and budget. You can also produce journal articles and structured abstracts with keywords from the same workspace.",
  },
  {
    group: "Collaboration",
    question: "Can my supervisor see my work?",
    answer:
      "Yes. Invite collaborators to a notebook as viewer, editor or owner. Viewers get read-only access; only owners manage membership. Notebooks are isolated, so nothing is shared unless you invite someone in.",
  },
  {
    group: "Pricing & tokens",
    question: "How does pricing work?",
    answer:
      "Kadi uses prepaid token packs rather than a subscription. One token is one model token, charged after the answer arrives; failed calls are never billed. Packs start at $10 and every account begins with 100,000 free tokens.",
  },
  {
    group: "Pricing & tokens",
    question: "What happens when my tokens run out?",
    answer:
      "You are warned as your balance runs low, and model calls pause once it reaches the reserve. Top up with a token pack from inside the studio to keep reviewing and drafting. Administrators are never gated on a balance.",
  },
  {
    group: "Privacy & data",
    question: "Where is my research data stored?",
    answer:
      "Your notebooks, reviews and drafts are stored in your workspace database. PDF binaries are never stored — only the text you choose to keep and the resulting review. Nothing is shared across notebooks unless you invite a collaborator.",
  },
  {
    group: "Privacy & data",
    question: "Which AI models does Kadi use?",
    answer:
      "Kadi runs on a configurable chain of models through OpenRouter by default, with a fallback chain for reliability. Grounded research questions use a search-capable model, while extraction, drafting and synthesis use a fast reasoning model.",
  },
];

export const FAQ_GROUPS = ["Getting started", "Evidence matrix", "Writing & drafting", "Collaboration", "Pricing & tokens", "Privacy & data"] as const;