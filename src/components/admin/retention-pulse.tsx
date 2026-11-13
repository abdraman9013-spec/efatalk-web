"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";

type Retention = {
  boardActiveThis: number;
  boardActivePrev: number;
  pointsThis: number;
  pointsPrev: number;
  matchActiveThis: number;
  matchActivePrev: number;
  formationThis: number;
  flaming: number;
  pushSubs: number;
  practice: number;
  official: number;
  clash: number;
};

const copy = {
  en: {
    kicker: "Retention pulse",
    title: "This week vs last week",
    board: "Board actives",
    match: "Voice match actives",
    points: "Board points",
    attract: "What pulls them",
    clash: "Clash players",
    formation: "Formation (7d)",
    push: "Push on",
    flaming: "Flames live",
  },
  fr: {
    kicker: "Pouls rétention",
    title: "Cette semaine vs semaine dernière",
    board: "Actifs tableau",
    match: "Actifs match vocal",
    points: "Points tableau",
    attract: "Ce qui attire",
    clash: "Joueurs Clash",
    formation: "Formation (7j)",
    push: "Push ON",
    flaming: "Flammes vivantes",
  },
  ar: {
    kicker: "نبض الاحتفاظ",
    title: "هذا الأسبوع مقابل الماضي",
    board: "نشطو اللوحة",
    match: "نشطو المباراة",
    points: "نقاط اللوحة",
    attract: "ما يجذبهم",
    clash: "لاعبو Clash",
    formation: "التدريب (7 أيام)",
    push: "التنبيهات",
    flaming: "شعلات حية",
  },
} as const;

function Delta({ now, prev }: { now: number; prev: number }) {
  const diff = now - prev;
  if (diff === 0) return <Minus className="inline h-3.5 w-3.5 text-[#c4a574]/70" />;
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-300">
        <TrendingUp className="h-3.5 w-3.5" />+{diff}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-rose-300">
      <TrendingDown className="h-3.5 w-3.5" />
      {diff}
    </span>
  );
}

export function RetentionPulse() {
  const { locale } = useI18n();
  const c = copy[locale];
  const [data, setData] = useState<Retention | null>(null);

  useEffect(() => {
    let live = true;
    void fetch("/api/admin/retention")
      .then((res) => res.json())
      .then((json) => {
        if (live && json?.ok) setData(json as Retention);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      live = false;
    };
  }, []);

  if (!data) return null;

  return (
    <section className="kingdom-glass mt-5 overflow-hidden p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c4a574]">{c.kicker}</p>
      <h2 className="mt-1 font-display text-[22px] text-[#f3e6c8]">{c.title}</h2>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <article className="rounded-2xl border border-[#c4a574]/20 bg-black/20 px-2 py-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#c4a574]">{c.board}</p>
          <p className="mt-1 font-display text-3xl text-[#f6e7a1]">{data.boardActiveThis}</p>
          <p className="mt-1 text-[10px]">
            <Delta now={data.boardActiveThis} prev={data.boardActivePrev} />
          </p>
        </article>
        <article className="rounded-2xl border border-[#c4a574]/20 bg-black/20 px-2 py-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#c4a574]">{c.match}</p>
          <p className="mt-1 font-display text-3xl text-[#f6e7a1]">{data.matchActiveThis}</p>
          <p className="mt-1 text-[10px]">
            <Delta now={data.matchActiveThis} prev={data.matchActivePrev} />
          </p>
        </article>
        <article className="rounded-2xl border border-[#c4a574]/20 bg-black/20 px-2 py-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#c4a574]">{c.points}</p>
          <p className="mt-1 font-display text-2xl text-[#f6e7a1]">{data.pointsThis}</p>
          <p className="mt-1 text-[10px]">
            <Delta now={data.pointsThis} prev={data.pointsPrev} />
          </p>
        </article>
      </div>

      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c4a574]">{c.attract}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[#e8d5b0]/80">
        <p>
          {c.clash}: <strong className="text-[#f6e7a1]">{data.clash}</strong>
        </p>
        <p>
          {c.formation}: <strong className="text-[#f6e7a1]">{data.formationThis}</strong>
        </p>
        <p>
          {c.push}: <strong className="text-[#f6e7a1]">{data.pushSubs}</strong>
        </p>
        <p>
          {c.flaming}: <strong className="text-[#f6e7a1]">{data.flaming}</strong>
        </p>
      </div>
    </section>
  );
}
