import { buildDailySession } from "@/lib/beginner-curriculum";
import { ensureIntermediateProgress, intermediateFormationDoneToday } from "@/lib/intermediate-progress";
import { getSupabase } from "@/lib/supabase";
import { lobbyPath, roomPath, studentBoardName, type EfaaStudent } from "@/lib/session";

export type GamificationRow = {
  user_id: string;
  total_points: number;
  diamonds_count: number;
  current_streak: number;
  last_activity_date: string | null;
  matchs_tonight_count: number;
  learned_phrases: string[];
  last_formation_at: string | null;
  age: number | null;
  favorite_color: string | null;
  display_name: string;
  nationality: string;
  photo?: string | null;
  missed_days?: number;
  streak_grace?: number;
  grace_left?: number;
};

export type LeaderPerson = {
  user_id: string;
  display_name: string;
  nationality: string;
  current_streak: number;
  diamonds_count: number;
  total_points: number;
  photo?: string | null;
};

export type LeaderboardPayload = {
  top: LeaderPerson[];
  me: GamificationRow | null;
  rank: number | null;
  rival: LeaderPerson | null;
  gap: number;
};

export function pointsTier(points: number) {
  if (points >= 10000) return { badge: "💎", label: "Diamond" };
  if (points >= 5000) return { badge: "🥇", label: "Gold" };
  if (points >= 2000) return { badge: "🥈", label: "Silver" };
  if (points >= 500) return { badge: "🥉", label: "Bronze" };
  return { badge: "", label: "" };
}

export function flagEmoji(code?: string) {
  if (!code || code.length !== 2) return "🌍";
  return code
    .toUpperCase()
    .split("")
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function formationDoneToday(row: GamificationRow | null) {
  if (!row?.last_formation_at) return false;
  return row.last_formation_at.slice(0, 10) === todayStamp();
}

export async function syncBrokenStreak(userId: string) {
  const { data } = await getSupabase().rpc("efaa_sync_broken_streak", { p_user_id: userId });
  return data as GamificationRow | null;
}

export async function ensureGamification(student: EfaaStudent): Promise<GamificationRow> {
  const supabase = getSupabase();
  const display = studentBoardName(student);
  const { data: existing } = await supabase
    .from("efaa_user_gamification")
    .select("*")
    .eq("user_id", student.id)
    .maybeSingle();

  if (existing) {
    const row = existing as GamificationRow;
    if (row.display_name !== display || row.nationality !== student.nationality) {
      await supabase
        .from("efaa_user_gamification")
        .update({ display_name: display, nationality: student.nationality, updated_at: new Date().toISOString() })
        .eq("user_id", student.id);
      return { ...row, display_name: display, nationality: student.nationality };
    }
    return row;
  }

  const fresh = {
    user_id: student.id,
    display_name: display,
    nationality: student.nationality || "",
  };
  const { data, error } = await supabase.from("efaa_user_gamification").insert(fresh).select("*").single();
  if (error) throw error;
  return data as GamificationRow;
}

export async function completeFormation(
  student: EfaaStudent,
  phraseIds: string[],
  age: number | null,
  color: string | null,
) {
  const { data, error } = await getSupabase().rpc("efaa_complete_formation", {
    p_user_id: student.id,
    p_phrase_ids: phraseIds,
    p_age: age,
    p_color: color,
    p_display_name: studentBoardName(student),
    p_nationality: student.nationality,
  });
  if (error) throw error;
  return data as GamificationRow;
}

export async function awardReactionPoints(speakerId: string, senderId: string) {
  if (!speakerId || speakerId === senderId) return { points_gained: 0, total_points: 0, diamonds_count: 0 };
  const { data, error } = await getSupabase().rpc("efaa_award_reaction_points", {
    p_speaker_id: speakerId,
    p_sender_id: senderId,
  });
  if (error) throw error;
  return data as { total_points: number; diamonds_count: number; points_gained: number };
}

export const MATCH_PRACTICE_MIN_SEC = 20;

/** Speech analyser seconds, or time actually in the match after a partner joined. */
export function matchPracticeSeconds(speechMs: number, startedAtMs: number) {
  const speech = Math.round(Math.max(0, speechMs) / 1000);
  const elapsed = startedAtMs > 0 ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)) : 0;
  return Math.min(1800, Math.max(speech, elapsed));
}

export type MatchAwardPayload = {
  total_points: number;
  diamonds_count: number;
  current_streak: number;
  matchs_tonight_count: number;
  points_gained: number;
  diamonds_gained: number;
};

async function awardMatchViaApi(userId: string, seconds: number) {
  const res = await fetch("/api/match/award", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, speechSeconds: seconds }),
    keepalive: true,
  });
  if (!res.ok) throw new Error(`award-api-${res.status}`);
  return (await res.json()) as MatchAwardPayload;
}

/** Fire-and-forget award that survives tab close / hangup. */
export function awardMatchPointsKeepalive(userId: string, speechSeconds: number) {
  if (!userId || userId === "efaa-admin") return;
  const seconds = Math.min(1800, Math.max(0, Math.floor(speechSeconds)));
  if (seconds < MATCH_PRACTICE_MIN_SEC) return;
  const body = JSON.stringify({ userId, speechSeconds: seconds });
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/match/award", blob)) return;
    }
  } catch {
    /* fall through */
  }
  void fetch("/api/match/award", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export async function awardMatchPoints(userId: string, speechSeconds: number) {
  const seconds = Math.min(1800, Math.max(0, Math.floor(speechSeconds)));
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { data, error } = await getSupabase().rpc("efaa_award_match_points", {
        p_user_id: userId,
        p_speech_seconds: seconds,
      });
      if (!error && data) return data as MatchAwardPayload;
      lastError = error;
    } catch (error) {
      lastError = error;
    }
    try {
      return await awardMatchViaApi(userId, seconds);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
  }
  awardMatchPointsKeepalive(userId, seconds);
  throw lastError || new Error("award-match-failed");
}

const HIDDEN_BOARD_IDS = new Set(["efaa-admin"]);

function visibleOnBoard(person: { user_id?: string } | null | undefined) {
  return Boolean(person?.user_id) && !HIDDEN_BOARD_IDS.has(person!.user_id!);
}

export async function fetchLeaderboard(userId: string, level?: "beginner" | "intermediate" | "advanced") {
  const { data, error } = level
    ? await getSupabase().rpc("efaa_leaderboard_for_level", { p_user_id: userId, p_level: level })
    : await getSupabase().rpc("efaa_leaderboard_for", { p_user_id: userId });
  if (error) throw error;
  const payload = data as LeaderboardPayload;
  const top = (payload.top || [])
    .filter((person) => visibleOnBoard(person) && Boolean(person.display_name?.trim()))
    .slice(0, 15);
  return {
    ...payload,
    top,
    rival: visibleOnBoard(payload.rival) ? payload.rival : null,
  };
}

export async function beginnerNextPath(student: EfaaStudent) {
  if (student.level === "intermediate") {
    try {
      const row = await ensureIntermediateProgress(student.id);
      if (intermediateFormationDoneToday(row)) return lobbyPath("intermediate");
      return "/mid";
    } catch {
      return "/mid";
    }
  }
  if (student.level === "advanced") return lobbyPath("advanced");
  if (student.level !== "beginner") return roomPath(student.level);
  try {
    const row = await ensureGamification(student);
    if (formationDoneToday(row)) return lobbyPath("beginner");
    if (!buildDailySession(row.learned_phrases || []).cards.length) return lobbyPath("beginner");
    return "/welcome";
  } catch {
    return "/welcome";
  }
}
