"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { haptic } from "@/lib/game-fx";
import { PUZZLE_SECONDS, shuffle, type PuzzleCard } from "@/lib/game-mode";

export function ChronoPuzzle({
  card,
  locked,
  onJudge,
}: {
  card: PuzzleCard;
  locked: boolean;
  onJudge: (correct: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const [picked, setPicked] = useState<string[]>([]);
  const [left, setLeft] = useState(PUZZLE_SECONDS);
  const [started, setStarted] = useState(false);
  const judged = useRef(false);
  const onJudgeRef = useRef(onJudge);
  onJudgeRef.current = onJudge;
  const bank = useMemo(() => shuffle(card.words), [card]);

  useEffect(() => {
    setPicked([]);
    setLeft(PUZZLE_SECONDS);
    judged.current = false;
  }, [card.id]);

  useEffect(() => {
    if (!started || locked || judged.current) return;
    const id = window.setInterval(() => {
      setLeft((sec) => {
        if (sec <= 1) {
          window.clearInterval(id);
          if (!judged.current) {
            judged.current = true;
            onJudgeRef.current(false);
          }
          return 0;
        }
        return sec - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [card.id, locked, started]);

  function choose(word: string, fromBank: boolean) {
    if (!started || locked || judged.current) return;
    haptic("tap");
    if (fromBank) {
      const next = [...picked, word];
      setPicked(next);
      if (next.length === card.words.length) {
        judged.current = true;
        onJudge(next.join(" ") === card.words.join(" "));
      }
      return;
    }
    setPicked((prev) => prev.filter((item) => item !== word));
  }

  const unused = bank.filter((word) => {
    const used = picked.filter((item) => item === word).length;
    const total = bank.filter((item) => item === word).length;
    return used < total;
  });
  const panic = left <= 3;

  if (!started) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center px-4 text-center">
        <p className="text-[12px] uppercase tracking-[0.28em] text-[#f0d78c]/70">{t.play.puzzleHint}</p>
        <p dir={locale === "ar" ? "rtl" : "ltr"} className="mt-3 font-display text-3xl text-[#f6e7a1]">
          {card.prompt[locale]}
        </p>
        <p className="mt-4 text-sm text-white/50">{t.play.startFirst}</p>
        <button type="button" className="game-start-btn mt-6" onClick={() => setStarted(true)}>
          {t.play.go}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4">
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={`h-full origin-left rounded-full ${panic ? "bg-[#ff4d4d]" : "bg-[#f43f5e]"}`}
          animate={{
            width: `${(left / PUZZLE_SECONDS) * 100}%`,
            boxShadow: panic ? ["0 0 0px #ff4d4d", "0 0 18px #ff4d4d", "0 0 0px #ff4d4d"] : "0 0 12px rgba(244,63,94,0.6)",
          }}
          transition={{ duration: 0.35, repeat: panic ? Infinity : 0, repeatType: "mirror" }}
        />
      </div>
      <p className="text-center text-[12px] uppercase tracking-[0.28em] text-[#f0d78c]/70">{t.play.puzzleHint}</p>
      <p dir={locale === "ar" ? "rtl" : "ltr"} className="mt-3 text-center font-display text-3xl text-[#f6e7a1]">
        {card.prompt[locale]}
      </p>
      <div className="mt-6 min-h-[72px] rounded-[24px] border border-[#f0d78c]/25 bg-white/5 p-3">
        <div className="flex min-h-[48px] flex-wrap justify-center gap-2">
          {picked.map((word) => (
            <motion.button
              key={`in-${word}-${picked.join("-")}`}
              type="button"
              layout
              onClick={() => choose(word, false)}
              className="rounded-full border border-[#f0d78c]/40 bg-[#f0d78c] px-4 py-2 text-sm font-bold text-[#1a1406]"
            >
              {word}
            </motion.button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {unused.map((word, index) => (
          <motion.button
            key={`${word}-${index}`}
            type="button"
            drag={!locked}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y < -40) choose(word, true);
            }}
            onClick={() => choose(word, true)}
            whileTap={{ scale: 0.94 }}
            className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md"
          >
            {word}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
