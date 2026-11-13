"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/provider";
import type { Level } from "@/i18n/translations";
import { clockLabel, nowInAcademy } from "@/lib/open-hours";
import { useOpenHours } from "@/lib/use-open-hours";
import { SectionDownArrow } from "./section-down-arrow";

const levels: Level[] = ["beginner", "intermediate", "advanced"];

export function Schedule() {
  const { t } = useI18n();
  const hours = useOpenHours();
  const rows = hours.rows;
  const live = hours.open || hours.forceOpen;
  const today = nowInAcademy().weekday;
  const enabled = rows.filter((row) => row.enabled);
  const todayRow = enabled.find((row) => Number(row.weekday) === today);

  const practiceTime = useMemo(() => {
    if (todayRow) return clockLabel(todayRow.open_at);
    const next = enabled.find((row) => Number(row.weekday) >= today) || enabled[0];
    if (next) return clockLabel(next.open_at);
    return t.schedule.startsAt;
  }, [enabled, t.schedule.startsAt, today, todayRow]);

  const status = useMemo(() => {
    if (hours.forceOpen) return t.admin.doorsOpenNow;
    if (hours.open && todayRow) {
      return `${t.schedule.liveNow} · ${clockLabel(todayRow.open_at)}–${clockLabel(todayRow.close_at)}`;
    }
    return `${t.schedule.next} · ${practiceTime}`;
  }, [hours.forceOpen, hours.open, practiceTime, t, todayRow]);

  return (
    <section id="atelier" className="px-4 pb-6 pt-4">
      <div className="mx-auto w-full max-w-xl rounded-[28px] efa-sea-glass p-5 md:max-w-3xl md:p-7">
        <p className="text-[10px] uppercase tracking-[0.32em] text-[#9a7418]">{t.schedule.eyebrow}</p>

        <p className="mt-3 font-display text-[56px] leading-none tracking-tight text-[#0c1b4d] md:text-[72px]" dir="ltr">
          {practiceTime}
        </p>
        <p className="mt-2 text-[13px] font-semibold uppercase tracking-[0.22em] text-[#9a7418]">
          {t.schedule.everyDay}
        </p>

        <h2 className="mt-4 font-display text-[22px] leading-snug text-[#0c1b4d] md:text-[26px]">
          {t.schedule.title}
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[#1a2a4a]/72">{t.schedule.hook}</p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0c1b4d] px-3 py-1.5 text-[11px] text-[#f0d78c]">
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-400 animate-pulse" : "bg-[#d4af37]"}`} />
          {status}
        </div>

        <ul className="mt-5 grid gap-2 sm:grid-cols-3">
          {levels.map((id) => (
            <li
              key={id}
              className="rounded-2xl border border-[#d4af37]/25 bg-[#0c1b4d]/[0.06] px-4 py-3"
            >
              <p className="font-display text-lg text-[#0c1b4d]">{t.levels[id]}</p>
              <p className="mt-0.5 text-[12px] text-[#1a2a4a]/65">{t.schedule.focus[id]}</p>
            </li>
          ))}
        </ul>
      </div>
      <SectionDownArrow to="temoignages" />
    </section>
  );
}
