"use client";

import { motion } from "framer-motion";
import { GraduationCap, Rocket } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { StarBurst } from "@/components/onboarding/star-burst";

export function FinaleModal({
  stars,
  onEnter,
  entering,
}: {
  stars: number;
  onEnter: () => void;
  entering: boolean;
}) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flash-finale"
    >
      <StarBurst token={1} label={`+${stars} 🌟`} />

      <motion.div
        initial={{ scale: 0.8, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.15 }}
        className="flash-finale-inner"
      >
        <span className="flash-finale-icon">
          <GraduationCap className="h-8 w-8" />
        </span>

        <h2 className="flash-finale-title">{t.flash.finaleTitle}</h2>
        <p className="flash-finale-body">{t.flash.finaleBody}</p>

        <p className="flash-finale-stars">
          {stars} <span>🌟 {t.flash.earned}</span>
        </p>

        <button
          type="button"
          onClick={onEnter}
          disabled={entering}
          className="flash-enter"
        >
          <Rocket className="h-5 w-5" />
          {t.flash.cta}
        </button>
      </motion.div>
    </motion.div>
  );
}
