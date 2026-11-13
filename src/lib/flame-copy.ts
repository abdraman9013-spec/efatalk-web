import type { Dictionary } from "@/i18n/translations";

export function firstNameOf(display: string | undefined, fallback = "") {
  const raw = (display || "").trim();
  if (!raw) return fallback;
  return raw.split(/\s+/)[0] || fallback;
}

export type PushKind = "match60" | "match30" | "match10" | "doors_open";

/** Which server blast window we are in. null = outside alert windows. */
export function pushKindFromMinutes(minutes: number | null): PushKind | null {
  if (minutes === null) return null;
  if (minutes === 0) return "doors_open";
  if (minutes > 0 && minutes <= 12) return "match10";
  if (minutes > 12 && minutes <= 35) return "match30";
  if (minutes > 35 && minutes <= 65) return "match60";
  return null;
}

export function flameBody(
  t: Dictionary,
  opts: {
    name: string;
    streak: number;
    minutes: number | null;
    missed: number;
    graceLeft: number;
    playedToday: boolean;
    kind?: PushKind | null;
  },
) {
  const name = opts.name || t.lobby.you;
  const n = String(Math.max(opts.streak, 0));
  const kind = opts.kind ?? pushKindFromMinutes(opts.minutes);

  if (!opts.playedToday && kind) {
    if (opts.streak > 0) {
      if (kind === "match60") return t.flame.t60.replaceAll("{name}", name).replaceAll("{n}", n);
      if (kind === "match30") return t.flame.t30.replaceAll("{name}", name).replaceAll("{n}", n);
      if (kind === "match10") return t.flame.t10.replaceAll("{name}", name).replaceAll("{n}", n);
      return t.flame.open.replaceAll("{name}", name).replaceAll("{n}", n);
    }
    if (kind === "match60") return t.flame.soft60.replaceAll("{name}", name);
    if (kind === "match30") return t.flame.soft30.replaceAll("{name}", name);
    if (kind === "match10") return t.flame.soft10.replaceAll("{name}", name);
    return t.flame.softOpen.replaceAll("{name}", name);
  }

  if (opts.streak > 0 && opts.missed > 0) {
    if (opts.graceLeft <= 1) {
      return t.flame.last.replaceAll("{name}", name).replaceAll("{n}", n);
    }
    return t.flame.grace
      .replaceAll("{name}", name)
      .replaceAll("{n}", n)
      .replaceAll("{d}", String(opts.graceLeft));
  }
  return "";
}

export function waitingBody(t: Dictionary, opts: { name: string; count: number; levelLabel: string }) {
  const name = opts.name || t.lobby.you;
  const count = Math.max(opts.count, 1);
  return t.flame.waiting
    .replaceAll("{name}", name)
    .replaceAll("{n}", String(count))
    .replaceAll("{level}", opts.levelLabel);
}
