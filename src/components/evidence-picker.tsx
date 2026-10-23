"use client";

import { Badge } from "@/components/ui";
import type { Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The slice of an evidence-matrix row a manuscript picker needs. */
export type EvidenceOption = {
  id: string;
  author: string;
  year: number | null;
  title: string;
  verdict: Verdict;
};

export function citationLabel(work: { author: string; year: number | null }): string {
  const author = work.author.trim() || "Untitled work";
  return work.year ? `${author} (${work.year})` : author;
}

/**
 * Chooses which evidence-matrix rows a manuscript may cite. An empty selection
 * means every non-excluded work, which is how the notebook behaved before the
 * picker existed; ticking one work turns that into an explicit list.
 */
export function EvidencePicker({
  options,
  selected,
  onChange,
  disabled = false,
}: {
  options: EvidenceOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const usable = options.filter((option) => option.verdict !== "exclude");
  const chosen = selected.filter((id) => usable.some((option) => option.id === id));
  const everything = chosen.length === 0 || chosen.length === usable.length;
  const included = everything ? usable.map((option) => option.id) : chosen;

  const toggle = (id: string) => {
    const next = included.includes(id)
      ? included.filter((entry) => entry !== id)
      : [...included, id];
    // A complete selection is the same as no selection, so store it as empty.
    onChange(next.length === usable.length ? [] : next);
  };

  if (options.length === 0) {
    return (
      <div className="rounded-sm border border-line px-3 py-4 text-[12.5px] text-muted">
        The evidence matrix is empty, so there is nothing to choose yet.
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-line">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="font-mono text-[11px] text-muted">
          {included.length} of {usable.length} works included
        </span>
        {everything ? (
          <span className="text-[11.5px] text-muted">Using the whole matrix</span>
        ) : (
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={disabled}
            className="text-[11.5px] font-medium text-accent-ink transition-colors hover:text-accent disabled:opacity-60"
          >
            Include all
          </button>
        )}
      </div>

      <div className="max-h-56 divide-y divide-line overflow-y-auto">
        {options.map((option) => {
          const excluded = option.verdict === "exclude";
          return (
            <label
              key={option.id}
              className={cn(
                "flex items-start gap-2.5 px-3 py-2 transition-colors",
                excluded || disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-paper-2",
                excluded ? "opacity-55" : null,
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5 size-3.5 shrink-0 accent-accent"
                checked={!excluded && included.includes(option.id)}
                disabled={disabled || excluded}
                onChange={() => toggle(option.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] text-ink">
                  {citationLabel(option)}
                </span>
                {option.title ? (
                  <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                    {option.title}
                  </span>
                ) : null}
              </span>
              {option.verdict === "include" ? null : (
                <Badge tone={excluded ? "bad" : "warn"}>{option.verdict}</Badge>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
