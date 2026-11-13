"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Send, Video, VideoOff } from "lucide-react";
import { LanguageSwitcher } from "@/components/landing/language-switcher";
import { VipBadge } from "@/components/landing/vip-badge";
import { DailyTile } from "@/components/room/daily-tile";
import { RoomAtmosphere } from "@/components/room/room-atmosphere";
import { useI18n } from "@/i18n/provider";
import type { Level } from "@/i18n/translations";
import { fetchWebSettings, restoreStudent } from "@/lib/efaa-db";
import { topics } from "@/lib/room-roster";
import { useDailySalon } from "@/lib/use-daily-salon";
import { getSupabase } from "@/lib/supabase";
import { adminHost, isAdminAuthed, readAdminVisit } from "@/lib/admin";
import { beginnerNextPath } from "@/lib/gamification";
import { isLevel, roomPath, studentBoardName, type EfaaStudent } from "@/lib/session";
import { useAvatarBroadcast } from "@/lib/avatar";

type ChatMsg = { id: string; name: string; text: string };

function gridCount(n: number) {
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}

export function KingdomRoom({ level }: { level: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [me, setMe] = useState<EfaaStudent | null>(null);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [topic, setTopic] = useState(topics[isLevel(level) ? level : "beginner"][locale]);
  const chatRef = useRef<HTMLDivElement>(null);
  const roomChannelRef = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null);
  const safeLevel: Level = isLevel(level) ? level : "beginner";
  const adminHere = isAdminAuthed() && readAdminVisit() === safeLevel;
  useAvatarBroadcast(setMe);
  const stayInSalon = safeLevel !== "intermediate" || adminHere;
  const liveCall = useDailySalon(safeLevel, me, Boolean(me) && stayInSalon);

  useEffect(() => {
    if (isAdminAuthed() && readAdminVisit() === safeLevel) {
      setMe(adminHost(safeLevel));
      setReady(true);
      return;
    }
    let live = true;
    restoreStudent()
      .then(async (student) => {
        if (!live) return;
        if (safeLevel === "intermediate") {
          router.replace(student ? await beginnerNextPath(student) : "/auth");
          return;
        }
        setMe(student);
        setReady(true);
        if (student && isLevel(level) && student.level !== level) {
          router.replace(roomPath(student.level));
          return;
        }
        if (!student) router.replace("/auth");
      })
      .catch(() => {
        if (!live) return;
        setReady(true);
        router.replace("/auth");
      });
    return () => {
      live = false;
    };
  }, [level, router, safeLevel]);

  const visitingAdmin = isAdminAuthed() && readAdminVisit() === safeLevel;
  const blocked = ready && !visitingAdmin && (!me || me.level !== safeLevel);

  useEffect(() => {
    fetchWebSettings()
      .then((row) => {
        if (row.topics?.[safeLevel]) setTopic(row.topics[safeLevel]);
      })
      .catch(() => setTopic(topics[safeLevel][locale]));
  }, [locale, safeLevel]);

  useEffect(() => {
    if (!isLevel(level)) return;
    const supabase = getSupabase();
    const channel = supabase.channel(`efaa-room-${level}`, {
      config: { broadcast: { self: false } },
    });
    roomChannelRef.current = channel;
    channel
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        const msg = payload as ChatMsg;
        if (!msg?.id || !msg.text) return;
        setMessages((prev) => [...prev.slice(-40), msg]);
      })
      .subscribe();
    return () => {
      roomChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [level]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight });
  }, [messages]);

  function sendChat(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !me) return;
    const msg: ChatMsg = {
      id: `${Date.now()}`,
      name: me.firstName,
      text,
    };
    setMessages((prev) => [...prev.slice(-40), msg]);
    void roomChannelRef.current?.send({ type: "broadcast", event: "chat", payload: msg });
    setDraft("");
  }

  if (!ready) return <div className="kingdom-shell h-full min-h-dvh" />;

  if (blocked) {
    return (
      <div className="kingdom-shell flex h-full min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-2xl text-[#f3e6c8]">{t.room.forbidden}</p>
        {me && (
          <button className="kingdom-cta mt-5" onClick={() => router.replace(roomPath(me.level))}>
            {t.room.back}
          </button>
        )}
      </div>
    );
  }

  const shown = (liveCall.tiles.length
    ? liveCall.tiles
    : me
      ? [
          {
            sessionId: "local-wait",
            userId: me.id,
            name: studentBoardName(me),
            nationality: me.nationality,
            streak: me.streak,
            photo: me.photo,
            local: true,
            audioOn: liveCall.audioOn,
            speaking: false,
          },
        ]
      : []
  ).map((tile) =>
    tile.local && me
      ? {
          ...tile,
          name: studentBoardName(me),
          nationality: me.nationality,
          streak: me.streak,
          photo: tile.photo || me.photo,
          userId: tile.userId || me.id,
        }
      : tile,
  );

  return (
    <div className="kingdom-shell relative flex h-full min-h-dvh flex-col overflow-hidden">
      <RoomAtmosphere />
      <header className="relative z-10 shrink-0 px-3 pt-2 pe-20">
        <div className="flex items-center justify-between gap-2 py-1">
          <p className="min-w-0 truncate font-display text-[11px] text-[#e8d5b0]">
            English For All Academy
          </p>
          <LanguageSwitcher />
        </div>
        <div className="live-topic">
          <p className="text-[9px] uppercase tracking-[0.28em] text-[#c4a574]">
            {t.levels[safeLevel]} · {t.room.topic}
          </p>
          <p className="truncate font-display text-[15px] leading-tight text-[#f3e6c8]">{topic}</p>
        </div>
      </header>

      <section className="relative z-10 mx-auto min-h-0 w-full max-w-md flex-1 px-2 pt-1">
        {liveCall.status === "joining" && (
          <p className="pointer-events-none absolute inset-x-0 top-2 z-10 text-center text-[11px] text-[#c4a574]">
            {t.room.joining}
          </p>
        )}
        {liveCall.status === "missing" && (
          <p className="pointer-events-none absolute inset-x-0 top-2 z-10 text-center text-[11px] text-[#e2b07a]">
            {t.room.liveWait}
          </p>
        )}
        <div className="live-grid h-full" data-count={gridCount(shown.length)}>
          {shown.map((tile) => (
            <DailyTile key={tile.userId || tile.sessionId} tile={tile} sessionsLabel={t.room.sessions} />
          ))}
        </div>

        <div className="live-chat">
          <div ref={chatRef} className="live-chat-feed">
            {messages.map((msg) => (
              <p key={msg.id} className="live-chat-line">
                <span>{msg.name}</span> {msg.text}
              </p>
            ))}
          </div>
          <form onSubmit={sendChat} className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.room.chatPlaceholder}
              className="kingdom-input flex-1 py-2 text-[13px]"
            />
            <button type="submit" className="kingdom-cta px-3 py-2" aria-label={t.room.send}>
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      <div className="live-controls relative z-10">
        <button
          type="button"
          onClick={liveCall.toggleAudio}
          className={`live-ctrl ${liveCall.audioOn ? "live-ctrl-on speaking-ring" : ""}`}
        >
          {liveCall.audioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          <span>{liveCall.audioOn ? t.room.micActive : t.room.talk}</span>
        </button>
        <button
          type="button"
          onClick={liveCall.toggleVideo}
          className={`live-ctrl ${liveCall.videoOn ? "live-ctrl-on" : ""}`}
        >
          {liveCall.videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          <span>{liveCall.videoOn ? t.room.camera : t.room.cameraOff}</span>
        </button>
      </div>
      <VipBadge />
    </div>
  );
}
