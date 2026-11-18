import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { tokenLedger } from "@/db/schema";
import { fail, ok, toErrorResponse } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { GHS_PER_USD_RATE, getTokenBalance, TOKEN_PACKS } from "@/lib/tokens";

export const runtime = "nodejs";

/** The wallet view: balance, pack catalogue, burn by feature and the ledger. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const checkoutCurrency = (process.env.PAYSTACK_CURRENCY ?? "GHS").toUpperCase();

    const [balance, byFeature, ledger] = await Promise.all([
      getTokenBalance(user.id),
      db
        .select({
          feature: tokenLedger.feature,
          tokens: sql<number>`coalesce(sum(abs(${tokenLedger.tokens})), 0)`,
          calls: sql<number>`count(*)`,
        })
        .from(tokenLedger)
        .where(sql`${tokenLedger.userId} = ${user.id} and ${tokenLedger.kind} = 'spend'`)
        .groupBy(tokenLedger.feature)
        .orderBy(desc(sql`sum(abs(${tokenLedger.tokens}))`)),
      db
        .select({
          id: tokenLedger.id,
          kind: tokenLedger.kind,
          tokens: tokenLedger.tokens,
          status: tokenLedger.status,
          amountMinor: tokenLedger.amountMinor,
          currency: tokenLedger.currency,
          feature: tokenLedger.feature,
          note: tokenLedger.note,
          createdAt: tokenLedger.createdAt,
        })
        .from(tokenLedger)
        .where(eq(tokenLedger.userId, user.id))
        .orderBy(desc(tokenLedger.createdAt))
        .limit(40),
    ]);

    return ok({
      balance,
      packs: TOKEN_PACKS,
      checkout: {
        currency: checkoutCurrency,
        /** Dollars per unit of the checkout currency; 1 when charging in USD. */
        usdRate: checkoutCurrency === "USD" ? 1 : GHS_PER_USD_RATE,
      },
      byFeature: byFeature.map((row) => ({
        feature: row.feature ?? "other",
        tokens: Number(row.tokens),
        calls: Number(row.calls),
      })),
      ledger,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
