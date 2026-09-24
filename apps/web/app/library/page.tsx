import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, type Category } from "@promptsite/compiler";
import { Tag, TierBadge } from "@/components/Badges";
import { ScaledFrame } from "@/components/ScaledFrame";
import { CATEGORY_LABEL } from "@/lib/labels";
import { getLibrary } from "@/lib/library";

export const metadata: Metadata = { title: "Kütüphane" };

type Search = { kategori?: string; ton?: string };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { kategori, ton } = await searchParams;
  const all = getLibrary();
  const present = CATEGORIES.filter((c) => all.some((e) => e.block.category === c));
  const entries = all.filter(
    (e) => (!kategori || e.block.category === kategori) && (!ton || e.block.tone === ton),
  );

  const href = (next: Search) => {
    const params = new URLSearchParams(Object.entries({ kategori, ton, ...next }).filter(([, v]) => v) as [string, string][]);
    const qs = params.toString();
    return qs ? `/library?${qs}` : "/library";
  };
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm transition-colors ${active ? "border-paper bg-paper text-ink" : "border-line text-muted hover:text-paper"}`;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="font-serif text-5xl tracking-tight">Kütüphane</h1>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Link href={href({ kategori: undefined })} className={chip(!kategori)}>Tümü</Link>
        {present.map((c: Category) => (
          <Link key={c} href={href({ kategori: c })} className={chip(kategori === c)}>{CATEGORY_LABEL[c]}</Link>
        ))}
        <span className="mx-2 h-5 w-px bg-line" aria-hidden />
        {(["dark", "light"] as const).map((t) => (
          <Link key={t} href={href({ ton: ton === t ? undefined : t })} className={chip(ton === t)}>
            {t === "dark" ? "Koyu" : "Açık"}
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <p className="mt-16 text-muted">Bu filtreye uyan blok yok.</p>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(({ block, referencePath }) => (
            <li key={block.slug}>
              <Link href={`/library/${block.slug}`} className="group block overflow-hidden rounded-2xl border border-line transition-colors hover:border-paper/30">
                {referencePath ? (
                  <ScaledFrame src={`/api/preview/${block.slug}`} title={`${block.name} önizleme`} />
                ) : (
                  <div className="aspect-[16/10] bg-ink-2" />
                )}
                <div className="border-t border-line p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-medium">{block.name}</h2>
                    <TierBadge tier={block.tier} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{block.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Tag>{CATEGORY_LABEL[block.category]}</Tag>
                    {block.moods.map((m) => <Tag key={m}>{m}</Tag>)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
