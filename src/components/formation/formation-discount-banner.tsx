"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/i18n/provider";
import {
  FORMATION_DISCOUNT_END_MS,
  formationDiscountParts,
} from "@/lib/formation-discount";

export function FormationDiscountBanner() {
  const { t } = useI18n();
  const fp = t.formationPrivate;
  const [endMs, setEndMs] = useState(FORMATION_DISCOUNT_END_MS);
  const [active, setActive] = useState(true);
  const [parts, setParts] = useState(() => formationDiscountParts(FORMATION_DISCOUNT_END_MS));

  useEffect(() => {
    void fetch("/api/formation/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { discountEndsAt?: string; discountActive?: boolean }) => {
        if (j.discountEndsAt) setEndMs(new Date(j.discountEndsAt).getTime());
        if (typeof j.discountActive === "boolean") setActive(j.discountActive);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setParts(formationDiscountParts(endMs)), 1000);
    return () => window.clearInterval(id);
  }, [endMs]);

  if (!active || parts.expired) {
    return (
      <motion.p
        className="formation-text-dark text-center text-[13px] font-semibold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {fp.discountExpired}
      </motion.p>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <motion.div
      className="formation-glass mx-auto max-w-xl rounded-2xl px-4 py-3 text-center"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <p className="formation-text-dark text-[12px] font-bold uppercase tracking-wide text-[#b8860b]">
        {fp.discount}
      </p>
      <p className="formation-text-dark mt-1 text-[13px] font-semibold leading-snug">{fp.discountExplain}</p>
      <p className="formation-text-dark mt-2 text-[12px] font-medium">{fp.discountEnds}</p>
      <p className="mt-2 font-display text-2xl tabular-nums text-[#0c4a6e]" dir="ltr">
        {parts.days}j {pad(parts.hours)}:{pad(parts.minutes)}:{pad(parts.seconds)}
      </p>
    </motion.div>
  );
}
