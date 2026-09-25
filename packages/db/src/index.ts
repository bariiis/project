import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(url, { schema });
}

export { schema };

// Re-exported so apps use the exact drizzle-orm instance the schema was built with.
export { and, count, desc, eq, gte, sql } from "drizzle-orm";

/** Applies pending SQL migrations from `folder` (drizzle-kit output). Safe to run on every boot. */
export async function runMigrations(folder: string, url = process.env.DATABASE_URL) {
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const db = createDb(url);
  try {
    await migrate(db, { migrationsFolder: folder });
  } finally {
    await db.$client.end();
  }
}
