#!/usr/bin/env node
// Captures a reference site (or a local reference.html) for block authoring:
// screenshots at desktop/mobile, a scroll-frame sequence, a scroll video,
// computed design tokens and the network asset list.
//
//   node capture.mjs <url-or-file> [--out dir] [--frames 8] [--no-video]
import { chromium } from "playwright";
import { mkdir, writeFile, readdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith("--"));
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
if (!input) {
  console.error("usage: capture.mjs <url-or-file> [--out dir] [--frames 8] [--no-video]");
  process.exit(1);
}

const url = existsSync(input) ? pathToFileURL(resolve(input)).href : input;
const slug = new URL(url).hostname.replace(/^www\./, "") || input.split("/").slice(-2, -1)[0] || "local";
const out = resolve(flag("out", join("captures", slug)));
const frames = Number(flag("frames", 8));
const video = !args.includes("--no-video");
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};

await mkdir(out, { recursive: true });
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const assets = new Map();

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  const { isMobile, hasTouch, deviceScaleFactor, ...size } = viewport;
  const context = await browser.newContext({
    viewport: size,
    isMobile,
    hasTouch,
    deviceScaleFactor,
    ...(video && name === "desktop" ? { recordVideo: { dir: out, size } } : {}),
  });
  const page = await context.newPage();
  page.on("response", (res) => {
    const type = res.request().resourceType();
    if (["image", "media", "font", "script", "stylesheet", "fetch", "xhr"].includes(type)) {
      assets.set(res.url(), { type, status: res.status(), contentType: res.headers()["content-type"] ?? "" });
    }
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(2500); // let loaders and entrance animations finish
  await page.screenshot({ path: join(out, `${name}-hero.png`) });

  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const max = Math.max(0, height - size.height);
  for (let i = 0; i <= frames; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round((max * i) / frames));
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(out, `${name}-scroll-${String(i).padStart(2, "0")}.png`) });
  }

  if (name === "desktop") {
    const tokens = await page.evaluate(() => {
      const count = (map, key) => key && map.set(key, (map.get(key) ?? 0) + 1);
      const colors = new Map(), backgrounds = new Map(), fonts = new Map(), sizes = new Map(), radii = new Map(), easings = new Map();
      for (const el of document.querySelectorAll("body *")) {
        const s = getComputedStyle(el);
        if (s.display === "none" || s.visibility === "hidden") continue;
        count(colors, s.color);
        if (s.backgroundColor !== "rgba(0, 0, 0, 0)") count(backgrounds, s.backgroundColor);
        count(fonts, `${s.fontFamily.split(",")[0].replace(/["']/g, "").trim()} ${s.fontWeight}`);
        count(sizes, s.fontSize);
        if (s.borderRadius !== "0px") count(radii, s.borderRadius);
        if (s.transitionTimingFunction && s.transitionDuration !== "0s") count(easings, `${s.transitionDuration} ${s.transitionTimingFunction}`);
      }
      const top = (m, n = 12) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
      const vars = {};
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText === ":root") {
              for (const prop of rule.style) if (prop.startsWith("--")) vars[prop] = rule.style.getPropertyValue(prop).trim();
            }
          }
        } catch { /* cross-origin sheet */ }
      }
      return {
        title: document.title,
        cssVariables: vars,
        colors: top(colors),
        backgrounds: top(backgrounds),
        fonts: top(fonts),
        fontSizes: top(sizes),
        radii: top(radii, 8),
        transitions: top(easings, 8),
        headings: [...document.querySelectorAll("h1,h2,h3")].slice(0, 30).map((h) => `${h.tagName} ${h.textContent.trim().slice(0, 80)}`),
        sections: [...document.querySelectorAll("section, header, footer")].map((s) => ({
          tag: s.tagName.toLowerCase(),
          id: s.id,
          className: String(s.className).slice(0, 80),
          height: Math.round(s.getBoundingClientRect().height),
        })),
        scriptsHint: [...document.scripts].map((s) => s.src).filter(Boolean),
      };
    });
    await writeFile(join(out, "tokens.json"), JSON.stringify({ url, height, ...tokens }, null, 2));
  }

  await context.close();
}

await browser.close();
await writeFile(join(out, "assets.json"), JSON.stringify([...assets].map(([u, meta]) => ({ url: u, ...meta })), null, 2));

if (video) {
  const webm = (await readdir(out)).find((f) => f.endsWith(".webm") && f !== "desktop-scroll.webm");
  if (webm) await rename(join(out, webm), join(out, "desktop-scroll.webm"));
}
console.log(`captured ${url} → ${out}`);
