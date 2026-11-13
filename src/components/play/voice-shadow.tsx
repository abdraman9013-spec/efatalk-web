"use client";

import { Fingerprint } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { haptic } from "@/lib/game-fx";

export function VoiceShadow({
  sentence,
  locked,
  onJudge,
}: {
  sentence: string;
  locked: boolean;
  onJudge: (correct: boolean, score: number) => void;
}) {
  const { t } = useI18n();
  const [holding, setHolding] = useState(false);
  const started = useRef(0);

  function start() {
    if (locked) return;
    started.current = Date.now();
    setHolding(true);
    haptic("hold");
  }

  function stop() {
    if (!holding || locked) return;
    setHolding(false);
    if (Date.now() - started.current < 420) return;
    const score = Math.random() < 0.55 ? 92 + Math.round(Math.random() * 7) : 68 + Math.round(Math.random() * 18);
    onJudge(score >= 90, score);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center px-5">
      <p className="text-center text-[12px] uppercase tracking-[0.28em] text-[#f0d78c]/70">{t.play.shadowHint}</p>
      <p className="mt-4 text-center font-display text-[28px] leading-tight text-[#f6e7a1]">{sentence}</p>
      <motion.button
        type="button"
        disabled={locked}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
        animate={holding ? { scale: [1, 1.08, 1], boxShadow: ["0 0 0px #f0d78c", "0 0 40px #f0d78c", "0 0 0px #f0d78c"] } : { scale: 1 }}
        transition={{ duration: 0.7, repeat: holding ? Infinity : 0 }}
        className="mt-10 grid h-36 w-36 place-items-center rounded-full border border-[#f0d78c]/50 bg-[radial-gradient(circle_at_30%_20%,#3a2a12,black)] text-[#f6e7a1]"
      >
        <Fingerprint className="h-16 w-16" />
      </motion.button>
      <p className="mt-4 text-[12px] uppercase tracking-[0.24em] text-white/40">{holding ? t.play.listening : t.play.hold}</p>
    </div>
  );
}
