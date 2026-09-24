import type { Tier } from "@promptsite/compiler";
import { TIER_LABEL } from "@/lib/labels";

export function TierBadge({ tier }: { tier: Tier }) {
  const style = tier === "free" ? "border-line text-muted" : tier === "pro" ? "border-ember/60 text-ember" : "border-paper/40 text-paper";
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] tracking-wide uppercase ${style}`}>{TIER_LABEL[tier]}</span>;
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-ink-3 px-2 py-0.5 text-[11px] text-muted">{children}</span>;
}
