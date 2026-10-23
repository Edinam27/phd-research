import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  manuscriptSections,
  manuscripts,
  reviews,
  type Manuscript,
  type ManuscriptSection,
  type Notebook,
  type Review,
} from "@/db/schema";
import { AccessError, requireNotebookAccess, type NotebookRole } from "@/lib/access";
import { getSections, type GuidelineSection, type ManuscriptKind, type StudyType } from "@/lib/guideline";
import { countWords } from "@/lib/utils";

/**
 * The reviews a manuscript is allowed to cite: its own selection when it has
 * one, otherwise every review in the notebook. Excluded rows never qualify.
 */
export function selectEvidence(all: Review[], evidenceIds: string[]): Review[] {
  const chosen = evidenceIds.length > 0 ? all.filter((review) => evidenceIds.includes(review.id)) : all;
  return chosen.filter((review) => review.verdict !== "exclude");
}

export type ManuscriptContext = {
  manuscript: Manuscript;
  notebook: Notebook;
  role: NotebookRole;
};

export async function loadManuscriptContext(
  manuscriptId: string,
  userId: string,
): Promise<ManuscriptContext> {
  const rows = await db.select().from(manuscripts).where(eq(manuscripts.id, manuscriptId)).limit(1);
  const manuscript = rows[0];
  if (!manuscript) throw new AccessError("Manuscript not found.", 404);
  const { notebook, role } = await requireNotebookAccess(manuscript.notebookId, userId);
  return { manuscript, notebook, role };
}

export type SectionContext = ManuscriptContext & {
  section: ManuscriptSection;
  siblings: ManuscriptSection[];
  evidence: Review[];
  template: GuidelineSection;
};

/** Shared loader for every route that acts on a single manuscript section. */
export async function loadSectionContext(
  manuscriptId: string,
  sectionId: string,
  userId: string,
): Promise<SectionContext> {
  const context = await loadManuscriptContext(manuscriptId, userId);

  const sectionRows = await db
    .select()
    .from(manuscriptSections)
    .where(and(eq(manuscriptSections.id, sectionId), eq(manuscriptSections.manuscriptId, manuscriptId)))
    .limit(1);
  const section = sectionRows[0];
  if (!section) throw new AccessError("Section not found.", 404);

  const [siblings, evidence] = await Promise.all([
    db.select().from(manuscriptSections).where(eq(manuscriptSections.manuscriptId, manuscriptId)),
    db.select().from(reviews).where(eq(reviews.notebookId, context.manuscript.notebookId)),
  ]);

  const template = templateFor(context.manuscript, section.sectionKey);

  return {
    ...context,
    section,
    siblings: siblings.sort((a, b) => a.position - b.position),
    evidence: selectEvidence(evidence, context.manuscript.evidenceIds),
    template,
  };
}

export function templateFor(manuscript: Manuscript, sectionKey: string): GuidelineSection {
  const sections = getSections(manuscript.kind as ManuscriptKind, manuscript.studyType as StudyType);
  return sections.find((entry) => entry.key === sectionKey) ?? sections[0];
}

export async function createManuscriptWithSections(input: {
  notebookId: string;
  createdById: string;
  title: string;
  kind: ManuscriptKind;
  studyType: StudyType;
  researchType?: string;
  evidenceIds?: string[];
  targetJournal?: string | null;
  status?: string;
  abstract?: string | null;
  keywords?: string[];
}): Promise<Manuscript> {
  const inserted = await db
    .insert(manuscripts)
    .values({
      notebookId: input.notebookId,
      createdById: input.createdById,
      title: input.title,
      kind: input.kind,
      studyType: input.studyType,
      researchType: input.researchType ?? "empirical",
      evidenceIds: input.evidenceIds ?? [],
      targetJournal: input.targetJournal ?? null,
      status: input.status ?? "draft",
      abstract: input.abstract ?? null,
      keywords: input.keywords ?? [],
    })
    .returning();

  const manuscript = inserted[0];
  await seedSections(manuscript.id, input.kind, input.studyType);
  return manuscript;
}

