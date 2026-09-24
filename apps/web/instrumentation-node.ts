import { resolve } from "node:path";
import { runMigrations } from "@promptsite/db";

// Containers run migrations on boot (RUN_MIGRATIONS=1 in the Dockerfile); dev uses `pnpm db:migrate`.
if (process.env.RUN_MIGRATIONS === "1") {
  const folder = process.env.MIGRATIONS_DIR ?? resolve(process.cwd(), "../../packages/db/migrations");
  await runMigrations(folder);
  console.log(`[migrations] applied from ${folder}`);
}
