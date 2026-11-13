"use client";

import { AnimatePresence, motion } from "framer-motion";

export function ComboHud({ combo }: { combo: number }) {
  const hot = combo >= 2;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-10 z-20 flex justify-center">
      <AnimatePresence>
        {hot ? (
          <motion.p
            key={combo}
            initial={{ scale: 0.35, opacity: 0, y: 18, rotate: -8 }}
            animate={{
              scale: Math.min(1.08 + combo * 0.08, 1.85),
              opacity: 1,
              y: 0,
              rotate: 0,
            }}
            exit={{ scale: 1.6, opacity: 0, rotate: 18, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 420, damping: 16 }}
            className="font-display text-[clamp(1.8rem,6vw,3.4rem)] tracking-[0.08em] text-[#f6e7a1] drop-shadow-[0_0_28px_rgba(240,215,140,0.7)]"
          >
            <motion.span
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ repeat: Infinity, duration: 0.55, ease: "easeInOut" }}
              className="inline-block"
            >
              COMBO x{combo} 🔥
            </motion.span>
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
