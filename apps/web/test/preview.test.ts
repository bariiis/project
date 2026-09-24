import { describe, expect, it } from "vitest";
import { injectPreview } from "../lib/preview";
import { decodeSlots, encodeSlots } from "../lib/slot-encoding";

describe("slot encoding", () => {
  it("round-trips unicode values", () => {
    const values = { brand: "Kuzey Işığı", headline_1: "Çok hızlı → şimdi" };
    expect(decodeSlots(encodeSlots(values))).toEqual(values);
  });

  it("drops malformed input, bad keys and non-string values", () => {
    expect(decodeSlots("%%%")).toEqual({});
    expect(decodeSlots(encodeSlots({ "Bad Key": "x", ok: "y" }))).toEqual({ ok: "y" });
    expect(decodeSlots(btoa(JSON.stringify({ n: 1, list: ["a"] })))).toEqual({});
    expect(decodeSlots(btoa(JSON.stringify(["a"])))).toEqual({});
    expect(decodeSlots(null)).toEqual({});
  });
});

describe("injectPreview", () => {
  const html = "<html><body><h1 data-slot=\"headline\">Hi</h1><script type=\"module\">run()</script></body></html>";

  it("inserts the runtime right before </body>", () => {
    const out = injectPreview(html, "demo", { headline: "Yeni" });
    expect(out.indexOf("<script>(() =>")).toBeGreaterThan(out.indexOf("run()"));
    expect(out.endsWith("</script></body></html>")).toBe(true);
    expect(out).toContain('"headline":"Yeni"');
  });

  it("cannot be broken out of with a closing script tag", () => {
    const out = injectPreview(html, "demo", { headline: "</script><img src=x onerror=alert(1)>" });
    const runtime = out.slice(out.indexOf("<script>(() =>"));
    expect(runtime.match(/<\/script>/g)).toHaveLength(1);
    expect(runtime).toContain("\\u003c/script>");
  });
});
