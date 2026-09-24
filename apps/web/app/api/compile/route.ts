import { NextResponse } from "next/server";
import { z } from "zod";
import { compile, Target } from "@promptsite/compiler";
import { canUse, getCurrentPlan } from "@/lib/access";
import { getEntry } from "@/lib/library";

const Body = z.object({
  title: z.string().trim().min(1).max(120),
  target: Target,
  lang: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).default("en"),
  blocks: z.array(z.string()).min(1).max(20),
  slots: z.record(z.string(), z.record(z.string(), z.string().max(2000))).default({}),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  }
  const { title, target, lang, blocks: slugs, slots } = parsed.data;

  const entries = slugs.map((slug) => ({ slug, entry: getEntry(slug) }));
  const missing = entries.filter((e) => !e.entry).map((e) => e.slug);
  if (missing.length) return NextResponse.json({ error: "unknown_blocks", blocks: missing }, { status: 404 });

  const plan = await getCurrentPlan();
  const blocks = entries.map((e) => e.entry!.block);
  const locked = blocks.filter((b) => !canUse(plan, b.tier)).map((b) => b.slug);
  if (locked.length) {
    return NextResponse.json({ error: "upgrade_required", plan, blocks: locked }, { status: 402 });
  }

  try {
    const result = compile({ title, target, lang, blocks, slots });
    return NextResponse.json({ prompt: result.prompt, warnings: result.warnings });
  } catch (error) {
    return NextResponse.json({ error: "compile_failed", message: (error as Error).message }, { status: 422 });
  }
}
