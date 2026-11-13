"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LearnShell } from "@/components/learn/learn-shell";
import { useI18n } from "@/i18n/provider";
import { lectureBand, readOfficialStudent } from "@/lib/session";
import { quizCorrect } from "@/lib/level0-lessons";
import { lessonForBand } from "@/lib/learn-catalog";
import { fetchLessonUnlocks, saveLessonWork, unlockedNumbers } from "@/lib/lesson-progress";

export function ExerciseQuizScreen({ n }: { n: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [band, setBand] = useState<"0" | "1">("0");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const lesson = lessonForBand(band, n);

  useEffect(() => {
    const student = readOfficialStudent();
    if (!student) {
      router.replace("/learn/exercises");
      return;
    }
    const nextBand = lectureBand(student.level);
    setBand(nextBand);
    setUserId(student.id);
    void fetchLessonUnlocks(nextBand).then((rows) => {
      if (!unlockedNumbers(rows).includes(n)) {
        router.replace("/learn/exercises");
        return;
      }
      setOk(true);
    });
  }, [n, router]);

  if (!lesson || !ok) {
    return <LearnShell title={t.official.exercises}><p>…</p></LearnShell>;
  }

  if (!lesson.quiz.length) {
    return (
      <LearnShell title={lesson.title}>
        <p className="rounded-2xl bg-white/80 p-4 text-[14px] text-sky-900">{t.official.exoSoon}</p>
      </LearnShell>
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const total = lesson!.quiz.length;
    let good = 0;
    lesson!.quiz.forEach((item) => {
      if (quizCorrect(item, answers[item.id] || "")) good += 1;
    });
    setScore(good);
    if (userId) {
      void saveLessonWork({
        userId,
        band,
        lessonNo: n,
        exoDone: true,
        exoScore: good,
        exoTotal: total,
      });
    }
  }

  return (
    <LearnShell title={lesson.title}>
      <form onSubmit={onSubmit} className="space-y-3">
        {lesson.quiz.map((item, index) => (
          <label key={item.id} className="block rounded-2xl border border-sky-200 bg-white/85 p-4">
            <span className="block text-[13px] font-bold text-slate-900">
              {index + 1}. {item.prompt}
            </span>
            <input
              value={answers[item.id] || ""}
              onChange={(event) => setAnswers((prev) => ({ ...prev, [item.id]: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-[14px] outline-none"
            />
          </label>
        ))}
        <button
          type="submit"
          className="w-full rounded-2xl bg-gradient-to-r from-sky-400 to-amber-400 py-3.5 text-[13px] font-black uppercase tracking-wide text-white"
        >
          {t.official.exoCheck}
        </button>
      </form>
      {score !== null ? (
        <p className="mt-4 text-center font-display text-2xl text-sky-800">
          {t.official.exoScore} {score}/{lesson.quiz.length}
        </p>
      ) : null}
      {score !== null ? (
        <p className="mt-2 text-center text-[12px] font-semibold text-amber-700">{t.official.exoFirstLocked}</p>
      ) : null}
      {score !== null && band === "1" ? (
        <button
          type="button"
          onClick={() => router.push("/learn/test")}
          className="mt-3 w-full rounded-2xl border border-sky-200 bg-white/85 py-3 text-[13px] font-black uppercase tracking-wide text-sky-800"
        >
          {t.official.test}
        </button>
      ) : null}
    </LearnShell>
  );
}
