import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BlockSchema, compile, fillSlots, mergeTokens, TARGETS, type BlockInput } from "../src";
import { checkReference, loadLibrary } from "../src/node";

const LIBRARY = resolve(import.meta.dirname, "../../../library");

function block(overrides: Partial<BlockInput> = {}) {
  return BlockSchema.parse({
    slug: "test-hero",
    name: "Test Hero",
    category: "hero",
    tone: "dark",
    tier: "free",
    targets: ["html", "react", "next"],
    summary: "A test hero.",
    tokens: { colors: { ink: "#000000" }, fonts: [{ family: "Geist", weights: [400], role: "body" }] },
    slots: [{ key: "headline", label: "Headline", type: "text", default: "Hello" }],
    structure: "Heading reads **{{headline}}**.",
    ...overrides,
  });
}

describe("BlockSchema", () => {
  it("rejects placeholders that are not declared slots", () => {
    const result = BlockSchema.safeParse({ ...block(), structure: "{{missing}}" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("unknown slot {{missing}}");
  });

  it("rejects duplicate slot keys", () => {
    const slot = { key: "a", label: "A", type: "text", default: "" };
    expect(BlockSchema.safeParse({ ...block(), slots: [slot, slot], structure: "x" }).success).toBe(false);
  });
});

describe("fillSlots", () => {
  it("replaces known keys and tolerates whitespace", () => {
    expect(fillSlots("a {{ x }} b {{y}}", { x: "1", y: "2" })).toBe("a 1 b 2");
  });
});

describe("mergeTokens", () => {
  it("namespaces conflicting values and unions font weights", () => {
    const a = block();
    const b = block({
      slug: "other",
      tokens: { colors: { ink: "#111111" }, fonts: [{ family: "Geist", weights: [500, 400], role: "body" }] },
    });
    const { tokens, warnings } = mergeTokens([a, b]);
    expect(tokens.colors).toEqual({ ink: "#000000", "other-ink": "#111111" });
    expect(tokens.fonts).toEqual([{ family: "Geist", weights: [400, 500], role: "body", italic: false }]);
    expect(warnings).toHaveLength(1);
  });
});

describe("compile", () => {
  it("applies slot overrides and falls back to defaults", () => {
    const b = block();
    expect(compile({ title: "T", target: "html", blocks: [b] }).prompt).toContain("Heading reads **Hello**.");
    const custom = compile({ title: "T", target: "html", blocks: [b], slots: { "test-hero": { headline: "Merhaba" } } });
    expect(custom.prompt).toContain("Heading reads **Merhaba**.");
  });

  it("emits an importmap for html and npm deps for react", () => {
    const b = block({ libraries: [{ name: "lenis", version: "1.3.26", esm: "https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.mjs", npm: "lenis" }] });
    expect(compile({ title: "T", target: "html", blocks: [b] }).prompt).toContain('<script type="importmap">');
    const react = compile({ title: "T", target: "react", blocks: [b] }).prompt;
    expect(react).toContain("`lenis@^1.3.26`");
    expect(react).not.toContain("importmap");
  });

  it("merges roman and italic cuts into one Google Fonts family", () => {
    const b = block({
      tokens: {
        fonts: [
          { family: "Instrument Serif", weights: [400], role: "display" },
          { family: "Instrument Serif", weights: [400], role: "display", italic: true },
        ],
      },
    });
    expect(compile({ title: "T", target: "html", blocks: [b] }).prompt).toContain(
      "css2?family=Instrument+Serif:ital,wght@0,400;1,400&display=swap",
    );
  });

  it("refuses blocks that do not support the target", () => {
    expect(() => compile({ title: "T", target: "next", blocks: [block({ targets: ["html"] })] })).toThrow(/test-hero/);
  });

  it("refuses an empty composition", () => {
    expect(() => compile({ title: "T", target: "html", blocks: [] })).toThrow();
  });
});

describe("media slots", () => {
  const withVideo = () =>
    block({
      slots: [
        { key: "headline", label: "Headline", type: "text", default: "Hello" },
        { key: "bg_video", label: "Video", type: "video", default: "", usage: "background loop" },
      ],
    });

  it("require a usage and an empty or https default", () => {
    const base = { key: "v", label: "V", type: "video" };
    expect(BlockSchema.safeParse({ ...block(), slots: [{ ...base, default: "" }] }).success).toBe(false);
    expect(BlockSchema.safeParse({ ...block(), structure: "x", slots: [{ ...base, default: "http://x.dev/a.mp4", usage: "u" }] }).success).toBe(false);
    expect(BlockSchema.safeParse({ ...block(), structure: "x", slots: [{ ...base, default: "https://x.dev/a.mp4", usage: "u" }] }).success).toBe(true);
  });

  it("list a provided https URL in the Assets table", () => {
    const b = withVideo();
    const { prompt, assets } = compile({ title: "T", target: "html", blocks: [b], slots: { "test-hero": { bg_video: "https://cdn.example.com/loop.mp4" } } });
    expect(assets).toContainEqual(expect.objectContaining({ key: "bg_video", kind: "video", url: "https://cdn.example.com/loop.mp4" }));
    expect(prompt).toContain("| `bg_video` | video | Test Hero: background loop | https://cdn.example.com/loop.mp4 |");
    expect(prompt).not.toContain("_not provided_");
  });

  it("mark missing or unsafe media as not provided and ask for the fallback", () => {
    const b = withVideo();
    const empty = compile({ title: "T", target: "html", blocks: [b] });
    expect(empty.prompt).toContain("| `bg_video` | video | Test Hero: background loop | _not provided_ |");
    expect(empty.prompt).toContain("render the procedural fallback");
    const unsafe = compile({ title: "T", target: "html", blocks: [b], slots: { "test-hero": { bg_video: "javascript:alert(1)" } } });
    expect(unsafe.prompt).not.toContain("javascript:");
    expect(unsafe.warnings).toContain("test-hero.bg_video: ignored non-https media URL");
  });
});

describe("checkReference", () => {
  it("requires a data-block root and one data-slot per slot", () => {
    const b = block();
    expect(checkReference('<section data-block><h1 data-slot="headline">Hi</h1></section>', b)).toEqual([]);
    expect(checkReference('<section><h1 data-slot="headline">Hi</h1></section>', b)).toEqual(["missing a data-block root element"]);
    expect(checkReference("<section data-block><h1>Hi</h1></section>", b)).toEqual(['no element marks slot "headline" (data-slot)']);
    const media = block({ structure: "x", slots: [{ key: "bg_video", label: "V", type: "video", default: "", usage: "u" }] });
    expect(checkReference('<section data-block><video data-slot-src="bg_video"></video></section>', media)).toEqual([]);
    expect(checkReference('<section data-block><video data-slot="bg_video"></video></section>', media)).toEqual(['no element marks slot "bg_video" (data-slot-src)']);
  });
});

describe("library", () => {
  const entries = loadLibrary(LIBRARY);

  it("loads every block with a reference implementation", () => {
    expect(entries.length).toBeGreaterThanOrEqual(3);
    for (const entry of entries) expect(entry.referencePath, entry.block.slug).not.toBeNull();
  });

  it("composes hero + cta + footer for every target without token conflicts", () => {
    const pick = (slug: string) => entries.find((e) => e.block.slug === slug)!.block;
    const blocks = [pick("ember-field-hero"), pick("ticker-band-cta"), pick("wordmark-footer")];
    for (const target of TARGETS) {
      const result = compile({ title: "Northwind", target, blocks });
      expect(result.warnings).toEqual([]);
      expect(result.prompt).not.toMatch(/\{\{\s*[a-z][a-z0-9_]*\s*\}\}/);
      expect(result.prompt).toMatchSnapshot(target);
    }
  });

  it("composes every block of the library into one page without token conflicts", () => {
    const blocks = entries.map((e) => e.block);
    for (const target of TARGETS) {
      const result = compile({ title: "Everything", target, blocks });
      expect(result.warnings).toEqual([]);
      expect(result.prompt).toContain("_not provided_"); // media slots without files
    }
  });
});
