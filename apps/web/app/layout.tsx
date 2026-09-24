import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin", "latin-ext"], variable: "--font-geist" });
const instrument = Instrument_Serif({ subsets: ["latin", "latin-ext"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument" });

export const metadata: Metadata = {
  title: { default: "Promptsite", template: "%s · Promptsite" },
  description: "Bölüm seç, birleşik prompt al: animasyonlu web sayfaları için prompt kütüphanesi ve builder.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${geist.variable} ${instrument.variable}`}>
      <body className="min-h-svh font-sans">
        <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur">
          <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 text-[15px] font-medium tracking-tight">
              <span className="size-2.5 bg-ember" aria-hidden />
              Promptsite
            </Link>
            <div className="flex items-center gap-6 text-sm text-muted">
              <Link href="/library" className="transition-colors hover:text-paper">Kütüphane</Link>
              <Link href="/builder" className="transition-colors hover:text-paper">Builder</Link>
              <Link href="/#fiyat" className="hidden transition-colors hover:text-paper sm:inline">Fiyatlar</Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
