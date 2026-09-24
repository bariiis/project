# Örnek promptların analizi

On üç örnek (`raw/`):
- **İlk grup:** 3D Portfolio (14 KB), Aurora (15 KB), Baseline (39 KB), Laocoön (42 KB), Kimi (299 KB).
- **İkinci grup:** Loopstack (28 KB), Lumora (46 KB), Payfull (31 KB), Space Voyage (24 KB).
- **Üçüncü grup:** LTX (26 KB), prmpt (13 KB), Soda (38 KB), SpaceEdu (33 KB).

## 1. Dört format

| Format | Örnek | Nasıl yazılmış | Güçlü | Zayıf |
|---|---|---|---|---|
| **A. Spec (React/Tailwind)** | 3D Portfolio, prmpt (GSAP ScrollTrigger + Motion) | Stack ve global stiller, sonra bölüm sırası, sonra her bölüm için Tailwind sınıfları, `clamp()` değerleri, animasyon gecikmeleri; en sonda yeniden kullanılan bileşenler ve bağımlılıklar | Kısa, okunur, stack'e sıkı bağlı | Framework değişince yeniden yazılmalı |
| **B. Tam kaynak** | Aurora | package.json, vite config ve her dosyanın birebir içeriği; en sonda "Design notes" | Birebir çıktı, yorum farkı yok | Prompt değil, kod dökümü; slot/özelleştirme yok; tek stack |
| **C. Tek dosya HTML (spec + verbatim parçalar)** | Baseline, Laocoön, Kimi, Loopstack, Lumora, Space Voyage, LTX, Soda, SpaceEdu | "What it is", shell ve importmap, token'lar, primitifler (spring, reveal), bölümler, loader, **Fixed parameters**, **Assets tablosu** | Framework'süz, her AI'da çalışır, stack'e "bir satırla" çevrilir; kritik yerlerde verbatim kod (shader, loop) | Uzun; 3D'de dosya boyutu çok büyüyor (Kimi 299 KB) |
| **D. Framework kaynağı + kalibrasyon verisi** | Payfull | "Fidelity task" talimatı, birebir metin (karakter sayılarıyla), vw ölçüleri, Next.js dosyaları ve ölçülmüş bir veri tablosu (açı → video zamanı) | Etkileşimin gerçekten ölçülmüş verisini taşır; model tahmin etmez | Verisi belirli bir videoya bağlı; başka medyayla çalışmaz, özelleştirilemez |

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
| Harf harf yandan blur'la açılış | Loopstack | `translateX(-105%) blur(20px) → 0`, 1.2s, 90ms stagger, `cubic-bezier(.05,.9,.1,1)` |
| Gecikmeli cam imleç etiketi + anlık halka | Loopstack | etiket lerp 0.08, ölçek lerp 0.15, butonda etiket gizlenir, halka 1.6× |
| Nabız atan durum noktası | Loopstack | 2s, iç nokta 0.85→1.1, dış dalga 0.6→2.3 ve sönme |
| Canvas "liquid reveal" (imleç fırçası) | Lumora | fırça yarıçapı 143px, sönüm 0.016/kare, radial gradient fırça, `destination-out` ile iz silme |
| 000→100 sayaçlı loader perdesi | Lumora, Space Voyage | 1300ms easeInOutCubic, 3 haneli sayaç, perde `translateY(-100%)` |
| Scroll'a bağlı sayı artışı | Lumora | `top bottom → center center` ilerlemesi, ~30ms throttle |
| İmlece göre video karesine atlama (scrub) | Payfull | açı → zaman tablosu, rAF ile birleştirilmiş seek, `seeked` sonrası en son hedef, all-intra video |
| Eğilen canvas "portal penceresi" | Space Voyage | 44 noktalı yuvarlak dikdörtgen, sahte perspektif (odak 850), ekrana kilitli medya, tıkla → pencere ekranı doldurur |
| Video preloader + yerine uçan logo | Space Voyage | `playbackRate = süre/3`, logo 2s'de merkezden header'a |
| Önceden üretilmiş video geçişleriyle durum makinesi | LTX | ileri/geri klip çiftleri, son karede bekleme, `requestVideoFrameCallback` ile "ilk kare hazır" kontrolü, token'lı kilit, sekme gizlenince zaman aşımı duraklatma |
| İmlecin X konumuyla iki yönlü video scrub | prmpt | ortada ölü bölge; sola gidince bir video, sağa gidince diğeri ileri sarılır (rAF) |
| Scroll'la ölçeklenen dağınık galeri | prmpt | kart `scale = min(1, (vh - top)/(vh*0.6))`, `transform-origin: right bottom`, siyah panel ilk 100vh'de yukarı kayar |
| İmlece doğru eğilen 3D model + itilen parçacıklar | Soda | `<model-viewer>`, imleç kuvvet alanı ile itilen yüzen 3D objeler, yükselen baloncuklar, lezzet değiştirince gradient geçişi. `flavor-switch-hero` olarak uygulandı: 3D model yerine ürün görseli + CSS 3D eğilme ve "flip-swap", görsel yoksa CSS kutu |
| Üçlü seçici (öne çıkan + iki yan slot) | SpaceEdu | tıklanan yan öğe öne çıkar, kalan ikisi slotları doldurur; video `data-src` ile ilk kullanımda yüklenir; reduced-motion için durağan görsel |

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
- [ ] Medyaya dayanan bloklar (video/görsel slot'u) medya verilmediğinde kodla üretilmiş bir yedek görüntüyle de düzgün çalışıyor.

## 5. Uyarılar

- Örneklerin hepsi rakip CDN'lerine bağlı (`motionsites.ai/assets`, `api.getlayers.ai/storage`,
  `*.figma.site`, `images.higgs.ai`, `*.cloudfront.net`). Bu URL'ler bizim ürünümüzde kullanılamaz.
