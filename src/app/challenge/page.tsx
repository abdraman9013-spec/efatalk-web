import type { Metadata } from "next";
import { Suspense } from "react";
import { ChallengePage } from "@/components/challenge/challenge-page";

export const metadata: Metadata = {
  title: "EfaTalk English Challenge 2026",
  description:
    "15 jours pour pratiquer l’anglais, créer une habitude et gagner 150 000 FCFA. Du 15 au 29 octobre 2026.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="challenge-sea" />}>
      <ChallengePage />
    </Suspense>
  );
}
