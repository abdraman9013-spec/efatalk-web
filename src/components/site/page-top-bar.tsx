"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/landing/language-switcher";

/** Public-page top bar: Retour | languages | space reserved for fixed hamburger. */
export function PageTopBar({
  backHref,
  backLabel,
}: {
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 pr-14 md:pr-16">
      <Link
        href={backHref}
        className="shrink-0 rounded-full border border-[#0c1b4d]/12 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0c1b4d] shadow-[0_8px_24px_rgba(12,27,77,0.04)]"
      >
        ← {backLabel}
      </Link>
      <div className="flex min-w-0 shrink-0 justify-end">
        <LanguageSwitcher tone="light" />
      </div>
    </div>
  );
}
