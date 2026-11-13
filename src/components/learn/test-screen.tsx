"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LearnShell } from "@/components/learn/learn-shell";
import { useI18n } from "@/i18n/provider";
import { lectureBand, readOfficialStudent } from "@/lib/session";
import { quizCorrect, speakPool, type LessonQuiz, type SpeakPair } from "@/lib/level0-lessons";
import { lessonsForBand } from "@/lib/learn-catalog";
import { fetchLessonUnlocks, saveLessonWork, unlockedNumbers } from "@/lib/lesson-progress";

function shuffle<T>(list: T[]) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function TestScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [band, setBand] = useState<"0" | "1">("0");
  const [pairs, setPairs] = useState<SpeakPair[]>([]);
  const [left, setLeft] = useState<SpeakPair[]>([]);
  const [right, setRight] = useState<SpeakPair[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [wrong, setWrong] = useState(0);
  const [leftSec, setLeftSec] = useState(60);
  const [ended, setEnded] = useState(false);
  const [userId, setUserId] = useState("");
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<LessonQuiz[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    const student = readOfficialStudent();
    if (!student) {
      router.replace("/");
      return;
    }
    const nextBand = lectureBand(student.level);
    setBand(nextBand);
    setUserId(student.id);
    void fetchLessonUnlocks(nextBand).then((rows) => {
      const open = unlockedNumbers(rows);
      if (nextBand === "1") {
        const paper = lessonsForBand("1")
          .filter((row) => open.includes(row.n))
          .flatMap((row) => row.test || []);
        setItems(paper);
        setReady(true);
        return;
      }
      const pool = speakPool(open);
      if (!pool.length) {
        setPairs([]);
        setReady(true);
        return;
      }
      const take = shuffle(pool).slice(0, Math.min(6, pool.length));
      setPairs(take);
      setLeft(shuffle(take));
      setRight(shuffle(take));
      setReady(true);
    });
  }, [router]);

  useEffect(() => {
    if (band === "1" || !pairs.length || ended) return;
    const id = window.setInterval(() => {
      setLeftSec((sec) => {
        if (sec <= 1) {
          window.clearInterval(id);
          setEnded(true);
          return 0;
        }
        return sec - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [band, ended, pairs.length]);

  useEffect(() => {
    if (band === "1" || !ended || !userId || !pairs.length) return;
    void saveLessonWork({
      userId,
      band: "0",
      lessonNo: 1,
      testBest: done.length,
    });
  }, [band, done.length, ended, pairs, userId]);

  const mm = String(Math.floor(leftSec / 60)).padStart(2, "0");
  const ss = String(leftSec % 60).padStart(2, "0");

  function tryMatch(phrase: string) {
    if (ended || !pick) return;
    if (pick === phrase) {
      setDone((prev) => [...prev, phrase]);
      setPick(null);
      if (done.length + 1 >= pairs.length) setEnded(true);
    } else {
      setWrong((n) => n + 1);
      setPick(null);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const total = items.length;
    let good = 0;
    items.forEach((item) => {
      if (quizCorrect(item, answers[item.id] || "")) good += 1;
    });
    setScore(good);
    if (userId) {
      void saveLessonWork({
        userId,
        band: "1",
        lessonNo: 1,
        testBest: good,
      });
    }
  }

  const remainingLeft = useMemo(() => left.filter((row) => !done.includes(row.phrase)), [done, left]);
  const remainingRight = useMemo(() => right.filter((row) => !done.includes(row.phrase)), [done, right]);

  if (!ready) {
    return (
      <LearnShell title={t.official.test}>
        <p>…</p>
      </LearnShell>
    );
  }

  if (band === "1") {
    if (!items.length) {
      return (
        <LearnShell title={t.official.test}>
          <p className="rounded-2xl bg-white/80 p-4 text-[14px] text-sky-900">{t.official.testLocked}</p>
        </LearnShell>
      );
    }
    return (
      <LearnShell title={t.official.test}>
        <p className="text-[14px] text-sky-900">{t.official.testHint1}</p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          {items.map((item, index) => (
            <label key={item.id} className="block rounded-2xl border border-sky-200 bg-white/85 p-4">
              <span className="block text-[13px] font-bold text-slate-900">
                {index + 1}. {item.prompt}
              </span>
              <input
                value={answers[item.id] || ""}
                onChange={(event) => setAnswers((prev) => ({ ...prev, [item.id]: event.currentTarget.value }))}
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
            {t.official.exoScore} {score}/{items.length}
          </p>
        ) : null}
      </LearnShell>
    );
  }

  if (!pairs.length) {
    return (
      <LearnShell title={t.official.test}>
        <p className="rounded-2xl bg-white/80 p-4 text-[14px] text-sky-900">{t.official.testLocked}</p>
      </LearnShell>
    );
  }

  return (
    <LearnShell title={t.official.test}>
      <p className="text-[14px] text-sky-900">{t.official.testHint}</p>
      <p
        className={`mt-3 text-center font-display text-[40px] leading-none ${
          leftSec <= 10 ? "text-rose-500" : "text-sky-800"
        }`}
      >
        {mm}
        <span className="px-1 text-[18px]">min</span>
        {ss}
        <span className="pl-1 text-[18px]">s</span>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {remainingLeft.map((row) => (
            <button
              key={`e-${row.phrase}`}
              type="button"
              disabled={ended}
              onClick={() => setPick(row.phrase)}
              className={`grid h-14 w-full place-items-center rounded-2xl text-2xl ${
                pick === row.phrase ? "bg-amber-300" : "bg-white/90"
              }`}
            >
              {row.emoji}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {remainingRight.map((row) => (
            <button
              key={`p-${row.phrase}`}
              type="button"
              disabled={ended || !pick}
              onClick={() => tryMatch(row.phrase)}
              className="w-full rounded-2xl bg-white/90 px-3 py-3 text-left text-[13px] font-bold text-slate-800"
            >
              {row.phrase}
            </button>
          ))}
        </div>
      </div>
      {ended ? (
        <p className="mt-5 text-center font-display text-2xl text-sky-800">
          {t.official.exoScore} {done.length}/{pairs.length}
          {wrong ? ` · ${wrong}` : ""}
        </p>
      ) : null}
    </LearnShell>
  );
}
