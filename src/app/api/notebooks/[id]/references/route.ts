import { fail, ok, toErrorResponse } from "@/lib/api";
import { requireNotebookAccess } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { loadNotebookLibrary } from "@/lib/manuscripts";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/**
 * The notebook's reference library: every work the reviewed articles lean on,
 * deduped, with the articles that cite each one. The count is the signal for
 * which works are core to the field rather than incidental.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    await requireNotebookAccess(id, user.id, user.isAdmin);

    const { entries, rows } = await loadNotebookLibrary(id);

    const articles = rows
      .map((row) => ({
        reviewId: row.id,
        author: row.author,
        year: row.year,
        title: row.title,
        verdict: row.verdict,
        count: row.citedReferences?.length ?? 0,
        hasSource: row.hasSource,
      }))
      .sort((a, b) => a.author.localeCompare(b.author));

    return ok({
      library: entries,
      articles,
      totals: {
        references: entries.reduce((sum, entry) => sum + entry.citedBy.length, 0),
        unique: entries.length,
        core: entries.filter((entry) => entry.citedBy.length > 1).length,
        articles: rows.length,
        extracted: articles.filter((article) => article.count > 0).length,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
