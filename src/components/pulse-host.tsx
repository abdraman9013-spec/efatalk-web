"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { onPulse, type PulseEvent } from "@/lib/pulse";

export function PulseHost() {
  const [items, setItems] = useState<PulseEvent[]>([]);

  useEffect(() => {
    return onPulse((event) => {
      setItems((prev) => [...prev.slice(-2), event]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== event.id));
      }, 3800);
    });
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(18px,env(safe-area-inset-top))] z-[220] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {items.map((item) => (
          <motion.p
            key={item.id}
            role="status"
            initial={{ y: -18, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -12, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="max-w-md rounded-full border border-[#f0d78c]/45 bg-[rgba(10,8,20,0.92)] px-5 py-2.5 text-center text-sm font-semibold text-[#f6e7a1] shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          >
            {item.text}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}
