"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/i18n/provider";
import { LandingClassBoard } from "./landing-class-board";
import { SectionDownArrow } from "./section-down-arrow";

const RANKS = [
  { badge: "🥉", label: "Bronze", pts: 500 },
  { badge: "🥈", label: "Silver", pts: 2000 },
  { badge: "🥇", label: "Gold", pts: 5000 },
  { badge: "💎", label: "Diamond", pts: 10000 },
];

export function GamePreview() {
  const { t } = useI18n();

  return (
    <section id="jeux" className="px-4 pb-6 pt-2">
      <div className="mx-auto w-full max-w-xl md:max-w-3xl">
        <motion.p
          className="text-[10px] uppercase tracking-[0.32em] text-[#9a7418]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {t.landing.game.eyebrow}
        </motion.p>
        <motion.h2
          className="mt-2 font-display text-[24px] leading-snug text-[#0c1b4d] md:text-[30px]"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {t.landing.game.title}
        </motion.h2>
        <motion.p
          className="mt-2 max-w-[42ch] text-[14px] leading-relaxed text-[#1a2a4a]/80"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {t.landing.game.body}
        </motion.p>

        <motion.div
          className="mt-5"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <LandingClassBoard />
        </motion.div>

        <motion.div
          className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {RANKS.map((rank) => (
            <div
              key={rank.label}
              className="rounded-2xl efa-sea-glass px-3 py-3 text-center"
            >
              <span className="text-2xl">{rank.badge}</span>
              <p className="mt-1 font-display text-[15px] text-[#0c1b4d]">{rank.label}</p>
              <p className="mt-0.5 text-[12px] font-bold tabular-nums text-[#9a7418]">
                {rank.pts.toLocaleString("fr-FR")} pts
              </p>
            </div>
          ))}
        </motion.div>
        <p className="mt-2 text-center text-[12px] text-[#1a2a4a]/65">{t.landing.game.ranksHint}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <motion.div
            className="efa-sea-glass-dark rounded-[22px] px-4 py-4 text-left"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#f0d78c]">
              {t.landing.game.soloTitle}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="grid h-14 w-11 place-items-center rounded-xl bg-white/10 text-2xl">🃏</span>
              <span className="grid h-14 w-11 place-items-center rounded-xl bg-white/10 text-2xl">🔥</span>
              <span className="grid h-14 w-11 place-items-center rounded-xl bg-white/10 text-2xl">📚</span>
            </div>
            <p className="mt-3 text-[13px] leading-snug text-white/75">{t.landing.game.soloHint}</p>
          </motion.div>
          <motion.div
            className="efa-sea-glass-dark rounded-[22px] px-4 py-4 text-left"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#f0d78c]">
              {t.landing.game.clashTitle}
            </p>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[14px] font-bold text-white">
              <span>You</span>
              <span className="text-[#f0d78c]">1v1 ⚡</span>
              <span>Rival</span>
            </div>
            <p className="mt-3 text-[13px] leading-snug text-white/75">{t.landing.game.clashHint}</p>
          </motion.div>
        </div>

        <SectionDownArrow to="comment" />
      </div>
    </section>
  );
}
