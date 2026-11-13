"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LearnShell } from "@/components/learn/learn-shell";
import { useI18n } from "@/i18n/provider";
import { lectureBand, officialTermDays, readOfficialStudent } from "@/lib/session";
import { fetchAttendanceDays } from "@/lib/attendance";
import { fetchLessonUnlocks, fetchLessonWork, unlockedNumbers } from "@/lib/lesson-progress";
import { lessonsForBand } from "@/lib/learn-catalog";
import { StudyClassBoard } from "@/components/learn/study-class-board";

export function ProgressScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [present, setPresent] = useState(0);
  const [termDays, setTermDays] = useState(60);
  const [open, setOpen] = useState<number[]>([]);
  const [watched, setWatched] = useState(0);
  const [exos, setExos] = useState(0);
  const [catalog, setCatalog] = useState(1);
  const [band, setBand] = useState<"0" | "1">("0");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const student = readOfficialStudent();
    if (!student) {
      router.replace("/");
      return;
    }
    setTermDays(officialTermDays(student.level));
    setUserId(student.id);
    void fetchAttendanceDays(student.id).then(setPresent).catch(() => setPresent(0));
    const nextBand = lectureBand(student.level);
    setBand(nextBand);
    setCatalog(lessonsForBand(nextBand).length);
    void Promise.all([fetchLessonUnlocks(nextBand), fetchLessonWork(student.id, nextBand)]).then(([unlocks, work]) => {
      setOpen(unlockedNumbers(unlocks));
      setWatched(work.filter((row) => row.watched).length);
      setExos(work.filter((row) => row.exo_done).length);
    });
  }, [router]);

  const filled = Math.min(termDays, present);
  const labels = useMemo(
    () => [
      { k: t.official.presence, v: `${filled}/${termDays}` },
      { k: t.official.lessonsSeen, v: `${watched}/${Math.max(open.length, catalog)}` },
      { k: t.official.exosDone, v: `${exos}/${Math.max(open.length, 1)}` },
    ],
    [catalog, exos, filled, open.length, t, termDays, watched],
  );

  return (
    <LearnShell title={t.official.progress}>
      <div className="space-y-3">
        {labels.map((row) => (
          <div key={row.k} className="rounded-2xl border border-sky-200 bg-white/85 px-4 py-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-sky-700">{row.k}</p>
            <p className="font-display text-3xl text-slate-900">{row.v}</p>
          </div>
        ))}
        {userId ? <StudyClassBoard band={band} userId={userId} /> : null}
      </div>
    </LearnShell>
  );
}
