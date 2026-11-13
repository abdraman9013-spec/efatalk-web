"use client";

import { locales } from "@/i18n/translations";
import { useI18n } from "@/i18n/provider";

export function LanguageSwitcher({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { locale, setLocale } = useI18n();
  const light = tone === "light";

  return (
    <div
      className={`flex shrink-0 items-center gap-0.5 rounded-full border p-0.5 backdrop-blur-xl ${
        light
          ? "border-[#0c1b4d]/15 bg-white/80"
          : "border-gold/25 bg-royal/30"
      }`}
      role="group"
      aria-label="Language"
    >
      {locales.map((item) => {
        const active = item.id === locale;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setLocale(item.id)}
            className={`rounded-full px-1.5 py-1 text-[10px] font-semibold tracking-wide transition ${
              active
                ? "bg-gold text-[#1a1406] shadow-[0_4px_14px_rgba(212,175,55,0.18)]"
                : light
                  ? "text-[#0c1b4d]/65 hover:text-[#0c1b4d]"
                  : "text-ivory/70"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
