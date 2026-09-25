import type { Tier } from "@promptsite/compiler";

export type Plan = "free" | "pro" | "power";

const RANK: Record<Tier, number> = { free: 0, pro: 1, power: 2 };

export function canUse(plan: Plan, tier: Tier): boolean {
  return RANK[plan] >= RANK[tier];
}

export interface SubscriptionLike {
  plan: Plan;
  status: string;
  endsAt: Date | null;
}

/**
 * Lemon Squeezy semantics: active, on_trial and past_due (still in dunning) grant access;
 * a cancelled subscription keeps access until `ends_at`; paused, unpaid and expired do not.
 */
export function grantsAccess(sub: SubscriptionLike, now = new Date()): boolean {
  if (sub.status === "active" || sub.status === "on_trial" || sub.status === "past_due") return true;
  if (sub.status === "cancelled") return sub.endsAt !== null && sub.endsAt > now;
  return false;
}

export function planFromSubscriptions(subs: SubscriptionLike[], now = new Date()): Plan {
  return subs
    .filter((s) => grantsAccess(s, now))
    .reduce<Plan>((best, s) => (RANK[s.plan] > RANK[best] ? s.plan : best), "free");
}
