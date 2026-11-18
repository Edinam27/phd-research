import { Suspense } from "react";

import { UsageClient } from "@/components/usage-client";

export const metadata = { title: "Tokens & usage" };

export default function UsagePage() {
  return (
    <Suspense fallback={null}>
      <UsageClient />
    </Suspense>
  );
}
