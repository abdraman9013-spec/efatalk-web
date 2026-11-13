"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { setDoorsOpen } from "@/lib/open-hours";
import { useOpenHours } from "@/lib/use-open-hours";

export function DoorsControl() {
  const { t } = useI18n();
  const hours = useOpenHours();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const forceOpen = hours.forceOpen;
  const scheduleOpen = hours.open;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await setDoorsOpen(!forceOpen);
      await hours.refresh();
    } catch {
      setError(t.admin.invalid);
    } finally {
      setBusy(false);
    }
  }

  const status = forceOpen
    ? t.admin.doorsOpenNow
    : scheduleOpen
      ? t.schedule.liveNow
      : t.admin.doorsClosedSchedule;

  return (
    <section className="kingdom-glass mt-4 space-y-3 p-4">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[#c4a574]">{t.admin.doorsTitle}</p>
      <p className="font-display text-[22px] leading-tight text-[#f3e6c8]">{status}</p>
      <p className="text-[13px] leading-relaxed text-[#e8d5b0]/85">{t.admin.doorsHint}</p>
      <button
        type="button"
        className={`w-full px-4 py-3 text-[14px] ${forceOpen ? "kingdom-cta-ghost" : "kingdom-cta"}`}
        disabled={busy || hours.loading}
        onClick={() => void toggle()}
      >
        {busy ? "…" : forceOpen ? t.admin.doorsCloseBtn : t.admin.doorsOpenBtn}
      </button>
      {error ? <p className="text-center text-[12px] text-[#e2b07a]">{error}</p> : null}
    </section>
  );
}
