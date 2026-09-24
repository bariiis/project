import { describe, expect, it } from "vitest";
import { Window } from "happy-dom";
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

  it("fills text and swaps media sources only for https URLs when run in a page", () => {
    const page =
      '<body><section data-block><h1 data-slot="headline">Hi</h1>' +
      '<video data-slot-src="bg_video"></video><img data-slot-src="photo"></section></body>';
    const out = injectPreview(page, "demo", {
      headline: "<b>Yeni</b>",
      bg_video: "https://cdn.example.com/a.mp4",
      photo: "javascript:alert(1)",
    });
    const window = new Window();
    const document = window.document;
    document.write(out.slice(0, out.indexOf("<script>")));
    const code = out.slice(out.indexOf("<script>") + 8, out.lastIndexOf("</script>"));
    new window.Function(code)();
    expect(document.querySelector("h1")!.textContent).toBe("<b>Yeni</b>");
    expect(document.querySelector("h1")!.children).toHaveLength(0);
    expect(document.querySelector("video")!.getAttribute("src")).toBe("https://cdn.example.com/a.mp4");
    expect(document.querySelector("img")!.hasAttribute("src")).toBe(false);
  });
});
