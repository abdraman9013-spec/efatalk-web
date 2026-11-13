import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { translations } from "@/i18n/translations";
import { firstNameOf, flameBody, pushKindFromMinutes, type PushKind } from "@/lib/flame-copy";
import { fetchDoorsOpen, fetchOpenHours, minutesUntilOpen } from "@/lib/open-hours";
import { sendPush, vapidReady } from "@/lib/web-push";

type SubRow = {
  endpoint: string;
  user_id: string;
  p256dh: string;
  auth: string;
  locale: string;
  level?: string;
};

type GameRow = {
  user_id: string;
  current_streak: number;
  last_activity_date: string | null;
  display_name: string;
  matchs_tonight_count?: number;
  total_points?: number;
};

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function dict(locale: string) {
  if (locale === "ar") return translations.ar;
  if (locale === "en") return translations.en;
  return translations.fr;
}

function todayStamp() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Ndjamena" }).format(new Date());
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return true;
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const query = new URL(request.url).searchParams.get("secret") || "";
  // Browser heartbeats send no secret; cron may send the secret.
  if (!bearer && !query) return true;
  return bearer === secret || query === secret;
}

function lobbyUrl(level?: string) {
  if (level === "intermediate" || level === "advanced") return `/lobby/${level}`;
  return "/lobby/beginner";
}

async function runTick(request: Request) {
  if (!vapidReady()) return NextResponse.json({ ok: false, reason: "vapid" }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ ok: false, reason: "auth" }, { status: 401 });

  const db = admin();
  if (!db) return NextResponse.json({ ok: false, reason: "db" }, { status: 503 });

  const [hours, forceOpen] = await Promise.all([fetchOpenHours(), fetchDoorsOpen()]);
  const minutes = minutesUntilOpen(hours, forceOpen);
  const kind = pushKindFromMinutes(minutes);
  if (!kind) return NextResponse.json({ ok: true, sent: 0, window: false, minutes });

  const { data: claimed } = await db.rpc("efaa_claim_push", { p_kind: kind, p_user_id: "" });
  if (!claimed) return NextResponse.json({ ok: true, sent: 0, dup: true, kind, minutes });

  const { data: subs } = await db.from("efaa_push_subs").select("endpoint,user_id,p256dh,auth,locale,level");
  const { data: games } = await db
    .from("efaa_user_gamification")
    .select("user_id,current_streak,last_activity_date,display_name,matchs_tonight_count,total_points");
  const { data: chalRows } = await db
    .from("efaa_challenge_leaderboard_v")
    .select("user_id,points")
    .eq("challenge_id", "english-2026");
  const chalPts = new Map(
    ((chalRows || []) as { user_id: string; points: number | null }[]).map((row) => [
      row.user_id,
      Number(row.points) || 0,
    ]),
  );
  const gameById = new Map(((games || []) as GameRow[]).map((row) => [row.user_id, row]));
  const today = todayStamp();
  const challengeEnds = new Date("2026-10-29T23:59:59+01:00");
  const daysLeft = Math.max(0, Math.ceil((challengeEnds.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  const finalStretch = daysLeft > 0 && daysLeft <= 5;
  let sent = 0;

  for (const sub of (subs || []) as SubRow[]) {
    const game = gameById.get(sub.user_id);
    const playedToday = (game?.last_activity_date || "").slice(0, 10) === today;
    const matches = playedToday ? Number(game?.matchs_tonight_count) || 0 : 0;
    if (playedToday && matches >= 15) continue;
    const streak = game?.current_streak || 0;
    const name = firstNameOf(game?.display_name);
    const challengePoints = chalPts.get(sub.user_id) ?? (Number(game?.total_points) || 0);
    const lowStack = challengePoints < 4000;
    const t = dict(sub.locale);
    const body = flameBody(t, {
      name,
      streak,
      minutes,
      missed: 0,
      graceLeft: 3,
      playedToday: false,
      kind: kind as PushKind,
    });
    if (!playedToday && !body && !name) continue;
    const lowEnergy = !playedToday || matches < 5 || lowStack;
    let pushBody: string;
    if (finalStretch && lowEnergy) {
      if (!playedToday) {
        pushBody = lowStack
          ? `${name || "Champion"}, ${challengePoints} pts — plus que ${daysLeft}j. Un soir = 360 pts. Ouvre le lobby MAINTENANT.`
          : `${name || "Champion"}, plus que ${daysLeft} jour${daysLeft > 1 ? "s" : ""}. Tu n’as pas encore matché. Un soir = jusqu’à 360 pts. Ouvre le lobby maintenant.`;
      } else {
        pushBody = lowStack
          ? `${name || "Champion"}, ${challengePoints} pts · ${matches}/15. Encore ${Math.max(0, 15 - matches)} matchs ce soir. 20 pts / match — remonte.`
          : `${name || "Champion"}, plus que ${daysLeft} jour${daysLeft > 1 ? "s" : ""}. ${matches}/15 matchs — encore ${Math.max(0, 15 - matches)} pour grimper. 20 pts / match.`;
      }
    } else if (playedToday) {
      pushBody = `${name}, ${matches}/15 matchs. Encore ${Math.max(0, (matches < 5 ? 5 : 10) - matches)} pour +30 flamme. Un match = 20 pts. Plafond 700.`;
    } else {
      pushBody = `${name || "Champion"}, tu n’as pas matché aujourd’hui. 20 pts par match, max 15. Plafond 700, diamant 10 500.`;
    }
    try {
      await sendPush(sub, {
        title:
          kind === "doors_open"
            ? finalStretch
              ? `EFA Talk — ${daysLeft}j restants`
              : "EFA Talk — OPEN"
            : finalStretch
              ? "EFA Talk — Sprint final"
              : "EFA Talk",
        body: pushBody,
        url: lobbyUrl(sub.level),
      });
      sent += 1;
    } catch {
      await db.from("efaa_push_subs").delete().eq("endpoint", sub.endpoint);
    }
  }

  return NextResponse.json({ ok: true, sent, kind, minutes });
}

export async function POST(request: Request) {
  return runTick(request);
}

export async function GET(request: Request) {
  return runTick(request);
}
