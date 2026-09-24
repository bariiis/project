import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());

export const planEnum = pgEnum("plan", ["free", "pro", "power"]);
export const tierEnum = pgEnum("tier", ["free", "pro", "power"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "on_trial",
  "active",
  "paused",
  "past_due",
  "unpaid",
  "cancelled",
  "expired",
]);

// Auth tables follow Better Auth's default model (user, session, account, verification).
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** One row per Lemon Squeezy subscription, kept in sync by the webhook. */
export const subscriptions = pgTable(
  "subscription",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("lemonsqueezy"),
    providerSubscriptionId: text("provider_subscription_id").notNull(),
    providerCustomerId: text("provider_customer_id").notNull(),
    variantId: text("variant_id").notNull(),
    plan: planEnum("plan").notNull(),
    status: subscriptionStatusEnum("status").notNull(),
    renewsAt: timestamp("renews_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /** Signed Lemon Squeezy customer-portal link, refreshed by every webhook. */
    portalUrl: text("portal_url"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("subscription_provider_id").on(t.provider, t.providerSubscriptionId), index("subscription_user").on(t.userId)],
);

/**
 * Blocks mirrored from library/ by the seed script. Git stays the source of truth; this table
 * powers search, analytics and admin edits that are later written back as a PR.
 */
export const blocks = pgTable(
  "block",
  {
    slug: text("slug").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    tone: text("tone").notNull(),
    moods: text("moods").array().notNull().default(sql`'{}'::text[]`),
    tier: tierEnum("tier").notNull(),
    targets: text("targets").array().notNull(),
    spec: jsonb("spec").notNull(),
    previewUrl: text("preview_url"),
    referenceUrl: text("reference_url"),
    version: integer("version").notNull().default(1),
    published: boolean("published").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("block_category").on(t.category)],
);

export const assets = pgTable("asset", {
  id: id(),
  key: text("key").notNull().unique(),
  kind: text("kind").notNull(),
  url: text("url").notNull(),
  bytes: integer("bytes"),
  contentType: text("content_type"),
  createdAt: createdAt(),
});

/** A saved builder composition. */
export const projects = pgTable(
  "project",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    target: text("target").notNull(),
    lang: text("lang").notNull().default("tr"),
    blocks: text("blocks").array().notNull(),
    slots: jsonb("slots").notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("project_user").on(t.userId)],
);

/** Every prompt handed out: analytics plus the data for per-user rate limits. */
export const promptEvents = pgTable(
  "prompt_event",
  {
    id: id(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").notNull(), // "block" | "composition"
    target: text("target").notNull(),
    blocks: text("blocks").array().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("prompt_event_user_time").on(t.userId, t.createdAt)],
);
