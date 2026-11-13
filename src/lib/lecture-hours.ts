"use client";

import { ADMIN_CODE } from "@/lib/admin";
import { ACADEMY_TZ } from "@/lib/schedule";
import { getSupabase } from "@/lib/supabase";
import type { Level } from "@/i18n/translations";
import { lectureBand } from "@/lib/session";

export type LectureHours = {
  band: "0" | "1";
  start_at: string;
  weekdays: number[];
};

export const DEFAULT_LECTURE_HOURS: LectureHours[] = [
  { band: "0", start_at: "21:30", weekdays: [2, 4, 6] },
  { band: "1", start_at: "20:30", weekdays: [2, 4, 6] },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function lectureWeekdayLabel(weekday: number) {
  return WEEKDAYS[weekday] || String(weekday);
}

export function hoursForLevel(level: Level, rows: LectureHours[]) {
  const band = lectureBand(level);
  return rows.find((row) => row.band === band) || DEFAULT_LECTURE_HOURS.find((row) => row.band === band) || null;
}

function academyNow() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: ACADEMY_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map = Object.fromEntries(fmt.formatToParts(new Date()).map((part) => [part.type, part.value]));
  const weekday =
    map.weekday === "Sun"
      ? 0
      : map.weekday === "Mon"
        ? 1
        : map.weekday === "Tue"
          ? 2
          : map.weekday === "Wed"
            ? 3
            : map.weekday === "Thu"
              ? 4
              : map.weekday === "Fri"
                ? 5
                : 6;
  const minutes = Number(map.hour) * 60 + Number(map.minute);
  const seconds = Number(map.second) || 0;
  return { weekday, minutes, seconds, nowSec: minutes * 60 + seconds };
}

function minutesOf(hhmm: string) {
  const [h, m] = (hhmm || "21:00").slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatRemain(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  if (d > 0) return `${d}d ${h}h ${mm}min ${ss}s`;
  if (h > 0) return `${h}h ${mm}min ${ss}s`;
  return `${mm}min ${ss}s`;
}

export function remainParts(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

export function lectureCountdown(hours: LectureHours | null) {
  if (!hours?.weekdays?.length) {
    return { live: false, remainSec: 0, label: "—" };
  }
  const now = academyNow();
  const startSec = minutesOf(hours.start_at) * 60;
  const days = hours.weekdays;
  if (days.includes(now.weekday) && now.nowSec >= startSec && now.nowSec < startSec + 3600) {
    return { live: true, remainSec: 0, label: "00min 00s" };
  }
  for (let add = 0; add < 8; add++) {
    const wd = (now.weekday + add) % 7;
    if (!days.includes(wd)) continue;
    const remain = add * 86400 + startSec - now.nowSec;
    if (remain <= 0) continue;
    return { live: false, remainSec: remain, label: formatRemain(remain) };
  }
  return { live: false, remainSec: 0, label: "—" };
}

export async function fetchLectureHours(): Promise<LectureHours[]> {
  try {
    const { data, error } = await getSupabase()
      .from("efaa_lecture_hours")
      .select("band, start_at, weekdays")
      .order("band");
    if (error || !data?.length) return DEFAULT_LECTURE_HOURS;
    return (data as LectureHours[]).map((row) => ({
      band: row.band === "1" ? "1" : "0",
      start_at: (row.start_at || "21:00").slice(0, 5),
      weekdays: Array.isArray(row.weekdays) ? row.weekdays.map(Number) : [2, 4, 6],
    }));
  } catch {
    return DEFAULT_LECTURE_HOURS;
  }
}

export async function saveLectureHours(band: "0" | "1", startAt: string, weekdays: number[]) {
  const { data, error } = await getSupabase().rpc("efaa_set_lecture_hours", {
    p_band: band,
    p_start_at: startAt,
    p_weekdays: weekdays,
    p_code: ADMIN_CODE,
  });
  if (error) throw error;
  return data as LectureHours;
}
