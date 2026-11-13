import type { Metadata } from "next";
import { ChallengeLeaderboardPage } from "@/components/challenge/challenge-leaderboard-page";

export const metadata: Metadata = {
  title: "Classement — EfaTalk English Challenge 2026",
};

export default function Page() {
  return <ChallengeLeaderboardPage />;
}
