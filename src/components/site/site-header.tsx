import Link from "next/link";
import { Menu } from "lucide-react";

import { PRIMARY_NAV } from "@/lib/site";

/**
 * Shared marketing header for the public pages (homepage, per-tab pages,
 * blog, FAQ). Ink chrome bar, paper canvas — the same 60-30-10 palette as
 * the app itself, so a visitor crosses from the site into the studio with no
 * visual jolt.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-line bg-ink text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-sm bg-accent font-serif text-[15px] font-semibold text-white">
            K
          </span>
          <span className="font-serif text-[15px] font-semibold tracking-tight">Kadi Research Studio</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13.5px] text-ink-muted transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            className="hidden text-[13.5px] text-ink-muted transition-colors hover:text-white sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-accent px-4 py-2 text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-2"
          >
            Start free
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-md border border-ink-line p-2 text-ink-muted transition-colors hover:text-white md:hidden"
            aria-label="Menu"
          >
            <Menu className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}