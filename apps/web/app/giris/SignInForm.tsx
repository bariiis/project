"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const input = "mt-1 w-full rounded-lg border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-paper/40";

export function SignInForm({ next, google, initialMode }: { next: string; google: boolean; initialMode: "signin" | "signup" }) {
  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setBusy(true);
    setError(null);
    const { error } =
      mode === "signup"
        ? await authClient.signUp.email({ email, password, name: String(form.get("name") || email.split("@")[0]) })
        : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (error) {
      setError(error.status === 401 ? "E-posta ya da şifre hatalı." : error.message ?? "Bir sorun oluştu.");
      return;
    }
    // Full navigation so server components pick up the new session cookie.
    window.location.assign(next);
  }

  return (
    <div>
      <h1 className="font-serif text-5xl tracking-tight">{mode === "signup" ? "Hesap oluştur" : "Giriş yap"}</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {mode === "signup" && (
          <label className="block text-xs text-muted">
            Ad
            <input name="name" autoComplete="name" className={input} />
          </label>
        )}
        <label className="block text-xs text-muted">
          E-posta
          <input name="email" type="email" required autoComplete="email" className={input} />
        </label>
        <label className="block text-xs text-muted">
          Şifre
          <input name="password" type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} className={input} />
        </label>
        {error && <p className="text-sm text-ember" role="alert">{error}</p>}
        <button disabled={busy} className="w-full rounded-full bg-paper py-3 text-sm font-medium text-ink disabled:opacity-50">
          {busy ? "Bekleyin…" : mode === "signup" ? "Kayıt ol" : "Giriş yap"}
        </button>
      </form>
      {google && (
        <button
          onClick={() => authClient.signIn.social({ provider: "google", callbackURL: next })}
          className="mt-3 w-full rounded-full border border-line py-3 text-sm transition-colors hover:border-paper/40"
        >
          Google ile devam et
        </button>
      )}
      <p className="mt-6 text-center text-sm text-muted">
        {mode === "signup" ? "Hesabın var mı? " : "Hesabın yok mu? "}
        <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(null); }} className="text-paper underline underline-offset-4">
          {mode === "signup" ? "Giriş yap" : "Kayıt ol"}
        </button>
      </p>
    </div>
  );
}
