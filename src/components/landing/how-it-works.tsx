"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/i18n/provider";
import { SectionDownArrow } from "./section-down-arrow";

export function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { n: "1", title: t.landing.how.step1Title, body: t.landing.how.step1Body },
    { n: "2", title: t.landing.how.step2Title, body: t.landing.how.step2Body },
    { n: "3", title: t.landing.how.step3Title, body: t.landing.how.step3Body },
  ];

  return (
    <section id="comment" className="px-4 pb-6 pt-2">
      <div className="mx-auto w-full max-w-xl md:max-w-3xl">
        <motion.p
          className="text-[10px] uppercase tracking-[0.32em] text-[#9a7418]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {t.landing.how.eyebrow}
        </motion.p>
        <motion.h2
          className="mt-2 font-display text-[24px] leading-snug text-[#0c1b4d] md:text-[30px]"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {t.landing.how.title}
        </motion.h2>

        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {steps.map((step, i) => (
            <motion.li
              key={step.n}
              className="relative rounded-[22px] efa-sea-glass px-4 py-5 text-center"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.06 * i }}
            >
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#0c1b4d] font-display text-lg text-[#f0d78c]">
                {step.n}
              </span>
              <p className="mt-3 font-display text-[18px] text-[#0c1b4d]">{step.title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#1a2a4a]/70">{step.body}</p>
            </motion.li>
          ))}
        </ol>
        <SectionDownArrow to="atelier" />
      </div>
    </section>
  );
}
