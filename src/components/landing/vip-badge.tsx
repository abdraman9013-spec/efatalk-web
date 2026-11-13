"use client";

import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { readCurrentStudent } from "@/lib/session";
import { isAcademyLevel } from "@/lib/whatsapp-groups";

/** Decorative VIP seal. Hidden when the student has a level WhatsApp group FAB instead. */
export function VipBadge() {
  const { t, dir } = useI18n();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const student = readCurrentStudent();
    setHidden(isAcademyLevel(student?.level));
  }, []);

  if (hidden) return null;

  return (
    <motion.aside
      className={`fixed bottom-24 z-50 ${dir === "rtl" ? "left-4" : "right-4"}`}
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.6 }}
    >
      <motion.div
        className="relative flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full border border-gold/50 bg-[radial-gradient(circle_at_30%_25%,#f6e7a1, #b8922a_55%,#6d5410)] text-[#1a1406] shadow-[0_10px_30px_rgba(212,175,55,0.35)]"
        animate={{ y: [0, -6, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="absolute inset-[3px] rounded-full border border-[#1a1406]/20" />
        <Crown className="h-4 w-4" strokeWidth={1.75} />
        <span className="font-display text-sm font-semibold tracking-[0.22em]">
          {t.vip.label}
        </span>
        <span className="text-[8px] font-medium uppercase tracking-[0.16em] text-[#3d2d08]/80">
          {t.vip.hint}
        </span>
      </motion.div>
    </motion.aside>
  );
}
