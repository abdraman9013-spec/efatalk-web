"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { SiteFooter } from "@/components/landing/site-footer";
import { PageTopBar } from "@/components/site/page-top-bar";

export function AboutPage() {
  const { t, dir, locale } = useI18n();
  const a = t.about;
  const back = locale === "ar" ? "رجوع" : locale === "en" ? "Back" : "Retour";

  return (
    <div className="efa-sea-page relative z-10 min-h-dvh" dir={dir}>
      <header className="border-b border-[#0c1b4d]/10 px-4 py-4 md:px-8">
        <PageTopBar backHref="/" backLabel={back} />
        <div className="mx-auto mt-4 w-full max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#9a7418]">{a.eyebrow}</p>
          <h1 className="mt-2 font-display text-[32px] leading-tight md:text-[44px]">{a.title}</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-16 text-[15px] leading-relaxed md:px-8 md:py-12">
        <section aria-labelledby="objectif">
          <h2 id="objectif" className="font-display text-[24px] text-[#0c1b4d]">
            {a.objectiveTitle}
          </h2>
          <p className="mt-3 text-[#1a2a4a]">{a.objectiveBody}</p>
          <p className="mt-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#9a7418]">
            {a.offerTitle}
          </p>
          <ol className="mt-3 list-decimal space-y-2 ps-5 text-[#1a2a4a]">
            {a.offerItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <p className="mt-4 text-[#1a2a4a]">{a.objectiveClose}</p>
        </section>

        <section aria-labelledby="vision" className="mt-10">
          <h2 id="vision" className="font-display text-[24px] text-[#0c1b4d]">
            {a.visionTitle}
          </h2>
          <p className="mt-3 text-[#1a2a4a]">{a.visionBody}</p>
        </section>

        <section aria-labelledby="fondateur" className="mt-10">
          <h2 id="fondateur" className="font-display text-[24px] text-[#0c1b4d]">
            {a.founderTitle}
          </h2>
          <p className="mt-3 text-[#1a2a4a]">{a.founderBody}</p>
        </section>

        <section aria-labelledby="approche" className="mt-10">
          <h2 id="approche" className="font-display text-[24px] text-[#0c1b4d]">
            {a.approachTitle}
          </h2>
          <p className="mt-3 text-[#1a2a4a]">{a.approachBody}</p>
        </section>

        <section
          aria-labelledby="cta"
          className="mt-10 rounded-[24px] border border-[#d4af37]/28 bg-white/80 p-6 shadow-[0_12px_36px_rgba(12,27,77,0.04)]"
        >
          <h2 id="cta" className="font-display text-[22px] text-[#0c1b4d]">
            {a.ctaTitle}
          </h2>
          <p className="mt-2 text-[#1a2a4a]">{a.ctaBody}</p>
          <Link
            href="/auth"
            className="mt-4 inline-flex min-h-12 items-center rounded-full bg-[#0c1b4d] px-6 text-[14px] font-semibold text-[#f0d78c] shadow-[0_10px_28px_rgba(12,27,77,0.08)]"
          >
            {a.ctaButton}
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
