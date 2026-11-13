"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/landing/language-switcher";
import { fetchChallengePublic } from "@/lib/challenge-api";
import type { ChallengePublicPayload } from "@/lib/challenge-types";
import { useI18n } from "@/i18n/provider";

export function ChallengeWinnersPage() {
  const { locale } = useI18n();
  const [data, setData] = useState<ChallengePublicPayload | null>(null);
  useEffect(() => {
    void fetchChallengePublic().then(setData).catch(() => undefined);
  }, []);
  const final = data?.challenge.phase === "final" && data.challenge.leaderboardLocked;
  const c =
    locale === "ar"
      ? { back: "العودة", title: "أبطال EfaTalk 2026", pending: "سيتم إعلان الفائزين بعد التحقق النهائي في 30 أو 31 أكتوبر.", first: "بطل EfaTalk للإنجليزية 2026", second: "الوصيف", third: "المركز الثالث" }
      : locale === "en"
        ? { back: "Back", title: "EfaTalk Champions 2026", pending: "Winners will be announced after final verification on 30 or 31 October.", first: "EfaTalk English Champion 2026", second: "Challenge Runner-Up", third: "Challenge Third Place" }
        : { back: "Retour", title: "Champions EfaTalk 2026", pending: "Les gagnants seront annoncés après la vérification finale du 30 ou 31 octobre.", first: "EfaTalk English Champion 2026", second: "Runner-Up du Challenge", third: "Troisième place du Challenge" };
  const labels = [c.first, c.second, c.third];
  const prizes = ["75 000 FCFA", "50 000 FCFA", "25 000 FCFA"];

  return (
    <div className="challenge-sea">
      <header className="challenge-sea-header px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/challenge" className="font-bold text-[#8a6a12]">← {c.back}</Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8a6a12]">EfaTalk English Challenge</p>
        <h1 className="mt-3 font-display text-4xl md:text-6xl">{c.title}</h1>
        {!final ? (
          <div className="mx-auto mt-10 max-w-xl rounded-[30px] border border-[#c9a227]/30 bg-white/70 p-8">
            <p className="text-lg leading-relaxed text-[#1e6a80]">{c.pending}</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {(data?.leaderboard || []).slice(0, 3).map((winner, index) => (
              <article key={winner.userId} className="rounded-[28px] border border-[#c9a227]/35 bg-white/75 p-6">
                <p className="text-4xl">{index === 0 ? "🏆" : index === 1 ? "🥈" : "🥉"}</p>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-[#8a6a12]">{labels[index]}</p>
                <h2 className="mt-3 font-display text-2xl">{winner.displayName}</h2>
                <p className="mt-3 font-black">{winner.points} pts</p>
                <p className="mt-1 text-sm text-[#1e6a80]">{prizes[index]}</p>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
