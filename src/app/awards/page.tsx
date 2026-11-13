import type { Metadata } from "next";
import { AwardsIndex } from "@/components/awards/awards-index";

export const metadata: Metadata = {
  title: "Awards 2026 — Top 10 Challenge",
  description:
    "Certificats officiels du Top 10 EfaTalk English Challenge 2026. Vérifiez le rang, les points et les sessions speaking via QR.",
  alternates: { canonical: "https://www.efatalk.fyi/awards" },
  openGraph: {
    title: "EFA Talk Awards 2026",
    url: "https://www.efatalk.fyi/awards",
    type: "website",
  },
};

export default function AwardsPage() {
  return <AwardsIndex />;
}
