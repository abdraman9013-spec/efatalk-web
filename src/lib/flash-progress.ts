const DONE_KEY = "efaa_flash_done";
const STARS_KEY = "efaa_flash_stars";

function tag(email: string) {
  return email.trim().toLowerCase() || "guest";
}

export function isFlashDone(email: string) {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DONE_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as string[]).includes(tag(email));
  } catch {
    return false;
  }
}

export function markFlashDone(email: string, stars: number) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(DONE_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    if (!list.includes(tag(email))) list.push(tag(email));
    window.localStorage.setItem(DONE_KEY, JSON.stringify(list.slice(-40)));
    window.localStorage.setItem(STARS_KEY, String(readStars() + stars));
  } catch {
    /* private mode */
  }
}

export function readStars() {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(STARS_KEY) || 0) || 0;
}
