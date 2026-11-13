"use client";

import type { Locale } from "@/i18n/translations";
import { getSupabase } from "@/lib/supabase";

export const EMOJI_DECK_SIZE = 12;

export type EmojiWord = {
  id: number;
  word_en: string;
  translation_fr: string;
  emoji: string;
  translation_ar?: string | null;
};

export type EmojiSwipeCard = {
  id: string;
  word_en: string;
  translation: string;
  emoji: string;
  match: boolean;
};

const SEEN_KEY = "efaa_emoji_seen_ids";
const SEEN_CAP = 240;

function asWord(row: unknown): EmojiWord | null {
  if (!row || typeof row !== "object") return null;
  const rec = row as Record<string, unknown>;
  const id = Number(rec.id);
  const word_en = String(rec.word_en || "").trim();
  const translation_fr = String(rec.translation_fr || "").trim();
  const emoji = String(rec.emoji || "").trim();
  if (!Number.isFinite(id) || !word_en || !translation_fr || !emoji) return null;
  if (emoji.includes("▶") || /^[A-Za-z0-9._-]+$/.test(emoji)) return null;
  return {
    id,
    word_en,
    translation_fr,
    emoji,
    translation_ar: rec.translation_ar ? String(rec.translation_ar) : null,
  };
}

function labelFor(word: EmojiWord, locale: Locale) {
  if (locale === "ar" && word.translation_ar?.trim()) return word.translation_ar.trim();
  return word.translation_fr;
}

function readSeenIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(Number).filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
}

function writeSeenIds(ids: number[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-SEEN_CAP)));
  } catch {
    /* private mode */
  }
}

export function rememberEmojiIds(words: EmojiWord[]) {
  const next = [...readSeenIds()];
  for (const word of words) {
    if (!next.includes(word.id)) next.push(word.id);
  }
  writeSeenIds(next);
}

export function clearEmojiSeen() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SEEN_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Emoji + English always belong to the SAME word.
 * Only the translation can be wrong (FALSE card) — never the picture/English pair.
 * Match/mismatch is seeded by word id so React remounts never reshuffle a live card.
 */
export function cardsFromEmojiDeck(words: EmojiWord[], locale: Locale): EmojiSwipeCard[] {
  if (words.length < 2) return [];
  return words.map((word, index) => {
    const match = word.id % 2 === 0;
    const other = words[(index + 1 + (word.id % (words.length - 1 || 1))) % words.length] || words[(index + 1) % words.length];
    const foil = other.id === word.id ? words[(index + 2) % words.length] : other;
    return {
      id: `${word.id}-swipe-${index}`,
      word_en: word.word_en.toUpperCase(),
      translation: match ? labelFor(word, locale) : labelFor(foil || word, locale),
      emoji: word.emoji,
      match,
    };
  });
}

export async function fetchRandomEmojiWords(n = EMOJI_DECK_SIZE): Promise<EmojiWord[]> {
  const size = Math.max(2, Math.min(n, 40));
  const exclude = readSeenIds();
  const client = getSupabase();

  async function pull(skip: number[]) {
    const { data, error } = await client.rpc("efaa_random_emoji_words", {
      n: size,
      p_exclude: skip.length ? skip : null,
    });
    if (error) throw error;
    return Array.isArray(data) ? data.map(asWord).filter((row): row is EmojiWord => Boolean(row)) : [];
  }

  let rows = await pull(exclude);
  if (rows.length < 2 && exclude.length) {
    clearEmojiSeen();
    rows = await pull([]);
  }
  // Legacy single-arg RPC fallback
  if (rows.length < 2) {
    const { data, error } = await client.rpc("efaa_random_emoji_words", { n: size });
    if (error) throw error;
    rows = Array.isArray(data) ? data.map(asWord).filter((row): row is EmojiWord => Boolean(row)) : [];
  }
  if (rows.length < 2) throw new Error("emoji-deck-empty");
  rememberEmojiIds(rows);
  return rows;
}
