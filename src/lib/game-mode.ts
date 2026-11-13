"use client";

import { countryByCode } from "@/lib/countries";
import type { Locale } from "@/i18n/translations";
import type { VocabularyWord } from "@/lib/adaptive-dictionary";
import { getSupabase } from "@/lib/supabase";

export type GameState = {
  user_id: string;
  lightning_bolts: number;
  personal_points: number;
  referral_code: string;
  country_code: string;
  exhausted_at: string | null;
  energy_refill_at: string | null;
  last_board_threshold?: number;
  board_bonus?: number;
};

export type CountryScore = {
  country_code: string;
  country_name: string;
  flag_emoji: string;
  total_score: number;
};

export type GameWin = {
  personal_points: number;
  lightning_bolts: number;
  country_code: string;
  country_score: number;
  personal_gained: number;
  country_gained: number;
  board_bonus?: number;
};

export type PuzzleCard = {
  id: string;
  prompt: Record<Locale, string>;
  words: string[];
};

export type ShadowLine = {
  id: string;
  sentence: string;
};

export const ENERGY_MAX = 50;
export const ENERGY_START = 15;
export const ENERGY_INVITE = 50;
export const ENERGY_WAIT_REFILL = 15;
export const PUZZLE_SECONDS = 15;
export const SWIPE_SECONDS = 5;
export const COMBO_POINT_CAP = 3;
export const CLASS_DAILY_CAP = 700;
export const CLASS_DAILY_CAP_BONUS = 1500;

const SITE = "https://www.efatalk.fyi";

