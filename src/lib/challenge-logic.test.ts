import assert from "node:assert/strict";
import test from "node:test";
import {
  assignUniqueChallengeRanks,
  cappedAward,
  challengeEligibility,
  compareChallengeRanks,
  rankChallengeBoard,
  resolveChallengePhase,
} from "./challenge-logic.ts";

test("Challenge uses the configured date window", () => {
  const campaign = {
    status: "scheduled",
    starts_at: "2026-10-14T23:00:00.000Z",
    ends_at: "2026-10-29T22:59:59.000Z",
    leaderboard_locked: false,
  };
  assert.equal(resolveChallengePhase(campaign, Date.parse("2026-10-14T22:59:59Z")), "upcoming");
  assert.equal(resolveChallengePhase(campaign, Date.parse("2026-10-15T12:00:00Z")), "active");
  assert.equal(resolveChallengePhase(campaign, Date.parse("2026-10-29T23:00:00Z")), "verification");
});

test("Prize eligibility is the three boxes after registration", () => {
  const base = {
    account: true,
    rules: true,
    tiktok: true,
    facebook: true,
    requiredReferrals: 2,
    fraudClear: true,
    participantActive: true,
    practiced: false,
    validReferrals: 0,
  };
  assert.equal(challengeEligibility(base).eligible, true);
  assert.equal(challengeEligibility({ ...base, rules: false }).eligible, false);
  assert.equal(challengeEligibility({ ...base, tiktok: false }).eligible, false);
  assert.equal(challengeEligibility({ ...base, facebook: false }).eligible, false);
  assert.equal(challengeEligibility({ ...base, fraudClear: false }).eligible, false);
});

test("Point awards cannot exceed source or daily caps", () => {
  assert.equal(cappedAward(100, 180, 230, 0, 100), 50);
  assert.equal(cappedAward(30, 100, 230, 20, 30), 10);
  assert.equal(cappedAward(30, 230, 230, 0, 30), 0);
  assert.equal(cappedAward(-10, 0, 230, 0, 30), 0);
});

test("Tie-breaks prioritize learning, active days, speaking, then earliest score", () => {
  const common = {
    points: 1000,
    activeDays: 10,
    speakingSessions: 8,
    scoreAchievedAt: "2026-10-29T20:00:00Z",
  };
  const ranked = [
    { ...common, learningPoints: 900 },
    { ...common, learningPoints: 950, scoreAchievedAt: "2026-10-29T21:00:00Z" },
  ].sort(compareChallengeRanks);
  assert.equal(ranked[0].learningPoints, 950);
});

test("Challenge ranks never share a place", () => {
  const numbered = assignUniqueChallengeRanks([
    { rank: 4, points: 10 },
    { rank: 4, points: 10 },
    { rank: 5, points: 8 },
  ]);
  assert.deepEqual(
    numbered.map((row) => row.rank),
    [1, 2, 3],
  );
});

test("Live board orders by points then tie-breaks, unique ranks", () => {
  const ranked = rankChallengeBoard([
    { points: 110, learning_points: 80, active_days: 1, speaking_sessions: 1, score_achieved_at: "2026-10-15T18:00:00Z" },
    { points: 150, learning_points: 150, active_days: 1, speaking_sessions: 2, score_achieved_at: "2026-10-15T17:00:00Z" },
    { points: 110, learning_points: 90, active_days: 1, speaking_sessions: 1, score_achieved_at: "2026-10-15T18:10:00Z" },
  ]);
  assert.deepEqual(
    ranked.map((row) => row.rank),
    [1, 2, 3],
  );
  assert.equal(ranked[0].points, 150);
  assert.equal(ranked[1].learning_points, 90);
  assert.equal(ranked[2].learning_points, 80);
});
