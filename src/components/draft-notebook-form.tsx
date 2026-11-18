"use client";

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";

import { Alert, Button, Card } from "@/components/ui";
import { ApiError } from "@/lib/client";

type ImportResponse = {
  notebook: { id: string; title: string };
  manuscript: { id: string; title: string };
  imported: { filename: string; chars: number; sectionsFilled: number; sections: number };
};

const ACCEPT = ".pdf,.docx,.txt,application/pdf,text/plain";

/** Upload an existing draft; the studio builds the notebook around it. */
export function DraftNotebookForm({
  onImported,
}: {
  onImported: (result: ImportResponse) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("Choose the draft file first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/notebooks/from-draft", { method: "POST", body });
      const payload = (await response.json()) as ImportResponse & { error?: string };
      if (!response.ok) {
        throw new ApiError(payload.error ?? "The draft could not be imported.", response.status, payload);
      }
      onImported(payload);
    } catch (thrown) {
      setError(
        thrown instanceof ApiError
          ? thrown.message
          : "The draft could not be imported. Check the file and try again.",
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <Alert tone="bad">{error}</Alert> : null}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center gap-2 rounded-sm border border-dashed border-line-2 bg-paper-2 px-5 py-8 text-center transition-colors hover:border-accent"
      >
        <FileUp className="size-5 text-accent" />
        <span className="text-[13.5px] font-medium text-ink">
          {file ? file.name : "Choose your draft"}
        </span>
        <span className="text-[12px] text-muted">PDF, DOCX or text — up to 12 MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
          setError(null);
        }}
      />

      <Card className="bg-paper-2 shadow-none">
        <div className="px-4 py-3 text-[12.5px] leading-relaxed text-ink-2">
          The studio reads the draft once, sets up the notebook around the study it finds — area,
          problem, variables, theory — and places your existing prose into the guideline&apos;s
          sections. Nothing is rewritten; you continue from your own words.
        </div>
      </Card>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full justify-center"
        loading={busy}
        disabled={!file}
      >
        {busy ? "Reading the draft — this can take a minute…" : "Build the notebook from this draft"}
      </Button>
    </form>
  );
}