- Kimi gibi 300 KB'lık promptlar bazı araçların bağlam sınırını aşar. Blok başına hedef: **8-40 KB**.
  Uzun verbatim kod "Power" katmanında dosya olarak verilir.

## 6. İkinci grubun dersleri

- **Medya merkezde.** Dört promptun dördü de video veya görsele dayanıyor. Bloklarımız medyayı
  kullanıcının vereceği bir **slot** olarak tanımlar (`image` / `video`) ve medya yokken kodla üretilmiş
  yedek görüntüye düşer. Böylece hem önizleme hem prompt medyasız da anlamlı kalır.
- **Etkileşimin verisi.** Payfull'un açı → zaman tablosu tek bir videoya özel. Genel bir blok, veriye
  ihtiyaç duymayan bir eşleme kullanmalı (ör. imlecin yatay konumu → video zamanı).
- **Tek ekran sahneler.** Loopstack ve Space Voyage kaydırmayan, tek ekranlık "sahne"ler. Builder'da
  bunlar sayfanın bir bölümü olarak dizildiği için bloklarımızda `100svh` yüksekliğinde bölümler olarak
  tanımlanır, `overflow: hidden` sayfaya değil bölüme uygulanır.

## 7. Üçüncü grubun dersleri

- **Video güvenilirliği bir özellik.** LTX'in en uzun bölümü "seam-safe player": kilit, token, ilk
  kare kontrolü, sekme gizlenince duraklatma, hata durumunda son geçerli kareyi koruma. Video
  geçişli her blokta bu kurallar `structure` içinde açıkça yazılmalı; model kendiliğinden yazmıyor.
- **"Known pitfalls / acceptance" listesi** (LTX, SpaceEdu, Space Voyage): Promptun sonunda
  gerçek tarayıcıda görülen hataların ve kabul kontrollerinin listesi var. Compiler'a blok başına
  isteğe bağlı bir `acceptance` alanı eklemek değerli olur (sonraki iş).
- **Tembel medya.** SpaceEdu, videoları `data-src` ile ilk kullanımda yüklüyor. Çok medyalı bloklarda
  varsayılan kural bu olmalı.
- **3D asset'e bağlı teknikler.** Soda'nın etkisi GLB modellere dayanıyor. Kullanıcıların çoğunda
  model yok, ürün fotoğrafı var. Bu yüzden teknik görsel slot'una indirgenir (şeffaf PNG + CSS 3D
  transform, yedek olarak CSS ile çizilmiş ürün). GLB kullanımı `variants` notunda anlatılır.
  Ayrı bir `model` slot tipi ileride eklenebilir.
- **Kütüphanesiz koreografi.** GSAP ile yapılan renk ve dönüş geçişleri `@property` renkleri ve Web
  Animations API ile aynı şekilde kurulabiliyor. Döngünün ve geçişin aynı `transform`'u yazmaması
  için objeler iki katmanlı (dış: döngü, iç: geçiş).
