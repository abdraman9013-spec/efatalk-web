"use client";

import { JoinMatchCta } from "@/components/lobby/join-match-cta";
import { AnimatePresence, Reorder, motion } from "framer-motion";
import { Lock, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/i18n/provider";
import { playLevelUp } from "@/lib/flash-lesson";
import { haptic, playErrorSound, playSuccessSound } from "@/lib/game-fx";
import {
  MID_GATE_PHRASES,
  MID_GATE_SECONDS,
  nextMidPhrase,
  scrambleWords,
  writeMidUnlock,
  type MidGatePhrase,
} from "@/lib/mid-gate";

export function MidGate({
  userId,
  unlocked,
  matchReady,
  requestOpen = 0,
  onUnlocked,
  onEnter,
}: {
  userId: string;
  unlocked: boolean;
  matchReady: boolean;
  requestOpen?: number;
  onUnlocked: () => void;
  onEnter: () => void;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState<MidGatePhrase>(MID_GATE_PHRASES[0]);
  const [bank, setBank] = useState<string[]>([]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [left, setLeft] = useState(MID_GATE_SECONDS);
  const [shake, setShake] = useState(0);
  const [flash, setFlash] = useState<"win" | "lose" | null>(null);
  const [shatter, setShatter] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [armed, setArmed] = useState(false);
  const startedAt = useRef(0);
  const locked = useRef(false);
  const phraseId = useRef(phrase.id);
  const prompt = locale === "ar" ? phrase.ar : phrase.fr;
  const panic = left <= 3;
  phraseId.current = phrase.id;

  const deal = useCallback((next: MidGatePhrase) => {
    setPhrase(next);
    setBank(scrambleWords(next.words));
    setPlaced([]);
    locked.current = false;
    startedAt.current = Date.now();
    setLeft(MID_GATE_SECONDS);
  }, []);

  const openTest = useCallback(() => {
    if (unlocked) return;
    deal(MID_GATE_PHRASES[Math.floor(Math.random() * MID_GATE_PHRASES.length)]);
    setOpen(true);
    haptic("tap");
  }, [deal, unlocked]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!unlocked) setShatter(false);
  }, [unlocked]);

  useEffect(() => {
    if (open) setArmed(false);
  }, [open]);

  useEffect(() => {
    if (requestOpen > 0 && !unlocked) openTest();
  }, [openTest, requestOpen, unlocked]);

  const fail = useCallback(() => {
    if (locked.current) return;
    locked.current = true;
    playErrorSound();
    haptic("lose");
    setFlash("lose");
    setShake((n) => n + 1);
    window.setTimeout(() => {
      setFlash(null);
      deal(nextMidPhrase(phraseId.current));
    }, 420);
  }, [deal]);

  const win = useCallback(() => {
    if (locked.current) return;
    locked.current = true;
    playSuccessSound();
    playLevelUp();
    haptic("win");
    setFlash("win");
    setConfetti(36);
    writeMidUnlock(userId);
    window.setTimeout(() => {
      setOpen(false);
      setConfetti(0);
      setFlash(null);
      setShatter(true);
      onUnlocked();
    }, 900);
    window.setTimeout(() => setShatter(false), 1600);
  }, [onUnlocked, userId]);

  useEffect(() => {
    if (!open || !armed) return;
    startedAt.current = Date.now();
    locked.current = false;
    setLeft(MID_GATE_SECONDS);
    const id = window.setInterval(() => {
      const remain = Math.max(0, MID_GATE_SECONDS - (Date.now() - startedAt.current) / 1000);
      setLeft(remain);
      if (remain <= 0 && !locked.current) fail();
    }, 50);
    return () => window.clearInterval(id);
  }, [armed, fail, open, phrase.id]);

  function close() {
    setOpen(false);
    setFlash(null);
    setConfetti(0);
  }

  function take(word: string, index: number) {
    if (locked.current) return;
    haptic("tap");
    setBank((prev) => prev.filter((_, i) => i !== index));
    setPlaced((prev) => {
      const next = [...prev, word];
      if (next.length === phrase.words.length && next.join(" ") === phrase.words.join(" ")) {
        window.setTimeout(win, 40);
      }
      return next;
    });
  }

  function giveBack(word: string, index: number) {
    if (locked.current) return;
    haptic("tap");
    setPlaced((prev) => prev.filter((_, i) => i !== index));
    setBank((prev) => [...prev, word]);
  }

  function onReorder(next: string[]) {
    if (locked.current) return;
    setPlaced(next);
    if (next.length === phrase.words.length && next.join(" ") === phrase.words.join(" ")) {
      window.setTimeout(win, 40);
    }
  }

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-3">
      <motion.div
        key={shake}
        animate={shake && !unlocked ? { x: [0, -10, 12, -8, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.38 }}
        className="relative w-full"
      >
        <JoinMatchCta
          locked={!unlocked}
          disabled={!matchReady}
          onJoin={onEnter}
          onLockedClick={openTest}
        />
        {shatter ? (
          <span className="pointer-events-none absolute left-6 top-1/2 z-10 inline-grid h-5 w-5 -translate-y-1/2 place-items-center">
            <AnimatePresence>
              {shatter ? (
                <>
                  <motion.span
                    key="lock-l"
                    className="absolute inset-0 overflow-hidden"
                    initial={{ x: 0, rotate: 0, opacity: 1 }}
                    animate={{ x: -28, y: -18, rotate: -48, opacity: 0 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    style={{ clipPath: "inset(0 50% 0 0)" }}
                  >
                    <Lock className="h-5 w-5 text-[#f6e7a1]" />
                  </motion.span>
                  <motion.span
                    key="lock-r"
                    className="absolute inset-0 overflow-hidden"
                    initial={{ x: 0, rotate: 0, opacity: 1 }}
                    animate={{ x: 28, y: -14, rotate: 52, opacity: 0 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    style={{ clipPath: "inset(0 0 0 50%)" }}
                  >
                    <Lock className="h-5 w-5 text-[#f6e7a1]" />
                  </motion.span>
                </>
              ) : null}
            </AnimatePresence>
          </span>
        ) : null}
      </motion.div>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] isolate min-h-dvh w-screen overflow-hidden bg-[#07060a] text-white"
            style={{ pointerEvents: "auto" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(240,215,140,0.2),transparent_42%),radial-gradient(circle_at_80%_100%,rgba(239,68,68,0.12),transparent_36%)]" />
            {flash ? (
              <motion.div
                key={flash}
                initial={{ opacity: 0.55 }}
                animate={{ opacity: 0 }}
                className={`pointer-events-none absolute inset-0 z-30 ${flash === "win" ? "bg-emerald-400/40" : "bg-red-500/50"}`}
              />
            ) : null}
            {Array.from({ length: confetti }).map((_, i) => (
              <motion.span
                key={`c-${confetti}-${i}`}
                className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-2 w-2 rounded-full bg-[#f0d78c]"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: (Math.random() - 0.5) * 480,
                  y: (Math.random() - 0.15) * -420,
                  opacity: 0,
                  rotate: 240,
                  scale: 0.2,
                }}
                transition={{ duration: 1.05, ease: "easeOut" }}
              />
            ))}

            <motion.div
              key={shake}
              animate={shake ? { x: [0, -12, 14, -10, 7, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))]"
            >
              <header className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.32em] text-[#f0d78c]/70">{t.midGate.kicker}</p>
                  <h2 className="font-display text-2xl text-[#f6e7a1]">{t.midGate.title}</h2>
                </div>
                <button type="button" onClick={close} className="rounded-full border border-white/15 p-2 text-white/70">
                  <X className="h-4 w-4" />
                </button>
              </header>

              {!armed ? (
                <div className="mt-10 flex flex-1 flex-col items-center justify-center text-center">
                  <p dir={locale === "ar" ? "rtl" : "ltr"} className="font-display text-3xl leading-tight text-[#f6e7a1]">
                    {prompt}
                  </p>
                  <p className="mt-4 text-sm text-white/45">{t.play.startFirst}</p>
                  <button
                    type="button"
                    className="game-start-btn mt-8"
                    onClick={() => {
                      startedAt.current = Date.now();
                      setArmed(true);
                    }}
                  >
                    {t.play.go}
                  </button>
                </div>
              ) : (
                <>
              <div className="h-5 overflow-hidden rounded-full bg-white/10 shadow-[inset_0_0_12px_rgba(0,0,0,0.35)]">
                <motion.div
                  className={`h-full origin-left rounded-full ${panic ? "bg-[#ff4d4d]" : "bg-[#f6e7a1]"}`}
                  animate={{
                    width: `${(left / MID_GATE_SECONDS) * 100}%`,
                    boxShadow: panic
                      ? ["0 0 8px #ff4d4d", "0 0 28px #ff4d4d", "0 0 8px #ff4d4d"]
                      : "0 0 22px rgba(246,231,161,0.85)",
                    scaleY: panic ? [1, 1.18, 1] : 1,
                  }}
                  transition={{ duration: 0.12, repeat: panic ? Infinity : 0, repeatType: "mirror" }}
                />
              </div>
              <p className={`mt-2 text-center font-display text-3xl ${panic ? "animate-pulse text-red-300" : "text-[#f6e7a1]"}`}>
                {Math.ceil(left)}
              </p>

              <p dir={locale === "ar" ? "rtl" : "ltr"} className="mt-5 text-center font-display text-3xl leading-tight text-[#f6e7a1]">
                {prompt}
              </p>
              <p className="mt-2 text-center text-sm text-white/45">{t.midGate.hint}</p>

              <Reorder.Group
                axis="x"
                values={placed}
                onReorder={onReorder}
                className="mt-6 flex min-h-[88px] flex-wrap content-start justify-center gap-2 rounded-[24px] border border-[#f0d78c]/30 bg-white/5 p-3"
              >
                {placed.length === 0 ? (
                  <p className="self-center text-sm text-white/35">{t.midGate.drop}</p>
                ) : (
                  placed.map((word) => (
                    <Reorder.Item key={word} value={word} className="list-none">
                      <button
                        type="button"
                        onClick={() => giveBack(word, placed.indexOf(word))}
                        className="rounded-full border border-[#f0d78c]/40 bg-[#f0d78c] px-4 py-2 text-sm font-bold text-[#1a1406]"
                      >
                        {word}
                      </button>
                    </Reorder.Item>
                  ))
                )}
              </Reorder.Group>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {bank.map((word, index) => (
                  <motion.button
                    key={`${word}-${index}`}
                    type="button"
                    drag
                    dragSnapToOrigin
                    onDragEnd={(_, info) => {
                      if (info.offset.y < -36) take(word, index);
                    }}
                    onClick={() => take(word, index)}
                    whileTap={{ scale: 0.94 }}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
                  >
                    {word}
                  </motion.button>
                ))}
              </div>
                </>
              )}
            </motion.div>
          </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
