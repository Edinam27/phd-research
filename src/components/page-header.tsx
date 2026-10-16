import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { SectionLabel } from "@/components/ui";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  crumbs,
  actions,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-line bg-paper/60 px-5 py-5 sm:px-7">
      <div className="mx-auto max-w-[1500px]">
        {crumbs?.length ? (
          <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 ? <ChevronRight className="size-3 text-line-2" /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-ink">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-ink-2">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? <SectionLabel className="mb-1.5">{eyebrow}</SectionLabel> : null}
            <h1 className="font-serif text-[1.6rem] leading-tight tracking-tight text-ink">{title}</h1>
            {subtitle ? (
              <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-muted">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  );
}

export function PageBody({
  children,
  className,
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className={cn("px-5 py-6 sm:px-7", !wide && "mx-auto max-w-[1500px]", className)}>{children}</div>
  );
}
