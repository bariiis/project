# Örnek promptların analizi

Beş örnek (`raw/`): 3D Portfolio (14 KB), Aurora (15 KB), Baseline (39 KB), Laocoön (42 KB), Kimi (299 KB).

## 1. Üç format

| Format | Örnek | Nasıl yazılmış | Güçlü | Zayıf |
|---|---|---|---|---|
| **A. Spec (React/Tailwind)** | 3D Portfolio | Stack ve global stiller, sonra bölüm sırası, sonra her bölüm için Tailwind sınıfları, `clamp()` değerleri, animasyon gecikmeleri; en sonda yeniden kullanılan bileşenler ve bağımlılıklar | Kısa, okunur, stack'e sıkı bağlı | Framework değişince yeniden yazılmalı |
| **B. Tam kaynak** | Aurora | package.json, vite config ve her dosyanın birebir içeriği; en sonda "Design notes" | Birebir çıktı, yorum farkı yok | Prompt değil, kod dökümü; slot/özelleştirme yok; tek stack |
| **C. Tek dosya HTML (spec + verbatim parçalar)** | Baseline, Laocoön, Kimi | "What it is", shell ve importmap, token'lar, primitifler (spring, reveal), bölümler, loader, **Fixed parameters**, **Assets tablosu** | Framework'süz, her AI'da çalışır, stack'e "bir satırla" çevrilir; kritik yerlerde verbatim kod (shader, loop) | Uzun; 3D'de dosya boyutu çok büyüyor (Kimi 299 KB) |

**Seçim:** Block Spec'imiz **C formatının** iskeletini esas alır (What it is, tokens, libraries, sections,
fixed parameters, assets). Hedef stack, compiler'daki `TARGET_BRIEF` başlığı ve bloğun `variants`
notlarıyla değişir. B formatı "Power" katmanında **kaynak kod indirme** olarak sunulur, prompt olarak değil.

## 2. C formatının anatomisi (bizim şablonumuz)

1. **Başlık**: `# Recreate this site as a single HTML file: <Ad> — <Slogan>`
2. **Rol + kısıtlar**: "expert creative front-end developer", tek dosya, build yok, importmap ile sadece X kütüphanesi, "hardcode every value".
3. **What it is**: 1-2 paragraf konsept, ton, font, akış; bölüm listesi.
4. **Page shell & libraries**: importmap JSON, font `<link>`, reset, scroll modeli (Lenis veya native + lerp).
5. **Tokens**: `:root` CSS değişkenleri; alfa tonları açıkça yazılı.
6. **Primitifler**: spring helper (`tension/friction`), clip-mask reveal, in-view reveal, hover spring. Bir kez tanımlanıp bölümlerde parametreyle çağrılıyor.
7. **Sections (in order)**: her bölüm için DOM iskeleti, ölçüler (rem/px/clamp), içerik metni, animasyon (`from → to`, süre, easing, stagger, delay), responsive kırılımlar.
8. **Loader / reveal**: açılış sekansı ve zamanlama sabitleri.
9. **Fixed parameters (bake these in)**: tüm sayıların tek yerde özeti. Modelin "yaklaşık" yazmasını engelleyen en etkili bölüm.
10. **Assets**: tablo (anahtar, tam URL, nerede kullanıldığı) ve yükleme stratejisi (eager/lazy).

## 3. Tekrar eden teknikler (blok malzemesi)

| Teknik | Görüldüğü yer | Parametreler |
|---|---|---|
| Kelime/satır clip-mask reveal | Baseline, Laocoön, Kimi | `translateY(115%) → 0`, stagger 90-140ms, 700-1100ms easeOutExpo, `padding-bottom: .12-.14em` |
| Harf harf blur-up | Laocoön | `y 50px, blur 12px → 0`, 35ms stagger |
| Scroll-driven karakter opaklığı | 3D Portfolio | opacity 0.2 → 1, offset `start 0.8 → end 0.2` |
| In-view spring reveal | Baseline | IntersectionObserver, once, `{tension, friction}` |
| Parallax plate | Baseline | %132 yükseklik, `translateY 0 → 12%` |
| Scroll marquee (iki yön) | 3D Portfolio | `(scrollY - top + vh) * 0.3` |
| Sticky kart yığını | 3D Portfolio, Kimi | `scale = 1 - (n-1-i)*0.03`, kapanan kart 0.9 ve %55 karartma |
| Magnet hover | 3D Portfolio | padding 150, strength 3 |
| Intro loader / perde | Baseline, Kimi | min 1400ms, max 2600ms, exit 850ms; `ready` bayrağı hero animasyonlarını tetikler |
| Adaptif rem ölçekleme | Baseline, Kimi | `html{font-size}` vw bantları + >1920 JS büyütme |
| Scroll = kamera yörüngesi (Three.js) | Laocoön | 900vh sayfa, lerp 0.025, 360° orbit |
| Arka plan shader | Laocoön, Kimi | tam ekran plane, scroll ile palet geçişi |
| Özel imleç | Laocoön | iç halka anlık, dış halka lerp 0.2 |
| Video hero + hafif overlay | Aurora | 3-4 katman gradient, opaklık 0.07-0.19 |
| Chequered dissolve / halftone / contour | Kimi | canvas, marching squares |

Bu liste `library/` için kategori ve etiket (mood) önerilerinin kaynağıdır. Her teknik tek başına bir
`background` veya `loader` bloğu olabilir, ya da bir bölüm bloğunun parçası olarak kullanılabilir.

## 4. Kalite ölçütleri (her blok için kontrol listesi)

- [ ] Her sayı yazılı. "biraz", "yumuşak", "yaklaşık" gibi ifade yok.
- [ ] Easing'ler adlandırılmış ve tanımlı (cubic-bezier ya da spring config).
- [ ] Responsive kırılımlar açık (360 / 640 / 768 / 1024 / 1440 / 1920).
- [ ] `prefers-reduced-motion` davranışı tanımlı.
- [ ] Asset tablosu tam URL içeriyor ve hepsi **bizim** depolamamızda.
- [ ] Verbatim kod yalnızca modelin yanlış yazma riski yüksek yerlerde (shader, fizik döngüsü).
- [ ] "Fixed parameters" özeti bölüm metniyle çelişmiyor.
- [ ] `reference.html` prompt'tan üretildiğinde görsel olarak eşleşiyor (doğrulama adımı).

## 5. Uyarılar

- Örneklerin hepsi rakip CDN'lerine bağlı (`motionsites.ai/assets`, `api.getlayers.ai/storage`,
  `*.figma.site`, `images.higgs.ai`). Bu URL'ler bizim ürünümüzde kullanılamaz.
- Kimi gibi 300 KB'lık promptlar bazı araçların bağlam sınırını aşar. Blok başına hedef: **8-40 KB**.
  Uzun verbatim kod "Power" katmanında dosya olarak verilir.
