export type ChallengeGate = "rules" | "tiktok" | "facebook";

export type OpenedGates = Record<ChallengeGate, boolean>;

const KEY = "efaa_challenge_opened";

const EMPTY: OpenedGates = { rules: false, tiktok: false, facebook: false };

export function readChallengeOpened(): OpenedGates {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY) || window.sessionStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<OpenedGates>) : {};
    return {
      rules: Boolean(parsed.rules),
      tiktok: Boolean(parsed.tiktok),
      facebook: Boolean(parsed.facebook),
    };
  } catch {
    return EMPTY;
  }
}

/** Written before leaving the page, so Back still unlocks the checkbox. */
export function markChallengeOpened(key: ChallengeGate): OpenedGates {
  const next = { ...readChallengeOpened(), [key]: true };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage blocked */
    }
  }
  return next;
}
