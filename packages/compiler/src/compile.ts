import { fillSlots, isHttpsUrl, isMediaSlot, type Asset, type Block, type Font, type Library, type Target } from "./schema";

export interface Composition {
  /** Page title used in the prompt heading. */
  title: string;
  target: Target;
  /** Blocks in page order. */
  blocks: Block[];
  /** Slot overrides keyed by block slug, then slot key. */
  slots?: Record<string, Record<string, string>>;
  /** Document language, e.g. "tr" or "en". */
  lang?: string;
}

export interface MergedTokens {
  colors: Record<string, string>;
  radii: Record<string, string>;
  easings: Record<string, string>;
  fonts: Font[];
}

export interface CompileResult {
  prompt: string;
  tokens: MergedTokens;
  libraries: Library[];
  assets: Asset[];
  warnings: string[];
}

const TARGET_BRIEF: Record<Target, { label: string; brief: string }> = {
  html: {
    label: "a single self-contained HTML file",
    brief: [
      "Produce a **single self-contained `index.html`**. Pure HTML/CSS/JS in one file: no build step, no framework, no bundler.",
      "Load third-party code only through the ES-module importmap given below, inside `<script type=\"module\">`.",
      "Load fonts with `<link>` tags to Google Fonts. Put every design token in CSS custom properties on `:root`.",
    ].join("\n"),
  },
  react: {
    label: "a Vite + React + TypeScript project",
    brief: [
      "Build a **Vite + React 19 + TypeScript** project styled with **Tailwind CSS v4** (via `@tailwindcss/vite`, a single `@import \"tailwindcss\";` in `src/index.css`).",
      "Use `framer-motion` for component-level motion unless a section names a different library.",
      "One component per section under `src/components/`, composed in `src/App.tsx` in the order given. Design tokens go in `@theme` in `src/index.css`.",
    ].join("\n"),
  },
  next: {
    label: "a Next.js App Router project",
    brief: [
      "Build a **Next.js (App Router) + TypeScript** project styled with **Tailwind CSS v4**.",
      "The page lives in `app/page.tsx`; each section is a component under `components/`. Mark components that use hooks, pointer or scroll listeners with `\"use client\"`.",
      "Load fonts with `next/font/google`. Put design tokens in `@theme` in `app/globals.css`. Use `next/image` for still images with the given URLs (add the host to `images.remotePatterns`).",
    ].join("\n"),
  },
};

export function mergeTokens(blocks: Block[]): { tokens: MergedTokens; warnings: string[] } {
  const warnings: string[] = [];
  const tokens: MergedTokens = { colors: {}, radii: {}, easings: {}, fonts: [] };

  for (const block of blocks) {
    for (const group of ["colors", "radii", "easings"] as const) {
      for (const [name, value] of Object.entries(block.tokens[group])) {
        const existing = tokens[group][name];
        if (existing === undefined) {
          tokens[group][name] = value;
        } else if (existing !== value) {
          // First block keeps the shared name; later blocks get a namespaced token.
          const scoped = `${block.slug}-${name}`;
          tokens[group][scoped] = value;
          warnings.push(
            `${group}.${name}: "${block.slug}" uses ${value}, page uses ${existing}; emitted as ${scoped}`,
          );
        }
      }
    }
    for (const font of block.tokens.fonts) {
      const existing = tokens.fonts.find((f) => f.family === font.family && f.italic === font.italic);
      if (existing) {
        existing.weights = [...new Set([...existing.weights, ...font.weights])].sort((a, b) => a - b);
      } else {
        tokens.fonts.push({ ...font, weights: [...font.weights].sort((a, b) => a - b) });
      }
    }
  }
  return { tokens, warnings };
}

export function mergeLibraries(blocks: Block[]): { libraries: Library[]; warnings: string[] } {
  const warnings: string[] = [];
  const byName = new Map<string, Library>();
  for (const block of blocks) {
    for (const lib of block.libraries) {
      const existing = byName.get(lib.name);
      if (!existing) byName.set(lib.name, lib);
      else if (existing.version !== lib.version) {
        warnings.push(`library ${lib.name}: "${block.slug}" wants ${lib.version}, using ${existing.version}`);
      }
    }
  }
  return { libraries: [...byName.values()], warnings };
}

