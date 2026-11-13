"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ComboHud } from "@/components/play/combo-hud";
import { SwipeCard } from "@/components/play/swipe-card";
import { useI18n } from "@/i18n/provider";
import {
  cardsFromEmojiDeck,
  EMOJI_DECK_SIZE,
  fetchRandomEmojiWords,
  type EmojiSwipeCard,
  type EmojiWord,
} from "@/lib/emoji-words";
import { SWIPE_SECONDS } from "@/lib/game-mode";

export function BeginnerSwipe({
  locked,
  onJudge,
}: {
  locked: boolean;
  onJudge: (correct: boolean, combo: number) => void;
}) {
  const { t, locale } = useI18n();
  const [deck, setDeck] = useState<EmojiWord[]>([]);
  const [deckId, setDeckId] = useState(0);
  const [index, setIndex] = useState(0);
  const [combo, setCombo] = useState(0);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const judged = useRef(false);
  const comboRef = useRef(0);
  const prefetching = useRef(false);
  const nextDeck = useRef<EmojiWord[] | null>(null);
  const progress = useMotionValue(1);
  const onJudgeRef = useRef(onJudge);
  onJudgeRef.current = onJudge;

  const cards = useMemo(
    () => cardsFromEmojiDeck(deck, locale).map((item) => ({ ...item, id: `${deckId}-${item.id}` })),
    [deck, deckId, locale],
  );
  const card: EmojiSwipeCard | null = cards[index] || null;

  const loadDeck = useCallback(async (fresh: boolean) => {
    setError(false);
    if (fresh) setLoading(true);
    try {
      const words = await fetchRandomEmojiWords(EMOJI_DECK_SIZE);
      if (fresh) {
        setDeck(words);
        setDeckId((n) => n + 1);
        setIndex(0);
      } else {
        nextDeck.current = words;
      }
    } catch {
      if (fresh) {
        setDeck([]);
        setError(true);
      }
    } finally {
      if (fresh) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDeck(true);
  }, [loadDeck]);

  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  useEffect(() => {
    if (!card || locked || judged.current) return;
    if (index >= deck.length - 3 && !prefetching.current && !nextDeck.current) {
      prefetching.current = true;
      void fetchRandomEmojiWords(EMOJI_DECK_SIZE)
        .then((words) => {
          // Never prefetch an identical set — avoid the "loop of the same cards".
          const currentIds = new Set(deck.map((w) => w.id));
          const fresh = words.filter((w) => !currentIds.has(w.id));
          nextDeck.current = fresh.length >= 2 ? fresh : words;
        })
        .catch(() => undefined)
        .finally(() => {
          prefetching.current = false;
        });
    }
  }, [card, deck, index, locked]);

  const finish = useCallback(
    (correct: boolean) => {
      if (judged.current || locked) return;
      judged.current = true;
      const nextCombo = correct ? comboRef.current + 1 : 0;
      comboRef.current = nextCombo;
      setCombo(nextCombo);
      onJudgeRef.current(correct, nextCombo);
      window.setTimeout(() => {
        judged.current = false;
        if (index + 1 >= deck.length) {
          const ready = nextDeck.current;
          nextDeck.current = null;
          if (ready && ready.length >= 2) {
            setDeck(ready);
            setDeckId((n) => n + 1);
            setIndex(0);
            setStarted(true);
            return;
          }
          void loadDeck(true);
          return;
        }
        setIndex((n) => n + 1);
      }, 180);
    },
    [deck.length, index, loadDeck, locked],
  );

  useEffect(() => {
    judged.current = false;
    progress.set(1);
    if (!started || !card || locked) return;
    const control = animate(progress, 0, {
      duration: SWIPE_SECONDS,
      ease: "linear",
      onComplete: () => finish(false),
    });
    return () => control.stop();
  }, [card, finish, locked, progress, started]);

  if (loading) {
    return (
      <div className="grid min-h-[min(68dvh,640px)] place-items-center">
        <p className="text-[12px] uppercase tracking-[0.32em] text-[#f0d78c]/70">{t.play.loadingDeck}</p>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="mx-auto grid min-h-[min(68dvh,640px)] w-full max-w-md place-items-center px-6 text-center">
        <div>
          <p className="font-display text-2xl text-[#f6e7a1]">{t.play.retryDeck}</p>
          <button
            type="button"
            onClick={() => void loadDeck(true)}
            className="mt-5 rounded-full border border-[#f0d78c]/40 bg-[#f0d78c] px-6 py-3 text-sm font-bold text-[#1a1406]"
          >
            {t.play.retryAction}
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="relative mx-auto flex min-h-[min(68dvh,640px)] w-full max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="select-none text-[clamp(6rem,24vw,9rem)] leading-none" aria-hidden>
          {card.emoji}
        </p>
        <p className="mt-4 font-display text-3xl tracking-[0.14em] text-[#f6e7a1]">{card.word_en}</p>
        <p className="mt-3 text-sm text-white/50">{t.play.goHint}</p>
        <button
          type="button"
          onClick={() => {
            judged.current = false;
            progress.set(1);
            setStarted(true);
          }}
          className="mt-8 w-full rounded-full bg-[#f0d78c] px-6 py-4 text-base font-extrabold text-[#1a1406] shadow-[0_16px_40px_rgba(240,215,140,0.28)]"
        >
          {t.play.go}
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full origin-left rounded-full bg-[#f0d78c] shadow-[0_0_18px_rgba(240,215,140,0.85)]"
          style={{ scaleX: progress }}
        />
      </div>
      <ComboHud combo={combo} />
      <SwipeCard card={card} locked={locked} onJudge={finish} />
    </div>
  );
}