export const PUZZLE_DECK: PuzzleCard[] = [
  {
    id: "bus",
    prompt: { en: "Je dois prendre le bus avant huit heures.", fr: "Je dois prendre le bus avant huit heures.", ar: "يجب أن أركب الحافلة قبل الثامنة." },
    words: ["I", "need", "to", "catch", "the", "bus", "before", "eight"],
  },
  {
    id: "help",
    prompt: { en: "Peux-tu m’aider avec ce problème ?", fr: "Peux-tu m’aider avec ce problème ?", ar: "هل يمكنك مساعدتي في هذه المشكلة؟" },
    words: ["Can", "you", "help", "me", "with", "this", "problem"],
  },
  {
    id: "plan",
    prompt: { en: "Nous devons parler du plan ce soir.", fr: "Nous devons parler du plan ce soir.", ar: "يجب أن نتحدث عن الخطة الليلة." },
    words: ["We", "should", "talk", "about", "the", "plan", "tonight"],
  },
  {
    id: "job",
    prompt: { en: "Elle veut trouver un meilleur travail.", fr: "Elle veut trouver un meilleur travail.", ar: "تريد أن تجد عملاً أفضل." },
    words: ["She", "wants", "to", "find", "a", "better", "job"],
  },
  {
    id: "wait",
    prompt: { en: "Ils attendent le professeur.", fr: "Ils attendent le professeur.", ar: "إنهم ينتظرون الأستاذ." },
    words: ["They", "are", "waiting", "for", "the", "teacher"],
  },
  {
    id: "door",
    prompt: { en: "Ferme la porte derrière toi, s’il te plaît.", fr: "Ferme la porte derrière toi, s’il te plaît.", ar: "أغلق الباب وراءك من فضلك." },
    words: ["Please", "close", "the", "door", "behind", "you"],
  },
  {
    id: "phone",
    prompt: { en: "J’ai oublié mon téléphone à la maison.", fr: "J’ai oublié mon téléphone à la maison.", ar: "نسيت هاتفي في البيت." },
    words: ["I", "forgot", "my", "phone", "at", "home"],
  },
  {
    id: "hotel",
    prompt: { en: "Il cherche un hôtel pas cher.", fr: "Il cherche un hôtel pas cher.", ar: "يبحث عن فندق رخيص." },
    words: ["He", "is", "looking", "for", "a", "cheap", "hotel"],
  },
  {
    id: "market",
    prompt: { en: "Retrouvons-nous devant le marché.", fr: "Retrouvons-nous devant le marché.", ar: "لنلتقِ أمام السوق." },
    words: ["Let's", "meet", "in", "front", "of", "the", "market"],
  },
  {
    id: "net",
    prompt: { en: "Internet ne marche pas aujourd’hui.", fr: "Internet ne marche pas aujourd’hui.", ar: "الإنترنت لا يعمل اليوم." },
    words: ["The", "internet", "is", "not", "working", "today"],
  },
  {
    id: "english",
    prompt: { en: "J’essaie d’améliorer mon anglais chaque jour.", fr: "J’essaie d’améliorer mon anglais chaque jour.", ar: "أحاول تحسين إنجليزيتي كل يوم." },
    words: ["I", "am", "trying", "to", "improve", "my", "English", "every", "day"],
  },
  {
    id: "message",
    prompt: { en: "N’oublie pas d’envoyer le message.", fr: "N’oublie pas d’envoyer le message.", ar: "لا تنسَ إرسال الرسالة." },
    words: ["Do", "not", "forget", "to", "send", "the", "message"],
  },
  {
    id: "meeting",
    prompt: { en: "La réunion commence dans dix minutes.", fr: "La réunion commence dans dix minutes.", ar: "يبدأ الاجتماع بعد عشر دقائق." },
    words: ["The", "meeting", "starts", "in", "ten", "minutes"],
  },
  {
    id: "agree",
    prompt: { en: "Je ne suis pas d’accord avec cette idée.", fr: "Je ne suis pas d’accord avec cette idée.", ar: "أنا لا أتفق مع هذه الفكرة." },
    words: ["I", "do", "not", "agree", "with", "this", "idea"],
  },
  {
    id: "slowly",
    prompt: { en: "Peux-tu répéter ça plus lentement ?", fr: "Peux-tu répéter ça plus lentement ?", ar: "هل يمكنك إعادة ذلك ببطء؟" },
    words: ["Can", "you", "repeat", "that", "more", "slowly"],
  },
  {
    id: "save",
    prompt: { en: "Ils veulent économiser de l’argent ce mois-ci.", fr: "Ils veulent économiser de l’argent ce mois-ci.", ar: "يريدون توفير المال هذا الشهر." },
    words: ["They", "want", "to", "save", "money", "this", "month"],
  },
  {
    id: "family",
    prompt: { en: "Je vais appeler ma famille après le cours.", fr: "Je vais appeler ma famille après le cours.", ar: "سأتصل بعائلتي بعد الحصة." },
    words: ["I", "will", "call", "my", "family", "after", "class"],
  },
  {
    id: "ontime",
    prompt: { en: "Nous devons arriver à l’heure demain.", fr: "Nous devons arriver à l’heure demain.", ar: "يجب أن نصل في الوقت غداً." },
    words: ["We", "must", "arrive", "on", "time", "tomorrow"],
  },
  {
    id: "afraid",
    prompt: { en: "Elle a peur de parler devant le groupe.", fr: "Elle a peur de parler devant le groupe.", ar: "تخاف أن تتكلم أمام المجموعة." },
    words: ["She", "is", "afraid", "to", "speak", "in", "front", "of", "the", "group"],
  },
  {
    id: "rain",
    prompt: { en: "S’il pleut, nous restons à la maison.", fr: "S’il pleut, nous restons à la maison.", ar: "إذا أمطرت نبقى في البيت." },
    words: ["If", "it", "rains", "we", "will", "stay", "at", "home"],
  },
];

export function puzzleFromWords(_words: VocabularyWord[], index: number): PuzzleCard {
  return PUZZLE_DECK[index % PUZZLE_DECK.length];
}

export const SHADOW_DECK: ShadowLine[] = [
  { id: "boss", sentence: "Speak like a pro. Laugh like a friend. Learn like a boss." },
  { id: "tonight", sentence: "I will speak English tonight with no fear." },
  { id: "dream", sentence: "Confidence is a skill you train every day." },
];

