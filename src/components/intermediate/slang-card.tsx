"use client";

import { motion } from "framer-motion";
import { Mic, Volume2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { speakEnglish } from "@/lib/flash-lesson";
import { playFail, buzz } from "@/lib/flash-lesson";
import { slangKindLabel, type SlangItem } from "@/lib/intermediate-slang";
import { canRecognizeSpeech, listenForPhrase, speechMatches } from "@/lib/speech-match";

type Props = {
  item: SlangItem;
  index: number;
  total: number;
  unlocked: boolean;
  onWin: () => void;
};

export function SlangCard({ item, index, total, unlocked, onWin }: Props) {
  const { t, locale } = useI18n();
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [live, setLive] = useState("");
  const [fail, setFail] = useState("");

  function listen() {
    setListening(true);
    speakEnglish(`${item.phrase}. ${item.example}`);
    window.setTimeout(() => setListening(false), 2200);
  }

  async function repeat() {
    if (unlocked || recording) return;
    if (!canRecognizeSpeech()) {
      setFail(t.mid.needChrome);
      playFail();
      return;
    }
    setRecording(true);
    setLive("");
    setFail("");
    try {
      const result = await listenForPhrase(item.phrase, item.aliases, 14000, setLive, [item.example, ...item.aliases]);
      setRecording(false);
      if (result.reason === "unsupported" || result.reason === "denied") {
        setFail(t.mid.needChrome);
        playFail();
        return;
      }
      const heard = result.transcript || "";
      const ok =
        result.ok ||
        item.aliases.some((alias) => speechMatches(heard, alias).ok) ||
        speechMatches(heard, item.example, item.aliases).ok;
      if (!ok) {
        playFail();
        buzz([40, 30, 40]);
        setFail(heard ? t.mid.heard.replace("{text}", heard) : t.mid.noSpeech);
        return;
      }
      onWin();
    } catch {
      setRecording(false);
      setFail(t.mid.noSpeech);
    }
  }

  return (
    <motion.article
      key={item.id}
      initial={{ opacity: 0, y: 36, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, y: -28, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 230, damping: 22 }}
      className={`mid-card ${recording ? "mid-card-live" : ""} ${unlocked ? "mid-card-won" : ""}`}
    >
      <header className="mid-card-head">
        <span className="mid-chip">{slangKindLabel(item.kind, locale)}</span>
        <span className="mid-step">
          {index + 1} {t.mid.of} {total}
        </span>
      </header>
      <p className="mid-phrase" dir="ltr">
        {item.phrase}
      </p>
      <p className="mid-example" dir="ltr">
        {item.example}
      </p>
      <p className="mid-meaning">{item.fr}</p>
      <p className="mid-meaning mid-ar" dir="rtl">
        {item.ar}
      </p>
      <div className="mid-actions">
        <button type="button" className={`mid-btn ${listening ? "mid-pulse" : ""}`} onClick={listen}>
          <Volume2 className="h-5 w-5" />
          {t.mid.listen}
        </button>
        <button
          type="button"
          className={`mid-btn mid-btn-mic ${recording ? "mid-mic-live" : ""}`}
          disabled={unlocked}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void repeat();
          }}
        >
          <Mic className="h-5 w-5" />
          {recording ? t.mid.recording : t.mid.repeat}
        </button>
      </div>
      {recording && live ? <p className="mid-live" dir="ltr">{live}</p> : null}
      {fail ? <p className="mid-fail">{fail}</p> : null}
    </motion.article>
  );
}
