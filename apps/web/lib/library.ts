import "server-only";
import { resolve } from "node:path";
import { cache } from "react";
import { loadLibrary, type LibraryEntry } from "@promptsite/compiler/node";
import type { Block } from "@promptsite/compiler";

const LIBRARY_DIR = process.env.LIBRARY_DIR ?? resolve(process.cwd(), "../../library");

export const getLibrary = cache((): LibraryEntry[] => loadLibrary(LIBRARY_DIR));

export function getEntry(slug: string): LibraryEntry | undefined {
  return getLibrary().find((e) => e.block.slug === slug);
}

/** What the browser may see about a block: never the prompt text itself. */
export type PublicBlock = Pick<
  Block,
  "slug" | "name" | "category" | "tone" | "moods" | "tier" | "targets" | "summary" | "slots"
> & { hasPreview: boolean };

export function toPublic(entry: LibraryEntry): PublicBlock {
  const { slug, name, category, tone, moods, tier, targets, summary, slots } = entry.block;
  return { slug, name, category, tone, moods, tier, targets, summary, slots, hasPreview: entry.referencePath !== null };
}
