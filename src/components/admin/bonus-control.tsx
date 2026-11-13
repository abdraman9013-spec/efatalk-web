"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { bonusIsLive, fetchBonusWindow, setBonus24h, type BonusWindow } from "@/lib/bonus-24h";
import { useEffect } from "react";

export function BonusControl() {
  const { t } = useI18n();
  const [row, setRow] = useState<BonusWindow>({ open: false, expires_at: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const live = bonusIsLive(row);

  useEffect(() => {
    void fetchBonusWindow()
      .then(setRow)
      .catch(() => undefined);
  }, []);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setRow(await setBonus24h(!live));
    } catch {
      setError(t.admin.invalid);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="kingdom-glass mt-4 space-y-3 p-4">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[#c4a574]">{t.admin.bonusTitle}</p>
      <p className="font-display text-[22px] leading-tight text-[#f3e6c8]">
        {live ? t.admin.bonusOn : t.admin.bonusOff}
      </p>
      <p className="text-[13px] leading-relaxed text-[#e8d5b0]/85">{t.admin.bonusHint}</p>
      <button
        type="button"
        className={`w-full px-4 py-3 text-[14px] ${live ? "kingdom-cta-ghost" : "kingdom-cta"}`}
        disabled={busy}
        onClick={() => void toggle()}
      >
        {busy ? "…" : live ? t.admin.bonusCloseBtn : t.admin.bonusOpenBtn}
      </button>
      {error ? <p className="text-center text-[12px] text-[#e2b07a]">{error}</p> : null}
    </section>
  );
}
