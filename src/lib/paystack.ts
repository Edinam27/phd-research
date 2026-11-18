import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Paystack gateway client — used for token pack purchases.
 *
 * Keys come from the environment: PAYSTACK_SECRET_KEY for server calls and
 * PAYSTACK_PUBLIC_KEY for the browser. Nothing is hard-coded here.
 *
 * Flow: initializeTransaction returns a hosted checkout URL the user is
 * redirected to; confirmation arrives either through the webhook
 * (charge.success, signature-verified) or the verify call the callback page
 * makes. Whichever lands first confirms the pending ledger row.
 */

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export class PaystackConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaystackConfigError";
  }
}

export class PaystackRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaystackRequestError";
  }
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) {
    throw new PaystackConfigError(
      "PAYSTACK_SECRET_KEY is missing in .env.local — token purchases cannot be initialised.",
    );
  }
  return key;
}

export function publicKey(): string {
  const key = process.env.PAYSTACK_PUBLIC_KEY?.trim();
  if (!key) {
    throw new PaystackConfigError(
      "PAYSTACK_PUBLIC_KEY is missing in .env.local — token purchases cannot be started.",
    );
  }
  return key;
}

/**
 * GHS by default: Ghanaian Paystack accounts settle in cedis, so dollar
 * pack prices are converted at checkout using GHS_PER_USD. Set
 * PAYSTACK_CURRENCY=USD only if the account genuinely settles in dollars.
 */
export function purchaseCurrency(): string {
  return (process.env.PAYSTACK_CURRENCY ?? "GHS").toUpperCase();
}

export function newPurchaseReference(): string {
  return `kadi-${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
}

type InitializeResponse = {
  status: boolean;
  message: string;
  data?: { authorization_url?: string; reference?: string };
};

/** Opens a hosted Paystack checkout for a purchase and returns the redirect URL. */
export async function initializePurchase(input: {
  email: string;
  amountMinor: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountMinor,
      currency: purchaseCurrency(),
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
    }),
  });

  const payload = (await response.json().catch(() => null)) as InitializeResponse | null;
  if (!response.ok || !payload?.status || !payload.data?.authorization_url) {
    throw new PaystackRequestError(
      payload?.message ?? `Paystack checkout could not be started (HTTP ${response.status}).`,
    );
  }
  return payload.data.authorization_url;
}

type VerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
  };
};

export type PurchaseVerification = {
  paid: boolean;
  amountMinor: number | null;
  currency: string | null;
};

/** Asks Paystack whether a reference was paid, and for how much. */
export async function verifyPurchase(reference: string): Promise<PurchaseVerification> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });

  const payload = (await response.json().catch(() => null)) as VerifyResponse | null;
  if (!response.ok || !payload?.status) {
    throw new PaystackRequestError(payload?.message ?? `Paystack verification failed (HTTP ${response.status}).`);
  }

  const paid = payload.data?.status === "success";
  return {
    paid,
    amountMinor: paid ? (payload.data?.amount ?? null) : null,
    currency: paid ? (payload.data?.currency ?? null) : null,
  };
}

/** Webhook requests are signed with HMAC-SHA512 of the raw body using the secret key. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type WebhookEvent = {
  event?: string;
  data?: { reference?: string; status?: string; amount?: number; currency?: string };
};
