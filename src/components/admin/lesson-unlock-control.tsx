"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { lessonsForBand } from "@/lib/learn-catalog";
import { fetchLessonUnlocks, setLessonUnlock, type LessonUnlock } from "@/lib/lesson-progress";

export function LessonUnlockControl() {
  const { t } = useI18n();
  const [rows0, setRows0] = useState<LessonUnlock[]>([]);
  const [rows1, setRows1] = useState<LessonUnlock[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([fetchLessonUnlocks("0"), fetchLessonUnlocks("1")])
      .then(([zero, one]) => {
        setRows0(zero);
        setRows1(one);
      })
      .catch(() => undefined);
  }, []);

  async function toggle(band: "0" | "1", n: number, open: boolean) {
    const key = `${band}-${n}`;
    if (busy) return;
    setBusy(key);
    setError("");
    try {
      const next = await setLessonUnlock(band, n, open);
      const apply = (prev: LessonUnlock[]) => {
        const others = prev.filter((row) => row.lesson_no !== n);
        return [...others, { band, lesson_no: n, unlocked: Boolean(next.unlocked) }].sort(
          (a, b) => a.lesson_no - b.lesson_no,
        );
      };
      if (band === "1") setRows1(apply);
      else setRows0(apply);
    } catch {
      setError(t.admin.invalid);
    } finally {
      setBusy(null);
    }
  }

  function grid(band: "0" | "1", rows: LessonUnlock[]) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {lessonsForBand(band).map((lesson) => {
          const open = rows.some((row) => row.lesson_no === lesson.n && row.unlocked);
          const key = `${band}-${lesson.n}`;
          return (
            <button
              key={key}
              type="button"
              disabled={busy === key}
              onClick={() => void toggle(band, lesson.n, !open)}
              className={`rounded-2xl px-3 py-3 text-left text-[12px] font-bold ${
                open ? "kingdom-cta" : "kingdom-cta-ghost"
              }`}
            >
              {open ? t.admin.lessonOpen : t.admin.lessonLocked} · {band === "1" ? t.official.revision : `L${lesson.n}`}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <section className="kingdom-glass mt-4 space-y-3 p-4">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#c4a574]">{t.admin.unlockTitle}</p>
        <p className="text-[13px] leading-relaxed text-[#e8d5b0]/85">{t.admin.unlockHint}</p>
        {grid("0", rows0)}
        {error ? <p className="text-center text-[12px] text-[#e2b07a]">{error}</p> : null}
      </section>
      <section className="kingdom-glass mt-4 space-y-3 p-4">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#c4a574]">{t.admin.unlockTitle1}</p>
        <p className="text-[13px] leading-relaxed text-[#e8d5b0]/85">{t.admin.unlockHint1}</p>
        {grid("1", rows1)}
      </section>
    </>
  );
}
