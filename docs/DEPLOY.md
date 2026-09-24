# Coolify'da yayına alma

Bu rehber siteyi kendi Coolify sunucunuzda sıfırdan ayağa kaldırır. Sıra önemlidir: önce
veritabanı ve depolama, sonra uygulama, en son ödeme.

Toplam süre yaklaşık 30–45 dakikadır. Lemon Squeezy onayı buna dahil değildir.

## 0. Hazırlık

- Coolify v4 kurulu ve çalışır olmalı. GitHub hesabınız Coolify'a bağlı olmalı
  (Sources → GitHub App).
- Üç alan adı ya da alt alan adı. Hepsi Coolify sunucusunun IP'sine **A kaydı** ile yönlenmeli:

  | Ne için | Örnek |
  |---|---|
  | Site | `promptsite.com` |
  | MinIO S3 API (görsel adresleri) | `s3.promptsite.com` |
  | MinIO konsolu (sadece siz) | `minio.promptsite.com` |

- Hangi branch'in yayınlanacağı:
  - PR #1 birleştiyse `main`;
  - birleşmeden denemek için `claude/landing-page-prompt-jp2u1t`.

## 1. PostgreSQL

1. Projenizde **+ New → Database → PostgreSQL** (16 ya da 17).
2. Açıldıktan sonra kaynağın sayfasındaki **Postgres URL (internal)** değerini kopyalayın.
   `postgres://kullanici:sifre@<servis-adı>:5432/postgres` gibi bir adrestir.
   Bu `DATABASE_URL` olacak.
3. Veritabanını internete açmanıza gerek yok. Uygulama aynı Coolify ağından bağlanır.

Tablolar uygulama her açıldığında **otomatik** oluşturulur ve güncellenir (migration). Elle bir şey
çalıştırmayın.

## 2. MinIO (yüklenen görseller)

1. **+ New → Service → MinIO**.
2. Servis ayarlarında iki alan adını girin:
   - S3 API için: `https://s3.promptsite.com` (iç port 9000);
   - konsol için: `https://minio.promptsite.com` (iç port 9001).
3. Ortam değişkenlerinde yazan kök kullanıcı ve şifreyi not alın. Bunlar `S3_ACCESS_KEY` ve
   `S3_SECRET_KEY` olacak. İsterseniz konsoldan bu uygulamaya özel bir erişim anahtarı da
   üretebilirsiniz.
4. Konsola girin (`https://minio.promptsite.com`) ve `promptsite-assets` adlı bir bucket oluşturun.
5. Bucket'ı **herkese okunur** yapın:
   - konsolda Buckets → promptsite-assets → Access Policy → **public**;
   - ya da `mc` ile: `mc anonymous set download <alias>/promptsite-assets`.

   Yalnızca okuma açılır. Yükleme yine sadece admin panelinden yapılabilir.
6. Kontrol: konsoldan bir test dosyası yükleyin ve
   `https://s3.promptsite.com/promptsite-assets/<dosya>` adresini tarayıcıda açın. Açılmalı.

## 3. Uygulama

1. **+ New → Application → GitHub** → `bariiis/project` → branch'i seçin.
2. **Build Pack: Dockerfile**. Dockerfile kök dizinde.
3. **Ports Exposes: 3000**.
4. **Domains: `https://promptsite.com`**. Coolify SSL sertifikasını kendisi alır.
5. **Health check**: Dockerfile'da tanımlı (`/api/health`). Coolify bunu kullanır; ayrıca bir şey
   girmeniz gerekmez.
6. Ortam değişkenlerini girin (aşağıdaki tablo). Hiçbirinin **"Build Variable"** olması gerekmez.
   İmaj ortam değişkeni olmadan derlenir, hepsi çalışma anında okunur.
7. **Deploy**. İlk derleme birkaç dakika sürer. Log'da `[migrations] applied` ve `Ready`
   satırlarını görmelisiniz.

### Ortam değişkenleri

