"use client";

import { JoinMatchCta } from "@/components/lobby/join-match-cta";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Mic, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/i18n/provider";
import { playApplause, playErrorSound, playSuccessSound, haptic } from "@/lib/game-fx";
import { speakEnglish } from "@/lib/flash-lesson";
import { canRecognizeSpeech, listenForPhrase } from "@/lib/speech-match";
import { SURVIVAL_PHRASES, writeSurvivalUnlock } from "@/lib/survival-gate";

type Phase = "train" | "test" | "win";

export function SurvivalGate({
  userId,
  unlocked,
  matchReady,
  onUnlocked,
  onEnter,
}: {
  userId: string;
  unlocked: boolean;
  matchReady: boolean;
  onUnlocked: () => void;
  onEnter: () => void;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("train");
  const [card, setCard] = useState(0);
  const [passed, setPassed] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [shake, setShake] = useState(0);
  const [error, setError] = useState("");
  const [heard, setHeard] = useState("");
  const [shatter, setShatter] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [mounted, setMounted] = useState(false);
  const phrase = SURVIVAL_PHRASES[phase === "test" ? Math.min(passed.length, SURVIVAL_PHRASES.length - 1) : card];

  useEffect(() => {
    setMounted(true);
  }, []);
  const prompt = locale === "ar" ? phrase.ar : phrase.fr;

  useEffect(() => {
    if (!unlocked) setShatter(false);
  }, [unlocked]);

  function close() {
    setOpen(false);
    setPhase("train");
    setCard(0);
    setPassed([]);
    setListening(false);
    setError("");
    setHeard("");
  }

  function celebrate() {
    setPhase("win");
    setConfetti(42);
    setShake((n) => n + 1);
    playApplause();
    haptic("win");
    writeSurvivalUnlock(userId);
    void import("@/lib/challenge-api").then(({ reportFirstEnglish }) => {
      void reportFirstEnglish("survival");
    });
    window.setTimeout(() => {
      setOpen(false);
      setPhase("train");
      setPassed([]);
      setConfetti(0);
      setShatter(true);
      onUnlocked();
    }, 1200);
    window.setTimeout(() => setShatter(false), 1900);
  }

  async function tapSpeak() {
    if (listening || phase !== "test") return;
    setError("");
    setHeard("");
    if (!canRecognizeSpeech()) {
      setError(t.survival.needChrome);
      playErrorSound();
      return;
    }
    // Start listen from the tap — no await unlock before SpeechRecognition (Android).
    setListening(true);
    haptic("tap");
    try {
      const result = await listenForPhrase(
        phrase.en,
        ["hi", "hello", "thanks", "thank you", "im"],
        14000,
        setHeard,
      );
      setListening(false);
      const transcript = (result.transcript || "").trim();
      setHeard(transcript);
      if (result.reason === "unsupported") {
        setError(t.survival.needChrome);
        playErrorSound();
        return;
      }
      if (result.reason === "denied") {
        setError(t.survival.micDenied);
        playErrorSound();
        haptic("lose");
        return;
      }
      if (result.ok) {
        playSuccessSound();
        haptic("win");
        const next = passed.includes(phrase.id) ? passed : [...passed, phrase.id];
        setPassed(next);
        setError("");
        if (next.length >= SURVIVAL_PHRASES.length) celebrate();
        return;
      }
      if (!transcript) {
        setError(t.survival.noSpeech);
        playErrorSound();
        setShake((n) => n + 1);
        return;
      }
      setError(t.survival.heard.replace("{text}", transcript));
      playErrorSound();
      haptic("lose");
      setShake((n) => n + 1);
    } catch {
      setListening(false);
      setError(t.survival.noSpeech);
    }
  }

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-3">
      <motion.div
        key={shake}
        animate={shake && !unlocked ? { x: [0, -8, 10, -6, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full"
      >
        <JoinMatchCta
          locked={!unlocked}
          disabled={!matchReady}
          onJoin={onEnter}
          onLockedClick={() => {
            setOpen(true);
            setPhase("train");
            haptic("tap");
          }}
        />
        {(shatter) ? (
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
            className="fixed inset-0 z-[200] isolate min-h-dvh w-screen overflow-y-auto bg-[#07060a] text-white"
            style={{ pointerEvents: "auto" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(240,215,140,0.18),transparent_42%),radial-gradient(circle_at_80%_100%,rgba(16,185,129,0.12),transparent_36%)]" />
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
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
            ))}

            <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))]">
              <header className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.32em] text-[#f0d78c]/70">{t.survival.kicker}</p>
                  <h2 className="font-display text-2xl text-[#f6e7a1]">
                    {phase === "test" ? t.survival.testTitle : t.survival.trainTitle}
                  </h2>
                </div>
                <button type="button" onClick={close} className="rounded-full border border-white/15 p-2 text-white/70">
                  <X className="h-4 w-4" />
                </button>
              </header>

              <p className="text-center text-sm text-white/50">
                {phase === "test"
                  ? t.survival.progress.replace("{n}", String(passed.length)).replace("{t}", String(SURVIVAL_PHRASES.length))
                  : t.survival.trainHint}
              </p>

              <motion.div
                key={`${phase}-${phrase.id}-${shake}`}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="mt-6 flex flex-1 flex-col"
              >
                {phase === "train" ? (
                  <motion.article
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.72}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -80) setCard((n) => Math.min(SURVIVAL_PHRASES.length - 1, n + 1));
                      if (info.offset.x > 80) setCard((n) => Math.max(0, n - 1));
                    }}
                    className="rounded-[32px] border border-[#f0d78c]/25 bg-[#120e08] px-6 py-10 text-center shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
                  >
                    <p dir="ltr" className="font-display text-3xl leading-tight text-[#f6e7a1]">
                      {phrase.en}
                    </p>
                    <p dir={locale === "ar" ? "rtl" : "ltr"} className="mt-4 text-lg text-white/70">
                      {prompt}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        speakEnglish(phrase.en);
                        haptic("tap");
                      }}
                      className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#f0d78c]/30 bg-[#f0d78c]/10 px-5 py-3 font-semibold text-[#f6e7a1]"
                    >
                      <Volume2 className="h-5 w-5" />
                      {t.survival.listen}
                    </button>
                  </motion.article>
                ) : (
                  <article className="rounded-[32px] border border-emerald-400/20 bg-[#08140f] px-6 py-10 text-center">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/70">{t.survival.sayThis}</p>
                    <p dir={locale === "ar" ? "rtl" : "ltr"} className="mt-4 font-display text-3xl leading-tight text-[#f6e7a1]">
                      {prompt}
                    </p>
                    <motion.button
                      type="button"
                      disabled={listening}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void tapSpeak();
                      }}
                      animate={
                        listening
                          ? { scale: [1, 1.08, 1], boxShadow: ["0 0 0px #34d399", "0 0 42px #34d399", "0 0 0px #34d399"] }
                          : { scale: 1 }
                      }
                      transition={{ duration: 0.7, repeat: listening ? Infinity : 0 }}
                      className="mx-auto mt-10 grid h-40 w-40 place-items-center rounded-full border border-emerald-300/40 bg-[radial-gradient(circle_at_30%_20%,#14532d,black)] text-emerald-200"
                    >
                      <Mic className="h-16 w-16" />
                    </motion.button>
                    <p className="mt-4 text-[12px] uppercase tracking-[0.24em] text-white/40">
                      {listening ? t.survival.listening : t.survival.hold}
                    </p>
                    {listening && heard ? (
                      <p dir="ltr" className="mt-3 text-base font-semibold text-emerald-200">
                        {heard}
                      </p>
                    ) : null}
                    {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
                  </article>
                )}
              </motion.div>

              <div className="mt-5 flex justify-center gap-2">
                {SURVIVAL_PHRASES.map((item, index) => (
                  <span
                    key={item.id}
                    className={`h-2 w-2 rounded-full ${
                      phase === "train"
                        ? index === card
                          ? "bg-[#f6e7a1]"
                          : "bg-white/20"
                        : passed.includes(item.id)
                          ? "bg-emerald-400"
                          : index === passed.length
                            ? "bg-[#f6e7a1]"
                            : "bg-white/20"
                    }`}
                  />
                ))}
              </div>

              {phase === "train" ? (
                <button
                  type="button"
                  onClick={() => {
                    setPhase("test");
                    setPassed([]);
                    setError("");
                    haptic("tap");
                  }}
                  className="mt-6 w-full rounded-full bg-[#f6e7a1] px-5 py-4 text-base font-extrabold text-[#1a1406]"
                >
                  {t.survival.startTest}
                </button>
              ) : null}
            </div>
          </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
