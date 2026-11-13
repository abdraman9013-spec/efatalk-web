"use client";

import Link from "next/link";
import { FlagMark } from "@/components/ui/flag-mark";
import { SiteFooter } from "@/components/landing/site-footer";
import { PageTopBar } from "@/components/site/page-top-bar";
import { useI18n } from "@/i18n/provider";
import { AWARDS_2026, AWARDS_2026_META } from "@/lib/awards-2026";

export function AwardsIndex() {
  const { locale, dir } = useI18n();
  const back = locale === "ar" ? "رجوع" : locale === "en" ? "Back" : "Retour";
  const title =
    locale === "ar"
      ? "جوائز EfaTalk 2026"
      : locale === "en"
        ? "EfaTalk Awards 2026"
        : "Awards EfaTalk 2026";
  const subtitle =
    locale === "ar"
      ? "أفضل 10 في تحدي الإنجليزية — شهادة رسمية عبر رمز QR"
      : locale === "en"
        ? "Official Top 10 of the English Challenge — verify each certificate via QR"
        : "Top 10 officiel du Challenge English — vérifiez chaque certificat via QR";
  const ends = locale === "en" ? AWARDS_2026_META.endsLabelEn : AWARDS_2026_META.endsLabelFr;

  return (
    <div className="efa-sea-page relative z-10 min-h-dvh" dir={dir}>
      <header className="border-b border-[#0c1b4d]/10 px-4 py-3 md:px-8">
        <PageTopBar backHref="/" backLabel={back} />
        <div className="mx-auto mt-5 w-full max-w-3xl pr-2">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8a6a12]">
            {AWARDS_2026_META.challengeName}
          </p>
          <h1 className="mt-2 font-display text-3xl md:text-5xl">{title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#1a2a4a]">{subtitle}</p>
          <p className="mt-2 text-xs text-[#1a3a7a]/70">{ends}</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-16 md:px-8">
        <ul className="flex flex-col gap-3">
          {AWARDS_2026.map((row) => (
            <li key={row.code}>
              <Link
                href={`/awards/${row.code}`}
                className="efa-sea-card grid grid-cols-[2.75rem_3rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[22px] px-3 py-3 transition hover:shadow-[0_12px_36px_rgba(12,27,77,0.08)] sm:gap-x-4 sm:px-4"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0c1b4d]">
                  <span className="font-display text-[17px] leading-none text-[#f0d78c]">
                    {row.rank}
                  </span>
                </span>

                {row.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.photo}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full border border-[#0c1b4d]/10 object-cover object-top"
                  />
                ) : (
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#0c1b4d]/10 bg-[#0c1b4d]/08 font-display leading-none text-[#0c1b4d]">
                    {row.displayName.slice(0, 1)}
                  </span>
                )}

                <div className="min-w-0">
                  <p className="truncate whitespace-nowrap font-display text-[17px] leading-tight text-[#0c1b4d]">
                    {row.displayName}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] leading-none text-[#1a3a7a]/75">
                    <FlagMark
                      code={row.nationality}
                      className="inline-block h-3 w-[18px] shrink-0 rounded-[2px] object-cover align-middle"
                    />
                    <span className="font-mono tracking-wide">{row.code}</span>
                  </div>
                </div>

                <div className="flex min-w-[5.5rem] flex-col items-end justify-center text-right leading-tight">
                  <span className="text-[13px] font-bold tabular-nums text-[#0c1b4d]">
                    {row.points.toLocaleString("fr-FR")} pts
                  </span>
                  <span className="mt-0.5 text-[11px] tabular-nums text-[#1a3a7a]/75">
                    {row.speakingSessions} speaking
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}
