---
name: site-capture
description: >-
  Capture a reference website or a local reference.html with Playwright: desktop and mobile
  screenshots, a scroll-frame sequence, a scroll video, computed design tokens (colours, fonts,
  sizes, radii, transitions, :root variables), section outline and the network asset list. Use
  before analysing a site with design-dna, when authoring a library block from a reference, or
  to visually verify a block's reference.html. Triggers: "siteyi tara", "capture", "screenshot
  the site", "extract tokens from URL", "önizleme üret".
---

# Site capture

```bash
node tools/capture/capture.mjs <url-or-file> [--out dir] [--frames 8] [--no-video]
```

Output goes to `tools/capture/captures/<host-or-folder>/` (git-ignored):

| File | What |
|---|---|
| `desktop-hero.png`, `mobile-hero.png` | First screen after 2.5s (loaders finished) at 1440×900 and 390×844@2x |
| `desktop-scroll-NN.png`, `mobile-scroll-NN.png` | Evenly spaced scroll positions, 700ms settle each |
| `desktop-scroll.webm` | Video of the desktop pass, usable as a raw block preview |
| `tokens.json` | `:root` variables, top colours/backgrounds/fonts/sizes/radii/transitions, headings, section outline, script URLs |
| `assets.json` | Every image/media/font/script/stylesheet/fetch the page loaded |

## Notes

- Chromium comes from `PLAYWRIGHT_BROWSERS_PATH`; set `PLAYWRIGHT_CHROMIUM_PATH` to use a
  different binary.
- Scroll-jacked pages (Lenis, 900vh WebGL stages) still work: positions are set with
  `window.scrollTo`, which Lenis follows.
- Some hosts block headless browsers or this environment's egress. Run the capture on a machine
  or Coolify worker with open network access in that case.
- The captures are for **analysis only**. Never ship captured assets or copy in a library block.
