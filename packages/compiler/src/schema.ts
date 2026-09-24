import { z } from "zod";

export const CATEGORIES = [
  "navbar",
  "hero",
  "features",
  "gallery",
  "stats",
  "testimonials",
  "pricing",
  "cta",
  "footer",
  "loader",
  "background",
  "full-page",
] as const;

export const TARGETS = ["html", "react", "next"] as const;
export const TIERS = ["free", "pro", "power"] as const;

export const Category = z.enum(CATEGORIES);
export const Target = z.enum(TARGETS);
export const Tier = z.enum(TIERS);

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "kebab-case slug");
const cssValue = z.string().min(1);

export const FontSchema = z.object({
  family: z.string().min(1),
  weights: z.array(z.number().int().min(100).max(900)).min(1),
  role: z.enum(["display", "body", "mono", "accent"]),
  italic: z.boolean().default(false),
});

export const TokensSchema = z.object({
  colors: z.record(z.string(), cssValue).default({}),
  fonts: z.array(FontSchema).default([]),
  radii: z.record(z.string(), cssValue).default({}),
  easings: z.record(z.string(), cssValue).default({}),
});

export const LibrarySchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  /** ES module URL used in the single-file HTML importmap. */
  esm: z.string().url(),
  /** npm package name used by React/Next targets. */
  npm: z.string().min(1),
});

export const AssetSchema = z.object({
  key: slug,
  kind: z.enum(["video", "image", "model", "hdr", "audio"]),
  url: z.string().url(),
  alt: z.string().default(""),
  usage: z.string().min(1),
});

export const SlotSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/, "snake_case slot key"),
  label: z.string().min(1),
  type: z.enum(["text", "textarea", "url", "color"]),
  default: z.string(),
});

export const BlockSchema = z
  .object({
    slug,
    name: z.string().min(1),
    category: Category,
    tone: z.enum(["dark", "light"]),
    moods: z.array(z.string().min(1)).default([]),
    tier: Tier,
    targets: z.array(Target).min(1),
    summary: z.string().min(1),
    tokens: TokensSchema.default({ colors: {}, fonts: [], radii: {}, easings: {} }),
    libraries: z.array(LibrarySchema).default([]),
    assets: z.array(AssetSchema).default([]),
    slots: z.array(SlotSchema).default([]),
    /** Markdown: layout, content, motion. May reference slots as {{key}}. */
    structure: z.string().min(1),
    /** Markdown: exact constants to bake in. */
    parameters: z.string().default(""),
    /** Target-specific notes appended to the block's section. */
    variants: z.partialRecord(Target, z.string()).default({}),
  })
  .superRefine((block, ctx) => {
    const keys = new Set(block.slots.map((s) => s.key));
    if (keys.size !== block.slots.length) {
      ctx.addIssue({ code: "custom", message: "duplicate slot keys", path: ["slots"] });
    }
    for (const field of ["structure", "parameters"] as const) {
      for (const ref of placeholders(block[field])) {
        if (!keys.has(ref)) {
          ctx.addIssue({
            code: "custom",
            message: `unknown slot {{${ref}}} in ${field}`,
            path: [field],
          });
        }
      }
    }
  });

export type Block = z.infer<typeof BlockSchema>;
export type BlockInput = z.input<typeof BlockSchema>;
export type Target = z.infer<typeof Target>;
export type Category = z.infer<typeof Category>;
export type Tier = z.infer<typeof Tier>;
export type Font = z.infer<typeof FontSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type Library = z.infer<typeof LibrarySchema>;

const PLACEHOLDER = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g;

export function placeholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => m[1]!);
}

export function fillSlots(text: string, values: Record<string, string>): string {
  return text.replace(PLACEHOLDER, (_, key: string) => values[key] ?? "");
}

export function parseBlock(input: unknown): Block {
  return BlockSchema.parse(input);
}
