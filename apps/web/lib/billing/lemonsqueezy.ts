import { createHmac, timingSafeEqual } from "node:crypto";
import type { Plan } from "../plans";

/** Statuses Lemon Squeezy reports for a subscription (mirrors the db enum). */
export const SUBSCRIPTION_STATUSES = ["on_trial", "active", "paused", "past_due", "unpaid", "cancelled", "expired"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface SubscriptionUpsert {
  userId: string;
  providerSubscriptionId: string;
  providerCustomerId: string;
  variantId: string;
  plan: Plan;
  status: SubscriptionStatus;
  renewsAt: Date | null;
  endsAt: Date | null;
  /** When Lemon Squeezy last changed the subscription; orders out-of-order deliveries. */
  providerUpdatedAt: Date | null;
  portalUrl: string | null;
}

export type WebhookOutcome =
  | { kind: "upsert"; event: string; subscription: SubscriptionUpsert }
  | { kind: "ignored"; event: string; reason: string };

/** `X-Signature` is the hex HMAC-SHA256 of the raw body with the webhook signing secret. */
export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "utf8");
  const given = Buffer.from(signature, "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Maps variant ids to plans from `LEMONSQUEEZY_VARIANT_PRO` / `_POWER` (comma-separated: monthly, yearly…). */
export function variantPlans(env: Record<string, string | undefined> = process.env): Map<string, Plan> {
  const map = new Map<string, Plan>();
  for (const [plan, key] of [["pro", "LEMONSQUEEZY_VARIANT_PRO"], ["power", "LEMONSQUEEZY_VARIANT_POWER"]] as const) {
    for (const id of (env[key] ?? "").split(",").map((s) => s.trim()).filter(Boolean)) map.set(id, plan);
  }
  return map;
}

const date = (value: unknown) => (typeof value === "string" && value ? new Date(value) : null);

/** Turns a verified webhook payload into the subscription row to store, or a reason to ignore it. */
export function parseWebhook(payload: unknown, plans: Map<string, Plan>): WebhookOutcome {
  const body = payload as {
    meta?: { event_name?: string; custom_data?: { user_id?: unknown } };
    data?: { type?: string; id?: string | number; attributes?: Record<string, unknown> };
  };
  const event = body.meta?.event_name ?? "unknown";
  if (!event.startsWith("subscription_") || body.data?.type !== "subscriptions") {
    return { kind: "ignored", event, reason: "not a subscription event" };
  }

  const attrs = body.data.attributes ?? {};
  const userId = body.meta?.custom_data?.user_id;
  if (typeof userId !== "string" || !userId) return { kind: "ignored", event, reason: "missing custom_data.user_id" };

  const variantId = String(attrs.variant_id ?? "");
  const plan = plans.get(variantId);
  if (!plan) return { kind: "ignored", event, reason: `unknown variant ${variantId}` };

  const status = attrs.status as SubscriptionStatus;
  if (!SUBSCRIPTION_STATUSES.includes(status)) return { kind: "ignored", event, reason: `unknown status ${String(attrs.status)}` };

  const urls = (attrs.urls ?? {}) as { customer_portal?: string };
  return {
    kind: "upsert",
    event,
    subscription: {
      userId,
      providerSubscriptionId: String(body.data.id),
      providerCustomerId: String(attrs.customer_id ?? ""),
      variantId,
      plan,
      status,
      renewsAt: date(attrs.renews_at),
      endsAt: date(attrs.ends_at),
      providerUpdatedAt: date(attrs.updated_at),
      portalUrl: urls.customer_portal ?? null,
    },
  };
}

/** Creates a hosted checkout for one variant, tagged with our user id so the webhook can find them. */
export async function createCheckout(input: {
  variantId: string;
  userId: string;
  email: string;
  redirectUrl: string;
}): Promise<string> {
  const { LEMONSQUEEZY_API_KEY: key, LEMONSQUEEZY_STORE_ID: store } = process.env;
  if (!key || !store) throw new Error("Lemon Squeezy is not configured");

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      accept: "application/vnd.api+json",
      "content-type": "application/vnd.api+json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: { email: input.email, custom: { user_id: input.userId } },
          product_options: { redirect_url: input.redirectUrl },
        },
        relationships: {
          store: { data: { type: "stores", id: store } },
          variant: { data: { type: "variants", id: input.variantId } },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Lemon Squeezy checkout failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data?: { attributes?: { url?: string } } };
  const url = json.data?.attributes?.url;
  if (!url) throw new Error("Lemon Squeezy checkout returned no url");
  return url;
}
