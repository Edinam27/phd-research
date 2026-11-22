import Link from "next/link";
import { Mail } from "lucide-react";

import { PRIMARY_NAV } from "@/lib/site";

/**
 * Shared marketing footer. Mirrors the ink chrome of the header and the app
 * sidebar, with real contact detail and an email/WhatsApp path so the site
 * reads as a real, reachable business — a trust signal for both users and
 * search engines.
 */
export function SiteFooter() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@kadistudio.app";
  const supportWhatsApp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim() || null;

  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-sm bg-accent font-serif text-[15px] font-semibold text-white">
                K
              </span>
              <span className="font-serif text-[15px] font-semibold tracking-tight">Kadi Research Studio</span>
            </Link>
            <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-ink-muted">
              A research studio for doctoral work: review to your taxonomy, synthesise the field, and draft to
              your journal&apos;s guideline. The tabulating is automated; the judgement stays yours.
            </p>
          </div>

          <div>
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">Explore</h3>
            <ul className="mt-4 space-y-2.5">
              {PRIMARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-[13.5px] text-ink-muted transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">Contact</h3>
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-ink-muted">
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0 text-accent-soft" />
                <a href={`mailto:${supportEmail}`} className="transition-colors hover:text-white">
                  {supportEmail}
                </a>
              </li>
              {supportWhatsApp ? (
                <li className="text-ink-muted">WhatsApp support available</li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-ink-line pt-6">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">
            © {new Date().getFullYear()} Kadi Research Studio
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted/70">
            Payments by Paystack
          </p>
        </div>
      </div>
    </footer>
  );
}