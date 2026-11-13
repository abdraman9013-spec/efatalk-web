"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LearnShell } from "@/components/learn/learn-shell";
import { useI18n } from "@/i18n/provider";
import { lectureBand, readOfficialStudent } from "@/lib/session";
import { lessonForBand } from "@/lib/learn-catalog";
import { saveLessonWork } from "@/lib/lesson-progress";
import { fetchLessonUnlocks, unlockedNumbers } from "@/lib/lesson-progress";

export function CourseWatchScreen({ n }: { n: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [band, setBand] = useState<"0" | "1">("0");
  const lesson = lessonForBand(band, n);

  useEffect(() => {
    const student = readOfficialStudent();
    if (!student) {
      router.replace("/learn/courses");
      return;
    }
    const nextBand = lectureBand(student.level);
    setBand(nextBand);
    void fetchLessonUnlocks(nextBand).then((rows) => {
      if (!unlockedNumbers(rows).includes(n)) {
        router.replace("/learn/courses");
        return;
      }
      setOk(true);
      void saveLessonWork({ userId: student.id, band: nextBand, lessonNo: n, watched: true });
    });
  }, [n, router]);

  if (!lesson || !ok) {
    return <LearnShell title={t.official.courses}><p>…</p></LearnShell>;
  }

  return (
    <LearnShell title={lesson.title}>
      <p className="text-[14px] leading-relaxed text-sky-900">{lesson.summary}</p>
      {lesson.youtubeId ? (
        <div className="mt-4 overflow-hidden rounded-[1.4rem] bg-black aspect-video">
          <iframe
            title={lesson.title}
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${lesson.youtubeId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <p className="mt-4 rounded-[1.4rem] bg-white/80 p-6 text-center text-[15px] font-semibold text-sky-800">
          {t.official.videoSoon}
        </p>
      )}
      <button
        type="button"
        onClick={() => router.push(`/learn/exercises/${n}`)}
        className="mt-5 w-full rounded-2xl bg-gradient-to-r from-sky-400 to-amber-400 py-3.5 text-[13px] font-black uppercase tracking-wide text-white"
      >
        {t.official.exercises}
      </button>
    </LearnShell>
  );
}
