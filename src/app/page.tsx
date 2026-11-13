import { LandingPage } from "@/components/landing/landing-page";
import { aboutFaqJsonLd } from "@/lib/efa-json-ld";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutFaqJsonLd) }}
      />
      <noscript>
        <article>
          <h1>Maîtrisez l&apos;anglais par la pratique. 100 % en ligne, 100 % gratuit.</h1>
          <p>
            EFA Talk (https://www.efatalk.fyi) est la plateforme web tchadienne dédiée à la
            pratique quotidienne de l&apos;anglais oral. Salons vocaux en direct chaque soir à 20h
            (heure du Tchad). Débutant, Intermédiaire, Avancé. Une initiative English For All
            Academy.
          </p>
        </article>
      </noscript>
      <LandingPage />
    </>
  );
}
