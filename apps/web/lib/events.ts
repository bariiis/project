import "server-only";
import { and, count, eq, gte, schema } from "@promptsite/db";
import { db } from "./db";

/** Compositions one signed-in user may generate per rolling 24 hours. */
export const DAILY_COMPOSITION_LIMIT = Number(process.env.DAILY_COMPOSITION_LIMIT ?? 300);

export async function compositionsInLastDay(userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db()
    .select({ n: count() })
    .from(schema.promptEvents)
    .where(and(eq(schema.promptEvents.userId, userId), eq(schema.promptEvents.kind, "composition"), gte(schema.promptEvents.createdAt, since)));
  return row?.n ?? 0;
}

export async function recordPrompt(event: { userId: string | null; kind: "block" | "composition"; target: string; blocks: string[] }) {
  if (!process.env.DATABASE_URL) return;
  try {
    await db().insert(schema.promptEvents).values(event);
  } catch (error) {
    // Analytics must never break prompt delivery.
    console.error("[events] failed to record prompt", error);
  }
}
