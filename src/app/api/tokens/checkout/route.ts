import { z } from "zod";

import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { PaystackConfigError, PaystackRequestError, initializePurchase, newPurchaseReference, purchaseCurrency } from "@/lib/paystack";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { findPack, writeLedgerEntry } from "@/lib/tokens";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  packId: z.string().min(1).max(40),
});

/** Starts a Paystack checkout for a token pack and records the pending purchase. */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("Sign in to continue.", 401);

    const limit = rateLimit(clientKey(request, "checkout"), 20, 60 * 60 * 1000);
    if (!limit.allowed) {
      return fail(`Too many checkout attempts. Try again in ${limit.retryAfter} seconds.`, 429);
    }

    const body = checkoutSchema.parse(await readJson(request));
    const pack = findPack(body.packId);
    if (!pack) return fail("That pack does not exist.", 404);

    const currency = purchaseCurrency();
    const reference = newPurchaseReference();
    const origin = process.env.APP_URL ?? new URL(request.url).origin;
    const callbackUrl = `${origin}/tokens?ref=${encodeURIComponent(reference)}`;

    // The pending row exists before the redirect: nothing is credited until
    // Paystack confirms, and the reference makes double-crediting impossible.
    await writeLedgerEntry({
      userId: user.id,
      kind: "purchase",
      tokens: pack.tokens,
      status: "pending",
      reference,
      amountMinor: pack.priceUsd * 100,
      currency,
      note: `${pack.name} — pending checkout`,
    });

    const authorizationUrl = await initializePurchase({
      email: user.email,
      amountMinor: pack.priceUsd * 100,
      reference,
      callbackUrl,
      metadata: { packId: pack.id, userId: user.id, tokens: pack.tokens },
    });

    return ok({ authorizationUrl, reference }, 201);
  } catch (error) {
    if (error instanceof PaystackConfigError) return fail(error.message, 503);
    if (error instanceof PaystackRequestError) return fail(error.message, 502);
    return toErrorResponse(error);
  }
}
