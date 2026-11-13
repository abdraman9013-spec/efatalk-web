"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";

function storageKey(userId?: string) {
  return userId ? `efaa-energy-refill:${userId}` : "efaa-energy-refill";
}

function remainingMs(refillAt: string | null | undefined, userId?: string, fallbackIso?: string) {
  const stored = typeof window !== "undefined" ? window.localStorage.getItem(storageKey(userId)) : null;
  const iso = refillAt || fallbackIso || stored;
  if (iso) {
    const stamp = new Date(iso).getTime();
    if (Number.isFinite(stamp)) return Math.max(0, stamp - Date.now());
  }
  return 60 * 60 * 1000;
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function EnergyModal({
  busy,
  refillAt,
  userId,
  onInvite,
  onWaitComplete,
}: {
  busy: boolean;
  refillAt?: string | null;
  userId?: string;
  onInvite: () => void;
  onWaitComplete: () => void;
}) {
  const { t } = useI18n();
  const fallbackIso = useRef<string | null>(null);
  if (!fallbackIso.current) {
    fallbackIso.current = refillAt || new Date(Date.now() + 60 * 60 * 1000).toISOString();
  }
  const [left, setLeft] = useState(() => remainingMs(refillAt, userId, fallbackIso.current || undefined));
  const clock = useMemo(() => formatCountdown(left), [left]);
  const waitRef = useRef(onWaitComplete);
  waitRef.current = onWaitComplete;

  useEffect(() => {
    if (refillAt) fallbackIso.current = refillAt;
    const iso = refillAt || fallbackIso.current;
    if (iso && userId) window.localStorage.setItem(storageKey(userId), iso);
    let fired = false;
    setLeft(remainingMs(refillAt, userId, fallbackIso.current || undefined));
    const id = window.setInterval(() => {
      const next = remainingMs(refillAt, userId, fallbackIso.current || undefined);
      setLeft(next);
      if (next <= 0 && !fired) {
        fired = true;
        waitRef.current();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [refillAt, userId]);

  return (
    <motion.div
      className="absolute inset-0 z-40 grid place-items-center bg-black/60 px-5 backdrop-blur-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={{ scale: 0.86, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="w-full max-w-md rounded-[32px] border border-[#f0d78c]/35 bg-[linear-gradient(180deg,rgba(28,18,6,0.88),rgba(8,6,4,0.94))] p-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
      >
        <p className="text-5xl">⚡</p>
        <h2 className="mt-3 font-display text-3xl text-[#f6e7a1]">{t.play.exhaustedTitle}</h2>
        <p className="mt-2 text-[15px] text-[#e8d5b0]/80">{t.play.exhaustedBody}</p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
          <p className="text-[12px] uppercase tracking-[0.28em] text-white/45">{t.play.waitHour}</p>
          <p className="mt-2 font-display text-4xl tracking-[0.18em] text-[#f6e7a1]">{clock}</p>
          <p className="mt-1 text-[12px] text-white/40">{t.play.waitRefill}</p>
        </div>
        <motion.button
          type="button"
          disabled={busy}
          onClick={onInvite}
          animate={{ scale: [1, 1.045, 1] }}
          transition={{ repeat: Infinity, duration: 1.15 }}
          className="mt-5 w-full rounded-full bg-[#25D366] px-5 py-4 text-[16px] font-bold text-[#073b1d] shadow-[0_0_28px_rgba(37,211,102,0.45)] disabled:opacity-60"
        >
          {t.play.invite}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