| Değişken | Zorunlu | Örnek | Açıklama |
|---|---|---|---|
| `SITE_URL` | **evet** | `https://promptsite.com` | Sitenin herkese açık adresi, sonda `/` olmadan. Giriş yönlendirmeleri ve ödeme dönüşü bunu kullanır. |
| `DATABASE_URL` | **evet** | `postgres://…@<servis>:5432/postgres` | Adım 1'deki iç adres. |
| `BETTER_AUTH_SECRET` | **evet** | `openssl rand -base64 32` çıktısı | Oturumları imzalar. Bir kez üretin, **değiştirmeyin**; değişirse herkesin oturumu düşer. |
| `S3_ENDPOINT` | yükleme için | `http://<minio-servis-adı>:9000` ya da `https://s3.promptsite.com` | Uygulamanın MinIO'ya yazarken kullandığı adres. |
| `S3_BUCKET` | yükleme için | `promptsite-assets` | |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | yükleme için | | Adım 2.3. |
| `S3_PUBLIC_URL` | yükleme için | `https://s3.promptsite.com/promptsite-assets` | Tarayıcının görselleri okuduğu adres (bucket dahil). |
| `S3_REGION` | hayır | | MinIO için boş bırakın. |
| `LEMONSQUEEZY_API_KEY` | ödeme için | | Adım 4. |
| `LEMONSQUEEZY_STORE_ID` | ödeme için | `12345` | |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | ödeme için | | Webhook'u oluştururken yazdığınız gizli değer. |
| `LEMONSQUEEZY_VARIANT_PRO` | ödeme için | `456789` | Virgülle birden fazla yazılabilir. İlki satın alma butonunda kullanılır. |
| `LEMONSQUEEZY_VARIANT_POWER` | ödeme için | `456790` | |
| `PRICE_PRO_LABEL` / `PRICE_POWER_LABEL` | hayır | `$149 / yıl` | Fiyat alanında görünen metin. |
| `DAILY_COMPOSITION_LIMIT` | hayır | `300` | Bir kullanıcının 24 saatte üretebileceği prompt sayısı. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | hayır | | Doluysa "Google ile devam et" butonu çıkar. Google'da yönlendirme adresi `https://promptsite.com/api/auth/callback/google` olmalı. |

`DEV_PLAN` canlıda **kullanılmaz**; yalnızca yerel geliştirme içindir.

## 4. Lemon Squeezy

Önce **Test mode** açıkken kurun ve deneyin, sonra canlıya geçin.

1. **Products → New product**: "Pro" ve "Power" için birer **abonelik** ürünü. Aylık ve yıllık
   istiyorsanız her ürüne iki varyant ekleyin.
2. Her varyantın numarasını (variant id) `LEMONSQUEEZY_VARIANT_PRO` ve
   `LEMONSQUEEZY_VARIANT_POWER` değişkenlerine yazın.
3. **Settings → Stores**: mağaza numarası → `LEMONSQUEEZY_STORE_ID`.
4. **Settings → API**: yeni anahtar → `LEMONSQUEEZY_API_KEY`.
5. **Settings → Webhooks → +**:
   - URL: `https://promptsite.com/api/webhooks/lemonsqueezy`;
   - Signing secret: uzun rastgele bir değer. Aynısını `LEMONSQUEEZY_WEBHOOK_SECRET` olarak girin;
   - Events: tüm `subscription_*` olayları.
6. Değişkenleri kaydedip uygulamayı **Redeploy** edin (ya da Restart).
7. Deneme: sitede kayıt olun → fiyatlandırmadan Pro'yu seçin → test kartı `4242 4242 4242 4242`
   (ileri bir tarih, herhangi bir CVC). Ödeme sonrası `/hesap` sayfasında plan **Pro** görünmeli.
   Görünmüyorsa Lemon Squeezy'de webhook'un "Recent deliveries" listesine bakın.
