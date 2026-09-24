# Promptsite

Animasyonlu web sayfaları için **prompt kütüphanesi + builder**. Kullanıcı hero, CTA, footer gibi
bölümleri seçer, metinleri kendi markasına göre değiştirir; sistem bunları tek, çelişkisiz bir
prompta derler. Prompt; Claude, Cursor, v0 veya Lovable'a yapıştırılınca **tek dosya HTML**,
**React + Vite** ya da **Next.js** olarak sayfayı üretir.

## Yapı

```
apps/web/            Next.js 16 (App Router): vitrin, /library, /builder, API
packages/compiler/   Block Spec şeması (Zod) + çok hedefli prompt derleyici + testler
packages/db/         Drizzle şeması, migration'lar ve admin script'i (Postgres)
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
pnpm test                # compiler + web testleri
pnpm db:migrate          # yerel Postgres'e migration uygula
pnpm db:generate         # şema değişince yeni migration üret
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

Adım adım rehber: **[docs/DEPLOY.md](docs/DEPLOY.md)**. Kısaca:

- Coolify'da PostgreSQL ve MinIO kaynakları eklenir.
- Uygulama bu repodan **Dockerfile** ile kurulur (port `3000`, health check `/api/health`).
- Ortam değişkenleri çalışma anında okunur. En az `SITE_URL`, `DATABASE_URL` ve `BETTER_AUTH_SECRET` gerekir.
- Migration'lar her açılışta otomatik uygulanır.
- Yayından sonra `node tools/smoke.mjs https://site-adresi` ile 8 temel kontrol çalıştırılır.

Yerelde tüm yığın: `cp .env.example .env && docker compose up --build`.

### Planlar nasıl hesaplanır

`active`, `on_trial` ve `past_due` abonelikler erişim verir. `cancelled` abonelik `ends_at`
tarihine kadar erişim verir. En yüksek plan geçerlidir. Admin hesapları tüm katmanlara erişir.
Giriş yapmış bir kullanıcı günde en fazla `DAILY_COMPOSITION_LIMIT` (varsayılan 300) birleşik
prompt üretebilir.

## Yol haritası

- **Faz 0:** compiler, ilk 3 blok, kütüphane + builder arayüzü, capture aracı, skill'ler, DB şeması, Docker.
- **Faz 1:** Better Auth (e-posta + Google), Lemon Squeezy abonelik + webhook, gerçek plan kontrolü, MinIO asset yükleme, admin paneli, prompt kaydı ve günlük limit.
- **Faz 2 (bu sürüm):** builder'da sürükle-bırak (fare ve klavye), metin değişikliklerinin canlı önizlemesi, blokların gerçek yükseklikte tek sayfa gibi dizilmesi, proje kaydetme (Pro) ve `/projeler` sayfası.
- **Faz 3:** MCP sunucusu, 40-60 blok, TR/EN arayüz.
