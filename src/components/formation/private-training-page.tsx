"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { SiteFooter } from "@/components/landing/site-footer";
import { PageTopBar } from "@/components/site/page-top-bar";
import { FlagMark } from "@/components/ui/flag-mark";
import { useI18n } from "@/i18n/provider";
import {
  FORMATION_COUNTRIES,
  FORMATION_OFFERS,
  FORMATION_VIDEOS,
  FORMATEUR_WHATSAPP,
  formatFcfa,
  type FormationLevel,
} from "@/lib/formation-pricing";
import { readFormationEnroll } from "@/lib/formation-auth";
import { FormationAzoloDesk } from "./formation-azolo-desk";
import { FormationDiscountBanner } from "./formation-discount-banner";
import { FormationEnrollWizard } from "./formation-enroll-wizard";
import { FormationYoutube } from "./formation-youtube";

type Seat = {
  level: FormationLevel;
  remaining: number;
  seatsTotal: number;
  open: boolean;
};

const sectionMotion = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.45 },
};

export function PrivateTrainingPage() {
  const { t, dir } = useI18n();
  const fp = t.formationPrivate;
  const [seats, setSeats] = useState<Seat[]>([]);
  const [enrollLevel, setEnrollLevel] = useState<FormationLevel | null>(null);
  const [azolo, setAzolo] = useState(false);

  const back = t.admin.home;

  useEffect(() => {
    void fetch("/api/formation/seats", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { seats?: Seat[] }) => setSeats(j.seats || []))
      .catch(() => setSeats([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("enroll") === "1") {
      const saved = readFormationEnroll();
      if (saved?.level) setEnrollLevel(saved.level);
    }
  }, []);

  function seatFor(level: FormationLevel) {
    return seats.find((s) => s.level === level);
  }

  function durationFor(level: FormationLevel) {
    return level === "level0" ? fp.duration0 : fp.duration1;
  }

  return (
    <div className="formation-sea relative z-10 min-h-dvh overflow-x-hidden" dir={dir}>
      <div className="formation-sea-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="formation-sea-shine pointer-events-none absolute inset-x-0 top-0 h-64" aria-hidden />

      <header className="relative z-10 px-4 pb-2 pt-3 md:px-8">
        <PageTopBar backHref="/" backLabel={back} />
        <motion.div
          className="mx-auto mt-6 max-w-3xl text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b8860b]">{fp.eyebrow}</p>
          <h1 className="mt-3 font-display text-4xl text-[#0c4a6e] md:text-5xl">{fp.title}</h1>
        </motion.div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-14 px-4 py-10 md:px-8">
        <section className="space-y-4">
          <motion.h2 className="formation-q" {...sectionMotion}>
            {fp.qCert}
          </motion.h2>
          <FormationYoutube
            src={FORMATION_VIDEOS.certificate}
            title={fp.videoCert}
            soon={fp.videoSoon}
            playLabel={fp.videoPlay}
            openLabel={fp.videoOpenYoutube}
          />
        </section>

        <section className="space-y-4">
          <motion.h2 className="formation-q" {...sectionMotion}>
            {fp.qAttend}
          </motion.h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormationYoutube
              src={FORMATION_VIDEOS.attendA}
              title={fp.videoAttend1}
              soon={fp.videoSoon}
              playLabel={fp.videoPlay}
              openLabel={fp.videoOpenYoutube}
            />
            <FormationYoutube
              src={FORMATION_VIDEOS.attendB}
              title={fp.videoAttend2}
              soon={fp.videoSoon}
              playLabel={fp.videoPlay}
              openLabel={fp.videoOpenYoutube}
            />
          </div>
        </section>

        <section className="space-y-4">
          <motion.h2 className="formation-q" {...sectionMotion}>
            {fp.qHow}
          </motion.h2>
          {FORMATION_VIDEOS.howWorks ? (
            <FormationYoutube
              src={FORMATION_VIDEOS.howWorks}
              title={fp.qHow}
              soon={fp.videoSoon}
              playLabel={fp.videoPlay}
              openLabel={fp.videoOpenYoutube}
            />
          ) : (
            <motion.div className="formation-glass rounded-[24px] px-5 py-6" {...sectionMotion}>
              <ol className="space-y-3">
                {fp.steps.map((step, i) => (
                  <motion.li
                    key={step}
                    className="formation-text-dark flex gap-3 text-sm leading-relaxed"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <span className="formation-step-dot">{i + 1}</span>
                    <span className="pt-0.5">{step}</span>
                  </motion.li>
                ))}
              </ol>
            </motion.div>
          )}
        </section>

        <section className="space-y-4">
          <motion.h2 className="formation-q" {...sectionMotion}>
            {fp.qStudents}
          </motion.h2>
          <motion.div
            className="formation-glass rounded-[24px] px-5 py-6 text-center"
            {...sectionMotion}
          >
            <p className="font-display text-3xl text-[#0c4a6e] md:text-4xl">{fp.studentsLine}</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {FORMATION_COUNTRIES.map((c, i) => (
                <motion.span
                  key={c.code}
                  className="formation-text-dark inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/30 bg-white/70 px-3 py-1.5 text-[12px] font-semibold"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                >
                  <FlagMark code={c.code} /> {c.name}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="space-y-4">
          <motion.h2 className="formation-q" {...sectionMotion}>
            {fp.qMotivation}
          </motion.h2>
          <motion.div className="formation-glass rounded-[24px] px-5 py-6" {...sectionMotion}>
            <p className="font-display text-2xl text-[#0c4a6e] md:text-3xl">{fp.motivationTitle}</p>
            <p className="formation-text-dark mt-3 text-[15px] leading-relaxed">{fp.motivationBody}</p>
          </motion.div>
        </section>

        <section className="space-y-4">
          <motion.h2 className="formation-q" {...sectionMotion}>
            {fp.qProfile}
          </motion.h2>
          <motion.div className="formation-glass overflow-hidden rounded-[24px] p-4" {...sectionMotion}>
            <p className="formation-text-dark mb-4 text-center text-[14px] font-semibold leading-relaxed">
              {fp.profileCaption}
            </p>
            <Image
              src="/brand/formation-profile-preview.png"
              alt=""
              width={900}
              height={1600}
              className="mx-auto w-full max-w-md rounded-2xl shadow-[0_20px_50px_rgba(12,74,110,0.15)] ring-1 ring-[#d4af37]/25"
              priority={false}
            />
          </motion.div>
        </section>

        <FormationDiscountBanner />

        <section id="offre" className="space-y-4">
          <motion.h2 className="formation-q" {...sectionMotion}>
            {fp.qOffer}
          </motion.h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(["level0", "level1"] as FormationLevel[]).map((level, i) => {
              const offer = FORMATION_OFFERS[level];
              const seat = seatFor(level);
              const open = seat ? seat.open : true;
              const left = seat?.remaining ?? 9;
              return (
                <motion.article
                  key={level}
                  className="formation-glass relative overflow-hidden rounded-[26px] p-5"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <span className="absolute right-3 top-3 max-w-[10rem] rounded-full bg-[#f0d78c]/55 px-2.5 py-1 text-[10px] font-black uppercase leading-tight tracking-wide text-[#7a5a10]">
                    {fp.discountTag.replace("{save}", formatFcfa(offer.listTotal - offer.total))}
                  </span>
                  <p className="font-display text-2xl text-[#0c4a6e]">{offer.label}</p>
                  <p className="formation-text-dark mt-1 text-[13px] font-bold">{durationFor(level)}</p>
                  <p className="formation-text-dark mt-4 text-[15px] leading-relaxed">
                    <span className="font-bold">{formatFcfa(offer.firstAmount)}</span> {fp.then}{" "}
                    <span className="font-bold">{formatFcfa(offer.secondAmount)}</span>
                  </p>
                  <p className="formation-text-dark mt-1 text-[13px] font-medium">
                    {fp.total} {formatFcfa(offer.total)}{" "}
                    <span className="line-through opacity-70">
                      ({fp.instead} {formatFcfa(offer.listTotal)})
                    </span>
                  </p>
                  <p className="formation-text-dark mt-1 text-[12px] leading-snug opacity-90">
                    {fp.discountExplain}
                  </p>
                  <p className="formation-text-dark mt-3 text-[13px] font-bold text-[#0a5c38]">
                    {open ? `${left} ${fp.left}` : fp.full}
                  </p>
                  <button
                    type="button"
                    disabled={!open}
                    onClick={() => setEnrollLevel(level)}
                    className="formation-cta mt-4 w-full rounded-full py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {open ? fp.reserve : fp.full}
                  </button>
                </motion.article>
              );
            })}
          </div>
        </section>

        <motion.section className="formation-glass rounded-[24px] px-5 py-6" {...sectionMotion}>
          <h2 className="formation-q !text-left">{fp.stepsTitle}</h2>
          <ol className="mt-4 space-y-3">
            {fp.steps.map((step, i) => (
              <motion.li
                key={step}
                className="formation-text-dark flex gap-3 text-sm leading-relaxed"
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <span className="formation-step-dot">{i + 1}</span>
                {step}
              </motion.li>
            ))}
          </ol>
        </motion.section>

        <motion.div className="text-center" {...sectionMotion}>
          <a
            href={FORMATEUR_WHATSAPP}
            target="_blank"
            rel="noreferrer"
            className="formation-cta inline-flex flex-col items-center rounded-full px-8 py-4 text-sm font-bold"
          >
            {fp.contact}
            <span className="mt-1 text-[11px] font-semibold text-[#f0d78c]/90">{fp.contactSub}</span>
          </a>
        </motion.div>
      </main>

      <div className="relative z-10 pb-8 text-center">
        <button
          type="button"
          onClick={() => setAzolo(true)}
          className="text-[10px] font-semibold tracking-wide text-[#0c4a6e]/35 hover:text-[#0c4a6e]/7"
        >
          Azolo
        </button>
      </div>

      <SiteFooter />

      {enrollLevel ? (
        <FormationEnrollWizard
          level={enrollLevel}
          onClose={() => setEnrollLevel(null)}
          onSwitchLevel={(next) => setEnrollLevel(next)}
        />
      ) : null}
      {azolo ? <FormationAzoloDesk onClose={() => setAzolo(false)} /> : null}
    </div>
  );
}
