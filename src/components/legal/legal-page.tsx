import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh w-full bg-[#f4efe6] text-[#0c1b4d]">
      <header className="border-b border-[#0c1b4d]/10 px-4 py-4 md:px-8">
        <Link href="/" className="text-[12px] font-semibold tracking-[0.16em] uppercase text-[#1a3a7a]">
          English For All Academy
        </Link>
        <h1 className="mt-2 font-display text-[32px] leading-tight md:text-[42px]">{title}</h1>
        <p className="mt-1 text-[13px] text-[#1a2a4a]/70">{updated}</p>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-24 text-[15px] leading-relaxed md:px-8 md:py-12">
        {children}
      </main>
    </div>
  );
}

export function LegalH({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 font-display text-[22px] text-[#0c1b4d]">{children}</h2>;
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[#1a2a4a]">{children}</p>;
}
