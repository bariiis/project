import { afterEach, describe, expect, it, vi } from "vitest";
import { siteUrl } from "../lib/site";

describe("siteUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("prefers SITE_URL, then NEXT_PUBLIC_SITE_URL, then the fallback", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(siteUrl("http://internal:3000")).toBe("http://internal:3000");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://old.example.com");
    expect(siteUrl("http://internal:3000")).toBe("https://old.example.com");
    vi.stubEnv("SITE_URL", "https://promptsite.example.com/");
    expect(siteUrl("http://internal:3000")).toBe("https://promptsite.example.com");
  });

  it("is undefined when nothing is configured", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(siteUrl()).toBeUndefined();
  });
});