export function mergeAssets(blocks: Block[]): Asset[] {
  const byUrl = new Map<string, Asset>();
  for (const block of blocks) {
    for (const asset of block.assets) {
      const existing = byUrl.get(asset.url);
      if (existing) existing.usage = `${existing.usage} · ${asset.usage}`;
      else byUrl.set(asset.url, { ...asset });
    }
  }
  return [...byUrl.values()];
}

/** A media slot the user left empty: the prompt asks for their file or the block's fallback. */
export interface MissingMedia {
  key: string;
  kind: "image" | "video";
  usage: string;
}

/**
 * Media slots (`image` / `video`) become Assets rows: the user's https URL when given,
 * otherwise a "provide your own or build the fallback" row.
 */
export function mediaAssets(
  blocks: Block[],
  overrides: Record<string, Record<string, string>> = {},
): { assets: Asset[]; missing: MissingMedia[]; warnings: string[] } {
  const assets: Asset[] = [];
  const missing: MissingMedia[] = [];
  const warnings: string[] = [];
  for (const block of blocks) {
    for (const slot of block.slots.filter(isMediaSlot)) {
      const kind = slot.type as "image" | "video";
      const usage = `${block.name}: ${slot.usage ?? slot.label}`;
      const value = (overrides[block.slug]?.[slot.key] ?? slot.default).trim();
      if (value && isHttpsUrl(value)) {
        assets.push({ key: slot.key, kind, url: value, alt: "", usage });
      } else {
        if (value) warnings.push(`${block.slug}.${slot.key}: ignored non-https media URL`);
        missing.push({ key: slot.key, kind, usage });
      }
    }
  }
  return { assets, missing, warnings };
}

