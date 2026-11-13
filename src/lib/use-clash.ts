"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CLASH_SECONDS,
  CLASH_STEP,
  clashWord,
  uniqueClashDeck,
  rotateClashDeck,
  clashPairKey,
  nextClashMatchId,
  rememberClashCursor,
  restoreClashCursor,
  joinClashPit,
  leaveClashPit,
  scrambleWord,
  type ClashPeer,
} from "@/lib/clash";
import { getSeededWords } from "@/lib/adaptive-dictionary";
import { getSupabase } from "@/lib/supabase";

export const WORLD_CUP_ROOM = "world-cup";

export type ClashEvent =
  | { type: "hit"; from: string; seq: number }
  | { type: "word"; index: number }
  | { type: "end"; winner: string | null; reason: "ko" | "time" }
  | { type: "rematch"; from: string }
  | { type: "match"; matchId: string; from: string }
  | { type: "emoji"; from: string; emoji: string; id: string };

function seatId() {
  const key = "efaa-clash-seat";
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const next = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(key, next);
  return next;
}

export function useClash(roomId: string, me: ClashPeer | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const seen = useRef(new Set<string>());
  const seq = useRef(0);
  const tugRef = useRef(50);
  const ended = useRef(false);
  const startedAt = useRef(0);
  const seatRef = useRef("");
  const meRef = useRef(me);
  const foeRef = useRef<ClashPeer | null>(null);
  const misses = useRef(0);
  const joinGen = useRef(0);
  meRef.current = me;

  const [tug, setTug] = useState(50);
  const [wordIndex, setWordIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [frozenUntil, setFrozenUntil] = useState(0);
  const [left, setLeft] = useState(CLASH_SECONDS);
  const [winner, setWinner] = useState<string | null>(null);
  const [reason, setReason] = useState<"ko" | "time" | null>(null);
  const [rematch, setRematch] = useState<string[]>([]);
  const [floats, setFloats] = useState<{ id: string; emoji: string; from: string }[]>([]);
  const [foe, setFoe] = useState<ClashPeer | null>(null);
  const [waiting, setWaiting] = useState(1);
  const [live, setLive] = useState(false);
  const [deck, setDeck] = useState<string[]>([]);
  const [deckKey, setDeckKey] = useState("");
  const [matchId, setMatchId] = useState("");
  const matchIdRef = useRef("");
  matchIdRef.current = matchId;
  const [setsMe, setSetsMe] = useState(0);
  const [setsFoe, setSetsFoe] = useState(0);

  const word = clashWord(roomId, wordIndex, deck);
  const tiles = scrambleWord(word, roomId, wordIndex);
  const ready = Boolean(me && foe && deck.length && deckKey === foe.id && matchId);

  const send = useCallback((payload: ClashEvent) => {
    void channelRef.current?.send({ type: "broadcast", event: "clash", payload });
  }, []);

  const applyHit = useCallback(
    (fromSeat: string) => {
      const mine = seatRef.current;
      const next = Math.max(0, Math.min(100, tugRef.current + (fromSeat === mine ? CLASH_STEP : -CLASH_STEP)));
      tugRef.current = next;
      setTug(next);
      if ((next >= 100 || next <= 0) && !ended.current) {
        ended.current = true;
        const who = next >= 100 ? meRef.current?.id || fromSeat : foeRef.current?.id || fromSeat;
        setWinner(who);
        setReason("ko");
        send({ type: "end", winner: who, reason: "ko" });
      }
    },
    [send],
  );

  useEffect(() => {
    if (!me?.id || !roomId) return;
    const seat = seatId();
    seatRef.current = seat;
    const gen = ++joinGen.current;

    async function heartbeat() {
      const student = meRef.current;
      if (!student || joinGen.current !== gen) return;
      try {
        const snap = await joinClashPit(seat, roomId, student);
        if (joinGen.current !== gen) return;
        setWaiting(snap.waiting);
        if (snap.partner) {
          misses.current = 0;
          foeRef.current = snap.partner;
          setFoe(snap.partner);
          setLive(true);
          return;
        }
        if (startedAt.current) return;
        misses.current += 1;
        if (misses.current >= 3) {
          foeRef.current = null;
          setFoe(null);
          setLive(false);
        }
      } catch {
        /* next tick retries */
      }
    }

    void heartbeat();
    const pulse = window.setInterval(() => void heartbeat(), 1200);

    const supabase = getSupabase();
    const watch = supabase
      .channel(`efaa-clash-pit-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "efaa_clash_pit" }, () => {
        void heartbeat();
      })
      .subscribe();

    const onLeave = () => {
      if (joinGen.current === gen) void leaveClashPit(seat);
    };
    window.addEventListener("pagehide", onLeave);

    return () => {
      window.clearInterval(pulse);
      window.removeEventListener("pagehide", onLeave);
      void supabase.removeChannel(watch);
      window.setTimeout(() => {
        if (joinGen.current === gen) void leaveClashPit(seat);
      }, 200);
    };
  }, [me?.id, roomId]);

  useEffect(() => {
    if (!me?.id || !roomId || !foe?.id) return;
    let cancelled = false;
    const studentId = me.id;
    const partner = foe.id;
    const pair = clashPairKey(studentId, partner);

    async function loadForMatch(id: string) {
      const restored = restoreClashCursor(id);
      if (restored && restored.deck.length >= 10) {
        if (cancelled) return;
        setDeck(restored.deck);
        setWordIndex(restored.wordIndex);
        setDeckKey(partner);
        setMatchId(id);
        return;
      }
      try {
        // Unique seed per match window — never restart the same day-locked pair deck.
        let snap = await getSeededWords(`${roomId}:${id}`, studentId, partner, 80);
        if (snap.words.length < 40) {
          await fetch(`/api/fetch-words?userId=${encodeURIComponent(studentId)}&limit=80`, { cache: "no-store" }).catch(() => null);
          snap = await getSeededWords(`${roomId}:${id}`, studentId, partner, 80);
        }
        if (cancelled) return;
        const next = uniqueClashDeck(
          snap.words.map((item) => item.word_en),
          60,
        );
        setDeck(next);
        setWordIndex(0);
        setDeckKey(partner);
        setMatchId(id);
        rememberClashCursor(id, 0, next);
        try {
          sessionStorage.setItem(`efaa_clash_active:${pair}`, id);
        } catch {
          /* ignore */
        }
      } catch {
        if (!cancelled) {
          const fallback = uniqueClashDeck([]);
          setDeck(fallback);
          setWordIndex(0);
          setDeckKey(partner);
          setMatchId(id);
          rememberClashCursor(id, 0, fallback);
        }
      }
    }

    let id = "";
    try {
      id = sessionStorage.getItem(`efaa_clash_active:${pair}`) || "";
    } catch {
      id = "";
    }
    // Shared 20s bucket so both phones that just matched get the same fresh deck.
    if (!id) id = `${pair}:t${Math.floor(Date.now() / 20000)}`;
    void loadForMatch(id);

    return () => {
      cancelled = true;
    };
  }, [foe?.id, me?.id, roomId]);

  useEffect(() => {
    if (!matchId || !deck.length) return;
    rememberClashCursor(matchId, wordIndex, deck);
  }, [deck, matchId, wordIndex]);

  useEffect(() => {
    if (!me || !roomId) return;
    const student = me;
    const supabase = getSupabase();
    const channel = supabase.channel(`efaa-clash-${roomId}`, {
      config: { broadcast: { ack: false, self: false } },
    });
    channelRef.current = channel;

    function onEvent(payload: ClashEvent) {
      if (!payload?.type) return;
      if (payload.type === "match") {
        if (!payload.matchId || matchIdRef.current === payload.matchId) return;
        if (meRef.current && foeRef.current && meRef.current.id > foeRef.current.id) {
          // Guest adopts host match id and loads that exact deck.
          void (async () => {
            const restored = restoreClashCursor(payload.matchId);
            if (restored && restored.deck.length >= 10) {
              setDeck(restored.deck);
              setWordIndex(restored.wordIndex);
              setDeckKey(foeRef.current!.id);
              setMatchId(payload.matchId);
              return;
            }
            try {
              const studentId = meRef.current!.id;
              const partner = foeRef.current!.id;
              let snap = await getSeededWords(`${roomId}:${payload.matchId}`, studentId, partner, 80);
              const next = uniqueClashDeck(
                snap.words.map((item) => item.word_en),
                60,
              );
              setDeck(next);
              setWordIndex(0);
              setDeckKey(partner);
              setMatchId(payload.matchId);
              rememberClashCursor(payload.matchId, 0, next);
            } catch {
              /* host deck will still play; guest falls back on next rematch */
            }
          })();
        }
        return;
      }
      if (payload.type === "hit") {
        const key = `hit-${payload.from}-${payload.seq}`;
        if (seen.current.has(key)) return;
        seen.current.add(key);
        applyHit(payload.from);
        return;
      }
      if (payload.type === "word") {
        setWordIndex(payload.index);
        setTyped(0);
        return;
      }
      if (payload.type === "end" && !ended.current) {
        ended.current = true;
        setWinner(payload.winner);
        setReason(payload.reason);
        if (payload.winner && meRef.current) {
          if (payload.winner === meRef.current.id) setSetsMe((n) => n + 1);
          else if (foeRef.current?.id && payload.winner === foeRef.current.id) setSetsFoe((n) => n + 1);
        }
        try {
          if (meRef.current && foeRef.current) {
            sessionStorage.removeItem(`efaa_clash_active:${clashPairKey(meRef.current.id, foeRef.current.id)}`);
          }
        } catch {
          /* ignore */
        }
        return;
      }
      if (payload.type === "rematch") {
        setRematch((prev) => (prev.includes(payload.from) ? prev : [...prev, payload.from]));
        return;
      }
      if (payload.type === "emoji") {
        setFloats((prev) => [...prev.slice(-10), payload]);
        window.setTimeout(() => {
          setFloats((prev) => prev.filter((item) => item.id !== payload.id));
        }, 1400);
      }
    }

    channel.on("broadcast", { event: "clash" }, ({ payload }) => onEvent(payload as ClashEvent));
    void channel.subscribe();

    const clock = window.setInterval(() => {
      if (!startedAt.current) return;
      const remain = Math.max(0, CLASH_SECONDS - Math.floor((Date.now() - startedAt.current) / 1000));
      setLeft(remain);
      if (remain <= 0 && !ended.current) {
        ended.current = true;
        const who = tugRef.current === 50 ? null : tugRef.current > 50 ? student.id : foeRef.current?.id || null;
        setWinner(who);
        setReason("time");
        send({ type: "end", winner: who, reason: "time" });
      }
    }, 200);

    return () => {
      window.clearInterval(clock);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [applyHit, me, roomId, send]);

  useEffect(() => {
    if (!ready || startedAt.current) return;
    startedAt.current = Date.now();
    setLive(true);
  }, [ready]);

  function tap(letter: string) {
    if (!me || !ready || ended.current || Date.now() < frozenUntil) return null;
    if (letter !== word[typed]) {
      setFrozenUntil(Date.now() + 2000);
      window.setTimeout(() => setFrozenUntil(0), 2000);
      return false;
    }
    const nextTyped = typed + 1;
    setTyped(nextTyped);
    seq.current += 1;
    const from = seatRef.current;
    seen.current.add(`hit-${from}-${seq.current}`);
    applyHit(from);
    send({ type: "hit", from, seq: seq.current });
    if (nextTyped >= word.length) {
      const nextWord = wordIndex + 1;
      setWordIndex(nextWord);
      setTyped(0);
      send({ type: "word", index: nextWord });
      if (matchIdRef.current) rememberClashCursor(matchIdRef.current, nextWord, deck);
    }
    return true;
  }

  function askRematch() {
    if (!me) return;
    setRematch((prev) => (prev.includes(me.id) ? prev : [...prev, me.id]));
    send({ type: "rematch", from: me.id });
  }

  function sendEmoji(emoji: string) {
    if (!me) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const payload = { type: "emoji" as const, from: me.id, emoji, id };
    setFloats((prev) => [...prev, payload]);
    window.setTimeout(() => setFloats((prev) => prev.filter((item) => item.id !== id)), 1400);
    send(payload);
  }

  function resetRound() {
    ended.current = false;
    tugRef.current = 50;
    seq.current = 0;
    seen.current.clear();
    startedAt.current = Date.now();
    const salt = Math.max(1, rematch.length);
    setTug(50);
    setTyped(0);
    // New unique order for rematch — never restart the same looping slice.
    setDeck((prev) => {
      const rotated = rotateClashDeck(prev.length ? prev : uniqueClashDeck([]), salt);
      if (me?.id && foe?.id) {
        const id = nextClashMatchId(me.id, foe.id);
        setMatchId(id);
        rememberClashCursor(id, 0, rotated);
        try {
          sessionStorage.setItem(`efaa_clash_active:${clashPairKey(me.id, foe.id)}`, id);
        } catch {
          /* ignore */
        }
        send({ type: "match", matchId: id, from: me.id });
      }
      return rotated;
    });
    setWordIndex(0);
    setWinner(null);
    setReason(null);
    setRematch([]);
    setFrozenUntil(0);
    setLeft(CLASH_SECONDS);
  }

  return {
    tug,
    word,
    tiles,
    typed,
    left,
    winner,
    reason,
    rematch,
    floats,
    foe,
    waiting,
    live,
    ready,
    setsMe,
    setsFoe,
    frozen: Date.now() < frozenUntil,
    tap,
    askRematch,
    sendEmoji,
    resetRound,
  };
}
