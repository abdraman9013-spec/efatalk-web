"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/landing/language-switcher";
import { VipBadge } from "@/components/landing/vip-badge";
import { useI18n } from "@/i18n/provider";
import type { Level } from "@/i18n/translations";
import { clearAdminAuth, isAdminAuthed, logoutAdmin, setAdminVisit } from "@/lib/admin";
import { DoorsControl } from "@/components/admin/doors-control";
import { BonusControl } from "@/components/admin/bonus-control";
import { LessonUnlockControl } from "@/components/admin/lesson-unlock-control";
import { GodModePanel } from "@/components/admin/god-mode-panel";
import { InvitationCodeGenerator } from "@/components/admin/invitation-code-generator";
import { AdminRosterPanel } from "@/components/admin/admin-roster-panel";
import { PresenceOverview } from "@/components/admin/presence-overview";
import { RetentionPulse } from "@/components/admin/retention-pulse";
import { ChallengeAdminPanel } from "@/components/admin/challenge-admin-panel";
import { ExamAdminPanel } from "@/components/admin/exam-admin-panel";
import { TopicsAdminPanel } from "@/components/admin/topics-admin-panel";
import { FormationAdminPanel } from "@/components/admin/formation-admin-panel";
import { useLiveIndex } from "@/lib/use-live-index";
import { lobbyPath, studentBoardName, type EfaaStudent } from "@/lib/session";
import {
  fetchWebSettings,
  listActiveStudents,
  saveWebSettings,
  updateStudentMoney,
} from "@/lib/efaa-db";
import { dayKeys, SESSION_END, SESSION_START, type DayKey } from "@/lib/schedule";
import { topics as defaultTopics } from "@/lib/room-roster";

const levels: Level[] = ["beginner", "intermediate", "advanced"];
const TAB_KEY = "efaa_admin_desk_tab";

const TABS = [
  "map",
  "topics",
  "live",
  "lessons",
  "schedule",
  "students",
  "challenge",
  "exam",
  "codes",
  "formation",
  "rooms",
] as const;

type DeskTab = (typeof TABS)[number];

function isDeskTab(value: string): value is DeskTab {
  return (TABS as readonly string[]).includes(value);
}

function readTab(): DeskTab {
  if (typeof window === "undefined") return "topics";
  const stored = window.sessionStorage.getItem(TAB_KEY) || "";
  return isDeskTab(stored) ? stored : "topics";
}

