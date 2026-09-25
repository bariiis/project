import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canUse, getViewer } from "@/lib/access";
import { getLibrary, toPublic } from "@/lib/library";
import { getProject } from "@/lib/projects";
import { Builder, type SavedProject } from "./Builder";

export const metadata: Metadata = { title: "Builder" };

type Search = { ekle?: string; proje?: string; yeni?: string };

export default async function BuilderPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { user, plan } = await getViewer();
  const blocks = getLibrary().map((e) => ({ ...toPublic(e), usable: canUse(plan, e.block.tier) }));
  const { ekle, proje, yeni } = await searchParams;

  let project: SavedProject | null = null;
  if (proje) {
    const row = user ? await getProject(user.id, proje) : null;
    if (!row) notFound();
    project = { id: row.id, title: row.title, target: row.target, lang: row.lang, blocks: row.blocks, slots: row.slots };
  }

  const initial = blocks.some((b) => b.slug === ekle && b.usable) ? [ekle!] : [];
  return (
    <Builder
      blocks={blocks}
      initial={initial}
      plan={plan}
      project={project}
      fresh={yeni === "1"}
      signedIn={!!user}
      canSave={canUse(plan, "pro")}
    />
  );
}
