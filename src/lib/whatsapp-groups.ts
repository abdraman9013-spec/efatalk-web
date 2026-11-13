import type { Level } from "@/i18n/translations";
import { ACADEMY_TZ } from "@/lib/schedule";
import { getSupabase } from "@/lib/supabase";

export function isAcademyLevel(level: string | null | undefined): level is Level {
  return level === "beginner" || level === "intermediate" || level === "advanced";
}

export function academyDateStamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ACADEMY_TZ }).format(date);
}

export function whatsappJoinedStorageKey(userId: string, level: string, href: string) {
  return `efaa_wa_joined:${userId}:${level}:${href}`;
}

export function whatsappNoteDismissKey(userId: string) {
  return `efaa_wa_note:${userId}`;
}

export async function fetchOwnWhatsAppGroup(expectedLevel?: string | null) {
  if (expectedLevel && !isAcademyLevel(expectedLevel)) return null;
  try {
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    const response = await fetch("/api/whatsapp-group", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { href?: string; level?: string };
    if (!payload.href || !isAcademyLevel(payload.level)) return null;
    if (expectedLevel && payload.level !== expectedLevel) return null;
    return { href: payload.href, level: payload.level };
  } catch {
    return null;
  }
}
