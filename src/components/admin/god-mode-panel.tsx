"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { setAdminVisit } from "@/lib/admin";
import { fetchOpenHours, saveOpenHours, weekdayLabel, type OpenHourRow } from "@/lib/open-hours";
import {
  fetchLectureHours,
  lectureWeekdayLabel,
  saveLectureHours,
  type LectureHours,
} from "@/lib/lecture-hours";
import { livePath, lobbyPath, lecturePath } from "@/lib/session";
import type { LiveRoomCard } from "@/lib/use-live-index";

const emptyWeek = (): OpenHourRow[] =>
  Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    open_at: "21:00",
    close_at: "22:00",
    enabled: weekday === 0 || weekday === 2 || weekday === 4 || weekday === 6,
  }));

export function GodModePanel({ rooms }: { rooms: LiveRoomCard[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [rows, setRows] = useState<OpenHourRow[]>(emptyWeek());
  const [clocks, setClocks] = useState<LectureHours[]>([
    { band: "0", start_at: "21:30", weekdays: [2, 4, 6] },
    { band: "1", start_at: "20:30", weekdays: [2, 4, 6] },
  ]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOpenHours()
      .then((next) => {
        if (next.length) setRows(next);
      })
      .catch(() => undefined);
    fetchLectureHours()
      .then((next) => {
        if (next.length) setClocks(next);
      })
      .catch(() => undefined);
  }, []);

  async function onSave() {
    setError("");
    try {
      await saveOpenHours(rows);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } catch {
      setError(t.admin.invalid);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <section className="kingdom-glass p-3">
        <p className="text-[11px] tracking-[0.16em] text-[#c4a574]">{t.admin.rooms}</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            className="kingdom-cta px-2 py-2 text-[11px]"
            onClick={() => {
              setAdminVisit("beginner");
              router.push(lecturePath("beginner") + "?mode=mod");
            }}
          >
            Level 0
          </button>
          <button
            type="button"
            className="kingdom-cta px-2 py-2 text-[11px]"
            onClick={() => {
              setAdminVisit("intermediate");
              router.push(lecturePath("intermediate") + "?mode=mod");
            }}
          >
            Level 1
          </button>
          <button
            type="button"
            className="kingdom-cta-ghost px-2 py-2 text-[11px]"
            onClick={() => {
              setAdminVisit("intermediate");
              router.push(lobbyPath("intermediate"));
            }}
          >
            {t.levels.intermediate}
          </button>
          <button
            type="button"
            className="kingdom-cta-ghost px-2 py-2 text-[11px]"
            onClick={() => {
              setAdminVisit("advanced");
              router.push(lobbyPath("advanced"));
            }}
          >
            {t.levels.advanced}
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {(["0", "1"] as const).map((band) => {
            const clock = clocks.find((row) => row.band === band) || {
              band,
              start_at: band === "1" ? "20:30" : "21:30",
              weekdays: [2, 4, 6],
            };
            return (
              <div key={band} className="rounded-2xl border border-[#c4a574]/25 p-2.5">
                <p className="text-[11px] text-[#c4a574]">
                  Level {band} · {t.admin.lectureStart}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="time"
                    value={clock.start_at}
                    onChange={(event) =>
                      setClocks((prev) =>
                        prev.map((row) => (row.band === band ? { ...row, start_at: event.target.value } : row)),
                      )
                    }
                    className="kingdom-input"
                  />
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                    const on = clock.weekdays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        className={`rounded-full px-2 py-1 text-[10px] ${on ? "kingdom-cta" : "kingdom-cta-ghost"}`}
                        onClick={() =>
                          setClocks((prev) =>
                            prev.map((row) =>
                              row.band === band
                                ? {
                                    ...row,
                                    weekdays: on
                                      ? row.weekdays.filter((item) => item !== day)
                                      : [...row.weekdays, day].sort((a, b) => a - b),
                                  }
                                : row,
                            ),
                          )
                        }
                      >
                        {lectureWeekdayLabel(day)}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="kingdom-cta px-3 py-1.5 text-[11px]"
                    onClick={() => {
                      void saveLectureHours(band, clock.start_at, clock.weekdays)
                        .then(() => {
                          setSaved(true);
                          window.setTimeout(() => setSaved(false), 1600);
                        })
                        .catch(() => setError(t.admin.invalid));
                    }}
                  >
                    {t.admin.save}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {rooms.length === 0 ? <p className="mt-3 text-[12px] text-[#c4a574]">{t.admin.emptyRooms}</p> : null}
        <ul className="mt-3 space-y-2">
          {rooms.map((room) => (
            <li key={room.roomId} className="rounded-2xl border border-[#c4a574]/30 p-3">
              <p className="font-display text-[#f3e6c8]">
                {t.levels[room.level]} · {room.count}
              </p>
              <p className="text-[12px] text-[#c4a574]">{room.names.join(" · ")}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="kingdom-cta-ghost px-2 py-2 text-[11px]"
                  onClick={() => {
                    setAdminVisit(room.level);
                    router.push(`${livePath(room.level, room.roomId)}?mode=ghost`);
                  }}
                >
                  {t.admin.silent}
                </button>
                <button
                  type="button"
                  className="kingdom-cta px-2 py-2 text-[11px]"
                  onClick={() => {
                    setAdminVisit(room.level);
                    router.push(`${livePath(room.level, room.roomId)}?mode=mod`);
                  }}
                >
                  {t.admin.moderator}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="kingdom-glass p-3">
        <p className="text-[11px] tracking-[0.16em] text-[#c4a574]">{t.admin.schedule}</p>
        <p className="mt-1 text-[12px] text-[#e8d5b0]/75">{t.admin.doorsScheduleNote}</p>
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.weekday} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
              <label className="flex items-center gap-2 text-[12px] text-[#f3e6c8]">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(event) =>
                    setRows((prev) =>
                      prev.map((item) =>
                        Number(item.weekday) === Number(row.weekday) ? { ...item, enabled: event.target.checked } : item,
                      ),
                    )
                  }
                />
                {weekdayLabel(Number(row.weekday))}
              </label>
              <input
                type="time"
                value={row.open_at.slice(0, 5)}
                onChange={(event) =>
                  setRows((prev) =>
                    prev.map((item) =>
                      Number(item.weekday) === Number(row.weekday) ? { ...item, open_at: event.target.value } : item,
                    ),
                  )
                }
                className="kingdom-input"
              />
              <input
                type="time"
                value={row.close_at.slice(0, 5)}
                onChange={(event) =>
                  setRows((prev) =>
                    prev.map((item) =>
                      Number(item.weekday) === Number(row.weekday) ? { ...item, close_at: event.target.value } : item,
                    ),
                  )
                }
                className="kingdom-input"
              />
              <span className="text-[10px] text-[#c4a574]">{row.enabled ? t.admin.openDay : t.live.hoursClosed}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="kingdom-cta mt-3 w-full" onClick={() => void onSave()}>
          {t.admin.save}
        </button>
        {saved ? <p className="mt-2 text-center text-[12px] text-[#b7f7c8]">{t.admin.saved}</p> : null}
        {error ? <p className="mt-2 text-center text-[12px] text-[#e2b07a]">{error}</p> : null}
      </section>
    </div>
  );
}
