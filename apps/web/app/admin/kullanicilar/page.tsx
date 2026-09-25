import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { listUsers } from "@/lib/admin-users";
import { CreateUserForm } from "./CreateUserForm";
import { UserRow } from "./UserRow";

export const metadata: Metadata = { title: "Kullanıcılar", robots: { index: false } };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireAdmin();
  const { q = "" } = await searchParams;
  const users = await listUsers(q);

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <a href="/admin" className="text-sm text-muted hover:text-paper">← Admin</a>
      <h1 className="mt-2 font-serif text-5xl tracking-tight">Kullanıcılar</h1>

      <section className="mt-8">
        <h2 className="text-sm text-muted">Yeni hesap aç</h2>
        <p className="mt-1 text-xs text-muted">Hesap e-posta ve şifreyle hemen kullanılabilir. Şifreyi kişiye kendin ilet.</p>
        <CreateUserForm />
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm text-muted">Hesaplar ({users.length})</h2>
          <form className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="E-posta ya da ad ara" className="rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm outline-none focus:border-paper/40" />
            <button className="rounded-full border border-line px-4 py-2 text-sm hover:border-paper/40">Ara</button>
          </form>
        </div>
        <p className="mt-1 text-xs text-muted">
          Verilen plan, ödemeli aboneliğe ek olarak çalışır; kişi hangisi yüksekse onu kullanır. Bitiş tarihi boşsa süresizdir.
        </p>
        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line text-sm">
          {users.length === 0 && <li className="p-4 text-muted">Kullanıcı bulunamadı.</li>}
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={{ ...u, createdAt: u.createdAt.toISOString(), grant: u.grant && { plan: u.grant.plan, until: u.grant.until?.toISOString() ?? null } }}
              isSelf={u.id === me.id}
            />
          ))}
        </ul>
      </section>
    </main>
  );
}
