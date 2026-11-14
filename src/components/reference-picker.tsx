"use client";

import { Badge } from "@/components/ui";
import { REFERENCE_ROLE_LABELS } from "@/lib/reference-labels";
import type { ReferenceLibraryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "Smith and Jones (2019)" — how a library work reads in the running text. */
export function libraryLabel(entry: { authors: string; year: number | null }): string {
  const authors = entry.authors.trim() || "Untitled work";
  return entry.year ? `${authors} (${entry.year})` : authors;
}

/**
 * Chooses which works from the notebook's reference library a manuscript may
 * cite as secondary sources. An empty selection means the whole library, which
 * is how drafting behaved before the picker existed; ticking one work narrows
 * that to an explicit list.
 */
export function ReferencePicker({
  options,
  selected,
  onChange,
  disabled = false,
}: {
  options: ReferenceLibraryEntry[];
  selected: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
}) {
  const chosen = selected.filter((key) => options.some((option) => option.key === key));
  const everything = chosen.length === 0 || chosen.length === options.length;
  const included = everything ? options.map((option) => option.key) : chosen;

  const toggle = (key: string) => {
    const next = included.includes(key)
      ? included.filter((entry) => entry !== key)
      : [...included, key];
    // A complete selection is the same as no selection, so store it as empty.
    onChange(next.length === options.length ? [] : next);
  };

  if (options.length === 0) {
    return (
      <div className="rounded-sm border border-line px-3 py-4 text-[12.5px] text-muted">
        No cited works have been extracted yet. Open the References tab and extract them from your
        reviewed articles first.
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-line">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="font-mono text-[11px] text-muted">
          {included.length} of {options.length} works included
        </span>
        {everything ? (
          <span className="text-[11.5px] text-muted">Using the whole library</span>
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
        {options.map((option) => (
          <label
            key={option.key}
            className={cn(
              "flex items-start gap-2.5 px-3 py-2 transition-colors",
              disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-paper-2",
            )}
          >
            <input
              type="checkbox"
              className="mt-0.5 size-3.5 shrink-0 accent-accent"
              checked={included.includes(option.key)}
              disabled={disabled}
              onChange={() => toggle(option.key)}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] text-ink">{libraryLabel(option)}</span>
              {option.title ? (
                <span className="mt-0.5 block truncate text-[11.5px] text-muted">{option.title}</span>
              ) : null}
            </span>
            <Badge tone={option.citedBy.length > 1 ? "accent" : "neutral"}>
              cited by {option.citedBy.length}
            </Badge>
          </label>
        ))}
      </div>
    </div>
  );
}

export function roleLabels(roles: ReferenceLibraryEntry["roles"]): string {
  return roles.map((role) => REFERENCE_ROLE_LABELS[role]).join(", ");
}
