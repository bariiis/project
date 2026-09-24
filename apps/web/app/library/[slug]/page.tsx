import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { compile, TARGETS, type Target } from "@promptsite/compiler";
import { Tag, TierBadge } from "@/components/Badges";
import { PromptActions } from "@/components/PromptActions";
import { ScaledFrame } from "@/components/ScaledFrame";
import { canUse, getCurrentPlan } from "@/lib/access";
import { CATEGORY_LABEL, TARGET_LABEL, TIER_LABEL } from "@/lib/labels";
import { getEntry } from "@/lib/library";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ hedef?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = getEntry((await params).slug);
  return entry ? { title: entry.block.name, description: entry.block.summary } : {};
}

export default async function BlockPage({ params, searchParams }: Props) {
  const entry = getEntry((await params).slug);
  if (!entry) notFound();
  const { block, referencePath } = entry;

  const requested = (await searchParams).hedef;
  const target: Target = TARGETS.includes(requested as Target) && block.targets.includes(requested as Target)
    ? (requested as Target)
    : block.targets[0]!;

  const allowed = canUse(await getCurrentPlan(), block.tier);
  const prompt = allowed ? compile({ title: block.name, target, blocks: [block] }).prompt : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link href="/library" className="text-sm text-muted hover:text-paper">← Kütüphane</Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag>{CATEGORY_LABEL[block.category]}</Tag>
            <TierBadge tier={block.tier} />
          </div>
          <h1 className="mt-3 font-serif text-5xl tracking-tight">{block.name}</h1>
          <p className="mt-3 max-w-2xl text-muted">{block.summary}</p>
        </div>
        <Link href={`/builder?ekle=${block.slug}`} className="rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-paper/40">
          Builder'a ekle
        </Link>
      </div>

      {referencePath && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-line">
          <ScaledFrame src={`/api/preview/${block.slug}`} title={`${block.name} canlı önizleme`} interactive />
        </div>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav className="flex gap-1 rounded-full border border-line p-1" aria-label="Hedef stack">
            {block.targets.map((t) => (
              <Link
                key={t}
                href={`/library/${block.slug}?hedef=${t}`}
                aria-current={t === target ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm ${t === target ? "bg-paper text-ink" : "text-muted hover:text-paper"}`}
              >
                {TARGET_LABEL[t]}
              </Link>
            ))}
          </nav>
          {prompt && <PromptActions prompt={prompt} filename={`${block.slug}-${target}.md`} />}
        </div>

        {prompt ? (
          <pre className="mt-4 max-h-[70vh] overflow-auto rounded-2xl border border-line bg-ink-2 p-5 text-[13px] leading-relaxed whitespace-pre-wrap text-paper/90">
            {prompt}
          </pre>
        ) : (
          <div className="mt-4 rounded-2xl border border-ember/40 bg-ink-2 p-8">
            <p className="font-medium">Bu blok {TIER_LABEL[block.tier]} planında.</p>
            <p className="mt-2 text-sm text-muted">Promptun tamamını görmek ve builder'da kullanmak için planını yükselt.</p>
            <Link href="/#fiyat" className="mt-5 inline-block rounded-full bg-ember px-4 py-2 text-sm font-medium text-ink">Planları gör</Link>
          </div>
        )}
      </section>
    </main>
  );
}
