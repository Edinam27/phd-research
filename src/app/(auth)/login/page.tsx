"use client";

import { LoginForm, SmokeyBackground } from "@/components/ui/login-form";

/**
 * Sign-in: an ink-and-smoke full-bleed panel with the glass LoginForm
 * floating at its centre. The animated cobalt shader backdrop runs behind
 * the card, matching the register page.
 */
export default function LoginPage() {
  return (
    <div className="relative -mx-6 -my-10 flex min-h-[70vh] flex-1 items-center justify-center overflow-hidden bg-ink px-6 py-12 sm:-mx-12 sm:px-12">
      <SmokeyBackground color="#2f4fd8" />
      <div className="relative z-10 flex w-full justify-center">
        <LoginForm />
      </div>
    </div>
  );
}