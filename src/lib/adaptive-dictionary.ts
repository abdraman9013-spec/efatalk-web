import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const MASTERY_DEFAULT = 5;
export const MASTERY_MIN = 1;
export const MASTERY_MAX = 100;
export const MASTERY_WINDOW = 5;
export const WINS_PER_TIER = 5;
export const MASTERY_BUMP = 2;
export const BEGINNER_DAYS = 14;
export const BEGINNER_CAP = 20;
export const MIN_DICTIONARY_FILL = 10;
export const GENERATE_BATCH = 20;

export type VocabularyWord = {
  id: number;
  word_en: string;
  translation_fr: string;
  translation_ar: string;
  difficulty_index: number;
  category: string;
  image_url: string | null;
};

export type UserMastery = {
  user_id: string;
  current_mastery_index: number;
  matches_won: number;
  account_created_at: string;
  updated_at?: string;
};

export type AdaptiveWordsPayload = {
  user_id: string;
  mastery_index: number;
  effective_mastery: number;
  matches_won: number;
  account_created_at: string;
  range: [number, number];
  words: VocabularyWord[];
};

export type GeneratedWord = {
  word_en: string;
  translation_fr: string;
  translation_ar: string;
  difficulty_index: number;
  category: string;
  image_url?: string | null;
};

function envClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase env is missing");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function createDictionaryClient(): SupabaseClient {
  return envClient();
}

function asMastery(row: UserMastery | null, userId: string): UserMastery {
  if (!row) {
    return {
      user_id: userId,
      current_mastery_index: MASTERY_DEFAULT,
      matches_won: 0,
      account_created_at: new Date().toISOString(),
    };
  }
  return row;
}

export function effectiveMastery(mastery: Pick<UserMastery, "current_mastery_index" | "account_created_at">) {
  const created = new Date(mastery.account_created_at).getTime();
  const beginner = Number.isFinite(created) && Date.now() - created < BEGINNER_DAYS * 86_400_000;
  const capped = beginner ? Math.min(mastery.current_mastery_index, BEGINNER_CAP) : mastery.current_mastery_index;
  return Math.max(MASTERY_MIN, Math.min(MASTERY_MAX, capped));
}

export async function getAdaptiveWords(
  userId: string,
  limitAmount = 20,
  client: SupabaseClient = createDictionaryClient(),
): Promise<AdaptiveWordsPayload> {
  const { data, error } = await client.rpc("get_adaptive_words", {
    user_id: userId,
    limit_amount: Math.max(1, Math.min(limitAmount, 50)),
  });
  if (error) throw error;
  return parsePayload(data, userId);
}

/**
 * Flow-state DDA: a win increments matches_won.
 * Every 5 wins, mastery moves +2 (still capped at 20 for the first 14 days).
 * Losses are a no-op. Never writes daily streak.
 */
export async function updateUserMastery(
  userId: string,
  didWin: boolean,
  client: SupabaseClient = createDictionaryClient(),
): Promise<UserMastery> {
  const id = userId.trim();
  if (!id) throw new Error("invalid user");
  const { data, error } = await client.rpc("efaa_update_user_mastery", {
    p_user_id: id,
    p_did_win: didWin,
  });
  if (error) throw error;
  return asMastery(data as UserMastery | null, id);
}

export async function ingestVocabulary(
  words: GeneratedWord[],
  client: SupabaseClient = createDictionaryClient(),
): Promise<number> {
  if (!words.length) return 0;
  const { data, error } = await client.rpc("efaa_ingest_vocabulary", { p_words: words });
  if (error) throw error;
  return Number(data) || 0;
}

function emptyPayload(userId: string): AdaptiveWordsPayload {
  return {
    user_id: userId,
    mastery_index: MASTERY_DEFAULT,
    effective_mastery: MASTERY_DEFAULT,
    matches_won: 0,
    account_created_at: new Date().toISOString(),
    range: [1, 10],
    words: [],
  };
}

function parsePayload(data: unknown, userId: string): AdaptiveWordsPayload {
  const payload = (data || {}) as Partial<AdaptiveWordsPayload>;
  return {
    user_id: payload.user_id || userId,
    mastery_index: Number(payload.mastery_index) || MASTERY_DEFAULT,
    effective_mastery: Number(payload.effective_mastery) || MASTERY_DEFAULT,
    matches_won: Number(payload.matches_won) || 0,
    account_created_at: payload.account_created_at || new Date().toISOString(),
    range: Array.isArray(payload.range)
      ? [Number(payload.range[0]) || 1, Number(payload.range[1]) || 10]
      : [1, 10],
    words: Array.isArray(payload.words) ? payload.words : [],
  };
}

export async function getSeededWords(
  seed: string,
  userId: string,
  partnerId: string | null,
  limitAmount = 24,
  client: SupabaseClient = createDictionaryClient(),
): Promise<AdaptiveWordsPayload> {
  const { data, error } = await client.rpc("efaa_get_seeded_words", {
    p_seed: seed,
    p_user_id: userId,
    p_partner_id: partnerId || "",
    p_limit: Math.max(1, Math.min(limitAmount, 120)),
  });
  if (error) throw error;
  return parsePayload(data, userId);
}

/** Hits the Edge filler first so Groq can restock a thin difficulty band. */
export async function loadAdaptiveDeck(userId: string, limitAmount = 24): Promise<AdaptiveWordsPayload> {
  try {
    const response = await fetch(
      `/api/fetch-words?userId=${encodeURIComponent(userId)}&limit=${Math.max(1, Math.min(limitAmount, 50))}`,
      { cache: "no-store" },
    );
    if (response.ok) {
      const body = parsePayload(await response.json(), userId);
      if (body.words.length) return body;
    }
  } catch {
    /* RPC fallback */
  }
  try {
    return await getAdaptiveWords(userId, limitAmount);
  } catch {
    return emptyPayload(userId);
  }
}
