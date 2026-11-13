"use client";

import Image from "next/image";
import { LanguageSwitcher } from "./language-switcher";
import { useI18n } from "@/i18n/provider";
import { usePwaInstall } from "@/lib/use-pwa-install";

export function SiteHeader({ onLogoPress }: { onLogoPress?: () => void }) {
  const { t } = useI18n();
  const { canInstall, install } = usePwaInstall();

  return (
    <header className="sticky top-0 z-40 px-3 pt-2 pr-[3.75rem] md:pr-[4.25rem]">
      <div className="efa-sea-glass-dark mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-2xl px-3 py-1.5 md:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button type="button" onClick={onLogoPress} className="shrink-0 rounded-full" aria-label={t.admin.gate}>
            <Image
              src="/brand/efaa-logo-v6.png"
              alt={t.header.academy}
              width={34}
              height={34}
              className="h-8 w-8 logo-shine"
            />
          </button>
          <div className="min-w-0">
            <p className="truncate font-display text-[12px] leading-[1.15] text-ivory">
              English For All Academy
            </p>
            <p className="text-[9px] tracking-[0.16em] text-gold/85">{t.header.live}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {canInstall ? (
            <button
              type="button"
              onClick={() => void install()}
              className="shrink-0 rounded-full bg-[#f0d78c] px-2.5 py-1 text-[10px] font-bold text-[#0c1b4d]"
            >
              {t.install.actionShort}
            </button>
          ) : null}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
