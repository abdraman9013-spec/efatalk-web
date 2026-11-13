/** Default discount ends 15 Nov (Chad / Ndjamena) — overridden by admin when set. */
export const FORMATION_DISCOUNT_END_MS = Date.UTC(2026, 10, 15, 22, 59, 59);

export function formationDiscountRemainingMs(endMs = FORMATION_DISCOUNT_END_MS, now = Date.now()) {
  return Math.max(0, endMs - now);
}

export function formationDiscountParts(endMs = FORMATION_DISCOUNT_END_MS, now = Date.now()) {
  const ms = formationDiscountRemainingMs(endMs, now);
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { ms, days, hours, minutes, seconds, expired: ms <= 0 };
}
