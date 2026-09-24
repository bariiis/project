import "server-only";
import type { Tier } from "@promptsite/compiler";

export type Plan = "free" | "pro" | "power";

const RANK: Record<Tier, number> = { free: 0, pro: 1, power: 2 };

export function canUse(plan: Plan, tier: Tier): boolean {
  return RANK[plan] >= RANK[tier];
}

/**
 * The signed-in user's plan. Until auth and Lemon Squeezy land (phase 1) everyone is on the
 * free plan; `DEV_PLAN` overrides it outside production for local testing.
 */
export async function getCurrentPlan(): Promise<Plan> {
  const dev = process.env.DEV_PLAN;
  if (process.env.NODE_ENV !== "production" && (dev === "pro" || dev === "power")) return dev;
  return "free";
}
