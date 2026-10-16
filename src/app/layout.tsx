import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PhD Research Studio",
    template: "%s · PhD Research Studio",
  },
  description:
    "Review literature against a fixed taxonomy, synthesise it, and draft publication-ready articles and proposals against your journal guideline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
