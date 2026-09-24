import { NextResponse } from "next/server";
import { getViewer } from "@/lib/access";
import { createCheckout } from "@/lib/billing/lemonsqueezy";

const VARIANT_ENV = { pro: "LEMONSQUEEZY_VARIANT_PRO", power: "LEMONSQUEEZY_VARIANT_POWER" } as const;

/** GET /api/billing/checkout?plan=pro → redirect to a Lemon Squeezy hosted checkout. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan");
  if (plan !== "pro" && plan !== "power") return NextResponse.json({ error: "invalid_plan" }, { status: 400 });

  const { user } = await getViewer();
  if (!user) return NextResponse.redirect(new URL(`/giris?sonra=${encodeURIComponent(`/api/billing/checkout?plan=${plan}`)}`, url));

  // The first id in the list is the default (e.g. yearly); others exist for existing subscribers.
  const variantId = process.env[VARIANT_ENV[plan]]?.split(",")[0]?.trim();
  if (!variantId) return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const checkout = await createCheckout({ variantId, userId: user.id, email: user.email, redirectUrl: `${site}/hesap?odeme=tamam` });
  return NextResponse.redirect(checkout, 303);
}
