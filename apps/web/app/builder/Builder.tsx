"use client";

import { useEffect, useMemo, useState } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CATEGORIES, TARGETS, type Category, type Target } from "@promptsite/compiler";
import { TierBadge } from "@/components/Badges";
import { PromptActions } from "@/components/PromptActions";
import { ScaledFrame } from "@/components/ScaledFrame";
import type { Plan } from "@/lib/plans";
import { CATEGORY_LABEL, TARGET_LABEL } from "@/lib/labels";
import type { PublicBlock } from "@/lib/library";
import { encodeSlots } from "@/lib/slot-encoding";
import { SortableItem } from "./SortableItem";

type BuilderBlock = PublicBlock & { usable: boolean };
type Slots = Record<string, Record<string, string>>;
type Lang = "tr" | "en";
type Draft = { title: string; target: Target; lang: Lang; order: string[]; slots: Slots };
export type SavedProject = { id: string; title: string; target: string; lang: string; blocks: string[]; slots: unknown };

const STORAGE_KEY = "promptsite.builder.v1";
const PREVIEW_DEBOUNCE_MS = 300;

function loadDraft(): Partial<Draft> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

const snapshot = (d: Draft) => JSON.stringify(d);

export function Builder({
  blocks,
  initial,
  plan,
  project,
  fresh,
  signedIn,
  canSave,
}: {
  blocks: BuilderBlock[];
  initial: string[];
  plan: Plan;
  project: SavedProject | null;
  fresh: boolean;
  signedIn: boolean;
  canSave: boolean;
}) {
  const bySlug = useMemo(() => new Map(blocks.map((b) => [b.slug, b])), [blocks]);
  const [title, setTitle] = useState("Yeni sayfa");
  const [target, setTarget] = useState<Target>("html");
  const [lang, setLang] = useState<Lang>("tr");
  const [order, setOrder] = useState<string[]>(initial);
  const [slots, setSlots] = useState<Slots>({});
  const [tab, setTab] = useState<"blocks" | "page">(initial.length || project ? "page" : "blocks");
  const [open, setOpen] = useState<string | null>(initial[0] ?? null);
  const [result, setResult] = useState<{ prompt: string; warnings: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(project?.id ?? null);
  const [saved, setSaved] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<{ busy: boolean; message: string | null }>({ busy: false, message: null });

  const current: Draft = { title, target, lang, order, slots };
  const dirty = projectId !== null && saved !== snapshot(current);

  // Hydrate once: an opened project wins, then ?yeni=1 (blank page), then the local draft.
  useEffect(() => {
    let next: Draft;
    if (project) {
      next = {
        title: project.title,
        target: TARGETS.includes(project.target as Target) ? (project.target as Target) : "html",
        lang: project.lang === "en" ? "en" : "tr",
        order: project.blocks.filter((s) => bySlug.has(s)),
        slots: (project.slots ?? {}) as Slots,
      };
      setSaved(snapshot(next));
    } else {
      const draft = fresh ? {} : loadDraft();
      const kept = (draft.order ?? []).filter((s) => bySlug.get(s)?.usable);
      next = {
        title: draft.title || "Yeni sayfa",
        target: draft.target && TARGETS.includes(draft.target) ? draft.target : "html",
        lang: draft.lang === "en" ? "en" : "tr",
        order: [...kept, ...initial.filter((s) => !kept.includes(s))],
        slots: draft.slots ?? {},
      };
    }
    setTitle(next.title);
    setTarget(next.target);
    setLang(next.lang);
    setOrder(next.order);
    setSlots(next.slots);
    setHydrated(true);
  }, [bySlug, initial, project, fresh]);

  // The local draft is for unsaved work only; an open project lives on the server.
  useEffect(() => {
    if (!hydrated || projectId) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      /* storage unavailable: the draft just won't persist */
    }
  }, [hydrated, projectId, title, target, lang, order, slots]);

  const previewSlots = useDebounced(slots, PREVIEW_DEBOUNCE_MS);
  const selected = order.map((s) => bySlug.get(s)).filter((b): b is BuilderBlock => !!b);
  const unsupported = selected.filter((b) => !b.targets.includes(target));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function changed() {
    setResult(null);
    setSaveState((s) => ({ ...s, message: null }));
  }
  function add(slug: string) {
    setOrder((o) => (o.includes(slug) ? o : [...o, slug]));
    setOpen(slug);
    changed();
  }
  function remove(slug: string) {
    setOrder((o) => o.filter((s) => s !== slug));
    changed();
  }
  function move(slug: string, delta: number) {
    setOrder((o) => {
      const i = o.indexOf(slug);
      const j = i + delta;
      return j < 0 || j >= o.length ? o : arrayMove(o, i, j);
    });
    changed();
  }
  // Rows collapse while dragging (see onDragStart) so an expanded slot form cannot block a drop target.
  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    setOrder((o) => arrayMove(o, o.indexOf(String(active.id)), o.indexOf(String(over.id))));
    changed();
  }
  function setSlot(slug: string, key: string, value: string) {
    setSlots((s) => ({ ...s, [slug]: { ...s[slug], [key]: value } }));
    changed();
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
            : data.error === "rate_limited"
              ? `Günlük limitine ulaştın (${data.limit}). Yarın tekrar dene.`
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

  async function save() {
    setSaveState({ busy: true, message: null });
    try {
      const res = await fetch(projectId ? `/api/projects/${projectId}` : "/api/projects", {
        method: projectId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...current, blocks: order }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          data.error === "upgrade_required" ? "Kaydetmek için Pro plan gerekli."
          : data.error === "project_limit" ? `En fazla ${data.limit} proje kaydedebilirsin.`
          : data.error === "invalid_request" ? "Kaydetmek için en az bir blok ve bir sayfa adı gerekli."
          : "Kaydedilemedi.";
        setSaveState({ busy: false, message });
        return;
      }
      setProjectId(data.project.id);
      setSaved(snapshot(current));
      // Keep the URL shareable without remounting the builder.
      window.history.replaceState(null, "", `/builder?proje=${data.project.id}`);
      setSaveState({ busy: false, message: "Kaydedildi" });
    } catch {
      setSaveState({ busy: false, message: "Sunucuya ulaşılamadı." });
    }
  }

  const categories = CATEGORIES.filter((c) => blocks.some((b) => b.category === c));
  const inputClass = "mt-1 w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-paper/40";

  return (
    <main className="grid min-h-[calc(100svh-3.5rem)] lg:grid-cols-[1fr_400px]">
      {/* Canvas */}
      <section className="order-2 bg-ink-2 p-4 sm:p-6 lg:order-1" aria-label="Sayfa önizlemesi">
        {selected.length === 0 ? (
          <div className="grid h-full min-h-80 place-items-center rounded-2xl border border-dashed border-line text-center text-sm text-muted">
            <p>Sağ panelden blok ekleyerek sayfanı kur.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-line" data-testid="canvas">
            {selected.map((b) =>
              b.hasPreview ? (
                <ScaledFrame
                  key={b.slug}
                  src={`/api/preview/${b.slug}?s=${encodeSlots(previewSlots[b.slug] ?? {})}`}
                  title={`${b.name} önizleme`}
                  interactive
                  autoHeight
                />
              ) : (
                <div key={b.slug} className="grid aspect-[16/10] place-items-center text-muted">{b.name}</div>
              ),
            )}
          </div>
        )}
      </section>

      {/* Right panel */}
      <aside className="order-1 flex flex-col border-line lg:order-2 lg:max-h-[calc(100svh-3.5rem)] lg:border-l">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="min-w-0 truncate text-sm">
            {projectId ? <>{title}{dirty && <span className="ml-1 text-ember" title="Kaydedilmemiş değişiklik">•</span>}</> : <span className="text-muted">Kaydedilmemiş taslak</span>}
          </p>
          {!signedIn ? (
            <a href="/giris?sonra=/builder" className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs hover:border-paper/40">Kaydetmek için giriş yap</a>
          ) : !canSave ? (
            <a href="/#fiyat" className="shrink-0 rounded-full border border-ember/60 px-3 py-1.5 text-xs text-ember">Kaydetmek için Pro</a>
          ) : (
            <button
              onClick={save}
              disabled={saveState.busy || selected.length === 0 || !title.trim() || (projectId !== null && !dirty)}
              className="shrink-0 rounded-full bg-paper px-4 py-1.5 text-xs font-medium text-ink disabled:opacity-40"
            >
              {saveState.busy ? "Kaydediliyor…" : projectId ? "Kaydet" : "Proje olarak kaydet"}
            </button>
          )}
        </div>
        {saveState.message && <p className="border-b border-line px-4 py-2 text-xs text-muted" role="status">{saveState.message}</p>}

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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => setOpen(null)} onDragEnd={onDragEnd}>
              <SortableContext items={order} strategy={verticalListSortingStrategy}>
                <ol className="space-y-2">
                  {order.map((slug, i) => {
                    const b = bySlug.get(slug);
                    if (!b) return null;
                    const expanded = open === slug;
                    return (
                      <SortableItem key={slug} id={slug} label={b.name}>
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
                              const common = {
                                id: `${slug}-${s.key}`,
                                value: slots[slug]?.[s.key] ?? s.default,
                                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSlot(slug, s.key, e.target.value),
                                className: inputClass,
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
                      </SortableItem>
                    );
                  })}
                </ol>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Output */}
        <div className="space-y-3 border-t border-line p-4">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <label className="text-xs text-muted">
              Sayfa adı
              <input value={title} onChange={(e) => { setTitle(e.target.value); changed(); }} className={inputClass} />
            </label>
            <label className="text-xs text-muted">
              Hedef
              <select value={target} onChange={(e) => { setTarget(e.target.value as Target); changed(); }} className={inputClass}>
                {TARGETS.map((t) => <option key={t} value={t}>{TARGET_LABEL[t]}</option>)}
              </select>
            </label>
            <label className="text-xs text-muted">
              Dil
              <select value={lang} onChange={(e) => { setLang(e.target.value as Lang); changed(); }} className={inputClass}>
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
