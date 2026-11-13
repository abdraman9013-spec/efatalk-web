import { ADMIN_CODE } from "@/lib/admin";
import { getSupabase } from "@/lib/supabase";
import { saveWebSettings } from "@/lib/efaa-db";
import { ACADEMY_TZ, type DayKey } from "@/lib/schedule";

export type OpenHourRow = {
  weekday: number;
  open_at: string;
  close_at: string;
  enabled: boolean;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const JS_TO_DAY: Record<number, DayKey | null> = {
  0: "sun",
  1: null,
  2: "tue",
  3: null,
  4: "thu",
  5: null,
  6: "sat",
};

export function weekdayLabel(weekday: number) {
  return WEEKDAYS[weekday] || String(weekday);
}

export function clockLabel(hhmm: string) {
  return hhmm.slice(0, 5);
}

function minutesOf(hhmm: string) {
  const raw = hhmm.slice(0, 5);
  const [h, m] = raw.split(":").map(Number);
  return h * 60 + m;
}

export function normalizeHourRow(row: OpenHourRow): OpenHourRow {
  return {
    weekday: Number(row.weekday),
    open_at: `${clockLabel(row.open_at)}:00`,
    close_at: `${clockLabel(row.close_at)}:00`,
    enabled: Boolean(row.enabled),
  };
}

export function nowInAcademy() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: ACADEMY_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
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
  return { weekday, minutes: Number(map.hour) * 60 + Number(map.minute) };
}

export function isOpenNow(rows: OpenHourRow[]) {
  const { weekday, minutes } = nowInAcademy();
  const row = rows.find((item) => Number(item.weekday) === weekday);
  if (!row?.enabled) return false;
  const start = minutesOf(row.open_at);
  let end = minutesOf(row.close_at);
  if (clockLabel(row.close_at) === "00:00") end = 24 * 60;
  if (end > start) return minutes >= start && minutes < end;
  return minutes >= start || minutes < minutesOf(row.close_at);
}

/** Minutes until tonight's salon opens. 0 if live. null if no class today. */
export function minutesUntilOpen(rows: OpenHourRow[], forceOpen = false) {
  if (forceOpen || isOpenNow(rows)) return 0;
  const { weekday, minutes } = nowInAcademy();
  const row = rows.find((item) => Number(item.weekday) === weekday && item.enabled);
  if (!row) return null;
  const start = minutesOf(row.open_at);
  if (minutes >= start) return null;
  return start - minutes;
}

export function nextOpenLabel(rows: OpenHourRow[]) {
  if (!rows.length) return "21:00";
  const order = [...rows].sort((a, b) => Number(a.weekday) - Number(b.weekday));
  const enabled = order.filter((row) => row.enabled);
  if (!enabled.length) return "—";
  const today = nowInAcademy().weekday;
  for (let add = 0; add < 7; add++) {
    const weekday = (today + add) % 7;
    const row = enabled.find((item) => Number(item.weekday) === weekday);
    if (row) return `${weekdayLabel(Number(row.weekday))} ${clockLabel(row.open_at)}`;
  }
  return clockLabel(enabled[0].open_at);
}

export async function fetchOpenHours() {
  const { data, error } = await getSupabase().from("efaa_open_hours").select("*").order("weekday");
  if (error) throw error;
  return ((data || []) as OpenHourRow[]).map(normalizeHourRow);
}

export function hoursFromWebDays(days: DayKey[], start: string, end: string): OpenHourRow[] {
  const want = new Set(days);
  const map: Record<DayKey, number> = { sun: 0, tue: 2, thu: 4, sat: 6 };
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    open_at: start,
    close_at: end,
    enabled: (Object.entries(map) as [DayKey, number][]).some(([key, js]) => js === weekday && want.has(key)),
  }));
}

export async function fetchDoorsOpen() {
  const { data, error } = await getSupabase().from("efaa_doors").select("force_open").eq("id", 1).maybeSingle();
  if (error) throw error;
  return Boolean(data?.force_open);
}

export async function setDoorsOpen(open: boolean) {
  const { data, error } = await getSupabase().rpc("efaa_set_doors", { p_open: open, p_code: ADMIN_CODE });
  if (error) throw error;
  return Boolean(data);
}

export async function saveOpenHours(rows: OpenHourRow[]) {
  const next = rows.map(normalizeHourRow);
  const { error } = await getSupabase().from("efaa_open_hours").upsert(next, { onConflict: "weekday" });
  if (error) throw error;
  const days = next
    .filter((row) => row.enabled)
    .map((row) => JS_TO_DAY[row.weekday])
    .filter((day): day is DayKey => Boolean(day));
  const first = next.find((row) => row.enabled) || next[0];
  try {
    await saveWebSettings({
      session_days: days.length ? days : ["tue"],
      session_start: clockLabel(first?.open_at || "21:00"),
      session_end: clockLabel(first?.close_at || "22:00"),
    });
  } catch {
    /* landing still reads efaa_open_hours */
  }
}
