import "server-only";
import { cache } from "react";
import { eq, schema } from "@promptsite/db";
import { getSession } from "./auth";
import { db } from "./db";
import { planFromSubscriptions, type Plan } from "./plans";

export { canUse, type Plan } from "./plans";

export interface Viewer {
  user: { id: string; email: string; name: string; role: string } | null;
  plan: Plan;
}

const ANONYMOUS: Viewer = { user: null, plan: "free" };

function devOverride(): Plan | null {
  const dev = process.env.DEV_PLAN;
  return process.env.NODE_ENV !== "production" && (dev === "pro" || dev === "power") ? dev : null;
}

/** The signed-in user and the plan their subscriptions grant. Admins get every tier. */
export const getViewer = cache(async (): Promise<Viewer> => {
  if (!process.env.DATABASE_URL) return { ...ANONYMOUS, plan: devOverride() ?? "free" };

  const session = await getSession();
  if (!session) return { ...ANONYMOUS, plan: devOverride() ?? "free" };

  const { id, email, name } = session.user;
  const role = (session.user as { role?: string }).role ?? "user";
  if (role === "admin") return { user: { id, email, name, role }, plan: "power" };

  const subs = await db()
    .select({ plan: schema.subscriptions.plan, status: schema.subscriptions.status, endsAt: schema.subscriptions.endsAt })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, id));

  return { user: { id, email, name, role }, plan: devOverride() ?? planFromSubscriptions(subs) };
});

export async function getCurrentPlan(): Promise<Plan> {
  return (await getViewer()).plan;
}
