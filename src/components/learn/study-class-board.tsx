"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/i18n/provider";
import {
  fetchStudyBoard,
  nextStudyBadge,
  type StudyBadge,
  type StudyBoardRow,
} from "@/lib/study-board";

const BADGE_EMOJI: Record<StudyBadge, string> = {
  rookie: "🪨",
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  diamond: "💎",
  legend: "👑",
};

function nudgeKey(band: string, userId: string) {
  return `efaa_study_nudge:${band}:${userId}`;
}

export function StudyClassBoard({
  band,
  userId,
  compact = false,
}: {
  band: "0" | "1";
  userId: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<StudyBoardRow[]>([]);
  const [nudge, setNudge] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchStudyBoard(band)
      .then((board) => {
        if (cancelled) return;
        setRows(board.rows);
        const me = board.rows.find((row) => row.user_id === userId);
        const myPoints = me?.points ?? 0;
        const myRank = me?.rank ?? board.rows.length;
        const top = board.rows[0];
        const above = board.rows.find((row) => row.rank === myRank - 1);
        const next = nextStudyBadge(myPoints);
        let message: string | null = null;

        if (myPoints <= 0) {
          message = t.official.studyNudgeZero;
        } else if (next && next.need <= 30) {
          message = t.official.studyNudgeBadge
            .replace("{n}", String(next.need))
            .replace("{badge}", t.official.studyBadges[next.badge]);
        } else if (above && above.points - myPoints > 0 && above.points - myPoints <= 40) {
          message = t.official.studyNudgeChase
            .replace("{n}", String(above.points - myPoints))
            .replace("{name}", above.display_name.split(" ")[0] || above.display_name);
        } else if (top && top.user_id !== userId && myRank > 3) {
          message = t.official.studyNudgeBehind.replace("{name}", top.display_name.split(" ")[0] || top.display_name);
        }

        if (message) {
          try {
            const key = nudgeKey(band, userId);
            const last = sessionStorage.getItem(key);
            if (last !== message) {
              sessionStorage.setItem(key, message);
              setNudge(message);
            }
          } catch {
            setNudge(message);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [band, t, userId]);

  const me = useMemo(() => rows.find((row) => row.user_id === userId), [rows, userId]);
  const list = compact ? rows.slice(0, 12) : rows;

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-sky-200/80 bg-white/80 shadow-[0_16px_48px_rgba(56,189,248,.14)] backdrop-blur">
      <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 to-amber-50 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-700">
          {t.official.studyBoard} · Level {band}
        </p>
        <p className="mt-1 text-[13px] font-semibold text-sky-900">{t.official.studyBoardHint}</p>
        {me ? (
          <p className="mt-2 text-[12px] font-bold text-sky-800">
            #{me.rank} · {me.points} {t.official.points} · {BADGE_EMOJI[me.badge]}{" "}
            {t.official.studyBadges[me.badge]}
          </p>
        ) : null}
      </div>

      <AnimatePresence>
        {nudge ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-3 mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] font-semibold text-rose-800"
          >
            {nudge}
            <button
              type="button"
              className="ml-2 text-[11px] font-black uppercase tracking-wide text-rose-500"
              onClick={() => setNudge(null)}
            >
              OK
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="max-h-[min(52vh,420px)] overflow-y-auto px-2 py-2">
        {loading ? (
          <p className="px-3 py-6 text-center text-[13px] text-sky-700/70">…</p>
        ) : list.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-sky-700/70">{t.official.studyBoardEmpty}</p>
        ) : (
          <ul className="space-y-1">
            {list.map((row) => {
              const mine = row.user_id === userId;
              return (
                <li
                  key={row.user_id}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
                    mine ? "bg-gradient-to-r from-sky-100 to-amber-50 ring-1 ring-sky-300/60" : "bg-white/60"
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full text-[12px] font-black ${
                      row.rank === 1
                        ? "bg-amber-300 text-amber-950"
                        : row.rank === 2
                          ? "bg-slate-200 text-slate-800"
                          : row.rank === 3
                            ? "bg-orange-200 text-orange-900"
                            : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {row.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-slate-900">
                      {row.display_name}
                      {mine ? ` · ${t.official.studyYou}` : ""}
                    </p>
                    <p className="text-[11px] font-semibold text-sky-700">
                      {BADGE_EMOJI[row.badge]} {t.official.studyBadges[row.badge]}
                    </p>
                  </div>
                  <p className="font-display text-xl text-sky-800">{row.points}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1 border-t border-sky-100 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-sky-700/80 sm:grid-cols-3">
        <span>50 · {t.official.studyBadges.bronze}</span>
        <span>100 · {t.official.studyBadges.silver}</span>
        <span>200 · {t.official.studyBadges.gold}</span>
        <span>500 · {t.official.studyBadges.diamond}</span>
        <span>1000 · {t.official.studyBadges.legend}</span>
        <span>{t.official.studyFirstOnly}</span>
      </div>
    </section>
  );
}