function googleFontsHref(fonts: Font[]): string {
  // Roman and italic cuts of one family must share a single `family=` param.
  const byFamily = new Map<string, Font[]>();
  for (const f of fonts) byFamily.set(f.family, [...(byFamily.get(f.family) ?? []), f]);
  const families = [...byFamily].map(([family, cuts]) => {
    const name = family.replace(/ /g, "+");
    if (!cuts.some((c) => c.italic)) return `family=${name}:wght@${cuts[0]!.weights.join(";")}`;
    const tuples = cuts
      .flatMap((c) => c.weights.map((w) => [c.italic ? 1 : 0, w] as const))
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return `family=${name}:ital,wght@${tuples.map(([i, w]) => `${i},${w}`).join(";")}`;
  });
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

function tokenBlock(tokens: MergedTokens): string {
  const lines: string[] = [];
  const emit = (prefix: string, group: Record<string, string>) => {
    for (const [name, value] of Object.entries(group)) lines.push(`  --${prefix}${name}: ${value};`);
  };
  emit("color-", tokens.colors);
  emit("radius-", tokens.radii);
  emit("ease-", tokens.easings);
  return lines.length ? ["```css", ":root {", ...lines, "}", "```"].join("\n") : "";
}

function libraryBlock(target: Target, libraries: Library[]): string {
  if (!libraries.length) return "No third-party libraries. Everything is hand-written.";
  if (target === "html") {
    const imports = Object.fromEntries(libraries.map((l) => [l.name, l.esm]));
    return [
      "```html",
      '<script type="importmap">',
      JSON.stringify({ imports }, null, 2),
      "</script>",
      "```",
    ].join("\n");
  }
  return libraries.map((l) => `- \`${l.npm}@^${l.version}\``).join("\n");
}

function assetTable(assets: Asset[], missing: MissingMedia[]): string {
  if (!assets.length && !missing.length) return "No external assets.";
  const rows = [
    ...assets.map((a) => `| \`${a.key}\` | ${a.kind} | ${a.usage} | ${a.url} |`),
    ...missing.map((m) => `| \`${m.key}\` | ${m.kind} | ${m.usage} | _not provided_ |`),
  ];
  const lines = [
    "| Key | Kind | Used by | URL |",
    "|---|---|---|---|",
    ...rows,
    "",
    "Point every `<img>`, `<video>`, loader and background at these full URLs. Hero media loads eagerly, everything else lazily.",
  ];
  if (missing.length) {
    lines.push(
      "",
      "Rows marked _not provided_ have no file yet: leave a clearly named constant for the URL at the top of the code, and until it is set render the procedural fallback that the section describes, so the page is complete without it.",
    );
  }
  return lines.join("\n");
}

export function compile(composition: Composition): CompileResult {
  const { title, target, blocks } = composition;
  if (!blocks.length) throw new Error("composition has no blocks");

  const unsupported = blocks.filter((b) => !b.targets.includes(target)).map((b) => b.slug);
  if (unsupported.length) {
    throw new Error(`blocks do not support target "${target}": ${unsupported.join(", ")}`);
  }

  const { tokens, warnings: tokenWarnings } = mergeTokens(blocks);
  const { libraries, warnings: libWarnings } = mergeLibraries(blocks);
  const media = mediaAssets(blocks, composition.slots);
  const assets = [...mergeAssets(blocks), ...media.assets];
  const brief = TARGET_BRIEF[target];
  const lang = composition.lang ?? "en";

  const sections = blocks.map((block, i) => {
    const values = Object.fromEntries(block.slots.map((s) => [s.key, s.default]));
    Object.assign(values, composition.slots?.[block.slug] ?? {});
    const parts = [`### ${i + 1}) ${block.name} — \`${block.category}\``, "", fillSlots(block.structure.trim(), values)];
    const variant = block.variants[target];
    if (variant) parts.push("", `**${brief.label} notes:**`, "", variant.trim());
    return parts.join("\n");
  });

  const parameters = blocks
    .filter((b) => b.parameters.trim())
    .map((b) => {
      const values = Object.fromEntries(b.slots.map((s) => [s.key, s.default]));
      Object.assign(values, composition.slots?.[b.slug] ?? {});
      return `**${b.name}**\n\n${fillSlots(b.parameters.trim(), values)}`;
    });

  const fonts = tokens.fonts.length
    ? [
        ...tokens.fonts.map((f) => `- **${f.family}**${f.italic ? " italic" : ""} (${f.role}): weights ${f.weights.join(", ")}`),
        "",
        target === "next" ? "Load with `next/font/google`." : `Load via \`${googleFontsHref(tokens.fonts)}\`.`,
      ].join("\n")
    : "Use the system font stack.";

  const prompt = [
    `# Build this page as ${brief.label}: ${title}`,
    "",
    `You are an expert creative front-end developer. Reproduce the page below exactly — same layout, copy, visuals, motion and interaction. Hardcode every value given here; nothing in it is a suggestion. Document language: \`${lang}\`.`,
    "",
    brief.brief,
    "",
    "## What it is",
    "",
    `A ${blocks.length}-section page, in this order:`,
    "",
    ...blocks.map((b, i) => `${i + 1}. **${b.name}** (${b.category}, ${b.tone}): ${b.summary}`),
    "",
    "## Design tokens",
    "",
    tokenBlock(tokens),
    "",
    "### Fonts",
    "",
    fonts,
    "",
    "## Libraries",
    "",
    libraryBlock(target, libraries),
    "",
    "## Sections (in order)",
    "",
    sections.join("\n\n"),
    "",
    ...(parameters.length ? ["## Fixed parameters (bake these in)", "", parameters.join("\n\n"), ""] : []),
    "## Assets",
    "",
    assetTable(assets, media.missing),
    "",
    "## Global rules",
    "",
    "- Responsive from 360px to ultra-wide; no horizontal scroll at any width.",
    "- Respect `prefers-reduced-motion: reduce`: skip entrance animations and scroll-linked motion, show final states.",
    "- Semantic landmarks (`header`, `main`, `section` with headings, `footer`), visible `:focus-visible` states, `alt` text as given.",
    "- Scroll and pointer listeners are passive; animate only `transform` and `opacity` (and `filter`/`clip-path` where specified).",
    "",
  ].join("\n");

  return { prompt, tokens, libraries, assets, warnings: [...tokenWarnings, ...libWarnings, ...media.warnings] };
}
