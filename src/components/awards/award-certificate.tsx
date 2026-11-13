"use client";

import Link from "next/link";
import { FlagMark } from "@/components/ui/flag-mark";
import { SiteFooter } from "@/components/landing/site-footer";
import { PageTopBar } from "@/components/site/page-top-bar";
import { useI18n } from "@/i18n/provider";
import {
  AWARDS_2026_META,
  awardPublicUrl,
  type AwardLaureate,
} from "@/lib/awards-2026";

function formatPrizeBanner(laureate: AwardLaureate, locale: string) {
  if (laureate.code === "2026-02") return "75 EURO";
  if (!laureate.prizeFcfa) return null;
  return `${laureate.prizeFcfa.toLocaleString(locale === "en" ? "en-US" : "fr-FR")} FCFA`;
}

function rankBadgeLabel(laureate: AwardLaureate) {
  if (laureate.rank === 1) return "CHAMPION  •  1ST PLACE";
  if (laureate.rank === 2) return "RUNNER-UP  •  2ND PLACE";
  if (laureate.rank === 3) return "3RD PLACE";
  return `TOP 10  •  ${laureate.rank}TH PLACE`;
}

function formatWhen(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar" : locale === "en" ? "en-GB" : "fr-FR", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: AWARDS_2026_META.timezone,
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function AwardCertificate({ laureate }: { laureate: AwardLaureate }) {
  const { locale, dir } = useI18n();
  const fr = locale !== "en" && locale !== "ar";
  const title = locale === "en" ? laureate.titleEn : laureate.titleFr;
  const back = locale === "ar" ? "رجوع" : locale === "en" ? "Back" : "Retour";
  const allAwards =
    locale === "ar" ? "كل الجوائز" : locale === "en" ? "All awards" : "Tous les awards";
  const verified =
    locale === "ar"
      ? "شهادة رسمية · EFA Talk"
      : locale === "en"
        ? "Official certificate · EFA Talk"
        : "Certificat officiel · EFA Talk";
  const challengeEnded =
    locale === "en" ? AWARDS_2026_META.endsLabelEn : AWARDS_2026_META.endsLabelFr;
  const stats = [
    {
      label: fr ? "Points Challenge" : locale === "ar" ? "النقاط" : "Challenge points",
      value: laureate.points.toLocaleString(fr ? "fr-FR" : "en-US"),
    },
    {
      label: fr ? "Sessions speaking" : locale === "ar" ? "جلسات التحدث" : "Speaking sessions",
      value: String(laureate.speakingSessions),
    },
    {
      label: fr ? "Jours actifs" : locale === "ar" ? "أيام نشطة" : "Active days",
      value: String(laureate.activeDays),
    },
    {
      label: fr ? "Parrainages validés" : locale === "ar" ? "إحالات" : "Valid referrals",
      value: String(laureate.validReferrals),
    },
    {
      label: fr ? "Meilleure série" : locale === "ar" ? "أطول سلسلة" : "Best streak",
      value: String(laureate.currentStreak),
    },
    {
      label: fr ? "Rang final" : locale === "ar" ? "الترتيب النهائي" : "Final rank",
      value: `#${laureate.rank}`,
    },
  ];

  return (
    <div className="efa-sea-page relative z-10 min-h-dvh" dir={dir}>
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.28), transparent), radial-gradient(ellipse 60% 40% at 100% 20%, rgba(12,27,77,0.08), transparent)",
        }}
        aria-hidden
      />
      <header className="relative border-b border-[#0c1b4d]/10 px-4 py-3 md:px-8">
        <PageTopBar backHref="/awards" backLabel={back} />
      </header>

      <main className="relative mx-auto w-full max-w-3xl px-4 py-8 pb-16 md:px-8 md:py-12">
        <p className="text-center text-[10px] font-black uppercase tracking-[0.28em] text-[#8a6a12]">
          {verified}
        </p>
        <p className="mt-2 text-center text-[11px] uppercase tracking-[0.18em] text-[#1a3a7a]/70">
          {AWARDS_2026_META.challengeName}
        </p>

        <article className="mt-8 overflow-hidden rounded-[32px] border border-[#c9a227]/35 bg-white/85 shadow-[0_18px_50px_rgba(12,27,77,0.06)]">
          <div className="bg-gradient-to-br from-[#0c1b4d] via-[#132a6e] to-[#1a3a7a] px-6 py-8 text-center text-[#f6f1e4] md:px-10">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f0d78c]">
              {title}
            </p>
            <div className="mx-auto mt-6 flex justify-center">
              {laureate.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={laureate.photo}
                  alt={laureate.displayName}
                  className="h-36 w-36 rounded-full border-[3px] border-[#d4af37]/70 object-cover object-top shadow-[0_12px_36px_rgba(0,0,0,0.12)]"
                />
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-full border-[3px] border-[#d4af37]/70 bg-[#f0d78c]/20 text-4xl font-display text-[#f0d78c]">
                  {laureate.displayName.slice(0, 1)}
                </div>
              )}
            </div>
            <h1 className="mt-5 font-display text-3xl leading-tight md:text-4xl">
              {laureate.displayName}
            </h1>
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-[#f0d78c]">
              <FlagMark code={laureate.nationality} />
              <span className="font-semibold tracking-wide">#{laureate.rank}</span>
              <span className="opacity-60">·</span>
              <span className="font-mono text-xs tracking-wider">{laureate.code}</span>
            </div>
          </div>

          <div className="grid gap-3 px-5 py-6 sm:grid-cols-2 md:px-8">
            {stats.map((row) => (
              <div
                key={row.label}
                className="rounded-2xl border border-[#0c1b4d]/8 bg-[#f4efe6]/80 px-4 py-3"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6a12]">
                  {row.label}
                </p>
                <p className="mt-1 font-display text-2xl text-[#0c1b4d]">{row.value}</p>
              </div>
            ))}
          </div>

          {/* Official certificate canvas: flexbox space-between + fixed watermark layer + 3-row metric pop */}
          <div className="relative overflow-hidden border-t border-[#0c1b4d]/8 bg-[#fcfaf7] px-5 py-7 md:px-10 md:py-9">
            <div
              className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center justify-center select-none opacity-[0.07]"
              aria-hidden
            >
              <span className="font-display text-3xl tracking-[0.22em] text-[#0c1b4d] md:text-5xl">
                ENGLISH FOR ALL ACADEMY
              </span>
              <span className="mt-1 text-xs font-black tracking-[0.35em] text-[#0c1b4d] md:text-sm">
                LEARN ENGLISH ONLINE
              </span>
            </div>

            <div className="relative z-10 mx-auto flex min-h-[250px] max-w-[742px] flex-col items-center justify-between text-center">
              <div className="w-full px-2">
                <p className="font-serif text-xs text-[#1c1c1c] md:text-sm">
                  This is to certify that
                </p>
                <h2 className="mt-1.5 font-display text-2xl font-bold tracking-wide text-[#02102e] md:text-4xl">
                  {laureate.displayName.toUpperCase()}
                </h2>
                <div className="mt-2 flex items-center justify-center gap-3">
                  <span className="h-[2px] w-12 bg-[#bd9941] md:w-16" aria-hidden />
                  <span className="font-serif text-xs font-bold tracking-[0.12em] text-[#bd9941] md:text-sm">
                    {rankBadgeLabel(laureate)}
                  </span>
                  <span className="h-[2px] w-12 bg-[#bd9941] md:w-16" aria-hidden />
                </div>
              </div>

              {/* Explicit prize slot / spacer so body rows never shift up when prize is absent */}
              <div className="my-auto flex min-h-[38px] items-center justify-center py-1">
                {formatPrizeBanner(laureate, locale) ? (
                  <p className="font-display text-lg font-bold tracking-wide md:text-2xl">
                    <span className="text-[#14243f]">PRIZE </span>
                    <span className="text-[#a07c2e]">
                      {formatPrizeBanner(laureate, locale)}
                    </span>
                  </p>
                ) : (
                  <span className="block h-[30px]" aria-hidden />
                )}
              </div>

              {/* 3-row Oumar body text: +18% scaled, line-height ~1.5, bold metric anchors */}
              <div className="mx-auto w-full max-w-[742px] px-2 font-serif text-[15px] leading-[1.5] text-[#181818] md:text-[17px]">
                <p>
                  In recognition of outstanding performance, consistency, and dedication to daily English
                </p>
                <p>
                  speaking practice throughout the inaugural EfaTalk English Challenge 2026 —{" "}
                  <strong className="font-bold text-[#0a1632]">
                    {laureate.points.toLocaleString("en-US")} points
                  </strong>
                  ,
                </p>
                <p>
                  <strong className="font-bold text-[#0a1632]">
                    {laureate.speakingSessions} speaking sessions
                  </strong>
                  , and{" "}
                  <strong className="font-bold text-[#0a1632]">
                    {laureate.activeDays} consecutive active days
                  </strong>
                  . Awarded on November 1, 2026.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-[#0c1b4d]/8 px-5 py-6 text-sm leading-relaxed text-[#1a2a4a] md:px-8">
            <p>
              <span className="font-semibold text-[#0c1b4d]">
                {fr ? "Fin du Challenge :" : locale === "ar" ? "نهاية التحدي :" : "Challenge ended :"}
              </span>{" "}
              {challengeEnded}
            </p>
            <p>
              <span className="font-semibold text-[#0c1b4d]">
                {fr ? "Score atteint le :" : locale === "ar" ? "تحقق الرقم في :" : "Score achieved :"}
              </span>{" "}
              {formatWhen(laureate.scoreAchievedAt, locale)}
            </p>
            {formatPrizeBanner(laureate, locale) ? (
              <p>
                <span className="font-semibold text-[#0c1b4d]">
                  {fr ? "Prix :" : locale === "ar" ? "الجائزة :" : "Prize :"}
                </span>{" "}
                {formatPrizeBanner(laureate, locale)}
              </p>
            ) : null}
            <p className="break-all text-[11px] text-[#1a3a7a]/70">
              {awardPublicUrl(laureate.code)}
            </p>
          </div>
        </article>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/awards"
            className="rounded-full border border-[#0c1b4d]/15 bg-white/80 px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[#0c1b4d]"
          >
            {allAwards}
          </Link>
          <Link
            href="/"
            className="rounded-full bg-[#0c1b4d] px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[#f0d78c]"
          >
            EFA Talk
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
