import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { reviews } from "@/db/schema";
import { fail, toErrorResponse } from "@/lib/api";
import { requireNotebookAccess } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { TAXONOMY_COLUMNS } from "@/lib/taxonomy";

export const runtime = "nodejs";
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

const EXTRA_COLUMNS: { header: string; get: (row: typeof reviews.$inferSelect) => string | number }[] = [
  { header: "APA citation", get: (row) => row.citation ?? "" },
  { header: "Method type", get: (row) => row.methodType ?? "" },
  { header: "Sample size", get: (row) => row.sampleSize ?? "" },
  { header: "Country", get: (row) => row.country ?? "" },
  { header: "Context", get: (row) => row.context ?? "" },
  { header: "Data analysis", get: (row) => row.dataAnalysis ?? "" },
  { header: "Key variables", get: (row) => (row.keyVariables ?? []).join("; ") },
  { header: "Hypotheses tested", get: (row) => (row.hypotheses ?? []).join("; ") },
  { header: "Gap tags", get: (row) => (row.gapTags ?? []).join("; ") },
  { header: "Rigour (1-10)", get: (row) => row.scoreRigour ?? "" },
  { header: "Relevance (1-10)", get: (row) => row.scoreRelevance ?? "" },
  { header: "Novelty (1-10)", get: (row) => row.scoreNovelty ?? "" },
  { header: "Clarity (1-10)", get: (row) => row.scoreClarity ?? "" },
  { header: "Overall (1-10)", get: (row) => row.overallScore ?? "" },
  { header: "Verdict", get: (row) => row.verdict },
  { header: "Strengths", get: (row) => row.strengths ?? "" },
  { header: "Weaknesses", get: (row) => row.weaknesses ?? "" },
  { header: "Use in manuscript", get: (row) => row.useInManuscript ?? "" },
  { header: "Reviewer notes", get: (row) => row.reviewerNotes ?? "" },
  { header: "Source file", get: (row) => row.sourceFilename ?? "" },
  { header: "AI model", get: (row) => row.aiModel ?? "" },
];

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "notebook"
  );
}

/** Exports the review matrix in the exact TAXONOMY.xlsx column order. */
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const { id } = await params;
    const { notebook } = await requireNotebookAccess(id, user.id);

    const rows = await db
      .select()
      .from(reviews)
      .where(eq(reviews.notebookId, id))
      .orderBy(asc(reviews.author), asc(reviews.year));

    const format = (new URL(request.url).searchParams.get("format") ?? "xlsx").toLowerCase();
    const base = `${slug(notebook.title)}-literature-matrix`;

    if (format === "json") {
      return new Response(JSON.stringify({ notebook, reviews: rows }, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${base}.json"`,
        },
      });
    }

    const headers = [
      ...TAXONOMY_COLUMNS.map((column) => column.header),
      ...EXTRA_COLUMNS.map((column) => column.header),
    ];

    const dataRows = rows.map((row) => [
      ...TAXONOMY_COLUMNS.map((column) => {
        const value = row[column.field];
        return value === null || value === undefined ? "" : value;
      }),
      ...EXTRA_COLUMNS.map((column) => column.get(row)),
    ]);

    if (format === "csv") {
      const escape = (value: string | number) => {
        const text = String(value ?? "");
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      };
      const csv = [headers, ...dataRows].map((line) => line.map(escape).join(",")).join("\r\n");
      return new Response(`\uFEFF${csv}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${base}.csv"`,
        },
      });
    }

    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "PhD Research Studio";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Literature matrix", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.addRow(headers);
    for (const row of dataRows) sheet.addRow(row);

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    headerRow.alignment = { vertical: "middle", wrapText: true };
    headerRow.height = 30;

    headers.forEach((header, index) => {
      const column = sheet.getColumn(index + 1);
      column.width = TAXONOMY_COLUMNS[index]?.kind === "long" ? 46 : 20;
      if (!TAXONOMY_COLUMNS[index]) column.width = 22;
      column.alignment = { vertical: "top", wrapText: true };
      if (!header) column.width = 22;
    });

    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

    const notes = workbook.addWorksheet("Reading notes");
    notes.addRow(["How this file was produced"]);
    notes.getRow(1).font = { bold: true };
    notes.addRow([
      `Notebook: ${notebook.title} · exported ${new Date().toISOString().slice(0, 10)} · ${rows.length} article reviews`,
    ]);
    notes.addRow([
      "Columns A-K follow the TAXONOMY.xlsx layout: Author, Year, Title, Journal, Problems/Gaps, Objectives, Theory, Empirical findings of past research, Methodology, Key Findings, Limitations.",
    ]);
    notes.addRow(["Columns L onwards carry reviewer enrichment and the critical appraisal scorecard."]);
    notes.addRow(["AI-drafted values are marked in the 'AI model' column and must be verified before use."]);
    notes.getColumn(1).width = 120;
    notes.getColumn(1).alignment = { wrapText: true };

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${base}.xlsx"`,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
