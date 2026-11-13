"use client";

import { useI18n } from "@/i18n/provider";
import type { Level } from "@/i18n/translations";

export function PlayEntry({ level }: { level?: Level }) {
  const { t } = useI18n();
  const label =
    level === "advanced"
      ? t.play.stormEnter
      : level === "intermediate"
        ? t.play.puzzleEnter
        : t.play.enter;
  return (
    <a href="/play" className="play-entry">
      {label}
    </a>
  );
}
