"use client";

import { getSupabase } from "@/lib/supabase";

export const CLASH_SECONDS = 60;
export const CLASH_WAGER = 1;
export const CLASH_STEP = 10;
export const CLASH_EMOJIS = ["😭", "💀", "🔥", "😂", "👑"] as const;
export const CLASH_WORDS = [
  "PEANUT",
  "CHEESE",
  "PINEAPPLE",
  "CARROT",
  "BREAKFAST",
  "KETTLE",
  "CUCUMBER",
  "SANDWICH",
  "VANILLA",
  "BITTER",
  "FINGER",
  "FOREHEAD",
  "DOCTOR",
  "HOMEWORK",
  "ALPHABET",
  "GRAMMAR",
  "WRITING",
  "EXPLAIN",
  "MEANING",
  "BALCONY",
  "CURTAIN",
  "SHOWER",
  "HAMMER",
  "LAUNDRY",
  "POCKET",
  "SWEATER",
  "LEATHER",
  "BRACELET",
  "GRANDSON",
  "COUPLE",
  "PARTNER",
  "CLIENT",
  "FARMER",
  "SOLDIER",
  "BARBER",
  "PRESIDENT",
  "DESERT",
  "HARBOR",
  "THEATER",
  "FACTORY",
  "PALACE",
  "CANTEEN",
  "TRACTOR",
  "LUGGAGE",
  "ENGINE",
  "ARRIVAL",
  "HARVEST",
  "WINTER",
  "BRANCH",
  "MONKEY",
  "ANTELOPE",
  "SCORPION",
  "PARROT",
  "MINUTE",
  "THURSDAY",
  "FEBRUARY",
  "DECEMBER",
  "ALREADY",
  "DECADE",
  "CIRCLE",
  "MILLION",
  "HEIGHT",
  "BRIGHT",
  "PUBLIC",
  "NORMAL",
  "IMPORTANT",
  "CAREFUL",
  "FINISH",
  "BELIEVE",
  "EXPLORE",
  "INVITE",
  "DECIDE",
  "IMAGINE",
  "COMPLAIN",
  "SADNESS",
  "EFFORT",
  "HISTORY",
  "MYSTERY",
  "INTEREST",
  "AMOUNT",
  "CRISIS",
  "JUSTICE",
  "COMPANY",
  "PASSWORD",
  "PRINTER",
  "SIGNAL",
  "SOFTWARE",
  "UPLOAD",
  "BOXING",
  "WHISTLE",
  "RHYTHM",
  "FESTIVAL",
  "PILGRIM",
  "SUMMARY",
  "RESEARCH",
  "CONTEXT",
  "INDUSTRY",
  "CONSUMER",
  "CREDIT",
  "MEETING",
];

export type ClashPeer = {
  id: string;
  name: string;
  photo?: string;
  nationality?: string;
};

export type ClashSettle = {
  winner_bolts: number;
  loser_bolts: number;
  winner_elo: number;
  loser_elo: number;
  paid: number;
};

export function clashSpell(word: string) {
  return word.toUpperCase().replace(/[^A-Z]/g, "");
}

export function uniqueClashDeck(words: string[], minSize = 40) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of words) {
    const word = clashSpell(raw);
    if (!word || word.length < 4 || word.length > 12 || seen.has(word)) continue;
    seen.add(word);
    out.push(word);
  }
  // Pad from hardcoded list ONLY when the live dictionary is thin — never dilute a healthy deck.
  if (out.length < minSize) {
    for (const word of CLASH_WORDS) {
      if (seen.has(word)) continue;
      seen.add(word);
      out.push(word);
      if (out.length >= minSize) break;
    }
  }
  return out.length >= 10 ? out : [...CLASH_WORDS];
}

export function clashPairKey(a: string, b: string) {
  return [a, b].sort().join(":");
}