async function seedSections(
  manuscriptId: string,
  kind: ManuscriptKind,
  studyType: StudyType,
): Promise<void> {
  const template = getSections(kind, studyType);
  if (template.length === 0) return;

  await db
    .insert(manuscriptSections)
    .values(
      template.map((section, index) => ({
        manuscriptId,
        sectionKey: section.key,
        heading: section.heading,
        content: "",
        wordMin: section.wordMin,
        wordMax: section.wordMax,
        position: index,
        status: "empty",
        checklistState: {},
      })),
    )
    .onConflictDoNothing();
}

/**
 * Keeps the section list aligned with the template after the manuscript's kind
 * or study type changes. Sections that carry writing are never removed.
 */
export async function syncSections(
  manuscriptId: string,
  kind: ManuscriptKind,
  studyType: StudyType,
): Promise<void> {
  const existing = await db
    .select()
    .from(manuscriptSections)
    .where(eq(manuscriptSections.manuscriptId, manuscriptId))
    .orderBy(asc(manuscriptSections.position));

  const template = getSections(kind, studyType);
  const templateKeys = new Set(template.map((section) => section.key));

  await seedSections(manuscriptId, kind, studyType);

  for (const [index, section] of template.entries()) {
    await db
      .update(manuscriptSections)
      .set({
        position: index,
        heading: section.heading,
        wordMin: section.wordMin,
        wordMax: section.wordMax,
      })
      .where(
        and(
          eq(manuscriptSections.manuscriptId, manuscriptId),
          eq(manuscriptSections.sectionKey, section.key),
        ),
      );
  }

  const stale = existing.filter(
    (section) => !templateKeys.has(section.sectionKey) && section.content.trim().length === 0,
  );
  for (const section of stale) {
    await db.delete(manuscriptSections).where(eq(manuscriptSections.id, section.id));
  }
}

export async function loadSections(manuscriptId: string): Promise<ManuscriptSection[]> {
  return db
    .select()
    .from(manuscriptSections)
    .where(eq(manuscriptSections.manuscriptId, manuscriptId))
    .orderBy(asc(manuscriptSections.position));
}

export function manuscriptWordCount(sections: ManuscriptSection[]): number {
  return sections.reduce((total, section) => total + countWords(section.content), 0);
}

export function sectionProgress(sections: ManuscriptSection[]): {
  total: number;
  complete: number;
  inProgress: number;
  percent: number;
  words: number;
} {
  const writing = sections.filter((section) => section.sectionKey !== "references");
  const complete = writing.filter((section) => section.status === "complete").length;
  const inProgress = writing.filter(
    (section) => section.status === "drafting" || (section.status === "empty" && section.content.trim().length > 0),
  ).length;
  return {
    total: writing.length,
    complete,
    inProgress,
    percent: writing.length === 0 ? 0 : Math.round((complete / writing.length) * 100),
    words: manuscriptWordCount(sections),
  };
}

/** Sections other than this one that already contain text, for continuity prompting. */
export function neighboursOf(
  sections: ManuscriptSection[],
  sectionKey: string,
): { heading: string; content: string }[] {
  return sections
    .filter((section) => section.sectionKey !== sectionKey && section.content.trim().length > 0)
    .map((section) => ({ heading: section.heading, content: section.content }));
}

/** Citation hygiene: every Author (Year) anchor must exist in the evidence matrix. */
export function uncitedAnchors(content: string, anchors: string[]): string[] {
  if (!content.trim()) return [];
  const known = anchors.map((anchor) => anchor.toLowerCase());
  const matches = content.match(/[A-Z][A-Za-z'’-]+(?:\s+(?:and|&)\s+[A-Z][A-Za-z'’-]+)?(?:\s+et\s+al\.?)?\s*\(\d{4}[a-z]?\)/g) ?? [];
  const unknown = new Set<string>();
  for (const match of matches) {
    const surname = match.split(/[\s(]/)[0].toLowerCase();
    if (surname.length < 3) continue;
    if (!known.some((anchor) => anchor.includes(surname))) unknown.add(match.trim());
  }
  return Array.from(unknown).slice(0, 25);
}
