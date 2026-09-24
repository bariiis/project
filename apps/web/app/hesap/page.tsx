import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq, schema } from "@promptsite/db";
import { getViewer } from "@/lib/access";
import { db } from "@/lib/db";
import { SignOutButton } from "./SignOutButton";

export const metadata: Metadata = { title: "Hesap" };

const STATUS: Record<string, string> = {
  on_trial: "Deneme",
  active: "Aktif",
  paused: "Duraklatıldı",
  past_due: "Ödeme bekleniyor",
  unpaid: "Ödenmedi",
  cancelled: "İptal edildi",
  expired: "Sona erdi",
};
const PLAN: Record<string, string> = { free: "Ücretsiz", pro: "Pro", power: "Power" };
const fmt = (d: Date | null) => (d ? d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "—");

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ odeme?: string }> }) {
  const { user, plan } = await getViewer();
  if (!user) redirect("/giris?sonra=/hesap");
  const { odeme } = await searchParams;

  const subs = await db()
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, user.id))
    .orderBy(desc(schema.subscriptions.updatedAt));

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-5xl tracking-tight">Hesap</h1>
          <p className="mt-2 text-muted">{user.name} · {user.email}</p>
        </div>
        <SignOutButton />
      </div>

      {odeme === "tamam" && (
        <p className="mt-8 rounded-2xl border border-ember/40 bg-ink-2 p-4 text-sm">
          Ödemen alındı. Planın, ödeme sağlayıcısından onay gelince birkaç saniye içinde güncellenir; görünmezse sayfayı yenile.
        </p>
      )}

      <section className="mt-10 rounded-2xl border border-line p-6">
        <h2 className="text-sm text-muted">Geçerli plan</h2>
        <p className="mt-1 font-serif text-4xl">{PLAN[plan]}</p>
        {user.role === "admin" && <p className="mt-2 text-xs text-muted">Yönetici hesabı: tüm bloklara erişim.</p>}
        {plan !== "power" && (
          <div className="mt-6 flex flex-wrap gap-2">
            {plan === "free" && (
              <a href="/api/billing/checkout?plan=pro" className="rounded-full bg-paper px-5 py-2.5 text-sm font-medium text-ink">Pro'ya geç</a>
            )}
            <a href="/api/billing/checkout?plan=power" className="rounded-full border border-line px-5 py-2.5 text-sm transition-colors hover:border-paper/40">Power'a geç</a>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm text-muted">Abonelikler</h2>
        {subs.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Henüz abonelik yok.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
            {subs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-medium">{PLAN[s.plan]} · {STATUS[s.status] ?? s.status}</p>
                  <p className="text-muted">
                    {s.status === "cancelled" || s.status === "expired" ? `Bitiş: ${fmt(s.endsAt)}` : `Yenileme: ${fmt(s.renewsAt)}`}
                  </p>
                </div>
                {s.portalUrl && (
                  <a href={s.portalUrl} className="rounded-full border border-line px-4 py-2 transition-colors hover:border-paper/40" rel="noopener">
                    Aboneliği yönet
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
