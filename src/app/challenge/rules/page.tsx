import type { Metadata } from "next";
import { ChallengeRulesPage } from "@/components/challenge/challenge-rules-page";

export const metadata: Metadata = {
  title: "Règlement — EfaTalk English Challenge 2026",
  description: "Règlement officiel, points, éligibilité et vérification des gagnants.",
};

export default function Page() {
  return <ChallengeRulesPage />;
}
