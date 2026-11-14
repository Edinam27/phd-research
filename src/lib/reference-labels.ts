import type { ReferenceRole } from "@/db/schema";

/**
 * Client-safe labels for the reference roles. Kept apart from
 * `@/lib/references` so a browser component can import them without pulling
 * the database schema into the bundle.
 */
export const REFERENCE_ROLE_LABELS: Record<ReferenceRole, string> = {
  theory: "Theory",
  concept: "Concept",
  "prior-evidence": "Prior evidence",
  method: "Method",
  context: "Context",
};
