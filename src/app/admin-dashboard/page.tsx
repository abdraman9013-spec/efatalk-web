"use client";

import { LockKeyhole, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { AdminScreen } from "@/components/admin/admin-screen";
import { isAdminAuthed, loginAdmin } from "@/lib/admin";

export default function AdminDashboardPage() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAuthed(isAdminAuthed());
    setReady(true);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const code = String(data.get("adminCode") || "");
    setBusy(true);
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => null);
    if (!response?.ok || !loginAdmin(code)) {
      setError("Accès refusé.");
      setBusy(false);
      return;
    }
    setError("");
    setAuthed(true);
    setBusy(false);
  }

  if (!ready) return <div className="min-h-dvh bg-[#060608]" />;
  if (authed) return <AdminScreen />;

  return (
    <main className="admin-desk grid min-h-dvh place-items-center px-5">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-[2rem] border border-[#c4a574]/25 bg-[rgba(18,32,62,0.55)] p-6 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-2xl"
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-200/20 bg-amber-300/[0.08] text-amber-300">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">
          Restricted operations
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Control room</h1>
        <label className="mt-7 flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 focus-within:border-amber-300/50">
          <LockKeyhole className="h-4 w-4 text-amber-300/70" />
          <input
            name="adminCode"
            type="password"
            inputMode="numeric"
            required
            autoComplete="off"
            aria-label="Administration code"
            className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/25"
            placeholder="••••"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="mt-3 min-h-14 w-full rounded-2xl bg-gradient-to-b from-[#ffe493] to-[#d99d2d] text-xs font-black uppercase tracking-[0.16em] text-[#151006]"
        >
          {busy ? "…" : "Authorize"}
        </button>
        {error ? <p className="mt-3 text-center text-xs font-semibold text-rose-300">{error}</p> : null}
      </form>
    </main>
  );
}
