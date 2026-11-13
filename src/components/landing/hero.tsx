"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { restoreStudent } from "@/lib/efaa-db";
import { beginnerNextPath } from "@/lib/gamification";
import { clearAdminAuth } from "@/lib/admin";
import { isOfficialStudent, isPracticeProfileComplete } from "@/lib/session";
import { useI18n } from "@/i18n/provider";
import { useState } from "react";
import { SectionDownArrow } from "./section-down-arrow";

export function Hero({ onLogoPress }: { onLogoPress?: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  async function joinClass() {
    if (opening) return;
    setOpening(true);
    clearAdminAuth();
    try {
      const student = await restoreStudent();
      if (student && !isOfficialStudent(student) && isPracticeProfileComplete(student)) {
        router.push(await beginnerNextPath(student));
        return;
      }
      router.push("/auth");
    } catch {
      router.push("/auth");
    } finally {
      setOpening(false);
    }
  }

  return (
    <section id="accueil" className="px-4 pb-1 pt-3 md:px-5">
      <div className="mx-auto w-full max-w-xl md:max-w-3xl">
        <motion.div
          className="efa-sea-glass rounded-[28px] px-5 py-8 text-center md:px-10 md:py-10"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="relative mx-auto mb-3 flex h-36 w-36 items-center justify-center md:h-40 md:w-40">
            <span className="logo-rays" />
            <span className="logo-halo" />
            <button type="button" onClick={onLogoPress} className="relative z-10" aria-label={t.admin.gate}>
              <Image
                src="/brand/efaa-logo-v6.png"
                alt={t.header.academy}
                width={160}
                height={160}
                className="h-auto w-[150px] logo-shine md:w-[168px]"
                priority
              />
            </button>
          </div>

          <h1 className="font-display text-[28px] leading-[1.12] text-[#0c1b4d] md:text-[44px]">
            {t.hero.line1}
            <br />
            {t.hero.line2}
          </h1>

          <p className="mt-3 inline-flex rounded-full border border-[#d4af37]/40 bg-[#f0d78c]/35 px-4 py-1 text-[13px] font-bold text-[#7a5a10]">
            {t.hero.line3}
          </p>

          <p className="mx-auto mt-4 max-w-[52ch] text-[14px] leading-relaxed text-[#1a2a4a]/82">
            {t.hero.manifesto}
          </p>
          <p className="mx-auto mt-3 max-w-[52ch] text-[14px] leading-relaxed text-[#1a2a4a]/72">
            {t.hero.academyNote}
          </p>

          <div className="mt-7 flex flex-col items-center gap-2">
            <p className="text-[12px] font-semibold tracking-wide text-[#1a3a7a]/85">
              {t.hero.createAccount}
            </p>
            <button
              type="button"
              onClick={joinClass}
              className="efa-sea-cta inline-flex min-h-14 items-center gap-2 rounded-full px-8 py-4 text-base font-semibold"
            >
              {opening ? "…" : t.hero.cta}
            </button>
          </div>
        </motion.div>
      </div>
      <SectionDownArrow to="jeux" />
    </section>
  );
}
