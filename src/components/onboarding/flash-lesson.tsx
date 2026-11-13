"use client";

import { AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FinaleModal } from "@/components/onboarding/finale-modal";
import { FlashCard } from "@/components/onboarding/flash-card";
import { StarBurst } from "@/components/onboarding/star-burst";
import { useI18n } from "@/i18n/provider";
import { buildDailySession, statusPhrase, type PhraseSlots } from "@/lib/beginner-curriculum";
import { countryByCode } from "@/lib/countries";
import { restoreStudent } from "@/lib/efaa-db";
import { buzz, playLevelUp, STARS_PER_CARD } from "@/lib/flash-lesson";
import { reportFirstEnglish } from "@/lib/challenge-api";
import {
  completeFormation,
  ensureGamification,
  formationDoneToday,
  type GamificationRow,
} from "@/lib/gamification";
import { lobbyPath, roomPath, type EfaaStudent } from "@/lib/session";
import { useAvatarBroadcast } from "@/lib/avatar";

export function FlashLesson() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [me, setMe] = useState<EfaaStudent | null>(null);
  const [row, setRow] = useState<GamificationRow | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [burst, setBurst] = useState(0);
  const [done, setDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useAvatarBroadcast(setMe);

  useEffect(() => {
    let live = true;
    restoreStudent()
      .then(async (student) => {
        if (!live) return;
        if (!student?.level) {
          router.replace("/auth");
          return;
        }
        if (student.level !== "beginner") {
          router.replace(roomPath(student.level));
          return;
        }
        const progress = await ensureGamification(student);
        if (!live) return;
        if (formationDoneToday(progress)) {
          router.replace(lobbyPath("beginner"));
          return;
        }
        setMe(student);
        setRow(progress);
        setAge(progress.age);
        setColor(progress.favorite_color);
        if (!buildDailySession(progress.learned_phrases || []).cards.length) {
          setDone(true);
        }
      })
      .catch(() => router.replace("/auth"));
    return () => {
      live = false;
    };
  }, [router]);

  const session = useMemo(() => buildDailySession(row?.learned_phrases || []), [row]);
  const total = session.cards.length;
  const current = session.cards[index];
  const progress = done || !total ? 100 : (index / total) * 100;

  const slots: PhraseSlots = {
    name: me?.firstName || "",
    age: age ? String(age) : "",
    color: color || "",
    city: me?.city || "",
    country: me ? countryByCode(me.nationality)?.name || me.nationality : "",
    status: me ? statusPhrase(me.status) : "",
  };

  function completeCard() {
    playLevelUp();
    buzz([18, 40, 26]);
    setStars((prev) => prev + STARS_PER_CARD);
    setBurst((prev) => prev + 1);
    window.setTimeout(() => {
      if (index + 1 >= total) {
        setDone(true);
        return;
      }
      setIndex((prev) => prev + 1);
    }, 900);
  }

  async function enterLobby() {
    if (!me || leaving) return;
    setLeaving(true);
    try {
      await completeFormation(
        me,
        session.cards.map((card) => card.id),
        age,
        color,
      );
      await reportFirstEnglish("formation");
    } catch {
      /* still enter the waiting room */
    }
    router.push(lobbyPath("beginner"));
  }

  return (
    <div className="flash-shell">
      <div className="flash-aurora" aria-hidden />
      <div className="flash-grid" aria-hidden />

      <header className="flash-header">
        <div>
          <p className="flash-kicker">{t.flash.kicker}</p>
          <h1 className="flash-title">{session.title?.[locale] || t.flash.title}</h1>
        </div>
        {me && (
          <span className="flash-streak">
            <Flame className="h-4 w-4" />
            {row?.current_streak || me.streak || 1}
          </span>
        )}
      </header>

      <div className="flash-meter">
        <div className="flash-meter-bar" style={{ width: `${progress}%` }} />
        <span className="flash-meter-stars">{stars} 🌟</span>
      </div>

      <main className="flash-main">
        {me && current ? (
          <AnimatePresence mode="wait">
            <FlashCard
              key={current.id}
              card={current}
              index={index}
              total={total}
              review={session.reviewIds.includes(current.id)}
              slots={slots}
              age={age}
              color={color}
              onAge={setAge}
              onColor={setColor}
              onComplete={completeCard}
            />
          </AnimatePresence>
        ) : null}
      </main>

      {!done && <StarBurst token={burst} label={`+${STARS_PER_CARD} 🌟`} />}
      {done && <FinaleModal stars={stars} onEnter={() => void enterLobby()} entering={leaving} />}
    </div>
  );
}
