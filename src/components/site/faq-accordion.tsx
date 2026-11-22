"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Faq } from "@/lib/faq";

/**
 * Accessible FAQ accordion. One open at a time; the answer region is always
 * in the DOM (so crawlers and AI engines see every answer) and toggled with
 * grid-rows for a smooth, dependency-free animation.
 */
export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<string | null>(faqs[0]?.question ?? null);

  return (
    <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
      {faqs.map((faq) => {
        const isOpen = open === faq.question;
        return (
          <div key={faq.question}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : faq.question)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-paper"
            >
              <span className="text-[14.5px] font-medium text-ink">{faq.question}</span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted transition-transform duration-300",
                  isOpen && "rotate-180 text-accent",
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-[13.5px] leading-relaxed text-ink-2">{faq.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}