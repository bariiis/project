#!/usr/bin/env node
// Post-deploy smoke test: `node tools/smoke.mjs https://your-site.com`
// No dependencies. Prints one line per check and exits non-zero if any check fails.

const base = (process.argv[2] ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("usage: node tools/smoke.mjs https://your-site.com");
  process.exit(2);
}

const checks = [
  ["health endpoint reports the library", async () => {
    const res = await fetch(`${base}/api/health`);
    const body = await res.json();
    if (!res.ok || body.ok !== true || !(body.blocks > 0)) throw new Error(`${res.status} ${JSON.stringify(body)}`);
    return `${body.blocks} blocks`;
  }],
  ["sample image is served", async () => {
    const res = await fetch(`${base}/media/demo/terminal.webp`, { method: "HEAD" });
    if (!res.ok || !res.headers.get("content-type")?.includes("image/webp")) throw new Error(`${res.status} ${res.headers.get("content-type")}`);
  }],
  ["sample video answers range requests", async () => {
    const res = await fetch(`${base}/media/demo/tiger-approach.mp4`, { headers: { range: "bytes=0-1023" } });
    await res.arrayBuffer();
    if (res.status !== 206) throw new Error(`expected 206, got ${res.status} (videos cannot seek without range support)`);
  }],
  ["library page renders", async () => {
    const res = await fetch(`${base}/library`);
    if (!res.ok) throw new Error(String(res.status));
  }],
  ["previews are sandboxed and use sample media", async () => {
    const res = await fetch(`${base}/api/preview/trio-switcher-hero`);
    const html = await res.text();
    if (!res.ok) throw new Error(String(res.status));
    if (!res.headers.get("content-security-policy")?.includes("sandbox")) throw new Error("missing CSP sandbox header");
    if (!html.includes("/media/demo/")) throw new Error("sample media paths missing");
  }],
  ["auth API answers", async () => {
    const res = await fetch(`${base}/api/auth/get-session`);
    if (!res.ok) throw new Error(`${res.status} (check BETTER_AUTH_SECRET and DATABASE_URL)`);
  }],
  ["checkout redirects to the configured SITE_URL", async () => {
    const res = await fetch(`${base}/api/billing/checkout?plan=pro`, { redirect: "manual" });
    const location = res.headers.get("location") ?? "";
    if (res.status < 300 || res.status >= 400) throw new Error(`expected a redirect to sign-in, got ${res.status}`);
    if (!location.startsWith(base)) throw new Error(`redirects to ${location}; set SITE_URL=${base}`);
  }],
  ["webhook rejects unsigned requests", async () => {
    const res = await fetch(`${base}/api/webhooks/lemonsqueezy`, { method: "POST", body: "{}" });
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  }],
];

let failed = 0;
for (const [name, run] of checks) {
  try {
    const note = await run();
    console.log(`✓ ${name}${note ? ` (${note})` : ""}`);
  } catch (error) {
    failed++;
    console.log(`✗ ${name}: ${error instanceof Error ? error.message : error}`);
  }
}
console.log(failed ? `\n${failed} of ${checks.length} checks failed` : `\nall ${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
