"use client";

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { C1SynonymsStorm } from "@/components/advanced/c1-synonyms-storm";
import { BeginnerSwipe } from "@/components/play/beginner-swipe";
import { ChronoPuzzle } from "@/components/play/chrono-puzzle";
import { EnergyModal } from "@/components/play/energy-modal";
import { useI18n } from "@/i18n/provider";
import { adminHost, isAdminAuthed, readAdminVisit } from "@/lib/admin";
import { loadAdaptiveDeck, updateUserMastery, type VocabularyWord } from "@/lib/adaptive-dictionary";
import { countryByCode } from "@/lib/countries";
import { haptic, playErrorSound, playSuccessSound } from "@/lib/game-fx";
import { pulseBoardPlus, pulseCombo, pulseInvite } from "@/lib/pulse";
import {
  addGamePoints,
  awardGameWin,
  COMBO_POINT_CAP,
  claimEnergyRefill,
  ensureGameState,
  handleWhatsAppInvite,
  localGameState,
  puzzleFromWords,
  spendGameEnergy,
  type GameState,
} from "@/lib/game-mode";
import { lobbyPath, readCurrentStudent, studentBoardName, visibleBoardName, type EfaaStudent } from "@/lib/session";
import { useAvatarBroadcast } from "@/lib/avatar";
import { fetchLeaderboard, type LeaderPerson } from "@/lib/gamification";
import { getSupabase } from "@/lib/supabase";
import { RivalRecordsPanel } from "@/components/play/rival-records-panel";

type Flash = "win" | "lose" | null;

