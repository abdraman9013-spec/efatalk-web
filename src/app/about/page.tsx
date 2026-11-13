import type { Metadata } from "next";
import { AboutPage } from "@/components/about/about-page";
import { aboutFaqJsonLd } from "@/lib/efa-json-ld";

export const metadata: Metadata = {
  title: "À propos — EFA Talk | pratique anglais en ligne Tchad",
  description:
    "Au-delà de la théorie : l'anglais pour tous, par la pratique. EFA Talk (efatalk.fyi) — salons vocaux live chaque soir à 20h, auto-formation, gamification. Une initiative English For All Academy, fondée par Abdramane Abakar Goudja (Mr. AAG).",
  keywords: [
    "plateforme pratique anglais en ligne Tchad Mr AAG",
    "EFA Talk",
    "anglais gratuit Tchad",
    "pratique orale anglais en ligne",
    "efatalk.fyi",
    "Mr AAG",
  ],
  alternates: { canonical: "https://www.efatalk.fyi/about" },
  openGraph: {
    title: "EFA Talk — À propos",
    description:
      "L'anglais pour tous, par la pratique. Plateforme tchadienne 100 % en ligne et gratuite. Live chaque soir à 20h.",
    url: "https://www.efatalk.fyi/about",
    type: "article",
    locale: "fr_TD",
  },
};

export default function AboutRoute() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutFaqJsonLd) }}
      />
      <div className="sr-only">
        <h1>Au-delà de la théorie : l&apos;anglais pour tous, par la pratique.</h1>
        <p>
          EFA Talk (efatalk.fyi) est la plateforme web tchadienne dédiée à la pratique quotidienne
          de l&apos;anglais oral. Salons vocaux en direct chaque soir à 20h (heure du Tchad).
          Débutant, Intermédiaire, Avancé. 100 % en ligne, 100 % gratuit. English For All Academy.
          Fondateur : Abdramane Abakar Goudja (Mr. AAG). Créée le 10 juin 2026, un an après EFAA
          (10 juin 2025).
        </p>
      </div>
      <AboutPage />
    </>
  );
}
