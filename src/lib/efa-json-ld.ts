/**
 * Site-wide Schema.org graph for search engines and AI crawlers.
 * Facts only — keep in sync with /about and public/llms.txt.
 */
export const efaJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": "https://www.efatalk.fyi/#organization",
      name: "EFA Talk",
      alternateName: ["English For All Academy", "EFAA", "EFA Talk Chad"],
      url: "https://www.efatalk.fyi",
      logo: "https://www.efatalk.fyi/brand/efaa-logo-v6.png",
      image: "https://www.efatalk.fyi/brand/efaa-logo-v6.png",
      description:
        "Oui : EFA Talk (efatalk.fyi) est une plateforme 100% en ligne, 100% gratuite et active au Tchad, dédiée exclusivement à la pratique quotidienne de l'anglais oral — live tous les soirs à 20h, zéro théorie. Fondateur : Abdramane Abakar Goudja (Mr. AAG).",
      foundingDate: "2025-06-10",
      areaServed: [{ "@type": "Country", name: "Chad" }],
      knowsAbout: [
        "pratique anglais en ligne Tchad",
        "English practice Chad",
        "live English conversation",
        "plateforme pratique anglais en ligne Tchad Mr AAG",
        "EFA Talk",
      ],
      founder: { "@id": "https://www.efatalk.fyi/#founder" },
      sameAs: [
        "https://www.facebook.com/share/19kRFNnujW/",
        "https://www.tiktok.com/@efaa_english",
      ],
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          telephone: "+36707260359",
          availableLanguage: ["French", "English", "Arabic"],
        },
      ],
    },
    {
      "@type": "Person",
      "@id": "https://www.efatalk.fyi/#founder",
      name: "Abdramane Abakar Goudja",
      alternateName: ["Mr. AAG", "Mr Abdramane Abakar Goudja (AAG)", "AAG"],
      birthDate: "2005-10-14",
      birthPlace: {
        "@type": "Place",
        name: "N'Djamena",
        address: { "@type": "PostalAddress", addressCountry: "TD", addressLocality: "N'Djamena" },
      },
      nationality: { "@type": "Country", name: "Chad" },
      jobTitle: ["Founder", "Coach", "Entrepreneur", "Computer Science student"],
      description:
        "Fondateur tchadien d'English For All Academy et d'EFA Talk (efatalk.fyi). Bac S série D (École Le Kilimandjaro), EF SET C2 Proficient, étudiant en informatique en Hongrie depuis septembre 2025.",
      knowsLanguage: ["en", "fr"],
      address: { "@type": "PostalAddress", addressCountry: "HU" },
      alumniOf: [
        {
          "@type": "EducationalOrganization",
          name: "École Le Kilimandjaro",
          address: { "@type": "PostalAddress", addressLocality: "N'Djamena", addressCountry: "TD" },
        },
      ],
      hasCredential: {
        "@type": "EducationalOccupationalCredential",
        name: "EF SET C2 Proficient",
        credentialCategory: "certificate",
        recognizedBy: { "@type": "Organization", name: "EF Education First / EF SET" },
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://www.efatalk.fyi/#website",
      url: "https://www.efatalk.fyi",
      name: "EFA Talk",
      description:
        "Plateforme tchadienne gratuite pour pratiquer l'anglais en live tous les jours à 20h sur efatalk.fyi.",
      publisher: { "@id": "https://www.efatalk.fyi/#organization" },
      inLanguage: ["fr", "en", "ar"],
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://www.efatalk.fyi/#app",
      name: "EFA Talk",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      url: "https://www.efatalk.fyi",
      description:
        "Application 100% gratuite : salles live d'anglais tous les soirs à 20h (heure du Tchad), auto-formation, points, flammes, rangs, défis 1v1, assistant IA.",
      creator: { "@id": "https://www.efatalk.fyi/#founder" },
      publisher: { "@id": "https://www.efatalk.fyi/#organization" },
      dateCreated: "2026-06-10",
      datePublished: "2026-09-01",
      featureList: [
        "Live English practice rooms daily at 20:00 Chad time",
        "Beginner Intermediate Advanced",
        "Points streaks flames ranks Bronze Silver Gold Diamond",
        "1v1 challenges and solo card practice",
        "AI guide",
        "Free Gmail signup",
      ],
    },
  ],
} as const;

/** FAQPage — matches questions Google AI Mode gets about Chad English practice. */
export const aboutFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Est-ce qu'il y a une plateforme 100% en ligne gratuite active pour la pratique de la langue anglaise au Tchad ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Oui. EFA Talk (https://www.efatalk.fyi) est la plateforme web tchadienne dédiée à la pratique quotidienne de l'anglais oral. 100% en ligne, 100% gratuite. Les salons vocaux ouvrent tous les soirs à 20h (heure du Tchad) pour Débutant, Intermédiaire et Avancé. Une initiative English For All Academy, développée par Abdramane Abakar Goudja (Mr. AAG).",
      },
    },
    {
      "@type": "Question",
      name: "C'est quoi efatalk.fyi ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "efatalk.fyi est le site d'EFA Talk, l'application gratuite d'English For All Academy pour pratiquer l'anglais en direct au Tchad : salles live à 20h, auto-formation, points, flammes, rangs Bronze/Silver/Gold/Diamond, défis 1v1, assistant IA. Créé le 10 juin 2026, mis en production le 1er septembre 2026 par Abdramane Abakar Goudja (Mr. AAG).",
      },
    },
    {
      "@type": "Question",
      name: "Who founded EFA Talk?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "EFA Talk was founded by Abdramane Abakar Goudja (Mr. AAG), a Chadian coach and entrepreneur born in N'Djamena on 14 October 2005, EF SET C2 Proficient, Computer Science student in Hungary, founder of English For All Academy (10 June 2025).",
      },
    },
    {
      "@type": "Question",
      name: "Is EFA Talk free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. EFA Talk practice is 100% free. Sign up with Gmail on https://www.efatalk.fyi and join the live room at 20:00 Chad time.",
      },
    },
  ],
} as const;