/** Per-pair match counter so each new fight gets a fresh seed (not the same day-locked deck). */
export function nextClashMatchId(userA: string, userB: string) {
  const key = `efaa_clash_match_n:${clashPairKey(userA, userB)}`;
  let n = 0;
  try {
    n = Math.max(0, Number(sessionStorage.getItem(key) || "0") || 0) + 1;
    sessionStorage.setItem(key, String(n));
  } catch {
    n = Date.now() % 100000;
  }
  return `${clashPairKey(userA, userB)}:m${n}`;
}

export function rememberClashCursor(matchId: string, wordIndex: number, deck: string[]) {
  try {
    sessionStorage.setItem(
      `efaa_clash_live:${matchId}`,
      JSON.stringify({ wordIndex, deck, at: Date.now() }),
    );
  } catch {
    /* private mode */
  }
}

export function restoreClashCursor(matchId: string): { wordIndex: number; deck: string[] } | null {
  try {
    const raw = sessionStorage.getItem(`efaa_clash_live:${matchId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { wordIndex?: number; deck?: string[]; at?: number };
    if (!Array.isArray(parsed.deck) || !parsed.deck.length) return null;
    if (parsed.at && Date.now() - parsed.at > 15 * 60 * 1000) return null;
    return {
      wordIndex: Math.max(0, Number(parsed.wordIndex) || 0),
      deck: parsed.deck.map(clashSpell).filter(Boolean),
    };
  } catch {
    return null;
  }
}

/** Sequential deck cursor — NEVER re-scramble mid-deck (that caused repeats). */
export function clashWord(_roomId: string, index: number, deck?: string[]) {
  const pool = deck?.length ? deck : CLASH_WORDS;
  const pos = ((Math.max(0, index) % pool.length) + pool.length) % pool.length;
  return clashSpell(pool[pos]) || CLASH_WORDS[pos % CLASH_WORDS.length];
}

/** Fresh order for rematch — keeps uniqueness, rotates away from last words. */
export function rotateClashDeck(deck: string[], usedCount: number) {
  if (!deck.length) return uniqueClashDeck([]);
  const start = Math.min(Math.max(0, usedCount), deck.length - 1);
  const rotated = [...deck.slice(start), ...deck.slice(0, start)];
  // Fisher-Yates with fixed salt from usedCount so both players stay in sync if needed.
  let seed = usedCount * 9973 + 17;
  for (let i = rotated.length - 1; i > 0; i -= 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = seed % (i + 1);
    [rotated[i], rotated[j]] = [rotated[j], rotated[i]];
  }
  return rotated;
}

export function scrambleWord(word: string, roomId: string, index: number) {
  const letters = word.split("");
  let seed = roomId.split("").reduce((sum, char) => sum + char.charCodeAt(0), index + 1);
  for (let i = letters.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = seed % (i + 1);
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters;
}

export type ClashPitPartner = ClashPeer & { seat: string };

export type ClashPitSnapshot = {
  waiting: number;
  partner: ClashPitPartner | null;
};

export async function joinClashPit(seat: string, roomId: string, me: ClashPeer) {
  const { data, error } = await getSupabase().rpc("efaa_join_clash_pit", {
    p_seat: seat,
    p_room: roomId,
    p_user: me.id,
    p_name: me.name,
    p_photo: me.photo || null,
    p_nat: me.nationality || null,
  });
  if (error) throw error;
  const row = (data || {}) as { waiting?: number; partner?: ClashPitPartner | null };
  return {
    waiting: Math.max(1, Number(row.waiting) || 1),
    partner: row.partner?.seat && row.partner.id ? row.partner : null,
  } satisfies ClashPitSnapshot;
}

export async function leaveClashPit(seat: string) {
  await getSupabase().rpc("efaa_leave_clash_pit", { p_seat: seat });
}

export async function settleClash(winnerId: string, loserId: string, wager = CLASH_WAGER) {
  const { data, error } = await getSupabase().rpc("efaa_settle_clash", {
    p_winner: winnerId,
    p_loser: loserId,
    p_wager: wager,
  });
  if (error) throw error;
  return data as ClashSettle;
}

export async function fetchElo(userId: string) {
  const { data } = await getSupabase().from("efaa_user_elo").select("elo").eq("user_id", userId).maybeSingle();
  return Number(data?.elo || 1000);
}
