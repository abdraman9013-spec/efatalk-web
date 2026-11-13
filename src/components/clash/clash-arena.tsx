"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FlagMark } from "@/components/ui/flag-mark";
import { useI18n } from "@/i18n/provider";
import { updateUserMastery } from "@/lib/adaptive-dictionary";
import { adminHost, isAdminAuthed, readAdminVisit } from "@/lib/admin";
import { CLASH_EMOJIS, CLASH_WAGER, type ClashPeer } from "@/lib/clash";
import { settleClash } from "@/lib/clash";
import { leaveClashLobby } from "@/lib/clash-sign";
import { haptic, playApplause, playErrorSound, playSuccessSound } from "@/lib/game-fx";
import { readCurrentStudent, studentBoardName, visibleBoardName } from "@/lib/session";
import { useClash } from "@/lib/use-clash";
import { useAvatarBroadcast } from "@/lib/avatar";
import { StudentPortrait } from "@/components/avatar/student-portrait";
import { getSupabase } from "@/lib/supabase";

export function ClashArena({ roomId }: { roomId: string }) {
  const { t } = useI18n();
  const [me, setMe] = useState<ClashPeer | null>(null);
  const [paid, setPaid] = useState(false);
  const [absorb, setAbsorb] = useState(0);
  const settled = useRef(false);
  const clash = useClash(roomId, me);
  const foe = clash.foe;
  useAvatarBroadcast(setMe);

  useEffect(() => {
    const student = isAdminAuthed()
      ? adminHost(readAdminVisit() || readCurrentStudent()?.level || "beginner")
      : readCurrentStudent();
    if (!student?.level) {
      window.location.replace("/auth");
      return;
    }
    setMe({
      id: student.id,
      name: studentBoardName(student),
      photo: student.photo,
      nationality: student.nationality,
    });
    void leaveClashLobby(student.id);
  }, []);

  useEffect(() => {
    if (!clash.winner || !me || settled.current) return;
    if (clash.winner !== me.id) {
      settled.current = true;
      setPaid(true);
      setAbsorb(CLASH_WAGER);
      return;
    }
    if (!foe?.id || foe.id === me.id) {
      settled.current = true;
      setPaid(true);
      return;
    }
    settled.current = true;
    void updateUserMastery(me.id, true).catch(() => undefined);
    const winnerName = visibleBoardName(me.name) || me.name;
    const loserName = visibleBoardName(foe.name) || foe.name;
    void settleClash(clash.winner, foe.id, CLASH_WAGER)
      .then((row) => {
        setPaid(true);
        setAbsorb(row.paid);
        playApplause();
        const w = clash.winner;
        const l = foe.id;
        void getSupabase()
          .rpc("efaa_clash_h2h_bump", {
            p_winner: w,
            p_loser: l,
            p_winner_name: w === me.id ? winnerName : loserName,
            p_loser_name: w === me.id ? loserName : winnerName,
          })
          .then(() => undefined);
      })
      .catch(() => setPaid(true));
  }, [clash.winner, foe?.id, me]);

  useEffect(() => {
    if (clash.rematch.length >= 2 && clash.winner) {
      settled.current = false;
      setPaid(false);
      setAbsorb(0);
      clash.resetRound();
    }
  }, [clash.rematch.length, clash.winner]);

  if (!me) return <div className="min-h-dvh bg-[#07060a]" />;

  const iWon = clash.winner === me.id;
  const frozen = clash.frozen;
  const foeName = visibleBoardName(foe?.name) || t.clash.foe;
  const stolen = absorb || CLASH_WAGER;
  const endTitle =
    clash.reason === "ko" ? (iWon ? t.clash.koWin.replace("{name}", foeName) : t.clash.koLose) : t.clash.timeup;
  const endDetail = !clash.winner
    ? t.clash.draw
    : (iWon ? t.clash.win : t.clash.lose).replace("{name}", foeName).replace("{n}", String(stolen));

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#07060a] text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-red-950 via-[#07060a] to-blue-950" />

      <section className="relative z-10 flex h-[38dvh] flex-col items-center justify-start pt-[max(12px,env(safe-area-inset-top))]">
        <Fighter peer={foe} side="foe" label={t.clash.foe} />
        {clash.ready ? (
          <p className="mt-1 font-display text-4xl tabular-nums text-[#f6e7a1]" dir="ltr">
            {clash.setsMe} — {clash.setsFoe}
          </p>
        ) : null}
        <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/45">{t.clash.matchScore}</p>
        <p className="mt-1 font-display text-3xl text-red-200">{clash.ready ? String(clash.left).padStart(2, "0") : "--"}</p>
      </section>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-full">
        <motion.div
          className="absolute left-1/2 w-[min(92vw,40rem)] -translate-x-1/2"
          animate={{ top: `${8 + (100 - clash.tug) * 0.72}%` }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
        >
          <div className="h-3 rounded-full bg-gradient-to-r from-red-500 via-[#f6e7a1] to-blue-500 shadow-[0_0_28px_rgba(246,231,161,0.65)]" />
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto -mt-2 w-full max-w-lg px-4 text-center">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#f0d78c]/70">{t.clash.spell}</p>
        <p className="mt-1 font-display text-4xl tracking-[0.18em] text-[#f6e7a1]">
          {clash.word.split("").map((letter, i) => (
            <span key={`${letter}-${i}`} className={i < clash.typed ? "text-emerald-300" : "text-[#f6e7a1]/35"}>
              {letter}
            </span>
          ))}
        </p>
      </div>

      <section className="relative z-10 mt-auto flex min-h-[42dvh] flex-col items-center justify-end px-4 pb-[max(18px,env(safe-area-inset-bottom))]">
        <div className={`relative mb-4 w-full max-w-lg ${frozen || !clash.ready ? "pointer-events-none" : ""}`}>
          {frozen ? (
            <div className="absolute inset-0 z-10 grid place-items-center rounded-3xl bg-cyan-200/20 backdrop-blur-[2px]">
              <p className="font-display text-2xl text-cyan-100">{t.clash.freeze}</p>
            </div>
          ) : null}
          <div className="grid grid-cols-5 gap-2">
            {clash.tiles.map((letter, index) => (
              <button
                key={`${letter}-${index}`}
                type="button"
                onClick={() => {
                  const ok = clash.tap(letter);
                  if (ok === false) {
                    haptic("lose");
                    playErrorSound();
                    return;
                  }
                  if (ok) {
                    haptic("tap");
                    playSuccessSound();
                  }
                }}
                className="rounded-2xl border border-blue-300/30 bg-blue-500/15 py-3 text-xl font-extrabold text-white"
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
        <Fighter peer={me} side="me" label={t.clash.you} />
      </section>

      {clash.floats.map((item) => (
        <motion.span
          key={item.id}
          className="pointer-events-none absolute left-1/2 z-30 text-4xl"
          initial={{ y: item.from === me.id ? 80 : -80, opacity: 1, x: -20 }}
          animate={{ y: item.from === me.id ? -220 : 220, opacity: 0 }}
          transition={{ duration: 1.2 }}
        >
          {item.emoji}
        </motion.span>
      ))}

      {!clash.ready && !clash.reason ? (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/55 px-6 text-center backdrop-blur-sm">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-red-300">{t.clash.title}</p>
            <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.1 }} className="mt-3 font-display text-3xl text-[#f6e7a1]">
              {t.clash.searching}
            </motion.p>
            <p className="mt-2 text-sm text-white/60">{t.clash.waiting.replace("{n}", String(clash.waiting))}</p>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {clash.reason ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-40 grid place-items-center bg-black/70 px-5 text-center backdrop-blur-md"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-red-300">
                {clash.reason === "ko" ? t.clash.ko : t.clash.timeup}
              </p>
              <motion.p
                initial={{ scale: 2.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-2 font-display text-5xl leading-tight text-[#f6e7a1] sm:text-6xl"
              >
                {endTitle}
              </motion.p>
              {foe?.name ? (
                <p className="mt-3 text-sm uppercase tracking-[0.18em] text-white/50">
                  <FlagMark code={foe.nationality} /> {foeName}
                </p>
              ) : null}
              <p className="mt-3 text-lg text-white/80">{endDetail}</p>
              {paid && absorb > 0 ? (
                <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-4 text-2xl text-amber-300">
                  {iWon ? `+${absorb} ⚡` : `-${absorb} ⚡`}
                </motion.p>
              ) : null}
              <div className="mt-5 flex justify-center gap-2">
                {CLASH_EMOJIS.map((emoji) => (
                  <button key={emoji} type="button" className="text-2xl" onClick={() => clash.sendEmoji(emoji)}>
                    {emoji}
                  </button>
                ))}
              </div>
              <motion.button
                type="button"
                onClick={clash.askRematch}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 1.1 }}
                className="mt-6 w-full max-w-sm rounded-full bg-[#f6e7a1] px-6 py-4 text-lg font-extrabold text-[#1a1406]"
              >
                {t.clash.rematch}
              </motion.button>
              <a href="/clash" className="mt-4 block text-xs uppercase tracking-[0.22em] text-white/40">
                {t.clash.leave}
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Fighter({ peer, side, label }: { peer: ClashPeer | null; side: "me" | "foe"; label: string }) {
  const ring = side === "foe" ? "border-red-400/50 bg-red-500/15" : "border-blue-400/50 bg-blue-500/15";
  return (
    <div className={`flex items-center gap-3 rounded-full border px-3 py-1.5 ${ring}`}>
      <StudentPortrait name={peer?.name} photo={peer?.photo} size={36} />
      <div className="text-left">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">{label}</p>
        <p className="text-sm font-semibold">
          <FlagMark code={peer?.nationality} /> {visibleBoardName(peer?.name) || "…"}
        </p>
      </div>
    </div>
  );
}
