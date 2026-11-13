import type { Dictionary } from "@/i18n/translations";
import { pointsTier, type LeaderboardPayload, type LeaderPerson } from "@/lib/gamification";
import { firstNameOf } from "@/lib/flame-copy";
import { visibleBoardName } from "@/lib/session";

const MATCH_PTS = 20;
const TIERS = [
  { min: 500, key: "bronze" as const, badge: "🥉" },
  { min: 2000, key: "silver" as const, badge: "🥈" },
  { min: 5000, key: "gold" as const, badge: "🥇" },
  { min: 10000, key: "diamond" as const, badge: "💎" },
];

export type BoardFuelLine = {
  id: string;
  text: string;
  weight: number;
};

function shortName(display?: string | null) {
  const full = visibleBoardName(display);
  return firstNameOf(full) || full || "—";
}

function rankKey(userId: string) {
  return `efaa_board_rank:${userId}`;
}

export function readStoredRank(userId: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(rankKey(userId));
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function writeStoredRank(userId: string, rank: number | null) {
  if (typeof window === "undefined" || !rank) return;
  try {
    localStorage.setItem(rankKey(userId), String(rank));
  } catch {
    /* ignore */
  }
}

function nextMedal(points: number) {
  for (const tier of TIERS) {
    if (points < tier.min) return { ...tier, need: tier.min - points };
  }
  return null;
}

function personAbove(top: LeaderPerson[], meId: string, rank: number | null): LeaderPerson | null {
  if (!rank || rank <= 1) return null;
  return top[rank - 2] || null;
}

function personBelow(top: LeaderPerson[], meId: string, rank: number | null): LeaderPerson | null {
  if (!rank) return null;
  return top[rank] || null;
}

/** Build prioritized dopamine lines for the class-board fuel strip. */
export function buildBoardFuel(opts: {
  t: Dictionary;
  board: LeaderboardPayload | null;
  meId?: string;
  onlineIds?: string[];
}): BoardFuelLine[] {
  const { t, board, meId } = opts;
  if (!board?.me || !meId) return [];

  const online = new Set(opts.onlineIds || []);
  const me = board.me;
  const rank = board.rank;
  const points = me.total_points || 0;
  const top = board.top || [];
  const rival = board.rival;
  const gap = board.gap || 0;
  const lines: BoardFuelLine[] = [];
  const fuel = t.lobby.fuel;

  const prevRank = readStoredRank(meId);
  if (prevRank && rank && rank > prevRank) {
    const thief = personAbove(top, meId, rank);
    const thiefName = shortName(thief?.display_name);
    lines.push({
      id: "stolen",
      weight: 100,
      text: fuel.stolen
        .replaceAll("{name}", thiefName)
        .replaceAll("{rank}", String(rank))
        .replaceAll("{prev}", String(prevRank)),
    });
  }

  if (rank === 1) {
    const hunter = personBelow(top, meId, rank);
    const hunterName = shortName(hunter?.display_name);
    if (hunter && online.has(hunter.user_id)) {
      lines.push({
        id: "defend-online",
        weight: 95,
        text: fuel.defendOnline.replaceAll("{name}", hunterName),
      });
    } else {
      lines.push({ id: "defend", weight: 80, text: fuel.defend });
    }
    lines.push({ id: "goat", weight: 55, text: fuel.goat });
  }

  const above = personAbove(top, meId, rank);
  if (above && gap > 0) {
    const name = shortName(above.display_name);
    if (online.has(above.user_id)) {
      lines.push({
        id: "rival-online",
        weight: 92,
        text: fuel.rivalOnline
          .replaceAll("{name}", name)
          .replaceAll("{pts}", String(MATCH_PTS))
          .replaceAll("{n}", String(gap)),
      });
    }
    lines.push({
      id: "chase",
      weight: 70,
      text: fuel.chase.replaceAll("{name}", name).replaceAll("{n}", String(gap)),
    });
    if (gap <= MATCH_PTS * 2) {
      lines.push({
        id: "one-match",
        weight: 85,
        text: fuel.oneMatch
          .replaceAll("{name}", name)
          .replaceAll("{pts}", String(MATCH_PTS))
          .replaceAll("{n}", String(gap)),
      });
    }
  }

  if (rival && rival.user_id !== above?.user_id && gap > 0) {
    const name = shortName(rival.display_name);
    if (online.has(rival.user_id)) {
      lines.push({
        id: "rival2-online",
        weight: 88,
        text: fuel.rivalOnline
          .replaceAll("{name}", name)
          .replaceAll("{pts}", String(MATCH_PTS))
          .replaceAll("{n}", String(gap)),
      });
    }
  }

  // Someone on the board is live — urgency.
  const liveRival = top.find((p) => p.user_id !== meId && online.has(p.user_id));
  if (liveRival && !lines.some((l) => l.id.includes("online"))) {
    lines.push({
      id: "live",
      weight: 75,
      text: fuel.live.replaceAll("{name}", shortName(liveRival.display_name)),
    });
  }

  const medal = nextMedal(points);
  if (medal) {
    const label =
      medal.key === "diamond"
        ? fuel.medalDiamond
        : medal.key === "gold"
          ? fuel.medalGold
          : medal.key === "silver"
            ? fuel.medalSilver
            : fuel.medalBronze;
    lines.push({
      id: `medal-${medal.key}`,
      weight: medal.need <= 150 ? 78 : 50,
      text: fuel.medal
        .replaceAll("{n}", String(medal.need))
        .replaceAll("{medal}", label)
        .replaceAll("{badge}", medal.badge),
    });
  } else {
    lines.push({ id: "legend", weight: 40, text: fuel.legend });
  }

  if (rank && rank > 15) {
    lines.push({
      id: "climb-board",
      weight: 82,
      text: fuel.climbBoard.replaceAll("{rank}", String(rank)),
    });
  } else if (rank && rank > 3) {
    lines.push({
      id: "top3",
      weight: 48,
      text: fuel.top3.replaceAll("{rank}", String(rank)),
    });
  }

  if (me.current_streak > 0) {
    lines.push({
      id: "streak",
      weight: 35,
      text: fuel.streak.replaceAll("{n}", String(me.current_streak)),
    });
  }

  lines.push({ id: "name", weight: 30, text: fuel.showName });

  // Deduplicate by id, sort by weight.
  const seen = new Set<string>();
  return lines
    .filter((line) => {
      if (seen.has(line.id)) return false;
      seen.add(line.id);
      return Boolean(line.text.trim());
    })
    .sort((a, b) => b.weight - a.weight);
}

export function pickFuelLine(lines: BoardFuelLine[], tick: number) {
  if (!lines.length) return "";
  // Rotate among the top 3 hottest lines so dopamine keeps refreshing.
  const pool = lines.slice(0, Math.min(3, lines.length));
  return pool[tick % pool.length]?.text || lines[0].text;
}

export { pointsTier };
