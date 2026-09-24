"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const input = "mt-1 w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-paper/40";

function randomPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const ERRORS: Record<string, string> = {
  email_taken: "Bu e-postayla bir hesap zaten var.",
  invalid_request: "Bilgileri kontrol et: geçerli e-posta, ad ve en az 8 karakterlik şifre gerekli.",
};

export function CreateUserForm() {
  const router = useRouter();
  const [password, setPassword] = useState(randomPassword);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...data, until: data.until || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(ERRORS[body.error] ?? "Hesap açılamadı.");
        return;
      }
      setCreated({ email: data.email!.trim().toLowerCase(), password: data.password! });
      form.reset();
      setPassword(randomPassword());
      router.refresh();
    } catch {
      setError("Sunucuya ulaşılamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-2xl border border-line p-4 sm:grid-cols-2 lg:grid-cols-6">
      <label className="text-xs text-muted lg:col-span-2">
        E-posta
        <input name="email" type="email" required className={input} />
      </label>
      <label className="text-xs text-muted lg:col-span-2">
        Ad
        <input name="name" required className={input} />
      </label>
      <label className="text-xs text-muted lg:col-span-2">
        Şifre
        <span className="flex gap-2">
          <input name="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={`${input} font-mono`} />
          <button type="button" onClick={() => setPassword(randomPassword())} className="mt-1 shrink-0 rounded-lg border border-line px-3 text-xs hover:border-paper/40" title="Yeni şifre üret">↻</button>
        </span>
      </label>
      <label className="text-xs text-muted">
        Plan
        <select name="plan" defaultValue="pro" className={input}>
          <option value="free">Ücretsiz</option>
          <option value="pro">Pro</option>
          <option value="power">Power</option>
        </select>
      </label>
      <label className="text-xs text-muted">
        Bitiş (boş = süresiz)
        <input name="until" type="date" className={input} />
      </label>
      <label className="text-xs text-muted">
        Rol
        <select name="role" defaultValue="user" className={input}>
          <option value="user">Kullanıcı</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <div className="flex items-end sm:col-span-2 lg:col-span-3">
        <button disabled={busy} className="w-full rounded-full bg-ember py-2.5 text-sm font-medium text-ink disabled:opacity-40">
          {busy ? "Açılıyor…" : "Hesabı aç"}
        </button>
      </div>
      {error && <p className="text-sm text-ember sm:col-span-2 lg:col-span-6" role="alert">{error}</p>}
      {created && (
        <p className="rounded-lg bg-ink-2 p-3 text-sm sm:col-span-2 lg:col-span-6" role="status">
          Hesap açıldı. Giriş bilgileri: <code>{created.email}</code> · <code>{created.password}</code>
          <button type="button" onClick={() => navigator.clipboard?.writeText(`${created.email}\n${created.password}`)} className="ml-3 underline underline-offset-4">kopyala</button>
        </p>
      )}
    </form>
  );
}
