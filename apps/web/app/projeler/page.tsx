import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { canUse, getViewer } from "@/lib/access";
import { TARGET_LABEL } from "@/lib/labels";
import { listProjects } from "@/lib/projects";
import type { Target } from "@promptsite/compiler";
import { DeleteProjectButton } from "./DeleteProjectButton";

export const metadata: Metadata = { title: "Projeler" };

export default async function ProjectsPage() {
  const { user, plan } = await getViewer();
  if (!user) redirect("/giris?sonra=/projeler");
  const projects = await listProjects(user.id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-5xl tracking-tight">Projeler</h1>
        <Link href="/builder?yeni=1" className="rounded-full bg-paper px-4 py-2 text-sm font-medium text-ink">Yeni sayfa</Link>
      </div>
      {!canUse(plan, "pro") && (
        <p className="mt-6 rounded-2xl border border-ember/40 bg-ink-2 p-4 text-sm">
          Proje kaydetmek Pro planında. Mevcut projelerini görebilir ve silebilirsin. <Link href="/#fiyat" className="underline underline-offset-4">Planları gör</Link>
        </p>
      )}
      {projects.length === 0 ? (
        <p className="mt-10 text-muted">Henüz kayıtlı proje yok. Builder'da bir sayfa kurup "Kaydet"e bas.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-2xl border border-line">
          {projects.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <Link href={`/builder?proje=${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                <p className="text-sm text-muted">
                  {p.blocks.length} blok · {TARGET_LABEL[p.target as Target] ?? p.target} · {p.updatedAt.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/builder?proje=${p.id}`} className="rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-paper/40">Aç</Link>
                <DeleteProjectButton id={p.id} title={p.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
