# PhD Research Studio

An article reviewer and proposal/article writer for doctoral research.

Two documents define everything the app does:

| Source | What it drives |
| --- | --- |
| `TAXONOMY.xlsx` | The **exact** 11-column review matrix (Author → Limitations). Every review row, the on-screen evidence matrix, and the Excel export all use this column order and these headers. |
| `guideline_for_publications1.docx` | Section templates, word budgets, per-section checklists, and expected tables for proposals and articles. |

Stack: **Next.js 15** (App Router, React 19) · **Neon Postgres** via Drizzle ORM · **Tailwind CSS v4** · AI through **OpenRouter** (default) or Perplexity/OpenAI.

---

## 1. Prerequisites

- Node.js 20 or newer
- A [Neon](https://neon.tech) project (free tier is fine)
- An [OpenRouter](https://openrouter.ai/keys) API key

## 2. Install and configure

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env.local
```

Then fill in `.env.local`:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon dashboard → Connect → **Node.js / Serverless driver**. Looks like `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/dbname?sslmode=require` |
| `OPENROUTER_API_KEY` | One key covers every model below |
| `AI_PROVIDER` | `openrouter` (default), `perplexity`, or `openai` |
| `AI_MODEL_RESEARCH` | Grounded tier — literature questions. Default `perplexity/sonar` |
| `AI_MODEL_REASONING` | Extraction, taxonomy fill, drafting, synthesis. Default `google/gemini-2.5-flash` |
| `AI_MODEL_FAST` | Cheap repair/formatting work. Default `google/gemini-2.5-flash-lite` |
| `AI_FALLBACK_MODELS` | Tried in order if a tier's models fail. Default `deepseek/deepseek-chat-v3.1` |

Each model variable accepts a comma-separated list; the first model that answers is used, then the fallback list, before the call reports failure.

## 3. Create the schema and demo data

```bash
npm run db:push     # create the tables in Neon
npm run db:seed     # optional: demo account + sample study
```

`db:seed` is idempotent — re-running it changes nothing. It creates:

- `demo@phdstudio.local` / `research1234`
- One notebook (*Visitor heterogeneity and experience processing*) with two completed article reviews — deliberately ≥2, because evidence synthesis requires at least two.
- One article manuscript scaffolded from the guideline's sections and word budgets.

## 4. Run

```bash
npm run dev      # http://localhost:3000
```

Scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Push the Drizzle schema to Neon |
| `npm run db:generate` / `db:migrate` | Versioned migrations instead of push |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | Demo account and sample study |

Visiting `/` redirects to `/login` or `/dashboard` depending on your session. If Neon or the AI key is missing, the dashboard's setup panel reports which one and why.

---

## 5. A tour of the app

Everything is scoped to a **notebook** — one notebook per study, thesis stream, or paper. Notebooks never see each other's articles, notes, or manuscripts.

**Notebook**
- *Overview* — the study's framing: research problem, objectives, key variables, theory, context, study type (quantitative / qualitative / mixed) and type of research (empirical, conceptual, review, case study, editorial). These fields are injected into every AI call, so filling them in materially improves output quality.
- *Article reviewer* (`/review`) — a three-step guided flow: supply a PDF/DOCX or paste text → let the AI draft the 11-column taxonomy row and the appraisal scores → verify and save. Low-confidence columns are flagged so you know what to check. Every saved review becomes a row of the evidence matrix.
- *Evidence matrix* (`/reviews`) — the TAXONOMY.xlsx layout: one row per article, 11 columns plus appraisal scores, verdict, status, and an AI-completeness meter. Sortable, searchable, bulk-deletable, exportable to `.xlsx` with the original headers.
- *Proposals & articles* (`/manuscripts`) — create a proposal or article, and write it against the guideline. A manuscript picks the reviewed works it may cite, so drafts and citation checks only see that selection; leaving everything ticked uses the whole matrix. Each section shows its word budget and checklist; AI actions are *Draft*, *Continue*, *Tighten*, and *Audit* (the audit reports structure, word budget, and citation hygiene).
- *Research* (`/research`) — three tools: ask grounded literature questions and keep a research log; synthesise all reviewed articles into themes, consensus, contradictions, gaps, candidate questions and hypotheses; and a supervisor chat that streams answers grounded in the notebook's own material.
- *Team* — invite collaborators by email as `viewer`, `editor`, or `owner`. Viewers get read-only UI; only owners can change membership.

**Global**
- *Cost & usage* (`/usage`) — every AI call is logged with model, token counts, latency, cost, and errors, grouped by feature and model over a selectable window.
- *Settings* (`/settings`) — profile, system status, model/cost configuration, data-and-privacy notes, sign out.

## 6. Cost and quality

The default configuration is deliberately cheap-but-grounded:

- **Research answers** run on `perplexity/sonar`, which performs its own web search and returns real citations — the cheapest way to get grounded literature answers. Step up to `sonar-pro` only when an answer genuinely needs deeper synthesis.
- **Extraction, drafting, and synthesis** run on `gemini-2.5-flash` — strong instruction-following at a low per-token price. `deepseek-chat-v3.1` is a comparable-value alternative; Claude/GPT models cost more for a modest quality gain on these tasks.
- **Repair and formatting** run on `gemini-2.5-flash-lite`.
- Every call is costed from a price table and written to the `ai_runs` ledger, so the **Cost & usage** page shows exactly what each feature spends. Set the model variables to your own trade-off at any time — no code changes.

**PDFs are read in your browser, not uploaded.** A journal PDF is heavy because of its embedded figures — the text inside is a small fraction of the file. `pdfjs-dist` rebuilds that text client-side (lazily, so it stays out of the shared bundle) and only the text is sent to the server; a 6 MB paper arrives as ~100 KB. This keeps every upload inside the request-body cap of serverless hosts such as Vercel (~4.5 MB) and never moves the binary. DOCX and TXT still go to the server, where parsing is in-memory only (`mammoth` for DOCX, `unpdf` for PDF). Nothing is written to disk or object storage. Only the extracted text you choose to keep, and the resulting review, are stored.

## 7. Project layout

```
src/
  app/
    (auth)/            login, register
    (app)/             dashboard, usage, settings,
                       notebooks/[id]/{reviews,review,manuscripts,research,team}
    api/               auth, notebooks, reviews (+analyze), manuscripts,
                       sections (draft/audit), research, synthesis,
                       assistant, export, usage, health
  components/          UI, one client component per screen
  db/                  Drizzle schema, lazy Neon client, seed
  lib/
    taxonomy.ts        the 11 TAXONOMY.xlsx columns, verbatim
    guideline.ts       section templates, word budgets, checklists
    extract.ts         server-side DOCX/text parsing (in-memory)
    upload.ts          browser-side PDF text rebuild before upload
    text.ts            shared text clean-up (no server deps)
    ai/                provider, prompts, review mapping
    validation.ts      Zod schemas for every endpoint
```

## 8. Data model

`users` → `notebooks` (owner) → `notebook_members` (roles) → `reviews` (the taxonomy rows), `manuscripts` → `manuscript_sections`, `research_queries`, and `ai_runs` (the cost ledger). Every read and write is authorised against the caller's membership in the notebook, so isolation is enforced server-side, not just hidden in the UI.
