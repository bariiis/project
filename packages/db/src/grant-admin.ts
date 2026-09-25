// Usage: pnpm --filter @promptsite/db admin:grant you@example.com
import { eq } from "drizzle-orm";
import { createDb } from "./index";
import { users } from "./schema";

const email = process.argv[2];
if (!email) {
  console.error("usage: admin:grant <email>");
  process.exit(1);
}
const db = createDb();
const rows = await db.update(users).set({ role: "admin" }).where(eq(users.email, email)).returning({ id: users.id });
await db.$client.end();
if (!rows.length) {
  console.error(`no user with email ${email}; sign up first`);
  process.exit(1);
}
console.log(`${email} is now an admin`);
