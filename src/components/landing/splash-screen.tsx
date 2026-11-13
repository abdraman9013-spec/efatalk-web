"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";

export function SplashScreen() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-gradient-to-b from-[#faf8f4] via-[#f7f4ee] to-[#f3efe6]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="relative flex h-52 w-52 items-center justify-center"
            initial={{ scale: 0.72, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="logo-rays" />
            <span className="logo-halo" />
            <Image
              src="/brand/efaa-logo-v6.png"
              alt="English For All Academy"
              width={188}
              height={188}
              priority
              className="relative z-10 h-auto w-[188px] logo-shine"
            />
          </motion.div>
          <motion.p
            className="mt-4 text-[11px] tracking-[0.28em] text-[#9a7418]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            {t.splash.tag}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
