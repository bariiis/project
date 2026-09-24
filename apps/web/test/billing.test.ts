import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseWebhook, variantPlans, verifySignature } from "../lib/billing/lemonsqueezy";
import { planFromSubscriptions } from "../lib/plans";

const plans = variantPlans({ LEMONSQUEEZY_VARIANT_PRO: "101, 102", LEMONSQUEEZY_VARIANT_POWER: "201" });

function payload(overrides: Record<string, unknown> = {}, meta: Record<string, unknown> = {}) {
  return {
    meta: { event_name: "subscription_created", custom_data: { user_id: "u1" }, ...meta },
    data: {
      type: "subscriptions",
      id: "sub_9",
      attributes: {
        customer_id: 55,
        variant_id: 102,
        status: "active",
        renews_at: "2026-10-24T00:00:00.000000Z",
        ends_at: null,
        urls: { customer_portal: "https://store.lemonsqueezy.com/billing?x=1" },
        ...overrides,
      },
    },
  };
}

describe("verifySignature", () => {
  it("accepts the hex HMAC of the raw body and rejects anything else", () => {
    const body = JSON.stringify(payload());
    const sig = createHmac("sha256", "s3cret").update(body).digest("hex");
    expect(verifySignature(body, sig, "s3cret")).toBe(true);
    expect(verifySignature(body + " ", sig, "s3cret")).toBe(false);
    expect(verifySignature(body, sig, "other")).toBe(false);
    expect(verifySignature(body, null, "s3cret")).toBe(false);
    expect(verifySignature(body, sig, "")).toBe(false);
  });
});

describe("parseWebhook", () => {
  it("maps a subscription event to an upsert", () => {
    const outcome = parseWebhook(payload(), plans);
    expect(outcome).toEqual({
      kind: "upsert",
      event: "subscription_created",
      subscription: {
        userId: "u1",
        providerSubscriptionId: "sub_9",
        providerCustomerId: "55",
        variantId: "102",
        plan: "pro",
        status: "active",
        renewsAt: new Date("2026-10-24T00:00:00.000Z"),
        endsAt: null,
        portalUrl: "https://store.lemonsqueezy.com/billing?x=1",
      },
    });
  });

  it("ignores non-subscription events, unknown variants and missing users", () => {
    expect(parseWebhook(payload({}, { event_name: "order_created" }), plans).kind).toBe("ignored");
    expect(parseWebhook(payload({ variant_id: 999 }), plans).kind).toBe("ignored");
    expect(parseWebhook(payload({}, { custom_data: {} }), plans).kind).toBe("ignored");
    expect(parseWebhook(payload({ status: "weird" }), plans).kind).toBe("ignored");
  });
});

describe("planFromSubscriptions", () => {
  const now = new Date("2026-09-24T00:00:00Z");
  it("picks the highest plan among subscriptions that grant access", () => {
    expect(planFromSubscriptions([], now)).toBe("free");
    expect(planFromSubscriptions([{ plan: "pro", status: "active", endsAt: null }], now)).toBe("pro");
    expect(
      planFromSubscriptions(
        [
          { plan: "pro", status: "active", endsAt: null },
          { plan: "power", status: "expired", endsAt: null },
        ],
        now,
      ),
    ).toBe("pro");
  });

  it("keeps a cancelled subscription until it ends", () => {
    const later = new Date("2026-10-01T00:00:00Z");
    const earlier = new Date("2026-09-01T00:00:00Z");
    expect(planFromSubscriptions([{ plan: "power", status: "cancelled", endsAt: later }], now)).toBe("power");
    expect(planFromSubscriptions([{ plan: "power", status: "cancelled", endsAt: earlier }], now)).toBe("free");
    expect(planFromSubscriptions([{ plan: "pro", status: "paused", endsAt: null }], now)).toBe("free");
  });
});
