"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AssetUploader() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([]);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("Yükleniyor…");
    const res = await fetch("/api/admin/assets", { method: "POST", body: new FormData(form) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(`Hata: ${data.error ?? res.status}${data.file ? ` (${data.file})` : ""}`);
      return;
    }
    setUrls(data.assets.map((a: { url: string }) => a.url));
    setStatus(`${data.assets.length} dosya yüklendi.`);
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={upload} className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line p-4">
      <input name="files" type="file" multiple accept="video/*,image/*,audio/*,.glb,.gltf,.hdr,.exr" className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-paper file:px-4 file:py-2 file:text-ink" />
      <button className="rounded-full bg-ember px-4 py-2 text-sm font-medium text-ink">Yükle</button>
      {status && <p className="w-full text-sm text-muted" role="status">{status}</p>}
      {urls.map((u) => <code key={u} className="w-full truncate text-xs">{u}</code>)}
    </form>
  );
}
