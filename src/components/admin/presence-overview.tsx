"use client";

import { Activity, Radio, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/provider";
import type { Level } from "@/i18n/translations";
import { fetchTonightAttendance, type AttendanceRow } from "@/lib/attendance";
import { removeRealtimeChannel, waitForChannelRemoval } from "@/lib/realtime-channel";
import { getSupabase } from "@/lib/supabase";
import type { LiveRoomCard } from "@/lib/use-live-index";

type LobbyPresence = {
  userId?: string;
  id?: string;
};

type LecturePeer = { id?: string; name?: string };

type PresenceByLevel = Record<Level, string[]>;

const levels: Level[] = ["beginner", "intermediate", "advanced"];
const emptyPresence = (): PresenceByLevel => ({
  beginner: [],
  intermediate: [],
  advanced: [],
});

const labels = {
  en: {
    kicker: "Live attendance",
    title: "Who is here now?",
    online: "online",
    waiting: "lobby",
    live: "in class",
    roll: "Level 0 · 1 — present in room only",
    absent: "Everyone else = absent tonight",
    note: "Room presence or a match tonight counts. Absentees from yesterday + day before had old marks cleared.",
  },
  fr: {
    kicker: "Présence en direct",
    title: "Qui est là maintenant ?",
    online: "en ligne",
    waiting: "salon",
    live: "en classe",
    roll: "Level 0 · 1 — présents dans la salle seulement",
    absent: "Tous les autres = absents ce soir",
    note: "Présent = dans la salle ou un match ce soir. Absents hier + avant-hier : anciennes marques effacées.",
  },
  ar: {
    kicker: "الحضور المباشر",
    title: "من موجود الآن؟",
    online: "متصل",
    waiting: "في الصالون",
    live: "داخل الفصل",
    roll: "المستوى 0 · 1 — الحاضرون في القاعة فقط",
    absent: "الباقون = غائبون الليلة",
    note: "الحضور = في القاعة أو مباراة الليلة. الغائبون أمس وقبل أمس: محيت علاماتهم القديمة.",
  },
} as const;

function currentIds(state: Record<string, LobbyPresence[]>) {
  return [
    ...new Set(
      Object.values(state)
        .map((entries) => entries[entries.length - 1])
        .filter((row) => {
          const id = String(row?.userId || row?.id || "");
          return Boolean(id) && id !== "efaa-admin";
        })
        .map((row) => String(row.userId || row.id)),
    ),
  ];
}

function rollPeers(state: Record<string, LecturePeer[]>) {
  const out: { id: string; name: string }[] = [];
  const seen = new Set<string>();
  Object.values(state).forEach((entries) => {
    const row = entries[entries.length - 1];
    const id = String(row?.id || "");
    if (!id || id === "efaa-admin" || seen.has(id)) return;
    seen.add(id);
    out.push({ id, name: row?.name || "—" });
  });
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function PresenceOverview({ liveRooms }: { liveRooms: LiveRoomCard[] }) {
  const { locale, t } = useI18n();
  const c = labels[locale];
  const [lobby, setLobby] = useState<PresenceByLevel>(emptyPresence);
  const [roll0, setRoll0] = useState<{ id: string; name: string }[]>([]);
  const [roll1, setRoll1] = useState<{ id: string; name: string }[]>([]);
  const [tonight, setTonight] = useState<AttendanceRow[]>([]);

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;
    const channels: { topic: string; channel: ReturnType<typeof supabase.channel> }[] = [];

    levels.forEach((level) => {
      const topic = `efaa-lobby-${level}`;
      void waitForChannelRemoval(topic).then(() => {
        if (cancelled) return;
        const channel = supabase.channel(topic);
        channels.push({ topic, channel });
        channel.on("presence", { event: "sync" }, () => {
          const ids = currentIds(channel.presenceState<LobbyPresence>());
          setLobby((previous) => ({ ...previous, [level]: ids }));
        });
        channel.subscribe();
      });
    });

    (["lecture-0", "lecture-1"] as const).forEach((key) => {
      const topic = `efaa-lecture-roll-${key}`;
      void waitForChannelRemoval(topic).then(() => {
        if (cancelled) return;
        const channel = supabase.channel(topic);
        channels.push({ topic, channel });
        channel.on("presence", { event: "sync" }, () => {
          const peers = rollPeers(channel.presenceState<LecturePeer>());
          if (key === "lecture-0") setRoll0(peers);
          else setRoll1(peers);
        });
        channel.subscribe();
      });
    });

    void fetchTonightAttendance().then((rows) => {
      if (!cancelled) setTonight(rows);
    });
    const tick = window.setInterval(() => {
      void fetchTonightAttendance().then((rows) => {
        if (!cancelled) setTonight(rows);
      });
    }, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(tick);
      channels.forEach(({ topic, channel }) => {
        void removeRealtimeChannel(topic, supabase, channel);
      });
    };
  }, []);

  const summary = useMemo(
    () =>
      levels.map((level) => {
        const waitingIds = new Set(lobby[level]);
        const liveIds = new Set(
          liveRooms
            .filter((room) => room.level === level)
            .flatMap((room) => room.ids)
            .filter((id) => id !== "efaa-admin"),
        );
        const everyone = new Set([...waitingIds, ...liveIds]);
        return {
          level,
          total: everyone.size,
          waiting: [...waitingIds].filter((id) => !liveIds.has(id)).length,
          live: liveIds.size,
        };
      }),
    [liveRooms, lobby],
  );

  const total = summary.reduce((sum, item) => sum + item.total, 0);
  const inRoom = [...roll0, ...roll1];

  return (
    <section className="kingdom-glass mt-5 overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c4a574]">
            <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-300" />
            {c.kicker}
          </p>
          <h2 className="mt-1 font-display text-[24px] text-[#f3e6c8]">{c.title}</h2>
        </div>
        <div className="flex min-w-14 items-center justify-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-sm font-bold text-emerald-200">
          <Users className="h-4 w-4" />
          {total}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {summary.map((item) => (
          <article
            key={item.level}
            className="rounded-2xl border border-[#c4a574]/20 bg-black/20 px-2 py-3 text-center"
          >
            <span
              className={`mx-auto block h-2 w-2 rounded-full ${
                item.total ? "bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" : "bg-white/20"
              }`}
            />
            <p className="mt-2 truncate text-[10px] font-bold uppercase tracking-wide text-[#c4a574]">
              {t.levels[item.level]}
            </p>
            <p className="mt-1 font-display text-3xl text-[#f6e7a1]">{item.total}</p>
            <p className="text-[9px] text-[#e8d5b0]/60">{c.online}</p>
            <div className="mt-2 border-t border-white/[0.06] pt-2 text-[9px] leading-4 text-[#e8d5b0]/55">
              <p>
                {item.waiting} {c.waiting}
              </p>
              <p>
                {item.live} {c.live}
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/5 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/90">{c.roll}</p>
        {inRoom.length ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {roll0.map((peer) => (
              <li key={`0-${peer.id}`} className="rounded-full bg-emerald-300/15 px-2.5 py-1 text-[11px] text-emerald-100">
                L0 · {peer.name}
              </li>
            ))}
            {roll1.map((peer) => (
              <li key={`1-${peer.id}`} className="rounded-full bg-sky-300/15 px-2.5 py-1 text-[11px] text-sky-100">
                L1 · {peer.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] text-[#e8d5b0]/55">{c.absent}</p>
        )}
        {tonight.length > 0 ? (
          <p className="mt-2 text-[10px] text-[#e8d5b0]/50">
            {tonight.length} marked present tonight (room or match)
          </p>
        ) : null}
      </div>

      <p className="mt-3 flex items-center justify-center gap-2 text-center text-[10px] text-[#c4a574]/70">
        <Activity className="h-3.5 w-3.5" />
        {c.note}
      </p>
    </section>
  );
}
