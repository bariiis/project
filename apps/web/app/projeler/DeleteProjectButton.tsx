"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteProjectButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        if (!confirm(`"${title}" silinsin mi? Bu geri alınamaz.`)) return;
        setBusy(true);
        await fetch(`/api/projects/${id}`, { method: "DELETE" });
        router.refresh();
      }}
      className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-ember hover:text-ember disabled:opacity-50"
    >
      Sil
    </button>
  );
}
