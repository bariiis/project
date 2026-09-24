import Link from "next/link";
import { getLibrary } from "@/lib/library";

const PLANS = [
  { name: "Ücretsiz", price: "0 ₺", href: "/giris?mod=kayit", cta: "Ücretsiz başla", points: ["Seçili tam promptlar", "Canlı önizleme", "3 hedef: HTML, React, Next.js"] },
  { name: "Pro", price: process.env.PRICE_PRO_LABEL || "Yakında", href: "/api/billing/checkout?plan=pro", cta: "Pro'ya geç", points: ["Tüm bloklar", "Builder: bölüm seç, birleşik prompt al", "Projeleri kaydet"], featured: true },
  { name: "Power", price: process.env.PRICE_POWER_LABEL || "Yakında", href: "/api/billing/checkout?plan=power", cta: "Power'a geç", points: ["Pro'daki her şey", "3D / WebGL / shader blokları", "Referans kaynak kod + MCP erişimi"] },
];

export default function Home() {
  const count = getLibrary().length;
  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 pt-24 pb-20 sm:px-6 sm:pt-32">
        <p className="text-sm text-muted">{count} blok · 3 hedef stack</p>
        <h1 className="mt-6 max-w-4xl font-serif text-[clamp(3rem,8vw,7rem)] leading-[0.92] tracking-[-0.03em]">
          Bölümleri seç, <em className="text-ember">tek prompt</em> al.
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted">
          Hero, CTA, footer ve daha fazlası. Her blok ölçüsü, hareketi ve asset'leri yazılı bir prompt olarak gelir.
          Seçtiklerini birleştir; Claude, Cursor, v0 ya da Lovable'a yapıştır.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/builder" className="rounded-full bg-paper px-6 py-3.5 text-[15px] font-medium text-ink transition-transform hover:-translate-y-0.5">
            Builder'ı aç
          </Link>
          <Link href="/library" className="rounded-full border border-line px-6 py-3.5 text-[15px] transition-colors hover:border-paper/40">
            Kütüphaneye göz at
          </Link>
        </div>
      </section>

      <section className="border-t border-line">
        <ol className="mx-auto grid max-w-7xl gap-px bg-line sm:grid-cols-3">
          {[
            ["01", "Seç", "Sağ panelden kategori kategori blok seç, metinleri kendi markana göre değiştir."],
            ["02", "Derle", "Token'lar, fontlar, kütüphaneler ve asset'ler tek, çelişkisiz bir prompta birleşir."],
            ["03", "Üret", "Promptu AI aracına yapıştır. Tek dosya HTML, React veya Next.js olarak çıkar."],
          ].map(([n, title, body]) => (
            <li key={n} className="bg-ink px-4 py-10 sm:px-6">
              <span className="font-serif text-5xl text-ember">{n}</span>
              <h2 className="mt-4 text-lg font-medium">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="fiyat" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <h2 className="font-serif text-5xl tracking-tight">Fiyatlar</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`rounded-3xl border p-6 ${plan.featured ? "border-ember" : "border-line"}`}>
              <h3 className="text-sm text-muted">{plan.name}</h3>
              <p className="mt-2 font-serif text-4xl">{plan.price}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {plan.points.map((p) => (
                  <li key={p} className="flex gap-2"><span className="text-ember">·</span>{p}</li>
                ))}
              </ul>
              <a
                href={plan.href}
                className={`mt-8 block rounded-full py-3 text-center text-sm font-medium ${plan.featured ? "bg-ember text-ink" : "border border-line hover:border-paper/40"}`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
