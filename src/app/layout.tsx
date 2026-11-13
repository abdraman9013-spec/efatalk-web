import type { Metadata, Viewport } from "next";
import { Cairo, Outfit, Playfair_Display } from "next/font/google";
import { EfaHelpWidget } from "@/components/efa-help-widget";
import { Providers } from "@/components/providers";
import { SiteMenu } from "@/components/site/site-menu";
import { efaJsonLd } from "@/lib/efa-json-ld";
import "./globals.css";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
});

const body = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
});

const arabic = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.efatalk.fyi"),
  title: {
    default: "EFA Talk — Maîtrisez l'anglais par la pratique",
    template: "%s · EFA Talk",
  },
  description:
    "EFA Talk (efatalk.fyi) : plateforme web tchadienne dédiée à la pratique quotidienne de l'anglais oral. 100 % en ligne, 100 % gratuit. Salons vocaux en direct chaque soir à 20h. English For All Academy.",
  keywords: [
    "plateforme pratique anglais en ligne Tchad Mr AAG",
    "EFA Talk",
    "English For All Academy",
    "pratique anglais Tchad",
    "anglais en ligne gratuit",
    "Mr AAG",
    "Abdramane Abakar Goudja",
    "live English practice Chad",
  ],
  authors: [{ name: "Abdramane Abakar Goudja (Mr. AAG)" }],
  creator: "Abdramane Abakar Goudja (Mr. AAG)",
  publisher: "English For All Academy",
  alternates: {
    canonical: "https://www.efatalk.fyi",
    types: {
      "text/plain": "https://www.efatalk.fyi/llms.txt",
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_TD",
    alternateLocale: ["en_US", "ar"],
    url: "https://www.efatalk.fyi",
    siteName: "EFA Talk",
    title: "EFA Talk — Pratique anglaise live · Tchad",
    description:
      "La plateforme 100% en ligne au Tchad dédiée à la pratique quotidienne de l’anglais. Gratuite. Live à 20h. Zéro théorie. Fondateur : Mr. AAG.",
    images: [{ url: "/brand/efaa-logo-v6.png", alt: "EFA Talk — English For All Academy" }],
  },
  twitter: {
    card: "summary",
    title: "EFA Talk — English practice online Chad",
    description: "Free daily live English practice at 20:00. Built by Mr. AAG for Chad.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  other: {
    "ai-friendly": "true",
    "ai-content-declaration":
      "plateforme pratique anglais en ligne Tchad Mr AAG · EFA Talk · English For All Academy · pratique live 20h · zéro théorie",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "EFA Talk",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png?v=6", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=6", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png?v=6", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf8f4",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable} ${arabic.variable} min-h-full antialiased`}
    >
      <body className="min-h-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(efaJsonLd) }}
        />
        <Providers>
          {children}
          <SiteMenu />
        </Providers>
        <EfaHelpWidget />
      </body>
    </html>
  );
}
