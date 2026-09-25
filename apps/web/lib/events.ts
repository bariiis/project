import "server-only";
import { and, count, eq, gte, schema, sql } from "@promptsite/db";
import { db } from "./db";

/** Compositions one signed-in user may generate per rolling 24 hours. */
export const DAILY_COMPOSITION_LIMIT = Number(process.env.DAILY_COMPOSITION_LIMIT ?? 300);

type PromptEvent = { userId: string | null; kind: "block" | "composition"; target: string; blocks: string[] };

/**
 * Counts and records a signed-in user's composition in one transaction, serialised per user by an
 * advisory lock, so parallel requests cannot all pass the check. Returns false over the limit.
 */
export async function reserveComposition(event: PromptEvent & { userId: string }): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return db().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${event.userId}))`);
    const [row] = await tx
      .select({ n: count() })
      .from(schema.promptEvents)
      .where(
        and(
          eq(schema.promptEvents.userId, event.userId),
          eq(schema.promptEvents.kind, "composition"),
          gte(schema.promptEvents.createdAt, since),
        ),
      );
    if ((row?.n ?? 0) >= DAILY_COMPOSITION_LIMIT) return false;
    await tx.insert(schema.promptEvents).values(event);
    return true;
  });
}

export async function recordPrompt(event: PromptEvent) {
  if (!process.env.DATABASE_URL) return;
  try {
    await db().insert(schema.promptEvents).values(event);
  } catch (error) {
    // Analytics must never break prompt delivery.
    console.error("[events] failed to record prompt", error);
  }
}
