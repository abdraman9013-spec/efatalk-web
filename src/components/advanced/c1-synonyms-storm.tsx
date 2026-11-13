"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { haptic, playErrorSound, playSuccessSound } from "@/lib/game-fx";
import {
  C1_SYNONYMS_STORM,
  STORM_ROUND_MS,
  dealNextStormWord,
  readStormHighScore,
  scoreStormHit,
  startStormRun,
  writeStormHighScore,
  type StormRun,
  type StormWord,
} from "@/lib/c1-synonyms-storm";

type Phase = "ready" | "playing" | "over";

export function C1SynonymsStorm({
  variant = "lobby",
  locked = false,
}: {
  variant?: "lobby" | "page";
  locked?: boolean;
}) {
  const { t } = useI18n();
  const runRef = useRef<StormRun>(startStormRun());
  const startedAtRef = useRef(0);
  const phaseRef = useRef<Phase>("ready");
  const scoreRef = useRef(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [card, setCard] = useState<StormWord | null>(null);
  const [failed, setFailed] = useState<StormWord | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [timerPct, setTimerPct] = useState(1);
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dealKey, setDealKey] = useState(0);

  useEffect(() => {
    setBest(readStormHighScore());
  }, []);

  const serve = useCallback(() => {
    const dealt = dealNextStormWord(runRef.current, C1_SYNONYMS_STORM);
    runRef.current = dealt.run;
    setCard(dealt.card);
    setFailed(null);
    setBusy(false);
    setTimerPct(1);
    startedAtRef.current = Date.now();
    setDealKey((n) => n + 1);
    phaseRef.current = "playing";
    setPhase("playing");
  }, []);

  const endRun = useCallback((missed: StormWord | null, finalScore: number) => {
    if (phaseRef.current === "over") return;
    phaseRef.current = "over";
    setPhase("over");
    setFailed(missed);
    setBusy(true);
    setCombo(0);
    setBest(writeStormHighScore(finalScore));
    playErrorSound();
    haptic("lose");
  }, []);

  useEffect(() => {
    if (phase !== "playing" || !card || locked) return;
    const started = startedAtRef.current;
    let frame = 0;
    const tick = () => {
      if (phaseRef.current !== "playing") return;
      const elapsed = Date.now() - started;
      setTimerPct(Math.max(0, 1 - elapsed / STORM_ROUND_MS));
      if (elapsed >= STORM_ROUND_MS) {
        endRun(card, scoreRef.current);
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [card, dealKey, endRun, locked, phase]);

  function begin() {
    if (locked) return;
    runRef.current = startStormRun();
    phaseRef.current = "playing";
    scoreRef.current = 0;
    setScore(0);
    setCombo(0);
    setFlash(false);
    serve();
  }

  function pick(index: number) {
    if (phase !== "playing" || !card || busy || locked) return;
    setBusy(true);
    if (index !== card.correctAnswerIndex) {
      endRun(card, scoreRef.current);
      return;
    }
    const elapsed = Date.now() - startedAtRef.current;
    const hit = scoreStormHit(elapsed, combo);
    playSuccessSound();
    haptic("win");
    setFlash(true);
    window.setTimeout(() => setFlash(false), 160);
    setCombo(hit.combo);
    const nextScore = score + hit.gained;
    scoreRef.current = nextScore;
    setScore(nextScore);
    serve();
  }

  if (locked) return null;

  return (
    <section className={`storm-wrap ${variant === "page" ? "storm-page" : ""} ${flash ? "storm-flash-ok" : ""}`}>
      <div className="storm-hud">
        <span>{t.play.stormTitle}</span>
        <span>
          {t.play.stormScore} {score} · {t.play.stormBest} {best}
        </span>
      </div>

      {phase === "ready" ? (
        <div className="storm-over">
          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6a12]">{t.play.stormKicker}</p>
          <h2>{t.play.stormTitle}</h2>
          <p className="mt-2 text-sm font-semibold text-[#1e6a80]">{t.play.stormHint}</p>
          <button type="button" className="storm-retry" onClick={begin}>
            {t.play.stormStart}
          </button>
        </div>
      ) : null}

      {phase === "playing" && card ? (
        <>
          <div className="storm-timer" aria-hidden>
            <span style={{ transform: `scaleX(${timerPct})` }} />
          </div>
          {combo >= 2 ? (
            <p className="storm-combo mt-3 text-center text-sm font-black">
              {t.play.stormCombo.replace("{n}", String(combo))}
            </p>
          ) : (
            <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[#1e6a80]/70">
              {t.play.stormClock}
            </p>
          )}
          <p className="storm-word" dir="ltr">
            {card.word}
          </p>
          <div className="storm-options">
            {card.options.map((option, index) => (
              <button
                key={`${card.id}-${option}-${index}`}
                type="button"
                className="storm-opt"
                disabled={busy}
                onClick={() => pick(index)}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {phase === "over" ? (
        <div className="storm-over">
          <p className="mt-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#8a6a12]">{t.play.stormOver}</p>
          <h2>
            {t.play.stormScore} {score}
          </h2>
          <p className="mt-1 text-sm font-bold text-[#8a6a12]">
            {t.play.stormBest} {best}
          </p>
          {failed ? (
            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#134e63]">
              <span dir="ltr">{failed.word}</span>
              {" — "}
              {failed.definition}
              {" · "}
              {failed.options[failed.correctAnswerIndex]}
            </p>
          ) : (
            <p className="mt-3 text-sm font-semibold text-[#134e63]">{t.play.stormTimeout}</p>
          )}
          <button type="button" className="storm-retry" onClick={begin}>
            {t.play.stormAgain}
          </button>
        </div>
      ) : null}
    </section>
  );
}