8. Canlıya geçerken **Test mode'u kapatın**. Canlı modda ürünlerin, API anahtarının ve webhook'un
   ayrı olduğunu unutmayın; aynı adımları canlı değerlerle tekrarlayın.

## 5. İlk admin

1. Sitede kendi e-postanızla kayıt olun.
2. Coolify'da Postgres kaynağının **Terminal** sekmesinde:
   ```sql
   update "user" set role = 'admin' where email = 'siz@ornek.com';
   ```
3. Çıkış yapıp tekrar girin. `/admin` sayfası açılır. Admin hesabı tüm planlara erişir.

## 6. Kontrol listesi

Önce otomatik kontrolü çalıştırın (bilgisayarınızda, repo klasöründe):

```bash
node tools/smoke.mjs https://promptsite.com
```

8 satırın hepsi ✓ olmalı. Sonra tarayıcıda elle kontrol edin:

- [ ] `/library` açılıyor ve önizlemelerde örnek görseller görünüyor.
- [ ] Scene Switch, Turntable ve Stage Footer önizlemelerinde **videolar oynuyor**.
- [ ] Kayıt, çıkış ve tekrar giriş çalışıyor.
- [ ] Builder'da blok ekleyip prompt üretilebiliyor, kopyalanabiliyor.
- [ ] Test ödemesinden sonra plan Pro'ya geçiyor, Pro bloklar açılıyor.
- [ ] `/admin` sayfasından bir görsel yüklenebiliyor ve dönen adres açılıyor.
- [ ] Telefondan site açılıyor, menü ve builder kullanılabiliyor.

## 7. Sık karşılaşılan sorunlar

| Belirti | Sebep ve çözüm |
|---|---|
| Deploy "unhealthy" oluyor, her sayfa 500 veriyor, log'da `ECONNREFUSED` ya da `Failed query: CREATE SCHEMA` var | Uygulama açılırken veritabanına ulaşamadı. `DATABASE_URL`'in **internal** adres olduğunu ve Postgres'in çalıştığını kontrol edin, sonra **Restart**. Migration açılışta bir kez denenir; veritabanı sonradan gelse bile yeniden başlatmak gerekir. |
| Girişten sonra `localhost`'a ya da başka bir adrese yönleniyor, ya da giriş 403 veriyor | `SITE_URL` eksik ya da siteyi açtığınız adresle birebir aynı değil (`https`, `www` farkı dahil). Düzeltip Restart. |
| Admin yüklemesi `storage_not_configured` ya da "S3 storage is not configured" hatası veriyor | `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` ve `S3_PUBLIC_URL` değişkenlerinden biri eksik. |
| Yükleme başarılı ama görsel adresi 403 veriyor | Bucket herkese okunur değil (adım 2.5). |
| Ödeme yapıldı ama plan değişmedi | Webhook URL'i ya da signing secret yanlış. Lemon Squeezy → Webhooks → Recent deliveries'de 401 görüyorsanız secret uyuşmuyor demektir. Test ve canlı mod değerlerinin karıştırılmadığından emin olun. |
| "billing_not_configured" hatası | `LEMONSQUEEZY_VARIANT_PRO/POWER` boş. |
| Videolar oynamıyor ya da ileri sarılamıyor | `node tools/smoke.mjs` içindeki "range requests" satırına bakın. Önde bir CDN ya da proxy varsa `Range` başlığını geçirmesi gerekir. |
| Derleme `library:check` adımında duruyor | Bir `block.yaml` hatalı. Hata satırı log'da yazar; yerelde `pnpm library:check` ile aynı hatayı görürsünüz. |

## Güncelleme

Branch'e yeni commit geldiğinde Coolify'da **Redeploy** yeterlidir. İsterseniz uygulama ayarlarından
otomatik deploy'u açabilirsiniz. Migration'lar yeni sürüm açılırken kendiliğinden uygulanır.
Yedek için Postgres kaynağının **Backups** sekmesinden zamanlanmış yedeği açmanızı öneririm.