export function AdminScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const liveRooms = useLiveIndex();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<DeskTab>("topics");
  const [students, setStudents] = useState<EfaaStudent[]>([]);
  const [topics, setTopics] = useState<Record<Level, string>>({
    beginner: defaultTopics.beginner.en,
    intermediate: defaultTopics.intermediate.en,
    advanced: defaultTopics.advanced.en,
  });
  const [days, setDays] = useState<DayKey[]>([...dayKeys]);
  const [start, setStart] = useState(SESSION_START);
  const [end, setEnd] = useState(SESSION_END);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const ok = isAdminAuthed();
      setAuthed(ok);
      if (!ok) {
        router.replace("/admin-dashboard");
        return;
      }
      setTab(readTab());
      Promise.all([fetchWebSettings(), listActiveStudents()])
        .then(([web, rows]) => {
          setStudents(rows);
          if (web.session_days?.length) setDays(web.session_days);
          if (web.session_start) setStart(web.session_start);
          if (web.session_end) setEnd(web.session_end);
          if (web.topics && Object.keys(web.topics).length) {
            setTopics({
              beginner: web.topics.beginner || defaultTopics.beginner[locale],
              intermediate: web.topics.intermediate || defaultTopics.intermediate[locale],
              advanced: web.topics.advanced || defaultTopics.advanced[locale],
            });
          }
          setReady(true);
        })
        .catch(() => setReady(true));
    });
  }, [locale, router]);

  function go(next: DeskTab) {
    setTab(next);
    try {
      window.sessionStorage.setItem(TAB_KEY, next);
    } catch {
      /* private mode */
    }
  }

  async function onSaveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveWebSettings({
      session_days: days,
      session_start: start,
      session_end: end,
      topics,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  async function onSaveMoney(id: string, paid: number, due: number) {
    const updated = await updateStudentMoney(id, paid, due);
    setStudents((prev) => prev.map((row) => (row.id === id ? updated : row)));
  }

  const nav = [
    { id: "map" as const, label: t.admin.navMap, hint: t.admin.navMapHint },
    { id: "topics" as const, label: t.admin.navTopics, hint: t.admin.navTopicsHint },
    { id: "live" as const, label: t.admin.navLive, hint: t.admin.navLiveHint },
    { id: "lessons" as const, label: t.admin.navLessons, hint: t.admin.navLessonsHint },
    { id: "schedule" as const, label: t.admin.navSchedule, hint: t.admin.navScheduleHint },
    { id: "students" as const, label: t.admin.navStudents, hint: t.admin.navStudentsHint },
    { id: "challenge" as const, label: t.admin.navChallenge, hint: t.admin.navChallengeHint },
    { id: "exam" as const, label: t.admin.navExam, hint: t.admin.navExamHint },
    { id: "codes" as const, label: t.admin.navCodes, hint: t.admin.navCodesHint },
    { id: "formation" as const, label: "Formation", hint: "Places · promo · caisse EFAA" },
    { id: "rooms" as const, label: t.admin.navRooms, hint: t.admin.navRoomsHint },
  ];

  const current = nav.find((item) => item.id === tab) || nav[1];

  if (!ready || !authed) return <div className="admin-desk" />;

  return (
    <div className="admin-desk">
      <header className="admin-desk-top">
        <div className="admin-desk-brand">
          <p>{t.admin.gate}</p>
          <h1>{t.admin.deskTitle}</h1>
        </div>
        <div className="admin-desk-actions">
          <LanguageSwitcher />
          <button
            type="button"
            className="kingdom-cta-ghost px-3 py-2 text-[12px]"
            onClick={() => {
              void fetch("/api/admin/session", { method: "DELETE" });
              clearAdminAuth();
              setAuthed(false);
              router.replace("/");
            }}
          >
            {t.admin.home}
          </button>
          <button
            type="button"
            className="kingdom-cta-ghost px-3 py-2 text-[12px]"
            onClick={() => {
              void fetch("/api/admin/session", { method: "DELETE" });
              logoutAdmin();
              setAuthed(false);
              router.push("/admin-dashboard");
            }}
          >
            {t.admin.logout}
          </button>
        </div>
      </header>

      <nav className="admin-rail" aria-label={t.admin.deskTitle}>
        {nav.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => go(item.id)}
            className={`admin-rail-btn ${tab === item.id ? "is-on" : ""}`}
          >
            <strong>{item.label}</strong>
            <span>{item.hint}</span>
          </button>
        ))}
      </nav>

      <main className="admin-desk-main">
        <section className="admin-pane">
          <p className="admin-pane-kicker">{current.label}</p>
          <h2 className="admin-pane-title">{current.label}</h2>
          <p className="admin-pane-copy">{tab === "map" ? t.admin.deskHint : current.hint}</p>

          {tab === "map" && (
            <div className="admin-map">
              {nav
                .filter((item) => item.id !== "map")
                .map((item) => (
                  <button key={item.id} type="button" className="admin-map-card" onClick={() => go(item.id)}>
                    <b>{item.label}</b>
                    <span>{item.hint}</span>
                  </button>
                ))}
            </div>
          )}

          {tab === "topics" && <TopicsAdminPanel />}

          {tab === "live" && (
            <>
              <AdminRosterPanel
                liveByLevel={{
                  beginner: liveRooms.filter((room) => room.level === "beginner").reduce((n, room) => n + room.count, 0),
                  intermediate: liveRooms
                    .filter((room) => room.level === "intermediate")
                    .reduce((n, room) => n + room.count, 0),
                  advanced: liveRooms.filter((room) => room.level === "advanced").reduce((n, room) => n + room.count, 0),
                }}
              />
              <PresenceOverview liveRooms={liveRooms} />
              <RetentionPulse />
              <div className="mt-4 grid grid-cols-1 gap-2">
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#c4a574]">{t.admin.enterAny}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {levels.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="kingdom-cta px-2 py-2 text-[11px]"
                      onClick={() => {
                        setAdminVisit(id);
                        router.push(lobbyPath(id));
                      }}
                    >
                      {t.levels[id]}
                    </button>
                  ))}
                </div>
              </div>
              <DoorsControl />
              <BonusControl />
            </>
          )}

          {tab === "lessons" && <LessonUnlockControl />}

          {tab === "schedule" && (
            <form onSubmit={onSaveContent} className="mt-4 space-y-3">
              <div className="kingdom-glass p-3">
                <p className="text-[11px] tracking-[0.16em] text-[#c4a574]">{t.admin.days}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {dayKeys.map((day) => (
                    <label key={day} className="flex items-center gap-1 text-[12px] text-[#f3e6c8]">
                      <input
                        type="checkbox"
                        checked={days.includes(day)}
                        onChange={(e) =>
                          setDays((prev) =>
                            e.target.checked ? [...prev, day] : prev.filter((item) => item !== day),
                          )
                        }
                      />
                      {t.days[day]}
                    </label>
                  ))}
                </div>
              </div>
              <label className="kingdom-glass block p-3">
                <span className="text-[11px] tracking-[0.16em] text-[#c4a574]">{t.admin.hours}</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="kingdom-input" />
                  <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="kingdom-input" />
                </div>
              </label>
              {levels.map((id) => (
                <label key={id} className="kingdom-glass block p-3">
                  <span className="text-[11px] tracking-[0.16em] text-[#c4a574]">
                    {t.levels[id]} · {t.admin.topic}
                  </span>
                  <textarea
                    className="kingdom-input mt-2 min-h-20"
                    value={topics[id]}
                    onChange={(e) => setTopics((prev) => ({ ...prev, [id]: e.target.value }))}
                  />
                </label>
              ))}
              <button type="submit" className="kingdom-cta w-full">
                {t.admin.save}
              </button>
              {saved && <p className="text-center text-[12px] text-[#b7f7c8]">{t.admin.saved}</p>}
            </form>
          )}

          {tab === "students" && (
            <ul className="mt-4 max-h-[70dvh] space-y-2 overflow-y-auto pe-1">
              {students.map((row) => (
                <li key={row.id} className="kingdom-glass p-3">
                  <p className="font-display text-[#f3e6c8]">{studentBoardName(row)}</p>
                  <p className="text-[12px] text-[#c4a574]">{row.email}</p>
                  <p className="text-[12px] text-[#c4a574]">
                    {t.levels[row.level]} · {row.accessCode}
                  </p>
                  <form
                    className="mt-3 grid grid-cols-2 gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const data = new FormData(event.currentTarget);
                      onSaveMoney(row.id, Number(data.get("paid") || 0), Number(data.get("due") || 0));
                    }}
                  >
                    <input
                      name="paid"
                      type="number"
                      min="0"
                      defaultValue={row.amountPaid || 0}
                      className="kingdom-input"
                      placeholder={t.admin.paid}
                    />
                    <input
                      name="due"
                      type="number"
                      min="0"
                      defaultValue={row.amountDue || 0}
                      className="kingdom-input"
                      placeholder={t.admin.due}
                    />
                    <button type="submit" className="kingdom-cta col-span-2">
                      {t.admin.save}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {tab === "challenge" && <ChallengeAdminPanel />}
          {tab === "exam" && <ExamAdminPanel />}
          {tab === "codes" && <InvitationCodeGenerator />}
          {tab === "formation" && <FormationAdminPanel />}
          {tab === "rooms" && <GodModePanel rooms={liveRooms} />}
        </section>
      </main>
      <VipBadge />
    </div>
  );
}
