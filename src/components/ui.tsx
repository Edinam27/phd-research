import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "ink";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-2 border border-accent hover:border-accent-2 shadow-sm disabled:bg-accent/60",
  secondary:
    "bg-card text-ink border border-line-2 hover:border-ink/40 hover:bg-paper-2 disabled:text-muted",
  ghost: "bg-transparent text-ink-2 border border-transparent hover:bg-paper-2 hover:border-line",
  danger: "bg-bad text-white border border-bad hover:bg-bad/90 shadow-sm",
  ink: "bg-ink text-white border border-ink hover:bg-ink-3",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9.5 px-3.5 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
  icon: "h-9 w-9 justify-center",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex items-center rounded-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-55",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
    >
      {loading ? <Spinner className="size-3.5" /> : null}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */

const CONTROL =
  "w-full rounded-sm border border-line-2 bg-card px-3 py-2 text-sm text-ink transition-colors " +
  "placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 " +
  "disabled:bg-paper-2 disabled:text-muted";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(CONTROL, "h-9.5", className)} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(CONTROL, "leading-relaxed", className)} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(CONTROL, "h-9.5 cursor-pointer pr-8", className)}>
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  counter,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  counter?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label ? (
        <span className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-medium text-ink-2">
            {label}
            {required ? <span className="ml-0.5 text-bad">*</span> : null}
          </span>
          {counter ? <span className="font-mono text-[11px] text-muted">{counter}</span> : null}
        </span>
      ) : null}
      {children}
      {hint && !error ? <span className="mt-1.5 block text-xs leading-relaxed text-muted">{hint}</span> : null}
      {error ? <span className="mt-1.5 block text-xs text-bad">{error}</span> : null}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn("rounded-md border border-line bg-card shadow-[0_1px_2px_rgba(16,19,25,0.04)]", className)}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  eyebrow?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">{eyebrow}</p>
        ) : null}
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted", className)}>{children}</p>
  );
}

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

type Tone = "neutral" | "accent" | "good" | "warn" | "bad";

const TONES: Record<Tone, string> = {
  neutral: "bg-paper-2 text-ink-2 border-line-2",
  accent: "bg-accent-soft text-accent-ink border-accent/25",
  good: "bg-good-soft text-good border-good/25",
  warn: "bg-warn-soft text-warn border-warn/25",
  bad: "bg-bad-soft text-bad border-bad/25",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-4 animate-spin", className)} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Progress({
  value,
  max = 100,
  tone = "accent",
  className,
}: {
  value: number;
  max?: number;
  tone?: "accent" | "good" | "warn";
  className?: string;
}) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const fill = tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : "bg-accent";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-paper-2", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", fill)} style={{ width: `${percent}%` }} />
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="rounded-md border border-line bg-card px-4 py-3.5">
      <div className="flex items-center gap-2">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">{label}</p>
        {tone !== "neutral" ? <span className={cn("size-1.5 rounded-full", TONES[tone].split(" ")[0])} /> : null}
      </div>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-[12px] text-muted">{sub}</p> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon ? <div className="mb-3 text-muted/70">{icon}</div> : null}
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {description ? <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Alert({
  tone = "bad",
  title,
  children,
  action,
  className,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const border =
    tone === "bad" ? "border-bad/30" : tone === "good" ? "border-good/30" : tone === "warn" ? "border-warn/30" : "border-line-2";
  return (
    <div className={cn("flex items-start gap-3 rounded-sm border bg-card px-3.5 py-3", border, className)}>
      <div className="min-w-0 flex-1">
        {title ? <p className="text-[13px] font-medium text-ink">{title}</p> : null}
        <div className="text-[13px] leading-relaxed text-ink-2">{children}</div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Small inline meter used in tight table cells. */
export function MiniMeter({ percent, tone = "accent" }: { percent: number; tone?: "accent" | "good" | "warn" }) {
  const fill = tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : "bg-accent";
  return (
    <span className="inline-flex items-center gap-1.5" title={`${percent}% complete`}>
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-paper-2">
        <span className={cn("block h-full rounded-full", fill)} style={{ width: `${Math.min(100, percent)}%` }} />
      </span>
      <span className="font-mono text-[11px] text-muted tabular-nums">{percent}%</span>
    </span>
  );
}