export function PlayArena() {
  const { t } = useI18n();
  const router = useRouter();
  const [me, setMe] = useState<EfaaStudent | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [flash, setFlash] = useState<Flash>(null);
  const [confetti, setConfetti] = useState(0);
  const [plusHint, setPlusHint] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState(0);
  const [cardRival, setCardRival] = useState<LeaderPerson | null>(null);
  const shake = useAnimationControls();
  const lock = state ? state.lightning_bolts <= 0 : false;
  const beginner = me?.level === "beginner";
  useAvatarBroadcast(setMe);

  useEffect(() => {
    let live = true;
    const next = isAdminAuthed()
      ? adminHost(readAdminVisit() || readCurrentStudent()?.level || "beginner")
      : readCurrentStudent();
    if (!next?.level) {
      window.location.replace("/auth");
      return;
    }
    setMe(next);
    setState(localGameState(next.id, next.nationality));
    void ensureGameState(next.id, next.nationality).then((row) => {
      if (live) setState(row);
    });
    if (next.level !== "beginner") {
      void loadAdaptiveDeck(next.id).then((deck) => {
        if (live) setWords(deck.words);
      });
    }
    void fetchLeaderboard(next.id, next.level)
      .then((board) => {
        if (!live) return;
        const rival = board.rival;
        if (rival?.user_id && rival.user_id !== next.id) {
          setCardRival(rival);
          return;
        }
        const alt = board.top.find((p) => p.user_id && p.user_id !== next.id);
        setCardRival(alt || null);
      })
      .catch(() => setCardRival(null));
    return () => {
      live = false;
    };
  }, []);

  function bumpCardH2h(winnerId: string, loserId: string, winnerName: string, loserName: string) {
    void getSupabase().rpc("efaa_card_h2h_bump", {
      p_winner: winnerId,
      p_loser: loserId,
      p_winner_name: winnerName,
      p_loser_name: loserName,
    });
  }

  useEffect(() => {
    if (!state?.user_id || typeof window === "undefined") return;
    const key = `efaa-energy-refill:${state.user_id}`;
    if (state.lightning_bolts > 0) {
      window.localStorage.removeItem(key);
      return;
    }
    if (state.energy_refill_at) window.localStorage.setItem(key, state.energy_refill_at);
  }, [state]);

  const puzzle = useMemo(() => puzzleFromWords(words, round), [round, words]);

  const paint = useCallback((kind: Flash) => {
    setFlash(kind);
    window.setTimeout(() => setFlash(null), 100);
  }, []);

  const win = useCallback(
    async (comboStreak = 1) => {
      if (!state || lock) return;
      const bonus = Math.min(COMBO_POINT_CAP, Math.max(0, comboStreak - 1));
      const gained = 2 + bonus;
      haptic("win");
      playSuccessSound();
      paint("win");
      setPlusHint(100);
      window.setTimeout(() => setPlusHint(null), 900);
      try {
        let next = await awardGameWin(state.user_id).catch(() => null);
        if (!next) {
          await ensureGameState(state.user_id, state.country_code);
          next = await awardGameWin(state.user_id);
        }
        let points = next.personal_points;
        let bolts = next.lightning_bolts;
        let boardBonus = next.board_bonus || 0;
        if (bonus > 0) {
          const extra = await addGamePoints(state.user_id, bonus);
          points = extra.personal_points;
          bolts = extra.lightning_bolts;
          boardBonus += extra.board_bonus || 0;
        }
        if (boardBonus > 0) pulseBoardPlus(t.pulse.board);
        if (comboStreak >= 3) pulseCombo(comboStreak, t.pulse.combo);
        setState((prev) =>
          prev ? { ...prev, personal_points: points, lightning_bolts: bolts } : prev,
        );
      } catch {
        setState((prev) => (prev ? { ...prev, personal_points: prev.personal_points + gained } : prev));
      }
      if (!beginner) {
        void updateUserMastery(state.user_id, true)
          .then(() => loadAdaptiveDeck(state.user_id))
          .then((deck) => setWords(deck.words))
          .catch(() => undefined);
      }
      setRound((n) => n + 1);
      if (state?.user_id && cardRival?.user_id && cardRival.user_id !== state.user_id) {
        bumpCardH2h(
          state.user_id,
          cardRival.user_id,
          studentBoardName(me!),
          visibleBoardName(cardRival.display_name) || cardRival.display_name,
        );
      }
    },
    [beginner, cardRival, lock, me, paint, state, t.pulse.board, t.pulse.combo],
  );

  const miss = useCallback(async () => {
    if (!state || lock) return;
    haptic("lose");
    playErrorSound();
    paint("lose");
    void shake.start({ x: [0, -10, 12, -8, 6, 0], transition: { duration: 0.38 } });
    try {
      const next = await spendGameEnergy(state.user_id);
      setState(next);
    } catch {
      setState((prev) => (prev ? { ...prev, lightning_bolts: Math.max(0, prev.lightning_bolts - 1) } : prev));
    }
    setRound((n) => n + 1);
    if (state?.user_id && cardRival?.user_id && cardRival.user_id !== state.user_id) {
      bumpCardH2h(
        cardRival.user_id,
        state.user_id,
        visibleBoardName(cardRival.display_name) || cardRival.display_name,
        studentBoardName(me!),
      );
    }
  }, [cardRival, lock, me, paint, shake, state]);

  const claimWait = useCallback(async () => {
    if (!state) return;
    try {
      const next = await claimEnergyRefill(state.user_id);
      setState(next);
    } catch {
      /* keep waiting */
    }
  }, [state]);

  async function invite() {
    if (!state || busy) return;
    setBusy(true);
    haptic("tap");
    const country = countryByCode(state.country_code)?.name || state.country_code;
    try {
      const next = await handleWhatsAppInvite(state, country);
      pulseInvite(t.pulse.invite);
      setState(next);
    } finally {
      setBusy(false);
    }
  }

  if (!me || !state) return <div className="min-h-dvh w-full bg-[#07060a]" />;

  return (
    <motion.div
      animate={shake}
      initial={{ x: 0 }}
      className="relative min-h-dvh w-full overflow-hidden bg-[#07060a] text-white"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(240,215,140,0.16),transparent_42%),radial-gradient(circle_at_80%_100%,rgba(255,77,77,0.12),transparent_36%)]" />
      <AnimatePresence>
        {flash ? (
          <motion.div
            key={flash}
            initial={{ opacity: 0.55 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className={`pointer-events-none absolute inset-0 z-30 ${flash === "win" ? "bg-emerald-400/35" : "bg-red-500/45"}`}
          />
        ) : null}
      </AnimatePresence>

      {Array.from({ length: confetti }).map((_, i) => (
        <motion.span
          key={`c-${confetti}-${i}`}
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-2 w-2 rounded-full bg-[#f0d78c]"
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: (Math.random() - 0.5) * 420,
            y: (Math.random() - 0.2) * -380,
            opacity: 0,
            rotate: 220,
            scale: 0.3,
          }}
          transition={{ duration: 1.05, ease: "easeOut" }}
        />
      ))}

      {plusHint !== null ? (
        <motion.span
          key={`plus-${plusHint}-${round}`}
          className="pointer-events-none absolute left-1/2 top-[22%] z-30 font-display text-5xl text-[#f6e7a1]"
          initial={{ y: 12, opacity: 1, scale: 0.8 }}
          animate={{ y: -40, opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        >
          +{plusHint}
        </motion.span>
      ) : null}

      <div className="relative z-10 mx-auto flex min-h-dvh w-full flex-col px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
        <header className="mb-4 flex items-center justify-between pe-20">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#f0d78c]/70">{t.play.kicker}</p>
            <h1 className="font-display text-2xl text-[#f6e7a1]">{t.play.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#f0d78c]/30 bg-white/5 px-3 py-1 text-sm text-[#f6e7a1]">
              {state.personal_points} pts
            </span>
            <span className="flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-sm">
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              {state.lightning_bolts}
            </span>
          </div>
        </header>

        <p className="text-center text-[12px] text-white/45">{t.play.noStreak}</p>
        <p className="mt-1 text-center text-[11px] text-white/35">{t.play.dailyCap}</p>
        {cardRival ? (
          <p className="mt-2 text-center text-[11px] font-semibold text-amber-200/90">
            {t.play.cardRival.replace(
              "{name}",
              visibleBoardName(cardRival.display_name) || cardRival.display_name,
            )}
          </p>
        ) : null}
        {me ? (
          <div className="mt-3">
            <RivalRecordsPanel
              userId={me.id}
              meName={studentBoardName(me)}
              rpc="efaa_card_h2h_for_user"
              title={t.play.cardRecordsTitle}
              empty={t.play.cardRecordsEmpty}
              line={t.play.cardRecordLine}
            />
          </div>
        ) : null}
        <a href="/clash" className="play-entry">
          {t.clash.enter}
        </a>

        <div className={`mt-4 flex min-h-0 flex-1 flex-col ${me.level !== "advanced" && lock ? "pointer-events-none blur-[2px]" : ""}`}>
          {me.level === "intermediate" ? (
            <ChronoPuzzle card={puzzle} locked={lock} onJudge={(ok) => void (ok ? win(1) : miss())} />
          ) : me.level === "advanced" ? (
            <C1SynonymsStorm variant="page" />
          ) : (
            <BeginnerSwipe locked={lock} onJudge={(ok, combo) => void (ok ? win(combo) : miss())} />
          )}
        </div>

        <button
          type="button"
          onClick={() => router.push(lobbyPath(me.level))}
          className="mt-4 text-center text-[12px] uppercase tracking-[0.24em] text-white/35"
        >
          {t.play.back}
        </button>
      </div>

      {lock && me.level !== "advanced" ? (
        <EnergyModal
          busy={busy}
          userId={state.user_id}
          refillAt={state.energy_refill_at}
          onInvite={() => void invite()}
          onWaitComplete={() => void claimWait()}
        />
      ) : null}
    </motion.div>
  );
}
