import { fail, ok, toErrorResponse } from "@/lib/api";
import { verifyWebhookSignature, type WebhookEvent } from "@/lib/paystack";
import { confirmPurchase } from "@/lib/tokens";

export const runtime = "nodejs";

/**
 * Paystack webhook. The gateway is the source of truth: even if the user
 * closes the browser before the callback fires, this route confirms the
 * pending purchase and credits the tokens.
 *
 * Signature: HMAC-SHA512 of the raw body, keyed with the secret key, sent
 * as the x-paystack-signature header. Configure
 * https://<your-domain>/api/paystack/webhook in the Paystack dashboard.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    if (!verifyWebhookSignature(rawBody, signature)) {
      return fail("Invalid webhook signature.", 401);
    }

    const event = JSON.parse(rawBody) as WebhookEvent;
    const reference = event.data?.reference;
    if (event.event === "charge.success" && reference) {
      await confirmPurchase(reference);
    }

    // Paystack treats a 200 as delivered regardless of the body.
    return ok({ received: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
