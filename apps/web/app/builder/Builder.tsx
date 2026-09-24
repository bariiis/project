"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, TARGETS, type Category, type Target } from "@promptsite/compiler";
import { TierBadge } from "@/components/Badges";
import { PromptActions } from "@/components/PromptActions";
import { ScaledFrame } from "@/components/ScaledFrame";
import type { Plan } from "@/lib/plans";
import { CATEGORY_LABEL, TARGET_LABEL } from "@/lib/labels";
import type { PublicBlock } from "@/lib/library";

type BuilderBlock = PublicBlock & { usable: boolean };
type Slots = Record<string, Record<string, string>>;
type Lang = "tr" | "en";
type Draft = { title: string; target: Target; lang: Lang; order: string[]; slots: Slots };

const STORAGE_KEY = "promptsite.builder.v1";

function loadDraft(): Partial<Draft> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function Builder({ blocks, initial, plan }: { blocks: BuilderBlock[]; initial: string[]; plan: Plan }) {
  const bySlug = useMemo(() => new Map(blocks.map((b) => [b.slug, b])), [blocks]);
  const [title, setTitle] = useState("Yeni sayfa");
  const [target, setTarget] = useState<Target>("html");
  const [lang, setLang] = useState<Lang>("tr");
  const [order, setOrder] = useState<string[]>(initial);
  const [slots, setSlots] = useState<Slots>({});
  const [tab, setTab] = useState<"blocks" | "page">(initial.length ? "page" : "blocks");
  const [open, setOpen] = useState<string | null>(initial[0] ?? null);
  const [result, setResult] = useState<{ prompt: string; warnings: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore the last draft once, merging any block requested via ?ekle=.
  useEffect(() => {
    const draft = loadDraft();
    if (draft.title) setTitle(draft.title);
    if (draft.target && TARGETS.includes(draft.target)) setTarget(draft.target);
    if (draft.slots) setSlots(draft.slots);
    if (draft.lang === "tr" || draft.lang === "en") setLang(draft.lang);
    const saved = (draft.order ?? []).filter((s) => bySlug.get(s)?.usable);
    setOrder([...saved, ...initial.filter((s) => !saved.includes(s))]);
    setHydrated(true);
  }, [bySlug, initial]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ title, target, lang, order, slots } satisfies Draft));
    } catch {
      /* storage unavailable: the draft just won't persist */
    }
  }, [hydrated, title, target, lang, order, slots]);

  const selected = order.map((s) => bySlug.get(s)).filter((b): b is BuilderBlock => !!b);
  const unsupported = selected.filter((b) => !b.targets.includes(target));

  function add(slug: string) {
    setOrder((o) => (o.includes(slug) ? o : [...o, slug]));
    setOpen(slug);
    setResult(null);
  }
  function remove(slug: string) {
    setOrder((o) => o.filter((s) => s !== slug));
    setResult(null);
  }
  function move(slug: string, delta: number) {
    setOrder((o) => {
      const i = o.indexOf(slug);
      const j = i + delta;
      if (j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
    setResult(null);
  }
  function setSlot(slug: string, key: string, value: string) {
    setSlots((s) => ({ ...s, [slug]: { ...s[slug], [key]: value } }));
    setResult(null);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, target, lang, blocks: order, slots }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "upgrade_required"
            ? `Planın bu blokları kapsamıyor: ${data.blocks.join(", ")}`
            : data.message ?? "Prompt oluşturulamadı.",
        );
        return;
      }
      setResult(data);
    } catch {
      setError("Sunucuya ulaşılamadı.");
    } finally {
      setBusy(false);
    }
  }

  const categories = CATEGORIES.filter((c) => blocks.some((b) => b.category === c));

  return (
    <main className="grid min-h-[calc(100svh-3.5rem)] lg:grid-cols-[1fr_400px]">
      {/* Canvas */}
      <section className="order-2 bg-ink-2 p-4 sm:p-6 lg:order-1" aria-label="Sayfa önizlemesi">
        {selected.length === 0 ? (
          <div className="grid h-full min-h-80 place-items-center rounded-2xl border border-dashed border-line text-center text-sm text-muted">
            <p>Sağ panelden blok ekleyerek sayfanı kur.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-line">
            {selected.map((b) =>
              b.hasPreview ? (
                <ScaledFrame key={b.slug} src={`/api/preview/${b.slug}`} title={`${b.name} önizleme`} interactive />
              ) : (
                <div key={b.slug} className="grid aspect-[16/10] place-items-center text-muted">{b.name}</div>
              ),
            )}
          </div>
        )}
        {selected.length > 0 && (
          <p className="mx-auto mt-3 max-w-5xl text-xs text-muted">
            Önizleme blokların referans halidir; metin değişiklikleri prompta yansır.
          </p>
        )}
      </section>

      {/* Right panel */}
      <aside className="order-1 flex flex-col border-line lg:order-2 lg:max-h-[calc(100svh-3.5rem)] lg:border-l">
        <div className="flex border-b border-line" role="tablist">
          {([["blocks", "Bloklar"], ["page", `Sayfa (${selected.length})`]] as const).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex-1 py-3 text-sm ${tab === key ? "border-b-2 border-ember text-paper" : "text-muted hover:text-paper"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "blocks" ? (
            <div className="space-y-6">
              {categories.map((c: Category) => (
                <div key={c}>
                  <h2 className="text-xs tracking-[0.14em] text-muted uppercase">{CATEGORY_LABEL[c]}</h2>
                  <ul className="mt-2 space-y-2">
                    {blocks.filter((b) => b.category === c).map((b) => (
                      <li key={b.slug} className="rounded-xl border border-line p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{b.name}</span>
                          <TierBadge tier={b.tier} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted">{b.summary}</p>
                        <button
                          onClick={() => add(b.slug)}
                          disabled={!b.usable || order.includes(b.slug)}
                          className="mt-3 rounded-full border border-line px-3 py-1 text-xs transition-colors enabled:hover:border-paper/40 disabled:opacity-50"
                        >
                          {!b.usable ? "Planını yükselt" : order.includes(b.slug) ? "Eklendi" : "Ekle"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : selected.length === 0 ? (
            <p className="text-sm text-muted">Henüz blok yok.</p>
          ) : (
            <ol className="space-y-2">
              {order.map((slug, i) => {
                const b = bySlug.get(slug);
                if (!b) return null;
                const key = slug;
                const expanded = open === slug;
                return (
                  <li key={key} className="rounded-xl border border-line">
                    <div className="flex items-center gap-2 p-3">
                      <button onClick={() => setOpen(expanded ? null : slug)} className="flex-1 text-left text-sm font-medium" aria-expanded={expanded}>
                        <span className="mr-2 text-muted">{i + 1}.</span>{b.name}
                      </button>
                      <button onClick={() => move(slug, -1)} disabled={i === 0} className="px-1 text-muted hover:text-paper disabled:opacity-30" aria-label="Yukarı taşı">↑</button>
                      <button onClick={() => move(slug, 1)} disabled={i === order.length - 1} className="px-1 text-muted hover:text-paper disabled:opacity-30" aria-label="Aşağı taşı">↓</button>
                      <button onClick={() => remove(slug)} className="px-1 text-muted hover:text-ember" aria-label="Kaldır">×</button>
                    </div>
                    {expanded && b.slots.length > 0 && (
                      <div className="space-y-3 border-t border-line p-3">
                        {b.slots.map((s) => {
                          const value = slots[slug]?.[s.key] ?? s.default;
                          const common = {
                            id: `${key}-${s.key}`,
                            value,
                            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSlot(slug, s.key, e.target.value),
                            className: "mt-1 w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm outline-none focus:border-paper/40",
                          };
                          return (
                            <label key={s.key} htmlFor={common.id} className="block text-xs text-muted">
                              {s.label}
                              {s.type === "textarea" ? <textarea rows={3} {...common} /> : <input type={s.type === "url" ? "url" : "text"} {...common} />}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Output */}
        <div className="space-y-3 border-t border-line p-4">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <label className="text-xs text-muted">
              Sayfa adı
              <input value={title} onChange={(e) => { setTitle(e.target.value); setResult(null); }} className="mt-1 w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-paper/40" />
            </label>
            <label className="text-xs text-muted">
              Hedef
              <select value={target} onChange={(e) => { setTarget(e.target.value as Target); setResult(null); }} className="mt-1 w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-paper/40">
                {TARGETS.map((t) => <option key={t} value={t}>{TARGET_LABEL[t]}</option>)}
              </select>
            </label>
            <label className="text-xs text-muted">
              Dil
              <select value={lang} onChange={(e) => { setLang(e.target.value as Lang); setResult(null); }} className="mt-1 w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-paper/40">
                <option value="tr">TR</option>
                <option value="en">EN</option>
              </select>
            </label>
          </div>
          {unsupported.length > 0 && (
            <p className="text-xs text-ember">Bu hedefi desteklemeyen bloklar: {unsupported.map((b) => b.name).join(", ")}</p>
          )}
          {error && <p className="text-xs text-ember" role="alert">{error}</p>}
          <button
            onClick={generate}
            disabled={busy || selected.length === 0 || unsupported.length > 0 || !title.trim()}
            className="w-full rounded-full bg-ember py-3 text-sm font-medium text-ink transition-opacity disabled:opacity-40"
          >
            {busy ? "Oluşturuluyor…" : "Birleşik promptu oluştur"}
          </button>
          <p className="text-center text-[11px] text-muted">Plan: {plan}</p>
        </div>
      </aside>

      {result && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-label="Oluşturulan prompt" onClick={() => setResult(null)}>
          <div className="flex max-h-[88svh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-ink" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
              <h2 className="font-medium">{title} · {TARGET_LABEL[target]}</h2>
              <div className="flex items-center gap-2">
                <PromptActions prompt={result.prompt} filename={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "sayfa"}-${target}.md`} />
                <button onClick={() => setResult(null)} className="px-2 text-xl text-muted hover:text-paper" aria-label="Kapat">×</button>
              </div>
            </div>
            {result.warnings.length > 0 && (
              <ul className="border-b border-line px-4 py-2 text-xs text-ember">
                {result.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}
            <pre className="overflow-auto p-4 text-[13px] leading-relaxed whitespace-pre-wrap text-paper/90">{result.prompt}</pre>
          </div>
        </div>
      )}
    </main>
  );
}
