import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AwardCertificate } from "@/components/awards/award-certificate";
import { AWARDS_2026, awardByCode, awardPublicUrl } from "@/lib/awards-2026";

type Props = { params: Promise<{ code: string }> };

export function generateStaticParams() {
  return AWARDS_2026.map((row) => ({ code: row.code }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const laureate = awardByCode(code);
  if (!laureate) return { title: "Award introuvable" };
  const url = awardPublicUrl(laureate.code);
  return {
    title: `#${laureate.rank} ${laureate.displayName} — Award ${laureate.code}`,
    description: `${laureate.titleFr}. ${laureate.points} points, ${laureate.speakingSessions} sessions speaking, EfaTalk English Challenge 2026.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${laureate.displayName} · Rank #${laureate.rank}`,
      description: `${laureate.points} pts · ${laureate.speakingSessions} speaking · Challenge 2026`,
      url,
      type: "profile",
      images: laureate.photo ? [{ url: laureate.photo, alt: laureate.displayName }] : undefined,
    },
  };
}

export default async function AwardCodePage({ params }: Props) {
  const { code } = await params;
  const laureate = awardByCode(code);
  if (!laureate) notFound();
  return <AwardCertificate laureate={laureate} />;
}
