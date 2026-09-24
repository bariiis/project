import { schema, sql } from "@promptsite/db";
import { parseWebhook, variantPlans, verifySignature } from "@/lib/billing/lemonsqueezy";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";
  if (!verifySignature(raw, request.headers.get("x-signature"), secret)) {
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const outcome = parseWebhook(payload, variantPlans());
  if (outcome.kind === "ignored") {
    console.warn(`[lemonsqueezy] ignored ${outcome.event}: ${outcome.reason}`);
    // 200 so Lemon Squeezy does not keep retrying an event we will never act on.
    return Response.json({ ok: true, ignored: outcome.reason });
  }

  const { subscription: sub } = outcome;
  const { userId, providerSubscriptionId, ...rest } = sub;
  // Each payload is the subscription's state when the event was created. Retries can deliver an
  // old "active" state after a newer "expired" one, so only apply events at least as new as ours.
  try {
    await db()
      .insert(schema.subscriptions)
      .values({ ...sub, provider: "lemonsqueezy" })
      .onConflictDoUpdate({
        target: [schema.subscriptions.provider, schema.subscriptions.providerSubscriptionId],
        set: { ...rest, updatedAt: new Date() },
        setWhere: sql`${schema.subscriptions.providerUpdatedAt} is null or excluded.provider_updated_at is null or excluded.provider_updated_at >= ${schema.subscriptions.providerUpdatedAt}`,
      });
  } catch (error) {
    // 23503: the user id in custom_data does not exist (deleted account, or another environment's checkout).
    if ((error as { cause?: { code?: string } }).cause?.code === "23503" || (error as { code?: string }).code === "23503") {
      console.warn(`[lemonsqueezy] ignored ${outcome.event}: unknown user ${userId}`);
      return Response.json({ ok: true, ignored: "unknown user" });
    }
    throw error;
  }

  return Response.json({ ok: true, event: outcome.event, userId, subscription: providerSubscriptionId });
}
