import type { Metadata } from "next";
import { canUse, getCurrentPlan } from "@/lib/access";
import { getLibrary, toPublic } from "@/lib/library";
import { Builder } from "./Builder";

export const metadata: Metadata = { title: "Builder" };

export default async function BuilderPage({ searchParams }: { searchParams: Promise<{ ekle?: string }> }) {
  const plan = await getCurrentPlan();
  const blocks = getLibrary().map((e) => ({ ...toPublic(e), usable: canUse(plan, e.block.tier) }));
  const { ekle } = await searchParams;
  const initial = blocks.some((b) => b.slug === ekle && b.usable) ? [ekle!] : [];
  return <Builder blocks={blocks} initial={initial} plan={plan} />;
}
