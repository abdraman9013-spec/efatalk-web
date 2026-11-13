"use client";

export type SurvivalPhrase = {
  id: string;
  en: string;
  fr: string;
  ar: string;
};

export const SURVIVAL_PHRASES: SurvivalPhrase[] = [
  { id: "hello", en: "Hello, how are you?", fr: "Bonjour, comment ça va ?", ar: "مرحبا، كيف حالك؟" },
  { id: "name", en: "What is your name?", fr: "Comment tu t'appelles ?", ar: "ما اسمك؟" },
  { id: "from", en: "Where are you from?", fr: "Tu viens d'où ?", ar: "من أين أنت؟" },
  { id: "good", en: "I am good, thanks", fr: "Je vais bien, merci", ar: "أنا بخير، شكرا" },
  { id: "meet", en: "Nice to meet you!", fr: "Ravi de te rencontrer !", ar: "تشرفت بمعرفتك!" },
];

const KEY = "efaa-survival-unlock";

export function survivalUnlockKey(userId: string) {
  return `${KEY}:${userId}`;
}

export function readSurvivalUnlock(userId: string) {
  if (!userId || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(survivalUnlockKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function writeSurvivalUnlock(userId: string) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(survivalUnlockKey(userId), "1");
  } catch {
    /* private mode */
  }
}
