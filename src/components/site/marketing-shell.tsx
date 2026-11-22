import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/**
 * Shared chrome for every public marketing page: ink header, paper canvas,
 * ink footer. Keeps the per-tab pages (how-it-works, pricing, why-kadi,
 * faq, blog) visually identical to the homepage without repeating the
 * header/footer markup in each.
 */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}