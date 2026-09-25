import { NextResponse } from "next/server";
import { compile } from "@promptsite/compiler";
import { canUse, getViewer } from "@/lib/access";
import { DAILY_COMPOSITION_LIMIT, recordPrompt, reserveComposition } from "@/lib/events";
import { CompositionBody } from "@/lib/composition";
import { getEntry } from "@/lib/library";

export async function POST(request: Request) {
  const parsed = CompositionBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  }
  const { title, target, lang, blocks: slugs, slots } = parsed.data;

  const entries = slugs.map((slug) => ({ slug, entry: getEntry(slug) }));
  const missing = entries.filter((e) => !e.entry).map((e) => e.slug);
  if (missing.length) return NextResponse.json({ error: "unknown_blocks", blocks: missing }, { status: 404 });

  const { user, plan } = await getViewer();
  const blocks = entries.map((e) => e.entry!.block);
  const locked = blocks.filter((b) => !canUse(plan, b.tier)).map((b) => b.slug);
  if (locked.length) {
    return NextResponse.json({ error: "upgrade_required", plan, blocks: locked }, { status: 402 });
  }
  let result: ReturnType<typeof compile>;
  try {
    result = compile({ title, target, lang, blocks, slots });
  } catch (error) {
    return NextResponse.json({ error: "compile_failed", message: (error as Error).message }, { status: 422 });
  }

  // Signed-in users (the only ones who can reach paid blocks) are metered atomically. Anonymous
  // callers can only compile free blocks, whose prompts the library pages show publicly anyway.
  if (user) {
    const allowed = await reserveComposition({ userId: user.id, kind: "composition", target, blocks: slugs });
    if (!allowed) return NextResponse.json({ error: "rate_limited", limit: DAILY_COMPOSITION_LIMIT }, { status: 429 });
  } else {
    await recordPrompt({ userId: null, kind: "composition", target, blocks: slugs });
  }
  return NextResponse.json({ prompt: result.prompt, warnings: result.warnings });
}
