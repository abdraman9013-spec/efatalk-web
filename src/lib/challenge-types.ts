export const CHALLENGE_ID = "english-2026";
export const CHALLENGE_REF_KEY = "efaa_challenge_referral";
export const CHALLENGE_NEXT_KEY = "efaa_auth_next";

export type ChallengePhase =
  | "draft"
  | "upcoming"
  | "active"
  | "paused"
  | "verification"
  | "final";

export type ChallengeSummary = {
  id: string;
  name: string;
  tagline: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  phase: ChallengePhase;
  requiredReferrals: number;
  dailyPointsCap: number;
  prizes: {
    first: number;
    second: number;
    third: number;
    currency: string;
  };
  participantCount: number;
  leaderboardLocked: boolean;
};

export type ChallengeLeader = {
  rank: number;
  userId: string;
  displayName: string;
  photo?: string | null;
  nationality?: string | null;
  points: number;
  learningPoints: number;
  activeDays: number;
  speakingSessions: number;
  validReferrals: number;
  currentStreak: number;
  scoreAchievedAt?: string | null;
};

export type ChallengeReferral = {
  id: string;
  name: string;
  status: "clicked" | "registered" | "activated" | "valid" | "held" | "invalid";
  points: number;
};

export type ChallengeMe = {
  joined: boolean;
  participantId?: string;
  userId?: string;
  displayName?: string;
  referralToken?: string;
  referralUrl?: string;
  challengePoints: number;
  lifetimePoints: number;
  rank: number | null;
  highestRank: number | null;
  pointsToday: number;
  dailyPointsCap: number;
  activeDays: number;
  speakingSessions: number;
  cardCorrectsToday: number;
  matchesToday: number;
  level: string;
  currentStreak: number;
  validReferrals: number;
  requiredReferrals: number;
  tiktokDeclared: boolean;
  facebookDeclared: boolean;
  rulesAccepted: boolean;
  eligible: boolean;
  eligibility: {
    account: boolean;
    rules: boolean;
    tiktok: boolean;
    facebook: boolean;
    referrals: boolean;
    practiced: boolean;
    fraudClear: boolean;
  };
  gapToNext: number;
  gapToTop10: number;
  daysLeft: number;
  referrals: ChallengeReferral[];
};

export type DailyChallenge = {
  dayNumber: number;
  academyDay: string;
  titleFr: string;
  titleEn: string;
  titleAr: string;
  promptFr: string;
  promptEn: string;
  promptAr: string;
  points: number;
};

export type ChallengePublicPayload = {
  challenge: ChallengeSummary;
  leaderboard: ChallengeLeader[];
  todayBoard: ChallengeLeader[];
  dailyChallenge: DailyChallenge | null;
};
