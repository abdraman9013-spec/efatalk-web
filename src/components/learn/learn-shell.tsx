"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/landing/language-switcher";

export function LearnShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-sky-100 via-[#f7fbff] to-amber-50 text-slate-900">
      <div className="pointer-events-none absolute -left-16 top-8 h-56 w-56 rounded-full bg-sky-300/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-24 h-64 w-64 rounded-full bg-amber-300/40 blur-3xl" />
      <header className="relative z-10 flex items-center justify-between px-4 pt-4 md:px-8">
        <button
          type="button"
          onClick={() => router.push("/vip-dashboard")}
          className="rounded-full bg-white/80 px-3 py-1.5 text-[12px] font-bold text-sky-800"
        >
          ←
        </button>
        <p className="font-display text-[13px] text-sky-800">English For All Academy</p>
        <LanguageSwitcher />
      </header>
      <main className="relative z-10 mx-auto max-w-lg px-4 pb-16 pt-6 md:max-w-xl">
        <h1 className="font-display text-[28px] text-slate-900">{title}</h1>
        <div className="mt-5">{children}</div>
      </main>
    </div>
  );
}
