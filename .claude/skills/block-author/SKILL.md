---
name: block-author
description: >-
  Author a new block for this repo's prompt library (library/<category>/<slug>/block.yaml +
  reference.html). Use when asked to add a hero, cta, footer, navbar, pricing, loader,
  background or any other section to the library, to turn a reference site or screenshot into a
  block, or to review/fix an existing block. Triggers: "yeni blok", "kütüphaneye ekle",
  "add a block", "new hero", "turn this site into a block", "block spec".
---

# Block author

A block is one page section, stored as a framework-agnostic spec plus a working reference
implementation. The compiler (`packages/compiler`) turns one or more blocks into a single prompt
for a single-file HTML, React or Next.js build. Your job is to produce blocks that compile into
prompts an AI can rebuild **exactly**.

## Files

```
library/<category>/<slug>/
  block.yaml       # the spec (schema: packages/compiler/src/schema.ts)
  reference.html   # single-file implementation of the spec with default slot values
```

`<category>` is one of: navbar, hero, features, gallery, stats, testimonials, pricing, cta,
footer, loader, background, full-page. `<slug>` is kebab-case, equals `slug` in the YAML, and is
unique across the library.

## Workflow

1. **Brief.** Settle what the block is for, its tone (dark/light), 1-3 moods, and the one
   signature move that makes it memorable. Use the `frontend-design` and `design-taste-frontend`
   skills for direction and `scrollcraft` when the block is scroll-driven.
2. **Reference (optional).** If you start from a live site, capture it first:
   `node tools/capture/capture.mjs <url>` (see the `site-capture` skill), then read
   `tokens.json` and the screenshots. Use `design-dna` for a structured style profile.
   **Take techniques, never content:** no copied copy, brand names, asset URLs or 1:1 layouts.
   See `research/README.md`.
3. **Tokens.** Name colours by role (`ink`, `paper`, `muted`, `accent`/brand, `hairline`), not
   by hue. Reuse the names and values other blocks already use when the block belongs to the same
   family, so compositions merge without namespaced duplicates.
4. **Write `reference.html` first**, then describe it. It must run offline except for Google
   Fonts and importmap CDNs; load non-essential libraries with a dynamic `import()` that fails
   soft. The builder preview depends on two markers, and `pnpm library:check` enforces both:
   - the block's root element carries `data-block` (its height sizes the builder frame);
   - every slot's visible text sits in an element with `data-slot="<key>"` whose whole
     `textContent` is that value (wrap it in a `<span>` if it shares a parent with icons).
     Scripts that build DOM from slot text (word splits, tickers, wordmarks) must read it from
     that element at runtime and escape it or use DOM APIs, never inject it as HTML.
5. **Write `block.yaml`** following `research/ANALYSIS.md` section 2:
   - `summary`: one sentence, used in the "What it is" list.
   - `structure`: DOM skeleton, every size (px/rem/clamp), copy, and each animation as
     `from → to, duration, easing, stagger, delay, trigger`. Responsive breakpoints stated.
     Reduced-motion behaviour stated. User-editable copy becomes `{{slot_key}}`.
   - `parameters`: every constant again as a flat list ("Fixed parameters").
   - `variants`: only what differs per target (hooks/cleanup for React, `"use client"` and
     `next/font` for Next).
   - `assets`: full URLs on our storage only (MinIO bucket), each with `usage`.
   - `tier`: `free` for a few showcase blocks, `pro` by default, `power` for 3D/WebGL/shader.
6. **Verify.**
   - `pnpm library:check`: schema, slugs, slot references, compiles for every target.
   - `pnpm --filter @promptsite/compiler test -u` then review the snapshot diff.
   - `node tools/capture/capture.mjs library/<category>/<slug>/reference.html` and look at the
     desktop and mobile screenshots. Fix overflow, clipped text, invisible states.
   - Checklist in `research/ANALYSIS.md` section 4.

## Style rules for the spec text

- Imperative and exact. Never "subtle", "smooth", "about". Give the number.
- Name easings once as tokens (`--ease-out-expo`) and refer to them by name.
- Refer to colours by token (`--color-ink`), never by raw hex inside `structure`.
- Keep a block under ~40 KB of YAML. Put long verbatim code (shaders, physics loops) in
  `structure` only when a model would otherwise get it wrong.
- Write the spec in English (AI builders follow English prompts most reliably). Slot labels are
  Turkish because they are shown in the builder UI.
