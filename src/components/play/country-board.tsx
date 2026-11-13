"use client";

import { motion } from "framer-motion";
import type { RefObject } from "react";
import { FlagMark } from "@/components/ui/flag-mark";
import type { CountryScore } from "@/lib/game-mode";

export function CountryBoard({
  board,
  mine,
  boardRef,
}: {
  board: CountryScore[];
  mine?: string;
  boardRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={boardRef} className="grid grid-cols-3 gap-2">
      {board.map((row, index) => {
        const hot = row.country_code === mine;
        return (
          <motion.div
            key={row.country_code}
            data-country={row.country_code}
            layout
            className={`rounded-2xl border px-2 py-2 text-center backdrop-blur-xl ${
              hot
                ? "border-[#f0d78c]/70 bg-[#f0d78c]/12 shadow-[0_0_24px_rgba(240,215,140,0.28)]"
                : "border-white/10 bg-white/5"
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#f0d78c]/70">#{index + 1}</p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-[13px] font-semibold text-white">
              <FlagMark code={row.country_code} />
              <span className="truncate">{row.country_name}</span>
            </p>
            <p className="font-display text-lg text-[#f6e7a1]">{row.total_score}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
