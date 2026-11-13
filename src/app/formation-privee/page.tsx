import type { Metadata } from "next";
import { PrivateTrainingPage } from "@/components/formation/private-training-page";

export const metadata: Metadata = {
  title: "Formation privée",
  description:
    "Formations privées EFA Talk avec Teacher AAG — coaching anglais oral personnalisé en ligne.",
  alternates: { canonical: "https://www.efatalk.fyi/formation-privee" },
};

export default function FormationPriveeRoute() {
  return <PrivateTrainingPage />;
}
