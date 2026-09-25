import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { schema } from "@promptsite/db";
import { db } from "./db";
import { siteUrl } from "./site";

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
    : {};

let instance: ReturnType<typeof createAuth> | undefined;

function createAuth() {
  return betterAuth({
    baseURL: siteUrl(),
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db(), {
      provider: "pg",
      schema: { user: schema.users, session: schema.sessions, account: schema.accounts, verification: schema.verifications },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    socialProviders: google,
    user: { additionalFields: { role: { type: "string", input: false, defaultValue: "user" } } },
    plugins: [nextCookies()],
  });
}

/** Created lazily so `next build` does not need a database. */
export function auth() {
  instance ??= createAuth();
  return instance;
}

export const googleEnabled = "google" in google;

export async function getSession() {
  return auth().api.getSession({ headers: await headers() });
}
