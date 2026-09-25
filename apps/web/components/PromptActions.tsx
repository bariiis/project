"use client";

import { useState } from "react";

export function PromptActions({ prompt, filename }: { prompt: string; filename: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function download() {
    const url = URL.createObjectURL(new Blob([prompt], { type: "text/markdown;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-2">
      <button onClick={copy} className="rounded-full bg-paper px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90">
        {copied ? "Kopyalandı" : "Promptu kopyala"}
      </button>
      <button onClick={download} className="rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-paper/40">
        .md indir
      </button>
    </div>
  );
}
