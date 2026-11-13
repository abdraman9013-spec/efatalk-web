"use client";

import { StudentPortrait } from "@/components/avatar/student-portrait";
import { FlagMark } from "@/components/ui/flag-mark";
import { useI18n } from "@/i18n/provider";
import {
  buildBoardFuel,
  pickFuelLine,
  writeStoredRank,
} from "@/lib/board-fuel";
import { pointsTier, type LeaderPerson, type LeaderboardPayload } from "@/lib/gamification";
import { visibleBoardName } from "@/lib/session";
import { useEffect, useMemo, useState } from "react";

const TOP = 15;

export function ClassBoard({
  board,
  meId,
  onlineIds = [],
}: {
  board: LeaderboardPayload | null;
  meId?: string;
  onlineIds?: string[];
}) {
  const { t } = useI18n();
  const top = [...(board?.top || [])]
    .sort(
      (a, b) =>
        b.diamonds_count * 10000 +
        b.total_points -
        (a.diamonds_count * 10000 + a.total_points),
    )
    .slice(0, TOP);
  const rank = board?.rank || null;
  const meRow = board?.me;
  const showSelf = Boolean(meId && meRow && rank && rank > TOP);
  const [tick, setTick] = useState(0);

  const lines = useMemo(
    () => buildBoardFuel({ t, board, meId, onlineIds }),
    [t, board, meId, onlineIds],
  );
  const fuel = pickFuelLine(lines, tick);

  useEffect(() => {
    if (!meId || !rank) return;
    writeStoredRank(meId, rank);
  }, [meId, rank]);

  useEffect(() => {
    if (lines.length < 2) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 5200);
    return () => window.clearInterval(id);
  }, [lines.length]);

  return (
    <section className="lobby-board">
      <p className="lobby-board-title">{t.lobby.top}</p>
      {top.map((person, i) => (
        <LeaderRow key={person.user_id} person={person} rank={i + 1} you={person.user_id === meId} />
      ))}
      {showSelf && meRow ? (
        <div className="lobby-you-card lobby-you-premium">
          <p className="lobby-you-kicker">{t.lobby.youRank.replace("{n}", String(rank))}</p>
          <LeaderRow
            person={{
              user_id: meId!,
              display_name: meRow.display_name,
              nationality: meRow.nationality,
              current_streak: meRow.current_streak,
              diamonds_count: meRow.diamonds_count,
              total_points: meRow.total_points,
              photo: meRow.photo,
            }}
            rank={rank!}
            you
          />
          <p className="lobby-you-hint">{t.lobby.youRankHint}</p>
        </div>
      ) : null}
      {meId && meRow && fuel ? (
        <p className="lobby-fuel" key={`${tick}-${fuel.slice(0, 24)}`} role="status">
          {fuel}
        </p>
      ) : null}
    </section>
  );
}

function LeaderRow({ person, rank, you }: { person: LeaderPerson; rank: number; you?: boolean }) {
  const tier = pointsTier(person.total_points);
  const name = visibleBoardName(person.display_name);
  return (
    <div className={`lobby-row ${you ? "lobby-row-you" : ""}`}>
      <span className="lobby-rank">{rank}</span>
      <StudentPortrait name={name} photo={person.photo} size={28} userId={person.user_id} />
      <span className="lobby-row-name">
        <FlagMark code={person.nationality} /> {name || "—"}
      </span>
      <span>🔥{person.current_streak}</span>
      <span>💎{person.diamonds_count}</span>
      <span>
        {person.total_points}
        {tier.badge ? ` ${tier.badge}${tier.label}` : ""}
      </span>
    </div>
  );
}
