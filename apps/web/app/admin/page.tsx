import type { Metadata } from "next";
import { count, desc, eq, gte, schema, sql } from "@promptsite/db";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { getLibrary } from "@/lib/library";
import { storageConfigured } from "@/lib/storage";
import { AssetUploader } from "./AssetUploader";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage() {
  await requireAdmin();
  const d = db();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [[users], subsByPlan, [compositions], topBlocks, recentUsers, assets] = await Promise.all([
    d.select({ n: count() }).from(schema.users),
    d
      .select({ plan: schema.subscriptions.plan, n: count() })
      .from(schema.subscriptions)
      .where(sql`${schema.subscriptions.status} in ('active', 'on_trial', 'past_due') or (${schema.subscriptions.status} = 'cancelled' and ${schema.subscriptions.endsAt} > now())`)
      .groupBy(schema.subscriptions.plan),
    d.select({ n: count() }).from(schema.promptEvents).where(gte(schema.promptEvents.createdAt, weekAgo)),
    d.execute<{ slug: string; n: number }>(sql`
      select unnest(${schema.promptEvents.blocks}) as slug, count(*)::int as n
      from ${schema.promptEvents}
      where ${schema.promptEvents.createdAt} >= ${weekAgo}
      group by 1 order by 2 desc limit 10`),
    d
      .select({ email: schema.users.email, role: schema.users.role, createdAt: schema.users.createdAt, plan: schema.subscriptions.plan, status: schema.subscriptions.status })
      .from(schema.users)
      .leftJoin(schema.subscriptions, eq(schema.subscriptions.userId, schema.users.id))
      .orderBy(desc(schema.users.createdAt))
      .limit(20),
    d.select().from(schema.assets).orderBy(desc(schema.assets.createdAt)).limit(50),
  ]);

  const library = getLibrary();
  const stat = (label: string, value: string | number) => (
    <div className="rounded-2xl border border-line p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-serif text-4xl">{value}</p>
    </div>
  );
  const active = (plan: string) => subsByPlan.find((s) => s.plan === plan)?.n ?? 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="font-serif text-5xl tracking-tight">Admin</h1>

      <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stat("Kullanıcı", users?.n ?? 0)}
        {stat("Aktif Pro", active("pro"))}
        {stat("Aktif Power", active("power"))}
        {stat("Prompt (7 gün)", compositions?.n ?? 0)}
        {stat("Blok", library.length)}
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-sm text-muted">En çok kullanılan bloklar (7 gün)</h2>
          {topBlocks.rows.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Henüz kayıt yok.</p>
          ) : (
            <ol className="mt-3 divide-y divide-line rounded-2xl border border-line text-sm">
              {topBlocks.rows.map((r) => (
                <li key={r.slug} className="flex justify-between p-3"><span>{r.slug}</span><span className="text-muted">{r.n}</span></li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h2 className="text-sm text-muted">Son kullanıcılar</h2>
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line text-sm">
            {recentUsers.map((u, i) => (
              <li key={`${u.email}-${i}`} className="flex flex-wrap justify-between gap-2 p-3">
                <span>{u.email}{u.role === "admin" && <span className="ml-2 text-ember">admin</span>}</span>
                <span className="text-muted">{u.plan ? `${u.plan} · ${u.status}` : "ücretsiz"} · {u.createdAt.toLocaleDateString("tr-TR")}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-12">
        <h2 className="text-sm text-muted">Asset'ler</h2>
        <p className="mt-1 text-xs text-muted">Yüklenen dosyanın URL'sini bloğun <code>assets</code> listesine yazın.</p>
        {storageConfigured() ? <AssetUploader /> : <p className="mt-3 text-sm text-ember">S3/MinIO ayarları eksik (.env: S3_*).</p>}
        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line text-sm">
          {assets.length === 0 && <li className="p-3 text-muted">Henüz asset yok.</li>}
          {assets.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span className="min-w-0 truncate">{a.key}</span>
              <span className="flex items-center gap-3 text-muted">
                {a.kind} · {a.bytes ? `${(a.bytes / 1024 / 1024).toFixed(1)} MB` : "—"}
                <a href={a.url} target="_blank" rel="noopener" className="text-paper underline underline-offset-4">aç</a>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
