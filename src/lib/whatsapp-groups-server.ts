import "server-only";

import type { Level } from "@/i18n/translations";

const WHATSAPP_GROUP_BY_LEVEL: Record<Level, string> = {
  beginner: "https://chat.whatsapp.com/EvOgOnck9M9IpT7aR4OjAI",
  intermediate: "https://chat.whatsapp.com/JStt1FYCXwSADCoz84J4Zf",
  advanced: "https://chat.whatsapp.com/KepF9pIkSAz10uEkpMixqk",
};

export function whatsappGroupForExactLevel(level: string | null | undefined) {
  if (level === "beginner" || level === "intermediate" || level === "advanced") {
    return { level, href: WHATSAPP_GROUP_BY_LEVEL[level] };
  }
  return null;
}