function asState(row: unknown): GameState {
  const rec = (row || {}) as Partial<GameState>;
  return {
    user_id: String(rec.user_id || ""),
    lightning_bolts: Number(rec.lightning_bolts) || 0,
    personal_points: Number(rec.personal_points) || 0,
    referral_code: String(rec.referral_code || ""),
    country_code: String(rec.country_code || ""),
    exhausted_at: rec.exhausted_at || null,
    energy_refill_at: rec.energy_refill_at || null,
    last_board_threshold: Number(rec.last_board_threshold) || 0,
    board_bonus: Number((rec as { board_bonus?: number }).board_bonus) || 0,
  };
}

export function localGameState(userId: string, countryCode: string): GameState {
  const code = countryCode.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) || "TD";
  return {
    user_id: userId,
    lightning_bolts: ENERGY_START,
    personal_points: 0,
    referral_code: `EFA${userId.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase() || "PLAYER"}`,
    country_code: code,
    exhausted_at: null,
    energy_refill_at: null,
  };
}

function withTimeout<T>(task: PromiseLike<T>, ms = 6000) {
  return Promise.race([
    Promise.resolve(task),
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error("game-timeout")), ms);
    }),
  ]);
}

export async function ensureGameState(userId: string, countryCode: string): Promise<GameState> {
  const fallback = localGameState(userId, countryCode);
  try {
    const country = countryByCode(countryCode);
    const { data, error } = await withTimeout<{ data: unknown; error: { message: string } | null }>(
      getSupabase().rpc("efaa_ensure_game_state", {
        p_user_id: userId,
        p_country_code: countryCode,
        p_country_name: country?.name || countryCode,
      }),
    );
    if (error || !data) return fallback;
    return asState(data);
  } catch {
    return fallback;
  }
}

export async function awardGameWin(userId: string): Promise<GameWin> {
  const { data, error } = await getSupabase().rpc("efaa_award_game_win", { p_user_id: userId });
  if (error) throw error;
  return data as GameWin;
}

export async function addGamePoints(userId: string, points: number): Promise<GameState> {
  const { data, error } = await getSupabase().rpc("efaa_add_game_points", {
    p_user_id: userId,
    p_points: Math.min(COMBO_POINT_CAP, Math.max(0, Math.floor(points))),
  });
  if (error) throw error;
  return asState(data);
}

export async function spendGameEnergy(userId: string): Promise<GameState> {
  const { data, error } = await getSupabase().rpc("efaa_spend_game_energy", { p_user_id: userId });
  if (error) throw error;
  return asState(data);
}

export async function rechargeGameEnergy(userId: string): Promise<GameState> {
  const { data, error } = await getSupabase().rpc("efaa_recharge_game_energy", { p_user_id: userId });
  if (error) throw error;
  return asState(data);
}

export async function claimEnergyRefill(userId: string): Promise<GameState> {
  const { data, error } = await getSupabase().rpc("efaa_claim_energy_refill", { p_user_id: userId });
  if (error) throw error;
  return asState(data);
}

export async function fetchCountryBoard(): Promise<CountryScore[]> {
  try {
    const { data, error } = await withTimeout<{ data: CountryScore[] | null; error: { message: string } | null }>(
      getSupabase()
        .from("efaa_countries_leaderboard")
        .select("country_code, country_name, flag_emoji, total_score")
        .order("total_score", { ascending: false })
        .limit(3),
    );
    if (error) return [];
    return (data || []) as CountryScore[];
  } catch {
    return [];
  }
}

export function referralUrl(code: string) {
  return `${SITE}/auth?ref=${encodeURIComponent(code)}`;
}

export function handleWhatsAppInvite(state: GameState, countryName?: string) {
  const line = `Rejoins-moi sur EfaTalk ⚡ ${SITE}`;
  const text = encodeURIComponent(line);
  const web = `https://wa.me/?text=${text}`;
  try {
    window.open(web, "_blank", "noopener,noreferrer");
  } catch {
    window.location.href = web;
  }
  return rechargeGameEnergy(state.user_id);
}

export function shadowFromWords(words: VocabularyWord[], index: number): ShadowLine {
  const fallback = SHADOW_DECK[index % SHADOW_DECK.length];
  if (!words.length) return fallback;
  const word = words[index % words.length];
  return {
    id: `${word.id}-shadow-${index}`,
    sentence: `I can say ${word.word_en} clearly.`,
  };
}

export function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}
