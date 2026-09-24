# Promptsite

Animasyonlu web sayfaları için **prompt kütüphanesi + builder**. Kullanıcı hero, CTA, footer gibi
bölümleri seçer, metinleri kendi markasına göre değiştirir; sistem bunları tek, çelişkisiz bir
prompta derler. Prompt; Claude, Cursor, v0 veya Lovable'a yapıştırılınca **tek dosya HTML**,
**React + Vite** ya da **Next.js** olarak sayfayı üretir.

## Yapı

```
apps/web/            Next.js 16 (App Router): vitrin, /library, /builder, API
packages/compiler/   Block Spec şeması (Zod) + çok hedefli prompt derleyici + testler
packages/db/         Drizzle şeması ve migration'lar (Postgres). Faz 1'de bağlanacak
library/             Bloklar: <kategori>/<slug>/block.yaml + reference.html
tools/capture/       Playwright ile site/blok yakalama (ekran görüntüsü, video, token, asset)
research/            Rakip ve format analizi (ham promptlar git dışında)
.claude/skills/      design-dna, frontend-design, design-taste-frontend, scrollcraft,
                     extract-design-system, block-author, site-capture
```

## Geliştirme

```bash
pnpm install
pnpm dev                 # http://localhost:3000
pnpm test                # compiler testleri (snapshot dahil)
pnpm typecheck
pnpm library:check       # tüm blokları doğrula ve her hedef için derle
node tools/capture/capture.mjs library/hero/ember-field-hero/reference.html
```

`DEV_PLAN=pro pnpm dev` ile ücretli blokları yerelde açabilirsiniz (production'da etkisizdir).

## Yeni blok eklemek

`block-author` skill'ini izleyin (`.claude/skills/block-author/SKILL.md`). Özetle:
`library/<kategori>/<slug>/` altına önce çalışan bir `reference.html`, sonra onu birebir anlatan
`block.yaml` yazılır. Ardından `pnpm library:check`, snapshot güncellemesi ve capture ile görsel
kontrol yapılır. Rakip sitelerden **teknik** alınır; metin, marka, asset ve birebir layout alınmaz
(`research/README.md`).

## Deploy (Coolify)

1. Coolify'da yeni uygulama: bu repo, build pack **Dockerfile**, port `3000`, health check `/api/health`.
2. Aynı projeye Postgres ve MinIO kaynaklarını ekleyin; bağlantı bilgilerini `.env.example`
   değişkenleriyle girin (Faz 1).
3. Yerelde tüm yığın: `cp .env.example .env && docker compose up --build`.

## Yol haritası

- **Faz 0 (bu sürüm):** compiler, ilk 3 blok, kütüphane + builder arayüzü, capture aracı, skill'ler, DB şeması, Docker.
- **Faz 1:** Better Auth, Lemon Squeezy abonelik + webhook, plan kontrolü (`apps/web/lib/access.ts`), MinIO asset'leri, admin, prompt olay kaydı/rate limit.
- **Faz 2:** builder'da sürükle-bırak, proje kaydetme, blok başına gerçek yükseklikte önizleme.
- **Faz 3:** MCP sunucusu, 40-60 blok, TR/EN arayüz.
