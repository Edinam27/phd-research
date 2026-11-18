import { z } from "zod";

import { db } from "@/db";
import { tokenLedger } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fail, ok, toErrorResponse } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { PaystackConfigError, PaystackRequestError, verifyPurchase } from "@/lib/paystack";
import { confirmPurchase, getTokenBalance } from "@/lib/tokens";

export const runtime = "nodejs";

const verifySchema = z.object({
  reference: z.string().min(4).max(120),
});

/**
 * The callback page calls this after Paystack redirects back. It asks the
 * gateway directly, then confirms the pending ledger row at most once.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const reference = verifySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    ).reference;

    const rows = await db.select().from(tokenLedger).where(eq(tokenLedger.reference, reference)).limit(1);
    const purchase = rows[0];
    if (!purchase || purchase.userId !== user.id) {
      return fail("Unknown purchase reference.", 404);
    }
    if (purchase.status === "confirmed") {
      return ok({ status: "confirmed", balance: await getTokenBalance(user.id) });
    }

    const verification = await verifyPurchase(reference);
    if (!verification.paid) {
      return ok({ status: "pending", balance: await getTokenBalance(user.id) });
    }

    const credited = await confirmPurchase(reference);
    if (credited) {
      await db
        .update(tokenLedger)
        .set({
          amountMinor: verification.amountMinor ?? purchase.amountMinor,
          currency: verification.currency ?? purchase.currency,
          note: "Pack purchase — paid",
        })
        .where(eq(tokenLedger.id, purchase.id));
    }

    return ok({ status: "confirmed", balance: await getTokenBalance(user.id) });
  } catch (error) {
    if (error instanceof PaystackConfigError) return fail(error.message, 503);
    if (error instanceof PaystackRequestError) return fail(error.message, 502);
    return toErrorResponse(error);
  }
}
