import { sql } from "drizzle-orm";

import { db } from "@/db";
import { tokenLedger, type LedgerKind } from "@/db/schema";

/**
 * The studio's internal token economy.
 *
 * A token is one model token (prompt or completion), charged 1:1 against a
 * prepaid balance. Margin is made at the pack level: packs are priced in
 * cedis above the blended cost of the models behind them, so profitability
 * is simply (packs sold) vs (underlying model spend), both of which the
 * admin overview reads off `ai_runs` and this ledger.
 *
 * Every movement is a row in `token_ledger`; the balance is the signed sum
 * of confirmed rows and is never stored or mutated.
 */

export class InsufficientTokensError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientTokensError";
  }
}

export type TokenPack = {
  id: string;
  name: string;
  tokens: number;
  /** Whole dollars the pack sells for. */
  priceUsd: number;
  /** One line on who the pack fits. */
  blurb: string;
};

/**
 * Pack catalogue. Prices are whole dollars; Paystack charges the amount in
 * cents. Tune freely — the ledger does not care where the numbers come
 * from, and past purchases keep the price they were sold at.
 */
export const TOKEN_PACKS: TokenPack[] = [
  {
    id: "starter",
    name: "Starter pack",
    tokens: 250_000,
    priceUsd: 10,
    blurb: "Roughly fifteen full article reviews or a term of drafts.",
  },
  {
    id: "research",
    name: "Research pack",
    tokens: 1_000_000,
    priceUsd: 25,
    blurb: "A working thesis season: reviews, synthesis and full drafts.",
  },
  {
    id: "department",
    name: "Department pack",
    tokens: 5_000_000,
    priceUsd: 50,
    blurb: "A lab or faculty group running several notebooks in parallel.",
  },
];

export function findPack(packId: string): TokenPack | undefined {
  return TOKEN_PACKS.find((pack) => pack.id === packId);
}

/**
 * Cedis per US dollar. Pack prices are authored in dollars but Paystack
 * Ghana accounts settle in cedis, so checkout converts at this rate — and
 * the admin margin panel converts model cost back the same way, keeping
 * both sides of the ledger in one currency.
 */
export const GHS_PER_USD_RATE = Number(process.env.GHS_PER_USD ?? 15.5);

/** The amount Paystack should charge for a pack, in its smallest subunit. */
export function checkoutAmount(pack: TokenPack): { amountMinor: number; currency: string } {
  const currency = (process.env.PAYSTACK_CURRENCY ?? "GHS").toUpperCase();
  const amountMinor =
    currency === "USD" ? pack.priceUsd * 100 : Math.round(pack.priceUsd * GHS_PER_USD_RATE) * 100;
  return { amountMinor, currency };
}

/** Free tokens credited when an account is created. */
export const STARTER_GRANT_TOKENS = Number(process.env.STARTER_GRANT_TOKENS ?? 100_000);

/** Block model calls once the balance falls to or below this reserve. */
export const MIN_BALANCE_TOKENS = 200;

export type LedgerInput = {
  userId: string;
  kind: LedgerKind;
  tokens: number;
  status?: "pending" | "confirmed";
  reference?: string | null;
  amountMinor?: number | null;
  currency?: string | null;
  feature?: string | null;
  aiRunId?: string | null;
  notebookId?: string | null;
  note?: string | null;
};

/** Appends one ledger row. Never mutates an existing row. */
export async function writeLedgerEntry(input: LedgerInput): Promise<void> {
  await db.insert(tokenLedger).values({
    userId: input.userId,
    kind: input.kind,
    tokens: input.tokens,
    status: input.status ?? "confirmed",
    reference: input.reference ?? null,
    amountMinor: input.amountMinor ?? null,
    currency: input.currency ?? null,
    feature: input.feature ?? null,
    aiRunId: input.aiRunId ?? null,
    notebookId: input.notebookId ?? null,
    note: input.note ?? null,
  });
}

/** The signed sum of confirmed ledger rows — the user's spendable balance. */
export async function getTokenBalance(userId: string): Promise<number> {
  const rows = await db
    .select({ balance: sql<number>`coalesce(sum(${tokenLedger.tokens}), 0)` })
    .from(tokenLedger)
    .where(sql`${tokenLedger.userId} = ${userId} and ${tokenLedger.status} = 'confirmed'`);
  return Number(rows[0]?.balance ?? 0);
}

/** Throws when the balance cannot cover a model call's reserve. */
export async function requireTokens(userId: string): Promise<void> {
  const balance = await getTokenBalance(userId);
  if (balance < MIN_BALANCE_TOKENS) {
    throw new InsufficientTokensError(
      "Your token balance is empty. Top up on the Tokens page to keep reviewing and drafting.",
    );
  }
}

/** Debits the tokens a finished model call actually consumed. */
export async function spendTokens(input: {
  userId: string;
  tokens: number;
  feature: string;
  aiRunId: string;
  notebookId?: string | null;
}): Promise<void> {
  if (input.tokens <= 0) return;
  await writeLedgerEntry({
    userId: input.userId,
    kind: "spend",
    tokens: -input.tokens,
    feature: input.feature,
    aiRunId: input.aiRunId,
    notebookId: input.notebookId ?? null,
  });
}

/** Credits an admin or starter grant, immediately confirmed. */
export async function grantTokens(input: {
  userId: string;
  tokens: number;
  kind: Extract<LedgerKind, "starter-grant" | "admin-grant">;
  note?: string | null;
}): Promise<void> {
  if (input.tokens <= 0) return;
  await writeLedgerEntry({
    userId: input.userId,
    kind: input.kind,
    tokens: input.tokens,
    note: input.note ?? null,
  });
}

/** Flips a pending purchase to confirmed exactly once; returns whether it credited. */
export async function confirmPurchase(reference: string): Promise<boolean> {
  const claimed = await db
    .update(tokenLedger)
    .set({ status: "confirmed" })
    .where(sql`${tokenLedger.reference} = ${reference} and ${tokenLedger.status} = 'pending'`)
    .returning({ id: tokenLedger.id });
  return claimed.length > 0;
}

/** Finds a pending purchase by its Paystack reference. */
export async function findPendingPurchase(reference: string) {
  const rows = await db
    .select()
    .from(tokenLedger)
    .where(sql`${tokenLedger.reference} = ${reference} and ${tokenLedger.status} = 'pending'`)
    .limit(1);
  return rows[0] ?? null;
}

/** Total tokens credited through a given kind, for admin reporting. */
export async function sumLedgerByKind(userId: string, kind: LedgerKind): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${tokenLedger.tokens}), 0)` })
    .from(tokenLedger)
    .where(sql`${tokenLedger.userId} = ${userId} and ${tokenLedger.kind} = ${kind}`);
  return Number(rows[0]?.total ?? 0);
}
