import { z } from "zod";

import { fail, ok, readJson, toErrorResponse } from "@/lib/api";
import { appOrigin, getCurrentUser } from "@/lib/auth";
import { PaystackConfigError, PaystackRequestError, initializePurchase, newPurchaseReference } from "@/lib/paystack";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { checkoutAmount, findPack, writeLedgerEntry } from "@/lib/tokens";

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

    // Pack prices are authored in dollars; the gateway is charged in the
    // account's settlement currency — the cedi equivalent by default.
    const { amountMinor, currency } = checkoutAmount(pack);
    const reference = newPurchaseReference();
    // Where Paystack sends the buyer back to. Derived from the request so it is
    // the deployment the user is on, not a value frozen at build time.
    const origin = appOrigin(request);
    const callbackUrl = `${origin}/tokens?ref=${encodeURIComponent(reference)}`;

    // The pending row exists before the redirect: nothing is credited until
    // Paystack confirms, and the reference makes double-crediting impossible.
    await writeLedgerEntry({
      userId: user.id,
      kind: "purchase",
      tokens: pack.tokens,
      status: "pending",
      reference,
      amountMinor,
      currency,
      note: `${pack.name} — pending checkout ($${pack.priceUsd})`,
    });

    const authorizationUrl = await initializePurchase({
      email: user.email,
      amountMinor,
      reference,
      callbackUrl,
      metadata: { packId: pack.id, userId: user.id, tokens: pack.tokens, listPriceUsd: pack.priceUsd },
    });

    return ok({ authorizationUrl, reference }, 201);
  } catch (error) {
    if (error instanceof PaystackConfigError) return fail(error.message, 503);
    if (error instanceof PaystackRequestError) return fail(error.message, 502);
    return toErrorResponse(error);
  }
}
