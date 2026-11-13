export const ACADEMY_TZ = "Africa/Ndjamena";
export const SESSION_START = "21:00";
export const SESSION_END = "22:00";

export const dayKeys = ["tue", "thu", "sat", "sun"] as const;
export type DayKey = (typeof dayKeys)[number];

const jsDayToKey: Record<number, DayKey | null> = {
  0: "sun",
  1: null,
  2: "tue",
  3: null,
  4: "thu",
  5: null,
  6: "sat",
};

export type LiveState =
  | { kind: "live"; day: DayKey }
  | { kind: "upcoming"; day: DayKey; label: string }
  | { kind: "closed" };

function partsInTz(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: ACADEMY_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const weekday = map.weekday;
  const jsDay =
    weekday === "Sun"
      ? 0
      : weekday === "Mon"
        ? 1
        : weekday === "Tue"
          ? 2
          : weekday === "Wed"
            ? 3
            : weekday === "Thu"
              ? 4
              : weekday === "Fri"
                ? 5
                : 6;
  return {
    jsDay,
    minutes: Number(map.hour) * 60 + Number(map.minute),
  };
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const allDayOrder: Array<{ js: number; day: DayKey }> = [
  { js: 2, day: "tue" },
  { js: 4, day: "thu" },
  { js: 6, day: "sat" },
  { js: 0, day: "sun" },
];

export function getLiveState(
  now = new Date(),
  settings?: { days?: DayKey[]; start?: string; end?: string },
): LiveState {
  const { jsDay, minutes } = partsInTz(now);
  const allowed = new Set(settings?.days?.length ? settings.days : dayKeys);
  const startLabel = settings?.start || SESSION_START;
  const endLabel = settings?.end || SESSION_END;
  const start = toMinutes(startLabel);
  const end = toMinutes(endLabel);
  const today = jsDayToKey[jsDay];

  if (today && allowed.has(today)) {
    if (minutes >= start && minutes < end) {
      return { kind: "live", day: today };
    }
    if (minutes < start) {
      return { kind: "upcoming", day: today, label: startLabel };
    }
  }

  const order = allDayOrder.filter((d) => allowed.has(d.day));
  for (let add = 1; add <= 7; add++) {
    const nextJs = (jsDay + add) % 7;
    const found = order.find((d) => d.js === nextJs);
    if (found) {
      return { kind: "upcoming", day: found.day, label: startLabel };
    }
  }
  return { kind: "closed" };
}
