import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { describeFile, objectKey } = await import("../lib/storage");
const { safeNext } = await import("../lib/redirect");

describe("objectKey", () => {
  it("builds a dated, slugged, unique key and keeps the extension", () => {
    const key = objectKey("Hero Döngü (final).MP4", new Date("2026-09-24T10:00:00Z"));
    expect(key).toMatch(/^assets\/2026\/09\/[0-9a-f]{8}-hero-dongu-final\.mp4$/);
    expect(objectKey("x.png")).not.toBe(objectKey("x.png"));
  });
});

describe("describeFile", () => {
  it("decides the type from an allowlist of extensions", () => {
    expect(describeFile("horse.glb")).toEqual({ contentType: "model/gltf-binary", kind: "model" });
    expect(describeFile("studio.hdr")).toEqual({ contentType: "image/vnd.radiance", kind: "hdr" });
    expect(describeFile("loop.webm")).toEqual({ contentType: "video/webm", kind: "video" });
    expect(describeFile("Photo.JPG")).toEqual({ contentType: "image/jpeg", kind: "image" });
    expect(describeFile("notes.pdf").kind).toBeNull();
  });

  it("never accepts scriptable files, whatever the browser claims", () => {
    expect(describeFile("logo.svg").kind).toBeNull();
    expect(describeFile("page.html").kind).toBeNull();
    expect(describeFile("image.png.html").kind).toBeNull();
  });
});

describe("safeNext", () => {
  it("allows same-site paths only", () => {
    expect(safeNext("/builder?x=1")).toBe("/builder?x=1");
    expect(safeNext("//evil.com")).toBe("/hesap");
    expect(safeNext("https://evil.com")).toBe("/hesap");
    expect(safeNext("/\\evil.com")).toBe("/hesap");
    expect(safeNext(undefined)).toBe("/hesap");
    // Browsers drop tabs and newlines inside URLs, turning these into "//evil.com".
    expect(safeNext("/\t/evil.com")).toBe("/hesap");
    expect(safeNext("/\n/evil.com")).toBe("/hesap");
    expect(safeNext("/%09/evil.com")).toBe("/%09/evil.com");
    expect(safeNext("/api/billing/checkout?plan=pro#x")).toBe("/api/billing/checkout?plan=pro#x");
  });
});
