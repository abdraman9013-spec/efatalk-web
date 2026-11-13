"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { buzz, playFail, speakEnglish } from "@/lib/flash-lesson";
import { playCoin } from "@/lib/intermediate-fx";
import { awardQuizAnswer } from "@/lib/intermediate-progress";
import { pickWarmup, WARMUP_SECONDS, type WarmupCard } from "@/lib/intermediate-warmup";
import { shuffle } from "@/lib/game-mode";

export function WarmupGame({
  userId,
  locked,
  onPoints,
}: {
  userId: string;
  locked: boolean;
  onPoints: (gained: number, total: number) => void;
}) {
  const { t, locale } = useI18n();
  const [seen, setSeen] = useState<string[]>([]);
  const [card, setCard] = useState<WarmupCard>(() => pickWarmup([], null));
  const [picked, setPicked] = useState<string[]>([]);
  const [left, setLeft] = useState(WARMUP_SECONDS);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [float, setFloat] = useState<{ n: number; key: number } | null>(null);
  const [fail, setFail] = useState("");
  const judged = useRef(false);
  const bank = useMemo(() => shuffle(card.words), [card]);

  useEffect(() => {
    setPicked([]);
    setLeft(WARMUP_SECONDS);
    setFail("");
    judged.current = false;
    setBusy(false);
  }, [card.id]);

  useEffect(() => {
    if (!started || locked || judged.current) return;
    const id = window.setInterval(() => {
      setLeft((sec) => {
        if (sec <= 1) {
          window.clearInterval(id);
          if (!judged.current) void settle(false, card);
          return 0;
        }
        return sec - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [card.id, locked, started]);

  function advance(from: WarmupCard) {
    const nextSeen = seen.includes(from.id) ? seen : [...seen, from.id];
    setSeen(nextSeen);
    setCard(pickWarmup(nextSeen, from.id));
  }

  async function settle(correct: boolean, from: WarmupCard) {
    if (judged.current) return;
    judged.current = true;
    setBusy(true);
    if (!correct) {
      playFail();
      setFail(t.mid.wrong);
      window.setTimeout(() => {
        advance(from);
      }, 420);
      return;
    }
    try {
      const payload = await awardQuizAnswer(userId, true);
      if (payload.points_gained > 0) {
        playCoin();
        buzz(18);
        setFloat({ n: payload.points_gained, key: Date.now() });
        onPoints(payload.points_gained, payload.total_points);
      }
    } catch {
      /* leave the card anyway */
    }
    advance(from);
  }

  function choose(word: string, fromBank: boolean) {
    if (!started || locked || busy || judged.current) return;
    if (fromBank) {
      const next = [...picked, word];
      setPicked(next);
      if (next.length === card.words.length) {
        void settle(next.join(" ") === card.words.join(" "), card);
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
  const prompt = locale === "ar" ? card.promptAr : card.promptFr;

  if (locked) return null;

  if (!started) {
    return (
      <section className="mid-warm">
        <p className="mid-warm-kicker">{t.mid.warmTitle}</p>
        <p className="mid-warm-prompt">{prompt}</p>
        <p className="mid-warm-start-hint">{t.play.startFirst}</p>
        <button type="button" className="game-start-btn" onClick={() => setStarted(true)}>
          {t.play.go}
        </button>
      </section>
    );
  }

  return (
    <section className="mid-warm">
      <div className="mid-warm-head">
        <p className="mid-warm-kicker">{t.mid.warmTitle}</p>
        <span className="mid-warm-clock">{left}s</span>
        {float ? (
          <span key={float.key} className="mid-float">
            +{float.n}
          </span>
        ) : null}
      </div>
      <p className="mid-warm-prompt">{prompt}</p>
      <button type="button" className="mid-warm-listen" onClick={() => speakEnglish(card.words.join(" "))}>
        {t.mid.listen}
      </button>
      <div className="mid-warm-line">
        {picked.map((word, index) => (
          <button key={`in-${word}-${index}`} type="button" className="mid-warm-chip on" onClick={() => choose(word, false)}>
            {word}
          </button>
        ))}
      </div>
      <div className="mid-warm-bank">
        {unused.map((word, index) => (
          <button key={`${word}-${index}`} type="button" className="mid-warm-chip" disabled={busy} onClick={() => choose(word, true)}>
            {word}
          </button>
        ))}
      </div>
      {fail ? <p className="mid-fail">{fail}</p> : null}
    </section>
  );
}
