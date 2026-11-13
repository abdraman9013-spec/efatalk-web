"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LearnShell } from "@/components/learn/learn-shell";
import { useI18n } from "@/i18n/provider";
import { lectureBand, readOfficialStudent } from "@/lib/session";
import { lessonsForBand } from "@/lib/learn-catalog";
import { fetchLessonUnlocks, fetchLessonWork, unlockedNumbers, type LessonWork } from "@/lib/lesson-progress";

export function ExercisesScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState<number[]>([]);
  const [work, setWork] = useState<LessonWork[]>([]);
  const [band, setBand] = useState<"0" | "1">("0");

  useEffect(() => {
    const student = readOfficialStudent();
    if (!student) {
      router.replace("/");
      return;
    }
    const nextBand = lectureBand(student.level);
    setBand(nextBand);
    void Promise.all([fetchLessonUnlocks(nextBand), fetchLessonWork(student.id, nextBand)]).then(([unlocks, rows]) => {
      setOpen(unlockedNumbers(unlocks));
      setWork(rows);
    });
  }, [router]);

  return (
    <LearnShell title={t.official.exercises}>
      <div className="space-y-2">
        {lessonsForBand(band).map((lesson) => {
          const live = open.includes(lesson.n);
          const done = work.find((row) => row.lesson_no === lesson.n);
          return (
            <button
              key={lesson.n}
              type="button"
              disabled={!live}
              onClick={() => router.push(`/learn/exercises/${lesson.n}`)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left ${
                live ? "border-sky-200 bg-white/85" : "border-sky-100 bg-sky-50/50 opacity-70"
              }`}
            >
              <span>
                <span className="block text-[14px] font-black text-slate-900">{lesson.title}</span>
                <span className="mt-1 block text-[12px] text-sky-800">
                  {live
                    ? done?.exo_done
                      ? `${t.official.exoScore} ${done.exo_score}/${done.exo_total}`
                      : t.official.tapExo
                    : t.official.lockedUntilLive}
                </span>
              </span>
              <span className="text-[18px]">{live ? (done?.exo_done ? "✓" : "✎") : "🔒"}</span>
            </button>
          );
        })}
      </div>
    </LearnShell>
  );
}
