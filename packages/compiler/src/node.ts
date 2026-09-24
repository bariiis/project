import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { BlockSchema, isMediaSlot, type Block } from "./schema";

export interface LibraryEntry {
  block: Block;
  dir: string;
  /** Absolute path to reference.html, if the block ships one. */
  referencePath: string | null;
}

/**
 * The builder preview rewrites `[data-slot]` text, swaps `[data-slot-src]` media and measures the
 * `[data-block]` root, so every reference implementation must mark all three.
 */
export function checkReference(html: string, block: Block): string[] {
  const problems: string[] = [];
  if (!/\sdata-block[\s>=]/.test(html)) problems.push("missing a data-block root element");
  for (const slot of block.slots) {
    const attr = isMediaSlot(slot) ? "data-slot-src" : "data-slot";
    if (!html.includes(`${attr}="${slot.key}"`)) problems.push(`no element marks slot "${slot.key}" (${attr})`);
  }
  return problems;
}

/** Reads every `library/<category>/<slug>/block.yaml`. Throws with all problems at once. */
export function loadLibrary(root: string): LibraryEntry[] {
  const entries: LibraryEntry[] = [];
  const errors: string[] = [];

  for (const category of readdirSync(root, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    for (const item of readdirSync(join(root, category.name), { withFileTypes: true })) {
      if (!item.isDirectory()) continue;
      const dir = join(root, category.name, item.name);
      const file = join(dir, "block.yaml");
      if (!existsSync(file)) {
        errors.push(`${dir}: missing block.yaml`);
        continue;
      }
      const result = BlockSchema.safeParse(parseYaml(readFileSync(file, "utf8")));
      if (!result.success) {
        for (const issue of result.error.issues) errors.push(`${file}: ${issue.path.join(".")} ${issue.message}`);
        continue;
      }
      const block = result.data;
      if (block.slug !== item.name) errors.push(`${file}: slug "${block.slug}" must match folder "${item.name}"`);
      if (block.category !== category.name) {
        errors.push(`${file}: category "${block.category}" must match folder "${category.name}"`);
      }
      const reference = join(dir, "reference.html");
      const hasReference = existsSync(reference);
      if (hasReference) errors.push(...checkReference(readFileSync(reference, "utf8"), block).map((e) => `${reference}: ${e}`));
      entries.push({ block, dir, referencePath: hasReference ? reference : null });
    }
  }

  const seen = new Set<string>();
  for (const { block } of entries) {
    if (seen.has(block.slug)) errors.push(`duplicate slug "${block.slug}"`);
    seen.add(block.slug);
  }
  if (errors.length) throw new Error(`library is invalid:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  return entries.sort((a, b) => a.block.slug.localeCompare(b.block.slug));
}
