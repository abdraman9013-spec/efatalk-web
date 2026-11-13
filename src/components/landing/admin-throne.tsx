"use client";

import { FormEvent, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { loginAdmin } from "@/lib/admin";

export function AdminThrone({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const code = String(data.get("adminCode") || "");
    setBusy(true);
    const session = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code }),
    }).catch(() => null);
    if (!session?.ok || !loginAdmin(code)) {
      setError(t.admin.invalid);
      setBusy(false);
      return;
    }
    window.location.assign("/admin-dashboard");
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#06060f]/72 px-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-3xl border border-[#d4af37]/35 bg-[#f7f1e4] p-5 shadow-[0_24px_80px_rgba(6,6,15,0.45)]"
      >
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#9a7418]">{t.admin.gate}</p>
        <p className="mt-1 font-display text-[22px] text-[#0c1b4d]">{t.admin.title}</p>
        <input
          name="adminCode"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          autoFocus
          autoComplete="off"
          placeholder={t.admin.codeOnly}
          className="mt-4 w-full rounded-full border border-[#d4af37]/35 bg-white px-4 py-3 text-[15px] text-[#0c1b4d] outline-none"
        />
        <div className="mt-3 flex gap-2">
          <button type="submit" disabled={busy} className="flex-1 rounded-full bg-[#0c1b4d] px-4 py-3 text-[13px] font-semibold text-[#f0d78c]">
            {t.admin.enter}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#0c1b4d]/15 px-4 py-3 text-[13px] text-[#0c1b4d]"
          >
            {t.admin.home}
          </button>
        </div>
        {error ? <p className="mt-2 text-[12px] text-[#9a7418]">{error}</p> : null}
      </form>
    </div>
  );
}
