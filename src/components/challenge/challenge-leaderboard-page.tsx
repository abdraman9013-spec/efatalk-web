"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/landing/language-switcher";
import { fetchChallengeMe, fetchChallengePublic } from "@/lib/challenge-api";
import type { ChallengeMe, ChallengePublicPayload } from "@/lib/challenge-types";
import { useI18n } from "@/i18n/provider";

export function ChallengeLeaderboardPage() {
  const { locale } = useI18n();
  const [data, setData] = useState<ChallengePublicPayload | null>(null);
  const [me, setMe] = useState<ChallengeMe | null>(null);
  useEffect(() => {
    void Promise.all([fetchChallengePublic(), fetchChallengeMe().catch(() => null)]).then(
      ([publicData, profile]) => {
        setData(publicData);
        setMe(profile);
      },
    );
  }, []);

  const copy =
    locale === "ar"
      ? { title: "الترتيب المباشر", back: "العودة", points: "نقطة", you: "ترتيبك", active: "أيام نشطة", speaking: "جلسات كلام" }
      : locale === "en"
        ? { title: "Live leaderboard", back: "Back", points: "points", you: "Your rank", active: "active days", speaking: "speaking sessions" }
        : { title: "Classement en direct", back: "Retour", points: "points", you: "Ton rang", active: "jours actifs", speaking: "sessions de parole" };

  return (
    <div className="challenge-sea">
      <header className="challenge-sea-header sticky top-0 z-30 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href="/challenge" className="font-bold text-[#8a6a12]">← {copy.back}</Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8a6a12]">EfaTalk Challenge 2026</p>
        <h1 className="mt-2 font-display text-4xl">{copy.title}</h1>
        {me?.joined ? (
          <div className="sticky top-16 z-20 mt-5 flex items-center justify-between rounded-2xl border border-[#c9a227]/40 bg-white/85 p-4 shadow-xl backdrop-blur">
            <span className="font-bold">{copy.you}</span>
            <span className="text-xl font-black text-[#8a6a12]">{me.rank ? `#${me.rank}` : "—"} · {me.challengePoints} pts</span>
          </div>
        ) : null}
        <ol className="mt-5 space-y-2">
          {(data?.leaderboard || []).map((leader) => (
            <li
              key={leader.userId}
              className={`rounded-2xl border p-4 ${leader.userId === me?.userId ? "border-[#c9a227] bg-[#fff8e4]" : "border-white/60 bg-white/70"}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-9 text-center text-lg font-black text-[#8a6a12]">#{leader.rank}</span>
                <span className="min-w-0 flex-1 truncate font-bold">{leader.displayName}</span>
                <span className="font-black">{leader.points} {copy.points}</span>
              </div>
              <p className="mt-2 ps-12 text-[11px] text-[#1e6a80]/70">
                {leader.activeDays} {copy.active} · {leader.speakingSessions} {copy.speaking}
              </p>
            </li>
          ))}
          {!data ? <li className="py-12 text-center text-[#1e6a80]/60">…</li> : null}
          {data && !data.leaderboard.length ? (
            <li className="rounded-2xl border border-white/60 bg-white/70 p-8 text-center text-[#1e6a80]/80">
              {locale === "ar"
                ? "يبدأ الترتيب في 15 أكتوبر."
                : locale === "en"
                  ? "The leaderboard starts on 15 October."
                  : "Le classement commencera le 15 octobre."}
            </li>
          ) : null}
        </ol>
      </main>
    </div>
  );
}
