"use client";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  return (
    <button
      onClick={async () => {
        await authClient.signOut();
        window.location.assign("/");
      }}
      className="rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-paper/40"
    >
      Çıkış yap
    </button>
  );
}
