"use client";

import { ChevronDown } from "lucide-react";
import type { MouseEvent } from "react";
import { useI18n } from "@/i18n/provider";

/** Dark fleche — tap jumps to the next landing section. Page stays freely finger-scrollable. */
export function SectionDownArrow({
  to,
  light = false,
}: {
  to: string;
  light?: boolean;
}) {
  const { t } = useI18n();
  const target = to.startsWith("#") ? to : `#${to}`;

  function go(event: MouseEvent<HTMLAnchorElement>) {
    const id = target.slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    const top = el.getBoundingClientRect().top + window.scrollY - 8;
    window.scrollTo({ top, behavior: "smooth" });
    try {
      history.replaceState(null, "", target);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex justify-center pb-3 pt-5">
      <a
        href={target}
        onClick={go}
        className={`inline-flex min-h-12 min-w-[3rem] flex-col items-center justify-center gap-0.5 rounded-full px-5 py-2.5 transition active:scale-95 ${
          light
            ? "text-[#1a3a7a]"
            : "border border-[#d4af37]/40 bg-[#0c1b4d] text-[#f0d78c] shadow-[0_12px_32px_rgba(12,27,77,0.35)]"
        }`}
        aria-label={t.hero.scrollPage}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{t.hero.scrollPage}</span>
        <ChevronDown className={`h-5 w-5 ${light ? "animate-bounce" : "animate-bounce"}`} />
      </a>
    </div>
  );
}
