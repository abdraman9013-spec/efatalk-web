import { NextRequest, NextResponse } from "next/server";
import {
  academyDate,
  challengeDb,
  challengeIdentity,
  currentChallenge,
  displayName,
} from "@/lib/challenge-server";
import { awardInviteeReferrals } from "@/lib/challenge-invitee";
import { challengeEligibility, rankChallengeBoard } from "@/lib/challenge-logic";
import type { ChallengeMe, ChallengeReferral } from "@/lib/challenge-types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const identity = await challengeIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: "verified-account-required" }, { status: 401 });
    }
    const header = request.headers.get("authorization") || "";
    const accessToken = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    await awardInviteeReferrals(accessToken);
    const db = challengeDb();
    const challenge = await currentChallenge(db);
    const { data: participant, error } = await db
      .from("efaa_challenge_participants")
      .select("*")
      .eq("challenge_id", challenge.id)
      .eq("auth_user_id", identity.authUser.id)
      .maybeSingle();
    if (error) throw error;

    const { data: game } = await db
      .from("efaa_user_gamification")
      .select("total_points,diamonds_count,current_streak,last_formation_at,learned_phrases,matchs_tonight_count,last_activity_date")
      .eq("user_id", identity.student.id)
      .maybeSingle();
    const lifetimePoints =
      (Number(game?.diamonds_count) || 0) * 10000 + (Number(game?.total_points) || 0);
    const dayStamp = academyDate();
    const matchesToday =
      String(game?.last_activity_date || "").slice(0, 10) === dayStamp
        ? Number(game?.matchs_tonight_count) || 0
        : 0;
    const level = identity.student.level || "beginner";
    const practicedOnce =
      Boolean(game?.last_formation_at) ||
      (Array.isArray(game?.learned_phrases) && game.learned_phrases.length >= 1);

    if (!participant) {
      const payload: ChallengeMe = {
        joined: false,
        userId: identity.student.id,
        displayName: displayName(identity.student),
        challengePoints: 0,
        lifetimePoints,
        rank: null,
        highestRank: null,
        pointsToday: 0,
        dailyPointsCap: challenge.daily_points_cap,
        activeDays: 0,
        speakingSessions: 0,
        cardCorrectsToday: 0,
        matchesToday,
        level,
        currentStreak: Number(game?.current_streak) || 0,
        validReferrals: 0,
        requiredReferrals: challenge.required_referrals,
        tiktokDeclared: false,
        facebookDeclared: false,
        rulesAccepted: false,
        eligible: false,
        eligibility: {
          account: true,
          rules: false,
          tiktok: false,
          facebook: false,
          referrals: false,
          practiced: practicedOnce,
          fraudClear: true,
        },
        gapToNext: 0,
        gapToTop10: 0,
        daysLeft: Math.max(
          0,
          Math.ceil(
            (new Date(challenge.ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          ),
        ),
        referrals: [],
      };
      return NextResponse.json(payload);
    }

    const day = dayStamp;
    const [boardResult, statsResult, referralsResult, flagsResult] = await Promise.all([
      db
        .from("efaa_challenge_leaderboard_v")
        .select("*")
        .eq("challenge_id", challenge.id)
        .order("rank")
        .limit(1000),
      db
        .from("efaa_challenge_daily_stats")
        .select("*")
        .eq("challenge_id", challenge.id)
        .eq("participant_id", participant.id),
      db
        .from("efaa_challenge_referrals")
        .select("id,invited_user_id,status")
        .eq("challenge_id", challenge.id)
        .eq("inviter_participant_id", participant.id)
        .order("created_at"),
      db
        .from("efaa_challenge_fraud_flags")
        .select("id", { count: "exact", head: true })
        .eq("challenge_id", challenge.id)
        .eq("participant_id", participant.id)
        .in("severity", ["high", "critical"])
        .in("status", ["open", "reviewing", "confirmed"]),
    ]);
    const board = rankChallengeBoard(boardResult.error ? [] : boardResult.data || []);
    const mine = board.find((row) => row.participant_id === participant.id);
    const rank = mine ? Number(mine.rank) : null;
    const points = Number(mine?.points) || 0;
    const next = rank && rank > 1 ? board.find((row) => Number(row.rank) === rank - 1) : null;
    const top10 = board.find((row) => Number(row.rank) === 10);
    const today = (statsResult.data || []).find((row) => row.academy_day === day);

    const invitedIds = (referralsResult.data || [])
      .map((row) => row.invited_user_id)
      .filter((id): id is string => Boolean(id));
    const names = new Map<string, string>();
    if (invitedIds.length) {
      const { data } = await db
        .from("efaa_user_gamification")
        .select("user_id,display_name")
        .in("user_id", invitedIds);
      (data || []).forEach((row) => names.set(row.user_id, row.display_name));
    }

    const referrals: ChallengeReferral[] = (referralsResult.data || []).map((row) => ({
      id: row.id,
      name: (row.invited_user_id && names.get(row.invited_user_id)) || "Ami invité",
      status: row.status,
      points: row.status === "valid" ? challenge.referral_points : 0,
    }));
    const validReferrals = referrals.filter((referral) => referral.status === "valid").length;
    const fraudClear = (flagsResult.count || 0) === 0;
    const rulesAccepted = Boolean(participant.rules_accepted_at);
    const eligibilityResult = challengeEligibility({
      account: true,
      rules: rulesAccepted,
      tiktok: Boolean(participant.tiktok_declared),
      facebook: Boolean(participant.facebook_declared),
      validReferrals,
      requiredReferrals: challenge.required_referrals,
      fraudClear,
      participantActive: participant.status === "active",
      practiced: practicedOnce || Number(mine?.speaking_sessions) > 0,
    });
    const eligibility = eligibilityResult.checks;
    const eligible = eligibilityResult.eligible;

    const bestRank =
      rank && (!participant.highest_rank || rank < participant.highest_rank)
        ? rank
        : participant.highest_rank;
    if (bestRank !== participant.highest_rank) {
      void db
        .from("efaa_challenge_participants")
        .update({ highest_rank: bestRank, updated_at: new Date().toISOString() })
        .eq("id", participant.id);
    }

    const payload: ChallengeMe = {
      joined: true,
      participantId: participant.id,
      userId: identity.student.id,
      displayName: displayName(identity.student),
      referralToken: participant.referral_token,
      referralUrl: `https://www.efatalk.fyi/challenge?ref=${encodeURIComponent(participant.referral_token)}`,
      challengePoints: points,
      lifetimePoints,
      rank,
      highestRank: bestRank || null,
      pointsToday: Number(today?.learning_points || 0) + Number(today?.referral_points || 0),
      dailyPointsCap: challenge.daily_points_cap,
      activeDays: Number(mine?.active_days) || 0,
      speakingSessions: Number(mine?.speaking_sessions) || 0,
      cardCorrectsToday: Number(today?.card_corrects) || 0,
      matchesToday,
      level,
      currentStreak: Number(game?.current_streak) || 0,
      validReferrals,
      requiredReferrals: challenge.required_referrals,
      tiktokDeclared: Boolean(participant.tiktok_declared),
      facebookDeclared: Boolean(participant.facebook_declared),
      rulesAccepted,
      eligible,
      eligibility,
      gapToNext: next ? Math.max(Number(next.points) - points, 0) : 0,
      gapToTop10:
        rank && rank > 10 && top10 ? Math.max(Number(top10.points) - points, 0) : 0,
      daysLeft: Math.max(
        0,
        Math.ceil(
          (new Date(challenge.ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
        ),
      ),
      referrals,
    };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "challenge-profile-failed" },
      { status: 500 },
    );
  }
}
