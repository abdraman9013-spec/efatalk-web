"use client";

import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { useI18n } from "@/i18n/provider";
import { haptic } from "@/lib/game-fx";
import type { EmojiSwipeCard } from "@/lib/emoji-words";

const THRESHOLD = 108;

export function SwipeCard({
  card,
  locked,
  onJudge,
}: {
  card: EmojiSwipeCard;
  locked: boolean;
  onJudge: (correct: boolean) => void;
}) {
  const { t } = useI18n();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-280, 0, 280], [-18, 0, 18]);
  const glow = useTransform(x, [-200, 0, 200], ["#ff4d4d", "#f0d78c", "#22c55e"]);
  const trueOp = useTransform(x, [24, 130], [0, 1]);
  const falseOp = useTransform(x, [-130, -24], [1, 0]);
  const lift = useTransform(x, [-220, 0, 220], [1.04, 1, 1.04]);

  function settle(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (locked) return;
    const goRight = info.offset.x > THRESHOLD || info.velocity.x > 780;
    const goLeft = info.offset.x < -THRESHOLD || info.velocity.x < -780;
    if (goRight) {
      haptic("tap");
      onJudge(card.match);
      return;
    }
    if (goLeft) {
      haptic("tap");
      onJudge(!card.match);
    }
  }

  return (
    <div className="relative mx-auto flex h-full min-h-[min(68dvh,640px)] w-full max-w-xl items-center justify-center px-4">
      <motion.article
        key={card.id}
        drag={locked ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.86}
        style={{ x, rotate, scale: lift }}
        onDragEnd={settle}
        initial={{ scale: 0.88, y: 48, opacity: 0, rotate: -6 }}
        animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="relative flex h-[min(72dvh,680px)] w-full touch-none cursor-grab flex-col overflow-hidden rounded-[36px] border border-[#f0d78c]/30 bg-[linear-gradient(180deg,rgba(28,20,10,0.72),rgba(8,6,4,0.9))] shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl active:cursor-grabbing"
      >
        <motion.div className="pointer-events-none absolute inset-0 z-10 mix-blend-soft-light" style={{ backgroundColor: glow, opacity: 0.2 }} />

        <motion.div
          style={{ opacity: trueOp }}
          className="pointer-events-none absolute inset-5 z-20 grid place-items-start justify-items-start"
        >
          <p className="rotate-[-18deg] rounded-2xl border-[3px] border-emerald-400 px-4 py-2 font-display text-3xl tracking-[0.12em] text-emerald-300 shadow-[0_0_28px_rgba(52,211,153,0.55)]">
            VRAI (TRUE) →
          </p>
        </motion.div>
        <motion.div
          style={{ opacity: falseOp }}
          className="pointer-events-none absolute inset-5 z-20 grid place-items-start justify-items-end"
        >
          <p className="rotate-[18deg] rounded-2xl border-[3px] border-red-500 px-4 py-2 font-display text-3xl tracking-[0.12em] text-red-400 shadow-[0_0_28px_rgba(248,113,113,0.55)]">
            ← FAUX (FALSE)
          </p>
        </motion.div>

        <div className="relative z-[1] flex flex-1 flex-col items-center justify-center px-6">
          <p
            className="select-none text-[clamp(7rem,28vw,11rem)] leading-none drop-shadow-[0_0_40px_rgba(240,215,140,0.35)]"
            aria-hidden
          >
            {card.emoji}
          </p>
          <p className="mt-6 text-center font-display text-[clamp(2.4rem,8vw,4.4rem)] tracking-[0.14em] text-[#f6e7a1] drop-shadow-[0_0_22px_rgba(240,215,140,0.35)]">
            {card.word_en}
          </p>
        </div>
        <div className="relative z-[1] border-t border-[#f0d78c]/15 bg-black/25 px-6 py-7 text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/35">{t.play.swipeMeta}</p>
          <p className="mt-2 font-display text-[clamp(1.6rem,5vw,2.4rem)] text-white/90">{card.translation}</p>
          <p className="mt-3 text-[12px] uppercase tracking-[0.22em] text-[#f0d78c]/55">{t.play.swipeHint}</p>
        </div>
      </motion.article>
    </div>
  );
}
