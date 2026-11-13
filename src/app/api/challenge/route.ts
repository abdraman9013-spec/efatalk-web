import { NextResponse } from "next/server";
import { rankChallengeBoard } from "@/lib/challenge-logic";
import {
  academyDate,
  challengeDb,
  challengePhase,
  currentChallenge,
} from "@/lib/challenge-server";
import type {
  ChallengeLeader,
  ChallengePublicPayload,
  DailyChallenge,
} from "@/lib/challenge-types";

export const dynamic = "force-dynamic";

function leader(row: Record<string, unknown>): ChallengeLeader {
  return {
    rank: Number(row.rank) || 0,
    userId: String(row.user_id || ""),
    displayName: String(row.display_name || "EfaTalk learner"),
    photo: row.photo ? String(row.photo) : null,
    nationality: row.nationality ? String(row.nationality) : null,
    points: Number(row.points) || 0,
    learningPoints: Number(row.learning_points) || 0,
    scoreAchievedAt: row.score_achieved_at ? String(row.score_achieved_at) : null,
    activeDays: Number(row.active_days) || 0,
    speakingSessions: Number(row.speaking_sessions) || 0,
    validReferrals: Number(row.valid_referrals) || 0,
    currentStreak: Number(row.current_streak) || 0,
  };
}

export async function GET() {
  try {
    const db = challengeDb();
    const challenge = await currentChallenge(db);
    const day = academyDate();
    const [leadersResult, countResult, dailyResult] = await Promise.all([
      db
        .from("efaa_challenge_leaderboard_v")
        .select("*")
        .eq("challenge_id", challenge.id)
        .order("rank")
        .limit(100),
      db
        .from("efaa_challenge_participants")
        .select("id", { count: "exact", head: true })
        .eq("challenge_id", challenge.id)
        .eq("status", "active"),
      db
        .from("efaa_challenge_daily_challenges")
        .select("*")
        .eq("challenge_id", challenge.id)
        .eq("academy_day", day)
        .eq("published", true)
        .maybeSingle(),
    ]);

    if (leadersResult.error) throw leadersResult.error;
    const daily = dailyResult.data
      ? ({
          dayNumber: dailyResult.data.day_number,
          academyDay: dailyResult.data.academy_day,
          titleFr: dailyResult.data.title_fr,
          titleEn: dailyResult.data.title_en,
          titleAr: dailyResult.data.title_ar,
          promptFr: dailyResult.data.prompt_fr,
          promptEn: dailyResult.data.prompt_en,
          promptAr: dailyResult.data.prompt_ar,
          points: dailyResult.data.points,
        } satisfies DailyChallenge)
      : null;

    const liveBoard = rankChallengeBoard(
      (leadersResult.data || []).map((row) => leader(row as Record<string, unknown>)),
    );
    const payload: ChallengePublicPayload = {
      challenge: {
        id: challenge.id,
        name: challenge.name,
        tagline: challenge.tagline,
        timezone: challenge.timezone,
        startsAt: challenge.starts_at,
        endsAt: challenge.ends_at,
        phase: challengePhase(challenge),
        requiredReferrals: challenge.required_referrals,
        dailyPointsCap: challenge.daily_points_cap,
        prizes: challenge.prizes,
        participantCount: countResult.count || 0,
        leaderboardLocked: challenge.leaderboard_locked,
      },
      leaderboard: liveBoard,
      todayBoard: liveBoard.slice(0, 3),
      dailyChallenge: daily,
    };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=5" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Challenge unavailable" },
      { status: 503 },
    );
  }
}
