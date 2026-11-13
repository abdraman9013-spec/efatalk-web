"use client";

export const MID_GATE_SECONDS = 10;

export type MidGatePhrase = {
  id: string;
  words: string[];
  fr: string;
  ar: string;
};

export const MID_GATE_PHRASES: MidGatePhrase[] = [
  {
    id: "disagree",
    words: ["I", "completely", "disagree", "with", "you"],
    fr: "Je ne suis pas du tout d'accord avec toi",
    ar: "أنا لا أتفق معك إطلاقاً",
  },
  {
    id: "view",
    words: ["From", "my", "point", "of", "view"],
    fr: "De mon point de vue",
    ar: "من وجهة نظري",
  },
  {
    id: "point",
    words: ["That", "is", "a", "good", "point", "but"],
    fr: "C'est un bon argument, mais",
    ar: "هذه نقطة جيدة، لكن",
  },
  {
    id: "explain",
    words: ["Let", "me", "explain", "why"],
    fr: "Laisse-moi t'expliquer pourquoi",
    ar: "دعني أشرح لماذا",
  },
];

const KEY = "efaa-mid-gate-unlock";

export function midUnlockKey(userId: string) {
  return `${KEY}:${userId}`;
}

export function readMidUnlock(userId: string) {
  if (!userId || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(midUnlockKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function writeMidUnlock(userId: string) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(midUnlockKey(userId), "1");
  } catch {
    /* private mode */
  }
}

export function scrambleWords(words: string[]) {
  const next = [...words];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  if (next.join(" ") === words.join(" ") && next.length > 1) {
    [next[0], next[1]] = [next[1], next[0]];
  }
  return next;
}

export function nextMidPhrase(currentId: string) {
  const others = MID_GATE_PHRASES.filter((item) => item.id !== currentId);
  return others[Math.floor(Math.random() * others.length)] || MID_GATE_PHRASES[0];
}
