"use client";

import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ConfettiBlast } from "@/components/intermediate/confetti-blast";
import { SlangCard } from "@/components/intermediate/slang-card";
import { useI18n } from "@/i18n/provider";
import { restoreStudent } from "@/lib/efaa-db";
import { buzz } from "@/lib/flash-lesson";
import { playJackpot } from "@/lib/intermediate-fx";
import {
  completeIntermediateDay,
  ensureIntermediateProgress,
  intermediateFormationDoneToday,
} from "@/lib/intermediate-progress";
import { slangBatchForDay } from "@/lib/intermediate-slang";
import { beginnerNextPath } from "@/lib/gamification";
import { lobbyPath, studentBoardName, type EfaaStudent } from "@/lib/session";

const STARS = 15;

export function SlangFormation() {
  const { t } = useI18n();
  const router = useRouter();
  const [me, setMe] = useState<EfaaStudent | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [stars, setStars] = useState(0);
  const [boom, setBoom] = useState(0);
  const [done, setDone] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let live = true;
    restoreStudent()
      .then(async (student) => {
        if (!live) return;
        if (!student?.level) {
          router.replace("/auth");
          return;
        }
        if (student.level !== "intermediate") {
          router.replace(await beginnerNextPath(student));
          return;
        }
        const progress = await ensureIntermediateProgress(student.id);
        if (!live) return;
        if (intermediateFormationDoneToday(progress)) {
          router.replace(lobbyPath("intermediate"));
          return;
        }
        setMe(student);
        setDayIndex(progress.day_index);
      })
      .catch(() => router.replace("/auth"));
    return () => {
      live = false;
    };
  }, [router]);

  const cards = useMemo(() => slangBatchForDay(dayIndex), [dayIndex]);
  const current = cards[index];

  function onWin() {
    playJackpot();
    buzz([20, 35, 20, 45, 18]);
    setUnlocked(true);
    setStars((prev) => prev + STARS);
    setBoom((prev) => prev + 1);
    window.setTimeout(() => {
      if (index + 1 >= cards.length) {
        setDone(true);
        return;
      }
      setUnlocked(false);
      setIndex((prev) => prev + 1);
    }, 980);
  }

  async function enterLobby() {
    if (!me || leaving) return;
    setLeaving(true);
    try {
      await completeIntermediateDay(
        me.id,
        cards.map((card) => card.id),
        studentBoardName(me),
        me.nationality,
      );
    } catch {
      /* still enter */
    }
    router.push(lobbyPath("intermediate"));
  }

  return (
    <div className={`mid-shell ${boom ? "mid-boom" : ""}`}>
      <div className="mid-aurora" aria-hidden />
      <div className="mid-grid" aria-hidden />
      <header className="mid-header">
        <div>
          <p className="mid-kicker">{t.mid.kicker}</p>
          <h1 className="mid-title">{t.mid.title}</h1>
        </div>
        <span className="mid-stars">{stars} 🌟</span>
      </header>
      <p className="mid-sub">{t.mid.subtitle}</p>
      <main className="mid-main">
        {me && current && !done ? (
          <AnimatePresence mode="wait">
            <SlangCard
              key={current.id}
              item={current}
              index={index}
              total={cards.length}
              unlocked={unlocked}
              onWin={onWin}
            />
          </AnimatePresence>
        ) : null}
      </main>
      <ConfettiBlast token={boom} label={`+${STARS} Stars 🌟`} />
      {done ? (
        <div className="mid-finale">
          <div className="mid-finale-card">
            <p className="mid-finale-title">{t.mid.finaleTitle}</p>
            <p className="mid-finale-body">{t.mid.finaleBody}</p>
            <p className="mid-finale-stars">{stars} 🌟</p>
            <button type="button" className="mid-enter" disabled={leaving} onClick={() => void enterLobby()}>
              {t.mid.cta}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
