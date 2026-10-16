"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BookOpenCheck,
  Coins,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  Plus,
  Settings,
  X,
} from "lucide-react";

import { cn, initials } from "@/lib/utils";
import { postJson, getJson } from "@/lib/client";
import type { NotebookSummary } from "@/lib/types";
import { Badge, Button, Spinner } from "@/components/ui";

export type ShellUser = {
  id: string;
  name: string;
  email: string;
  institution: string | null;
  discipline: string | null;
  academicRole: string | null;
};

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/usage", label: "Cost & usage", icon: Coins },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notebooks, setNotebooks] = useState<NotebookSummary[] | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const loadNotebooks = useCallback(async () => {
    try {
      const data = await getJson<{ notebooks: NotebookSummary[] }>("/api/notebooks");
      setNotebooks(data.notebooks ?? []);
    } catch {
      setNotebooks([]);
    }
  }, []);

  useEffect(() => {
    void loadNotebooks();
  }, [loadNotebooks, pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await postJson("/api/auth/logout", {});
    } catch {
      // the cookie is cleared regardless
    }
    router.replace("/login");
    router.refresh();
  };

  const activeNotebookId = pathname.match(/^\/notebooks\/([^/]+)/)?.[1] ?? null;

  const sidebar = (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="grid size-8 shrink-0 place-items-center rounded-sm bg-accent font-serif text-[15px] font-semibold">
          R
        </div>
        <div className="min-w-0">
          <p className="truncate font-serif text-[15px] leading-tight tracking-tight">Research Studio</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
            review · synthesise · publish
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto rounded-sm p-1.5 text-ink-muted hover:bg-ink-3 hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="px-2">
        {PRIMARY_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13.5px] transition-colors",
                active ? "bg-ink-3 text-white" : "text-ink-muted hover:bg-ink-2 hover:text-white",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-4 pb-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">Notebooks</p>
          <Link
            href="/dashboard?new=1"
            className="rounded-xs p-1 text-ink-muted transition-colors hover:bg-ink-3 hover:text-white"
            aria-label="New notebook"
            title="New notebook"
          >
            <Plus className="size-3.5" />
          </Link>
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {notebooks === null ? (
            <div className="flex items-center gap-2 px-2.5 py-2 text-[13px] text-ink-muted">
              <Spinner className="size-3.5" /> Loading…
            </div>
          ) : notebooks.length === 0 ? (
            <p className="px-2.5 py-2 text-[12.5px] leading-relaxed text-ink-muted">
              No notebooks yet. A notebook keeps one study&apos;s literature, drafts and AI spend together.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {notebooks.map((notebook) => {
                const active = notebook.id === activeNotebookId;
                return (
                  <li key={notebook.id}>
                    <Link
                      href={`/notebooks/${notebook.id}`}
                      className={cn(
                        "block rounded-sm px-2.5 py-2 transition-colors",
                        active ? "bg-ink-3" : "hover:bg-ink-2",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <NotebookPen className="size-3.5 shrink-0 text-ink-muted" />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-white">{notebook.title}</span>
                      </span>
                      <span className="mt-1 flex items-center gap-2 pl-5.5 font-mono text-[10px] text-ink-muted">
                        <span>{notebook.reviewCount} art.</span>
                        <span>·</span>
                        <span>{notebook.manuscriptCount} drafts</span>
                        {notebook.role !== "owner" ? (
                          <span className="ml-auto text-accent-soft/70">{notebook.role}</span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-ink-line px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-ink-3 text-[12px] font-medium text-white">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-white">{user.name}</p>
            <p className="truncate text-[11px] text-ink-muted">{user.academicRole ?? user.email}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="rounded-sm p-1.5 text-ink-muted transition-colors hover:bg-ink-3 hover:text-white disabled:opacity-50"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{sidebar}</aside>

      {open ? (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 shadow-2xl">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-paper/85 px-4 py-2.5 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu className="size-4" />
          </Button>
          <span className="flex items-center gap-2 font-serif text-[15px] tracking-tight">
            <BookOpenCheck className="size-4 text-accent" />
            Research Studio
          </span>
          <Badge tone="accent" className="ml-auto">
            {user.academicRole ?? "Researcher"}
          </Badge>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
