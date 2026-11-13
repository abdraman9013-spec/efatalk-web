"use client";

import { useEffect, useState } from "react";
import { FlagMark } from "@/components/ui/flag-mark";
import { useI18n } from "@/i18n/provider";
import { pointsTier, type LeaderPerson } from "@/lib/gamification";
import { visibleBoardName } from "@/lib/session";

export function LandingClassBoard({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<LeaderPerson[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/board/beginner", { cache: "no-store" });
        const json = (await res.json()) as { top?: LeaderPerson[] };
        if (cancelled) return;
        const top = [...(json.top || [])]
          .filter(
            (p) =>
              p?.user_id &&
              p.user_id !== "efaa-admin" &&
              Boolean(visibleBoardName(p.display_name)),
          )
          .sort(
            (a, b) =>
              b.diamonds_count * 10000 +
              b.total_points -
              (a.diamonds_count * 10000 + a.total_points),
          )
          .slice(0, 5);
        setRows(top);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`lobby-board landing-top-board ${className}`.trim()}>
      <p className="lobby-board-title">{t.landing.game.boardLabel}</p>
      {rows.map((person, i) => {
        const tier = pointsTier(person.total_points);
        const name = visibleBoardName(person.display_name);
        return (
          <div key={person.user_id || `${name}-${i}`} className="landing-board-row">
            <span className="lobby-rank">{i + 1}</span>
            {person.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={person.photo}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover object-top ring-1 ring-[#d4af37]/35"
              />
            ) : (
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0c1b4d]/10 text-[11px] font-black text-[#0c1b4d] ring-1 ring-[#d4af37]/25">
                {(name || "?").slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="lobby-row-name truncate">
                <FlagMark code={person.nationality} /> {name}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-[#1a3a7a]/85">
                🔥{person.current_streak} · 💎{person.diamonds_count} ·{" "}
                {person.total_points.toLocaleString("fr-FR")}
                {tier.badge ? ` ${tier.badge}` : ""}
              </p>
            </div>
          </div>
        );
      })}
      {!rows.length ? (
        <p className="px-1 py-3 text-center text-[12px] font-semibold text-[#1a3a7a]/75">
          {t.landing.game.boardEmpty}
        </p>
      ) : null}
    </div>
  );
}
