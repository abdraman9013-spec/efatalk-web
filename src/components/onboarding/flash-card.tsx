"use client";

import { motion } from "framer-motion";
import { Check, Mic, Volume2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { AGES, COLORS, fillPhrase, type CurriculumPhrase, type PhraseSlots } from "@/lib/beginner-curriculum";
import { buzz, playFail, speakEnglish } from "@/lib/flash-lesson";
import { canRecognizeSpeech, listenForPhrase } from "@/lib/speech-match";

type Props = {
  card: CurriculumPhrase;
  index: number;
  total: number;
  review: boolean;
  slots: PhraseSlots;
  age: number | null;
  color: string | null;
  onAge: (value: number) => void;
  onColor: (value: string) => void;
  onComplete: () => void;
};

export function FlashCard({
  card,
  index,
  total,
  review,
  slots,
  age,
  color,
  onAge,
  onColor,
  onComplete,
}: Props) {
  const { t } = useI18n();
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [shake, setShake] = useState(0);
  const [failed, setFailed] = useState(false);
  const [heard, setHeard] = useState("");
  const [failKind, setFailKind] = useState<"heard" | "empty" | "engine" | null>(null);

  const english = fillPhrase(card.en, slots);
  const needsAge = card.needs?.includes("age") && !age;
  const needsColor = card.needs?.includes("color") && !color;
  const ready = !needsAge && !needsColor && !unlocked;

  function listen() {
    setListening(true);
    speakEnglish(english);
    window.setTimeout(() => setListening(false), 1800);
  }

  async function repeat() {
    if (!ready || recording) return;
    if (!canRecognizeSpeech()) {
      setFailed(true);
      setFailKind("engine");
      setHeard("");
      playFail();
      return;
    }
    setRecording(true);
    setFailed(false);
    setFailKind(null);
    setHeard("");
    // Do NOT await mic unlock before listen — Android needs SpeechRecognition.start()
    // in the same turn as the tap. listenForPhrase primes the first slice synchronously.
    const flexible = [slots.name, slots.age, slots.color, slots.city, slots.country, slots.status].filter(
      (value): value is string => Boolean(value),
    );
    try {
      const result = await listenForPhrase(english, flexible, 14000, setHeard);
      setRecording(false);
      if (result.reason === "unsupported") {
        setFailed(true);
        setFailKind("engine");
        setHeard("");
        playFail();
        return;
      }
      if (result.reason === "denied") {
        setFailed(true);
        setFailKind("engine");
        setHeard("");
        playFail();
        return;
      }
      if (!result.ok) {
        playFail();
        buzz([40, 30, 40]);
        setShake((prev) => prev + 1);
        setFailed(true);
        setHeard(result.transcript);
        setFailKind(result.transcript ? "heard" : "empty");
        return;
      }
      setUnlocked(true);
      onComplete();
    } catch {
      setRecording(false);
      setFailed(true);
      setFailKind("empty");
      setHeard("");
    }
  }

  return (
    <motion.article
      key={`${card.id}-${shake}`}
      initial={{ opacity: 0, y: 42, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -36, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className={`flash-card ${recording ? "flash-card-live" : ""} ${shake ? "flash-shake" : ""}`}
    >
      <header className="flash-card-head">
        <span className="flash-step">
          {review ? t.flash.memory : t.flash.step} {index + 1} {t.flash.of} {total}
        </span>
        {unlocked && (
          <span className="flash-badge-done">
            <Check className="h-3 w-3" /> {t.flash.done}
          </span>
        )}
      </header>

      <p className="flash-line-en" dir="ltr">
        {english}
      </p>
      <p className="flash-line-sub" dir="ltr">
        {fillPhrase(card.fr, slots)}
      </p>
      <p className="flash-line-sub flash-line-ar" dir="rtl">
        {fillPhrase(card.ar, slots)}
      </p>

      {needsAge && (
        <div className="flash-chips">
          {AGES.map((value) => (
            <button
              key={value}
              type="button"
              className={`flash-chip ${age === value ? "flash-chip-on" : ""}`}
              onClick={() => onAge(value)}
            >
              {value}
            </button>
          ))}
        </div>
      )}

      {needsColor && (
        <div className="flash-chips">
          {COLORS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`flash-color ${color === item.id ? "flash-color-on" : ""}`}
              style={{ background: item.hex }}
              onClick={() => onColor(item.id)}
              aria-label={item.id}
            />
          ))}
        </div>
      )}

      <div className="flash-actions">
        <button
          type="button"
          onClick={listen}
          className={`flash-btn flash-btn-listen ${listening ? "flash-pulse" : ""}`}
        >
          <Volume2 className="h-5 w-5" />
          {t.flash.listen}
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void repeat();
          }}
          disabled={!ready}
          className={`flash-btn flash-btn-mic ${recording ? "flash-mic-live" : ""}`}
        >
          {recording ? (
            <span className="flash-wave" aria-hidden>
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          ) : (
            <Mic className="h-5 w-5" />
          )}
          {recording ? t.flash.recording : t.flash.repeat}
        </button>
      </div>

      {recording && heard ? <p className="flash-live" dir="ltr">{heard}</p> : null}
      {failed && failKind === "engine" && <p className="flash-fail">{t.flash.needChrome}</p>}
      {failed && failKind === "empty" && <p className="flash-fail">{t.flash.noSpeech}</p>}
      {failed && failKind === "heard" && (
        <p className="flash-fail">{t.flash.heard.replace("{text}", heard)}</p>
      )}
    </motion.article>
  );
}
