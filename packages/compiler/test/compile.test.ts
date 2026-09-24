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

describe("checkReference", () => {
  it("requires a data-block root and one data-slot per slot", () => {
    const b = block();
    expect(checkReference('<section data-block><h1 data-slot="headline">Hi</h1></section>', b)).toEqual([]);
    expect(checkReference('<section><h1 data-slot="headline">Hi</h1></section>', b)).toEqual(["missing a data-block root element"]);
    expect(checkReference("<section data-block><h1>Hi</h1></section>", b)).toEqual(['no element marks slot "headline" (data-slot)']);
  });
});

describe("library", () => {
  const entries = loadLibrary(LIBRARY);

  it("loads every block with a reference implementation", () => {
    expect(entries.length).toBeGreaterThanOrEqual(3);
    for (const entry of entries) expect(entry.referencePath, entry.block.slug).not.toBeNull();
  });

  it("composes hero + cta + footer for every target without token conflicts", () => {
    const pick = (category: string) => entries.find((e) => e.block.category === category)!.block;
    const blocks = [pick("hero"), pick("cta"), pick("footer")];
    for (const target of TARGETS) {
      const result = compile({ title: "Northwind", target, blocks });
      expect(result.warnings).toEqual([]);
      expect(result.prompt).not.toMatch(/\{\{\s*[a-z][a-z0-9_]*\s*\}\}/);
      expect(result.prompt).toMatchSnapshot(target);
    }
  });
});
