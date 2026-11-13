"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { StudentPortrait } from "@/components/avatar/student-portrait";
import { LanguageSwitcher } from "@/components/landing/language-switcher";
import { useI18n } from "@/i18n/provider";
import { ENERGY_START, ensureGameState } from "@/lib/game-mode";
import { lecturePath, lectureBand, officialDisplayName, officialTermDays, readOfficialStudent, saveCurrentStudent, type EfaaStudent } from "@/lib/session";
import { fetchAttendanceDays } from "@/lib/attendance";
import { fetchLectureHours, hoursForLevel, lectureCountdown, remainParts } from "@/lib/lecture-hours";
import { findStudentByCode } from "@/lib/efaa-db";
import { StudyClassBoard } from "@/components/learn/study-class-board";

function levelBadge(level: EfaaStudent["level"]) {
  if (level === "intermediate") return "Level 1";
  if (level === "advanced") return "Level 2";
  return "Level 0";
}

export function VipStudentDashboard() {
  const { t } = useI18n();
  const router = useRouter();
  const [student, setStudent] = useState<EfaaStudent | null>(null);
  const [bolts, setBolts] = useState(ENERGY_START);
  const [points, setPoints] = useState(0);
  const [filled, setFilled] = useState(0);
  const [joinLive, setJoinLive] = useState(false);
  const [joinRemain, setJoinRemain] = useState(0);

  useEffect(() => {
    const local = readOfficialStudent();
    if (!local || local.kind !== "official") {
      router.replace("/");
      return;
    }
    setStudent(local);
    void fetchAttendanceDays(local.id).then(setFilled).catch(() => setFilled(0));
    if (local.accessCode) {
      findStudentByCode(local.accessCode)
        .then((fresh) => {
          if (!fresh) return;
          saveCurrentStudent(fresh);
          setStudent(fresh);
          void fetchAttendanceDays(fresh.id).then(setFilled).catch(() => undefined);
        })
        .catch(() => undefined);
    }
    void ensureGameState(local.id, local.nationality || "TD")
      .then((state) => {
        setBolts(state.lightning_bolts || ENERGY_START);
        setPoints(state.personal_points || 0);
      })
      .catch(() => {
        setBolts(ENERGY_START);
        setPoints(0);
      });
  }, [router]);

  useEffect(() => {
    if (!student) return;
    let stop = false;
    let hours: ReturnType<typeof hoursForLevel> = null;
    void fetchLectureHours()
      .then((rows) => {
        hours = hoursForLevel(student.level, rows);
      })
      .catch(() => undefined);
    const tick = () => {
      if (stop) return;
      const next = lectureCountdown(hours);
      setJoinLive(next.live);
      setJoinRemain(next.remainSec);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [student]);

  if (!student) {
    return <div className="min-h-dvh bg-gradient-to-b from-sky-100 via-white to-amber-50" />;
  }

  const fullName = officialDisplayName(student);
  const termDays = officialTermDays(student.level);
  const clock = remainParts(joinLive ? 0 : joinRemain);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-sky-100 via-[#f7fbff] to-amber-50 text-slate-900">
      <div className="pointer-events-none absolute -left-16 top-8 h-56 w-56 rounded-full bg-sky-300/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-24 h-64 w-64 rounded-full bg-amber-300/40 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-4 pt-4 md:px-8">
        <p className="font-display text-[13px] text-sky-800">English For All Academy</p>
        <LanguageSwitcher />
      </header>

      <main className="relative z-10 mx-auto max-w-lg px-4 pb-16 pt-6 md:max-w-xl">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] border border-sky-200/80 bg-white/75 p-6 shadow-[0_24px_80px_rgba(56,189,248,.22)] backdrop-blur-xl"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-amber-600">{t.official.welcomeProfile}</p>
          <div className="mt-4 flex items-center gap-4">
            <StudentPortrait name={fullName} photo={student.photo} size={84} living userId={student.id} />
            <div className="min-w-0">
              <h1 className="font-display text-[28px] leading-tight text-slate-900">{fullName}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-sky-800">
                <span className="rounded-full bg-gradient-to-r from-sky-400 to-amber-300 px-2.5 py-0.5 text-[11px] font-black text-white">
                  {levelBadge(student.level)}
                </span>
                <span>{t.auth.statuses[student.status]}</span>
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-center">
              <p className="text-[11px] uppercase tracking-wider text-amber-700">⚡</p>
              <p className="font-display text-3xl text-amber-600">{bolts}</p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-center">
              <p className="text-[11px] uppercase tracking-wider text-sky-700">{t.official.points}</p>
              <p className="font-display text-3xl text-sky-700">{points}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-sky-800">{t.official.presence}</p>
            <p className="font-display text-4xl leading-none text-sky-800">
              {filled}/{termDays}
            </p>
            <div className="mt-2 grid grid-cols-12 gap-1">
              {Array.from({ length: termDays }, (_, i) => (
                <span
                  key={i}
                  className={`h-2.5 rounded-full ${i < filled ? "bg-gradient-to-r from-sky-400 to-amber-400" : "bg-sky-100"}`}
                />
              ))}
            </div>
          </div>
        </motion.section>

        <button
          type="button"
          onClick={() => router.push(lecturePath(student.level))}
          className={`mt-5 w-full rounded-[2rem] px-4 py-5 text-white shadow-[0_18px_48px_rgba(56,189,248,.42)] ${
            joinLive
              ? "bg-gradient-to-r from-emerald-400 via-green-500 to-lime-400"
              : "bg-gradient-to-r from-sky-400 via-sky-500 to-amber-400"
          }`}
        >
          <span className="block text-[13px] font-black uppercase tracking-[0.2em]">{t.official.joinRoom}</span>
          <span className="mt-2 flex items-end justify-center gap-1.5 font-display leading-none">
            {clock.d > 0 ? (
              <>
                <span className="text-[36px] md:text-[44px]">{clock.d}</span>
                <span className="mb-1 text-[13px] font-bold opacity-90">d</span>
              </>
            ) : null}
            {clock.d > 0 || clock.h > 0 ? (
              <>
                <span className="text-[36px] md:text-[44px]">{String(clock.h).padStart(2, "0")}</span>
                <span className="mb-1 text-[13px] font-bold opacity-90">h</span>
              </>
            ) : null}
            <span className="text-[42px] md:text-[52px]">{String(clock.m).padStart(2, "0")}</span>
            <span className="mb-1 text-[14px] font-bold opacity-90">min</span>
            <span className="text-[42px] md:text-[52px]">{String(clock.s).padStart(2, "0")}</span>
            <span className="mb-1 text-[14px] font-bold opacity-90">s</span>
          </span>
        </button>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {(
            [
              ["courses", t.official.courses, "/learn/courses"],
              ["exercises", t.official.exercises, "/learn/exercises"],
              ["progress", t.official.progress, "/learn/progress"],
              ["test", t.official.test, "/learn/test"],
              ["exam", t.official.exam, "/learn/exam"],
            ] as const
          ).map(([id, label, href]) => (
            <button
              key={href}
              type="button"
              onClick={() => router.push(href)}
              className={`rounded-2xl border px-3 py-4 text-[13px] font-bold shadow-[0_8px_24px_rgba(56,189,248,.12)] ${
                id === "exam"
                  ? "col-span-2 border-amber-300/70 bg-gradient-to-r from-amber-50 via-white to-sky-50 text-amber-950"
                  : "border-sky-200 bg-white/80 text-sky-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <StudyClassBoard band={lectureBand(student.level)} userId={student.id} />
        </div>
      </main>
    </div>
  );
}
