import "server-only";
import { z } from "zod";
import { and, desc, eq, schema } from "@promptsite/db";
import { auth } from "./auth";
import { db } from "./db";
import { planFromSubscriptions, type Plan } from "./plans";

/**
 * Plans granted by an admin are stored as a subscription row with provider "manual", so the
 * normal plan logic (planFromSubscriptions) applies to them unchanged. One row per user.
 * No end date → status "active"; with an end date → "cancelled", which keeps access until then.
 */
const MANUAL = "manual";

export const PlanGrant = z.object({
  plan: z.enum(["free", "pro", "power"]),
  until: z.coerce.date().nullable().optional(),
});

export const NewAccount = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(128),
  role: z.enum(["user", "admin"]).default("user"),
  plan: PlanGrant.shape.plan.default("free"),
  until: PlanGrant.shape.until,
});

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  plan: Plan;
  /** The admin grant, if any; a paid subscription can still give a higher plan. */
  grant: { plan: Plan; until: Date | null } | null;
  paid: boolean;
};

export async function listUsers(query = ""): Promise<AdminUserRow[]> {
  const d = db();
  const q = query.trim().toLowerCase();
  const users = await d.select().from(schema.users).orderBy(desc(schema.users.createdAt)).limit(500);
  const subs = await d.select().from(schema.subscriptions);

  return users
    .filter((u) => !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
    .map((u) => {
      const own = subs.filter((s) => s.userId === u.id);
      const manual = own.find((s) => s.provider === MANUAL);
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        plan: u.role === "admin" ? "power" : planFromSubscriptions(own),
        grant: manual ? { plan: manual.plan, until: manual.endsAt } : null,
        paid: own.some((s) => s.provider !== MANUAL),
      };
    });
}

export async function grantPlan(userId: string, plan: Plan, until: Date | null = null) {
  const d = db();
  if (plan === "free") {
    await d.delete(schema.subscriptions).where(and(eq(schema.subscriptions.userId, userId), eq(schema.subscriptions.provider, MANUAL)));
    return;
  }
  const values = { plan, status: until ? ("cancelled" as const) : ("active" as const), endsAt: until, renewsAt: null };
  await d
    .insert(schema.subscriptions)
    .values({ userId, provider: MANUAL, providerSubscriptionId: `${MANUAL}:${userId}`, providerCustomerId: MANUAL, variantId: MANUAL, ...values })
    .onConflictDoUpdate({ target: [schema.subscriptions.provider, schema.subscriptions.providerSubscriptionId], set: values });
}

export async function setRole(userId: string, role: "user" | "admin") {
  await db().update(schema.users).set({ role }).where(eq(schema.users.id, userId));
}

/**
 * Creates an email/password account the same way sign-up does (Better Auth's own hashing and
 * adapter), but without signing the admin in as the new user.
 */
export async function createAccount(input: z.infer<typeof NewAccount>): Promise<{ id: string } | { error: "email_taken" }> {
  const ctx = await auth().$context;
  if (await ctx.internalAdapter.findUserByEmail(input.email)) return { error: "email_taken" };

  const hash = await ctx.password.hash(input.password);
  const user = await ctx.internalAdapter.createUser({ email: input.email, name: input.name, emailVerified: true }, { method: "email-password" });
  await ctx.internalAdapter.linkAccount({ userId: user.id, providerId: "credential", accountId: user.id, password: hash });

  if (input.role === "admin") await setRole(user.id, "admin");
  await grantPlan(user.id, input.plan, input.until ?? null);
  return { id: user.id };
}
