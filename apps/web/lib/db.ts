import "server-only";
import { createDb } from "@promptsite/db";

type Db = ReturnType<typeof createDb>;
const globalForDb = globalThis as unknown as { promptsiteDb?: Db };

/** One pool per server process (and per dev hot-reload). */
export function db(): Db {
  globalForDb.promptsiteDb ??= createDb();
  return globalForDb.promptsiteDb;
}
