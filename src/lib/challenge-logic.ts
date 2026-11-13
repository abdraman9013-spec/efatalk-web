import type { ChallengePhase } from "@/lib/challenge-types";

export function resolveChallengePhase(
  challenge: {
    status: string;
    starts_at: string;
    ends_at: string;
    leaderboard_locked: boolean;
  },
  now = Date.now(),
): ChallengePhase {
  if (challenge.status === "draft") return "draft";
  if (challenge.status === "paused") return "paused";
  if (challenge.status === "verification") return "verification";
  if (challenge.status === "final" || challenge.leaderboard_locked) return "final";
  if (now < new Date(challenge.starts_at).getTime()) return "upcoming";
  if (now <= new Date(challenge.ends_at).getTime()) return "active";
  return "verification";
}

export function challengeEligibility(input: {
  account: boolean;
  rules: boolean;
  tiktok: boolean;
  facebook: boolean;
  validReferrals: number;
  requiredReferrals: number;
  fraudClear: boolean;
  participantActive: boolean;
  practiced: boolean;
}) {
  const checks = {
    account: input.account,
    rules: input.rules,
    tiktok: input.tiktok,
    facebook: input.facebook,
    referrals: true,
    practiced: true,
    fraudClear: input.fraudClear,
  };
  return {
    checks,
    eligible: Object.values(checks).every(Boolean) && input.participantActive,
  };
}

export function cappedAward(
  requested: number,
  dailyUsed: number,
  dailyCap: number,
  sourceUsed: number,
  sourceCap: number,
) {
  return Math.max(
    Math.min(
      Math.max(Math.trunc(requested) || 0, 0),
      Math.max(dailyCap - dailyUsed, 0),
      Math.max(sourceCap - sourceUsed, 0),
    ),
    0,
  );
}

export type TieBreakFacts = {
  points: number;
  learningPoints: number;
  activeDays: number;
  speakingSessions: number;
  scoreAchievedAt: string;
};

export function compareChallengeRanks(a: TieBreakFacts, b: TieBreakFacts) {
  return (
    b.points - a.points ||
    b.learningPoints - a.learningPoints ||
    b.activeDays - a.activeDays ||
    b.speakingSessions - a.speakingSessions ||
    new Date(a.scoreAchievedAt).getTime() - new Date(b.scoreAchievedAt).getTime()
  );
}

/** One person per place: 1, 2, 3, 4, 5 — never two 4ths. */
export function assignUniqueChallengeRanks<T extends object>(rows: T[]): Array<T & { rank: number }> {
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

function rankFacts(row: object): TieBreakFacts {
  const item = row as Record<string, unknown>;
  return {
    points: Number(item.points) || 0,
    learningPoints: Number(item.learning_points ?? item.learningPoints) || 0,
    activeDays: Number(item.active_days ?? item.activeDays) || 0,
    speakingSessions: Number(item.speaking_sessions ?? item.speakingSessions) || 0,
    scoreAchievedAt: String(item.score_achieved_at ?? item.scoreAchievedAt ?? "1970-01-01T00:00:00Z"),
  };
}

export function rankChallengeBoard<T extends object>(rows: T[]): Array<T & { rank: number }> {
  const sorted = [...rows].sort((a, b) => compareChallengeRanks(rankFacts(a), rankFacts(b)));
  return assignUniqueChallengeRanks(sorted);
}
