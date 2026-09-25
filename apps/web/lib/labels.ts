import type { Category, Target, Tier } from "@promptsite/compiler";

export const CATEGORY_LABEL: Record<Category, string> = {
  navbar: "Navbar",
  hero: "Hero",
  features: "Özellikler",
  gallery: "Galeri",
  stats: "İstatistik",
  testimonials: "Yorumlar",
  pricing: "Fiyatlandırma",
  cta: "CTA",
  footer: "Footer",
  loader: "Loader",
  background: "Arka plan",
  "full-page": "Tam sayfa",
};

export const TARGET_LABEL: Record<Target, string> = {
  html: "Tek dosya HTML",
  react: "React + Vite",
  next: "Next.js",
};

export const TIER_LABEL: Record<Tier, string> = {
  free: "Ücretsiz",
  pro: "Pro",
  power: "Power",
};
