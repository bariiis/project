"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Plan = "free" | "pro" | "power";
type Row = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  plan: Plan;
  grant: { plan: Plan; until: string | null } | null;
  paid: boolean;
};

const PLAN: Record<Plan, string> = { free: "Ücretsiz", pro: "Pro", power: "Power" };
const field = "rounded-lg border border-line bg-ink-2 px-2 py-1.5 text-xs text-paper outline-none focus:border-paper/40";

export function UserRow({ user, isSelf }: { user: Row; isSelf: boolean }) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>(user.grant?.plan ?? "free");
  const [until, setUntil] = useState(user.grant?.until?.slice(0, 10) ?? "");
  const [status, setStatus] = useState<string | null>(null);

  const dirty = plan !== (user.grant?.plan ?? "free") || until !== (user.grant?.until?.slice(0, 10) ?? "");

  async function patch(body: object, done: string) {
    setStatus("Kaydediliyor…");
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    setStatus(res?.ok ? done : "Kaydedilemedi.");
    if (res?.ok) router.refresh();
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="truncate">
          {user.email}
          {user.role === "admin" && <span className="ml-2 text-ember">admin</span>}
          {isSelf && <span className="ml-2 text-muted">(sen)</span>}
        </p>
        <p className="text-xs text-muted">
          {user.name} · {new Date(user.createdAt).toLocaleDateString("tr-TR")} · Geçerli plan: {PLAN[user.plan]}
          {user.paid && " · ödemeli abonelik var"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={plan} onChange={(e) => setPlan(e.target.value as Plan)} className={field} aria-label="Verilen plan">
          <option value="free">Plan verme</option>
          <option value="pro">Pro ver</option>
          <option value="power">Power ver</option>
        </select>
        <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} disabled={plan === "free"} className={`${field} disabled:opacity-40`} aria-label="Bitiş tarihi" title="Boş = süresiz" />
        <button
          onClick={() => patch({ grant: { plan, until: plan === "free" || !until ? null : until } }, "Plan güncellendi.")}
          disabled={!dirty}
          className="rounded-full bg-paper px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-30"
        >
          Kaydet
        </button>
        {!isSelf && (
          <button
            onClick={() => patch({ role: user.role === "admin" ? "user" : "admin" }, "Rol güncellendi.")}
            className="rounded-full border border-line px-3 py-1.5 text-xs hover:border-paper/40"
          >
            {user.role === "admin" ? "Admin'liği al" : "Admin yap"}
          </button>
        )}
        {status && <span className="text-xs text-muted" role="status">{status}</span>}
      </div>
    </li>
  );
}
